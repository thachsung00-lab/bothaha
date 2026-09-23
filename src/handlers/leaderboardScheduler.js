const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const levelHandler = require('./levelHandler');
const config = require('../config.json');

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

/**
 * Tạo Embed Báo Cáo Bảng Xếp Hạng 24h
 */
function createLeaderboardEmbed(guild) {
  const topXpUsers = db.getLeaderboard(guild.id, 'xp', 10);
  const topVoiceUsers = db.getLeaderboard(guild.id, 'voiceMinutes', 10);
  const topCoinUsers = db.getLeaderboard(guild.id, 'xccoin', 10);

  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(`📢 BẢNG XẾP HẠNG TỔNG KẾT 24H | ${guild.name.toUpperCase()}`)
    .setDescription(
      `Chào mọi người! Đây là bảng vinh danh những thành viên chăm chỉ và tích cực nhất trong 24 giờ qua.\n` +
      `*Cập nhật tự động mỗi 24 giờ tại kênh này.*`
    )
    .setThumbnail(guild.iconURL({ dynamic: true }) || null);

  // Cột Top Voice
  let voiceText = '';
  if (topVoiceUsers.length === 0) {
    voiceText = '*Chưa có dữ liệu voice.*';
  } else {
    topVoiceUsers.slice(0, 5).forEach((u, i) => {
      const medal = MEDALS[i] || `#${i + 1}`;
      const timeStr = levelHandler.formatVoiceTime(u.voiceMinutes || 0);
      voiceText += `${medal} <@${u.userId}>: **${timeStr}**\n`;
    });
  }

  // Cột Top XP
  let xpText = '';
  if (topXpUsers.length === 0) {
    xpText = '*Chưa có dữ liệu XP.*';
  } else {
    topXpUsers.slice(0, 5).forEach((u, i) => {
      const realmTag = levelInfo.level > 0 ? `[${levelInfo.realm}] ` : '';
      xpText += `${medal} <@${u.userId}>: 🔮 **${realmTag}Cấp ${levelInfo.level}: ${levelInfo.title}** (*${(u.xp || 0).toLocaleString()} XP*)\n`;
    });
  }

  // Cột Top XCCoin
  let coinText = '';
  if (topCoinUsers.length === 0) {
    coinText = '*Chưa có dữ liệu XCCoin.*';
  } else {
    topCoinUsers.slice(0, 5).forEach((u, i) => {
      const medal = MEDALS[i] || `#${i + 1}`;
      const coins = (u.xccoin || 0).toLocaleString();
      coinText += `${medal} <@${u.userId}>: 🪙 **${coins} XCCoin**\n`;
    });
  }

  embed.addFields(
    { name: '🎙️ TOP ONLINE PHÒNG THOẠI (VOICE)', value: voiceText, inline: false },
    { name: '⭐ TOP CẤP ĐỘ & KINH NGHIỆM (XP)', value: xpText, inline: false },
    { name: '🪙 TOP ĐẠI GIA XCCOIN', value: coinText, inline: false }
  );

  embed.setFooter({ text: 'Hãy vào phòng voice để nhận 1,000 XCCoin/giờ và điểm danh /daily mỗi ngày nhé!' })
    .setTimestamp();

  return embed;
}

/**
 * Gửi báo cáo bảng xếp hạng đến kênh chỉ định
 */
async function sendDailyLeaderboard(guild, channel) {
  try {
    const embed = createLeaderboardEmbed(guild);
    await channel.send({ embeds: [embed] });
    console.log(`[AutoReport] Đã gửi báo cáo bảng xếp hạng 24h vào kênh #${channel.name} của guild ${guild.name}`);
    
    // Cập nhật mốc thời gian vừa gửi
    db.setGuildSettings(guild.id, { lastAutoLeaderboard: Date.now() });
    return true;
  } catch (err) {
    console.error(`[AutoReport] Không thể gửi bảng xếp hạng vào kênh ${channel?.id}:`, err);
    return false;
  }
}

/**
 * Khởi chạy vòng lặp kiểm tra định kỳ để tự động đăng sau mỗi 24h
 */
function startLeaderboardScheduler(client) {
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  // Kiểm tra mỗi 5 phút
  setInterval(async () => {
    const now = Date.now();

    for (const [guildId, guild] of client.guilds.cache.entries()) {
      try {
        const settings = db.getGuildSettings(guildId);
        if (!settings || !settings.leaderboardChannelId) continue;

        const lastPost = settings.lastAutoLeaderboard || 0;
        const timeElapsed = now - lastPost;

        if (timeElapsed >= TWENTY_FOUR_HOURS_MS) {
          const channel = guild.channels.cache.get(settings.leaderboardChannelId);
          if (channel && channel.isTextBased()) {
            await sendDailyLeaderboard(guild, channel);
          }
        }
      } catch (err) {
        console.error(`[LeaderboardScheduler] Lỗi xử lý guild ${guildId}:`, err);
      }
    }
  }, 5 * 60 * 1000); // Kiểm tra mỗi 5 phút
}

module.exports = {
  createLeaderboardEmbed,
  sendDailyLeaderboard,
  startLeaderboardScheduler
};
