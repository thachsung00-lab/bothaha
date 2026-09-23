const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const levelHandler = require('./levelHandler');
const config = require('../config.json');

// Map lưu trữ phiên voice đang hoạt động: `${guildId}_${userId}` => session data
const activeSessions = new Map();

function getSessionKey(guildId, userId) {
  return `${guildId}_${userId}`;
}

/**
 * Xử lý sự kiện voiceStateUpdate
 */
function handleVoiceState(oldState, newState) {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return; // Bỏ qua bot

  const guildId = (newState.guild || oldState.guild).id;
  const userId = member.id;
  const sessionKey = getSessionKey(guildId, userId);

  // Người dùng tham gia kênh voice
  if (!oldState.channelId && newState.channelId) {
    activeSessions.set(sessionKey, {
      userId,
      guildId,
      channelId: newState.channelId,
      joinedAt: Date.now(),
      lastXpAwarded: Date.now()
    });
    console.log(`[Voice] ${member.user.tag} đã vào phòng: ${newState.channel.name}`);
  }
  // Người dùng đổi kênh voice
  else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    const session = activeSessions.get(sessionKey);
    if (session) {
      session.channelId = newState.channelId;
    } else {
      activeSessions.set(sessionKey, {
        userId,
        guildId,
        channelId: newState.channelId,
        joinedAt: Date.now(),
        lastXpAwarded: Date.now()
      });
    }
  }
  // Người dùng rời kênh voice
  else if (oldState.channelId && !newState.channelId) {
    const session = activeSessions.get(sessionKey);
    if (session) {
      // Tính thời gian còn dư từ lần cộng XP gần nhất (nếu còn)
      const now = Date.now();
      const elapsedMs = now - session.lastXpAwarded;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);

      if (elapsedMinutes > 0) {
        awardVoiceRewards(member.guild, member, elapsedMinutes);
      }

      activeSessions.delete(sessionKey);
      console.log(`[Voice] ${member.user.tag} đã rời phòng voice.`);
    }
  }
}

/**
 * Cộng XP và thời gian cho thành viên
 */
function awardVoiceRewards(guild, member, minutes) {
  if (minutes <= 0) return;

  const xpToAdd = minutes * config.voice.xpPerMinute;
  const coinsPerHour = config.voice.coinsPerHour || 1000;
  const coinsToAdd = Math.round(minutes * (coinsPerHour / 60));

  const currentData = db.getUser(member.id, guild.id);
  const oldLevelInfo = levelHandler.getLevelInfo(currentData.xp);

  const updatedData = db.addVoiceActivity(member.id, guild.id, minutes, xpToAdd, coinsToAdd);
  db.updateUser(member.id, guild.id, {
    lastVoiceActive: Date.now(),
    penalizedDays: 0
  });
  const newLevelInfo = levelHandler.getLevelInfo(updatedData.xp);

  // Kiểm tra lên cấp (Level Up)
  if (newLevelInfo.level > oldLevelInfo.level) {
    db.updateUser(member.id, guild.id, { level: newLevelInfo.level });
    notifyLevelUp(guild, member, newLevelInfo.level);
  }
}

/**
 * Thông báo khi người dùng lên cấp
 */
async function notifyLevelUp(guild, member, newLevel) {
  try {
    const levelConfig = levelHandler.CULTIVATION_LEVELS[newLevel] || { realm: 'Tu Tiên', title: `Cấp ${newLevel}` };
    const embed = new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle('⚡ ĐỘT PHÁ CẢNH GIỚI TU TIÊN THÀNH CÔNG! 🎉')
      .setDescription(`Chúc mừng đạo hữu ${member} đã tu vi đại tiến, đột phá đạt **[${levelConfig.realm}] - Cấp ${newLevel}: ${levelConfig.title}**!`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🔮 Cảnh Giới Mới', value: `**[ ${levelConfig.realm} ]**\n➡️ Cấp **${newLevel}**: **${levelConfig.title}**`, inline: true },
        { name: '🔥 Động Lực Tu Hành', value: 'Tiếp tục online Voice và tham gia các hoạt động để sớm ngày phi thăng chứng đạo!', inline: false }
      )
      .setTimestamp();

    // Thử gửi tin nhắn vào kênh văn bản thuộc phòng voice hoặc systemChannel
    const voiceChannel = member.voice?.channel;
    if (voiceChannel && voiceChannel.isTextBased && voiceChannel.isTextBased()) {
      await voiceChannel.send({ embeds: [embed] }).catch(() => {});
    } else if (guild.systemChannel) {
      await guild.systemChannel.send({ embeds: [embed] }).catch(() => {});
    }
  } catch (err) {
    console.error('[Voice] Lỗi thông báo level up:', err);
  }
}

/**
 * Quét định kỳ mỗi phút: Tự động cộng XP cho tất cả thành viên đang trong voice
 */
function startVoiceTicker(client) {
  setInterval(async () => {
    const now = Date.now();

    for (const [key, session] of activeSessions.entries()) {
      try {
        const guild = client.guilds.cache.get(session.guildId);
        if (!guild) continue;

        const channel = guild.channels.cache.get(session.channelId);
        if (!channel || !channel.isVoiceBased()) {
          activeSessions.delete(key);
          continue;
        }

        const member = channel.members.get(session.userId);
        if (!member || member.user.bot) {
          activeSessions.delete(key);
          continue;
        }

        // Kiểm tra điều kiện bỏ qua khi Deafen
        if (config.voice.ignoreDeafened && (member.voice.selfDeaf || member.voice.serverDeaf)) {
          continue;
        }

        // Kiểm tra số lượng người tối thiểu trong phòng
        if (channel.members.filter(m => !m.user.bot).size < config.voice.minMembersInChannel) {
          continue;
        }

        // Cộng 1 phút và lượng XP tương ứng
        awardVoiceRewards(guild, member, 1);
        session.lastXpAwarded = now;

      } catch (err) {
        console.error(`[VoiceTicker] Lỗi xử lý cho session ${key}:`, err);
      }
    }
  }, 60000); // Mỗi 60 giây (1 phút)
}

module.exports = {
  handleVoiceState,
  startVoiceTicker,
  activeSessions
};
