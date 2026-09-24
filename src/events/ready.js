const { Events, ActivityType } = require('discord.js');
const voiceHandler = require('../handlers/voiceHandler');
const { startLeaderboardScheduler } = require('../handlers/leaderboardScheduler');
const { startDecayTicker } = require('../handlers/decayHandler');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`===========================================`);
    console.log(`🤖 Bot đã đăng nhập thành công với tag: ${client.user.tag}`);
    console.log(`🌐 Đang phục vụ trên ${client.guilds.cache.size} server`);
    console.log(`===========================================`);

    // Thiết lập trạng thái hoạt động
    client.user.setPresence({
      activities: [{ name: '🎙️ Ngồi voice nhận XP | /help', type: ActivityType.Custom }],
      status: 'online',
    });

    // Tự động đồng bộ Slash Commands tức thì cho từng Guild đang kết nối để lệnh dùng được ngay
    const { deployGuildCommands } = require('../deploy-commands');
    client.guilds.cache.forEach(async (guild) => {
      await deployGuildCommands(guild.id, client.user.id).catch(() => {});
    });

    // Quét các thành viên đang có mặt trong kênh voice sẵn để theo dõi ngay
    let initialVoiceMembers = 0;
    client.guilds.cache.forEach(guild => {
      guild.channels.cache.forEach(channel => {
        if (channel.isVoiceBased()) {
          channel.members.forEach(member => {
            if (!member.user.bot) {
              const sessionKey = `${guild.id}_${member.id}`;
              voiceHandler.activeSessions.set(sessionKey, {
                userId: member.id,
                guildId: guild.id,
                channelId: channel.id,
                joinedAt: Date.now(),
                lastXpAwarded: Date.now()
              });
              initialVoiceMembers++;
            }
          });
        }
      });
    });

    if (initialVoiceMembers > 0) {
      console.log(`[Voice] Đã nhận diện và theo dõi sẵn ${initialVoiceMembers} thành viên đang trong các kênh voice.`);
    }

    // Bắt đầu vòng lặp tính thời gian voice và cộng XP tự động
    voiceHandler.startVoiceTicker(client);
    console.log(`[Voice] Hệ thống tự động cộng Voice XP đã sẵn sàng.`);

    // Bắt đầu hệ thống tự động đăng bảng xếp hạng mỗi 24h
    startLeaderboardScheduler(client);
    console.log(`[AutoReport] Hệ thống tự động gửi bảng xếp hạng 24h đã kích hoạt.`);

    // Bắt đầu hệ thống trừ phạt khi không online voice quá 24h
    startDecayTicker();

    // Tự động làm mới bảng điều khiển tiện ích trên kênh đã ghim
    const db = require('../database/db');
    const { createFeaturePanel } = require('../utils/panelBuilder');

    client.guilds.cache.forEach(async (guild) => {
      try {
        const settings = db.getGuildSettings(guild.id);
        // 1. Bảng Tiện Ích
        if (settings && settings.stickyChannelId && settings.stickyMessageId) {
          const channel = guild.channels.cache.get(settings.stickyChannelId);
          if (channel && channel.isTextBased()) {
            const oldMsg = await channel.messages.fetch(settings.stickyMessageId).catch(() => null);
            if (oldMsg) {
              const panelPayload = createFeaturePanel();
              await oldMsg.edit(panelPayload).catch(() => {});
              console.log(`[Panel] Đã tự động cập nhật Bảng Tiện Ích vào kênh #${channel.name}`);
            }
          }
        }

        // 2. Bảng Khu Trò Chơi
        if (settings && settings.gameChannelId && settings.gameMessageId) {
          const channel = guild.channels.cache.get(settings.gameChannelId);
          if (channel && channel.isTextBased()) {
            const oldMsg = await channel.messages.fetch(settings.gameMessageId).catch(() => null);
            if (oldMsg) {
              const { createGamePanel } = require('../utils/gamePanelBuilder');
              const panelPayload = createGamePanel();
              await oldMsg.edit(panelPayload).catch(() => {});
              console.log(`[Panel] Đã tự động cập nhật Bảng Mini-Game vào kênh #${channel.name}`);
            }
          }
        }

        // 3. Bảng Giao Dịch Coin Pay
        if (settings && settings.coinPayChannelId && settings.coinPayMessageId) {
          const channel = guild.channels.cache.get(settings.coinPayChannelId);
          if (channel && channel.isTextBased()) {
            const oldMsg = await channel.messages.fetch(settings.coinPayMessageId).catch(() => null);
            if (oldMsg) {
              const { createCoinPayPanel } = require('../utils/coinPayPanelBuilder');
              const panelPayload = createCoinPayPanel();
              await oldMsg.edit(panelPayload).catch(() => {});
              console.log(`[Panel] Đã tự động cập nhật Bảng Coin Pay vào kênh #${channel.name}`);
            }
          }
        }
      } catch (e) {}
    });
  }
};
