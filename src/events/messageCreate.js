const { Events } = require('discord.js');
const db = require('../database/db');
const { createFeaturePanel } = require('../utils/panelBuilder');
const { createGamePanel } = require('../utils/gamePanelBuilder');
const { createCoinPayPanel } = require('../utils/coinPayPanelBuilder');

// Không dùng stickyTimeouts để tránh tình trạng bảng bị ẩn hiện/làm mới liên tục
module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild) return;

    // BỎ QUA TẤT CẢ TIN NHẮN CỦA BOT ĐỂ TRÁNH VÒNG LẶP
    if (message.author.bot) return;

    const guildId = message.guild.id;
    const settings = db.getGuildSettings(guildId);
    const contentLower = message.content.trim().toLowerCase();

    // ==========================================
    // 1. Xử lý các lệnh dạng văn bản (Text Commands) của Admin
    // ==========================================
    if (contentLower.startsWith('/setgame') || contentLower.startsWith('!setgame')) {
      if (message.member && message.member.permissions.has('ManageGuild')) {
        try {
          // Xóa tất cả các bảng game cũ hoặc trùng lặp trong kênh
          const recentMessages = await message.channel.messages.fetch({ limit: 20 }).catch(() => null);
          if (recentMessages) {
            for (const [, msg] of recentMessages) {
              if (msg.author.id === message.client.user.id && msg.embeds.some(e => e.title && e.title.includes('SÒNG BẠC & KHU TRÒ CHƠI'))) {
                await msg.delete().catch(() => {});
              }
            }
          }
          if (settings && settings.gameChannelId && settings.gameMessageId && settings.gameChannelId !== message.channel.id) {
            const oldChan = message.guild.channels.cache.get(settings.gameChannelId);
            if (oldChan) {
              const oldMsg = await oldChan.messages.fetch(settings.gameMessageId).catch(() => null);
              if (oldMsg) await oldMsg.delete().catch(() => {});
            }
          }
          const panelPayload = createGamePanel();
          const newMsg = await message.channel.send(panelPayload);
          db.setGuildSettings(guildId, {
            gameChannelId: message.channel.id,
            gameMessageId: newMsg.id
          });
          await message.delete().catch(() => {});
          return;
        } catch (e) {
          console.error('[TextCommand /setgame] Lỗi:', e);
        }
      }
    }

    if (contentLower.startsWith('/choose') || contentLower.startsWith('!choose')) {
      if (message.member && (message.member.permissions.has('ManageGuild') || message.member.permissions.has('Administrator'))) {
        try {
          // Xóa tất cả các bảng tiện ích cũ hoặc trùng lặp trong kênh
          const recentMessages = await message.channel.messages.fetch({ limit: 20 }).catch(() => null);
          if (recentMessages) {
            for (const [, msg] of recentMessages) {
              if (msg.author.id === message.client.user.id && msg.embeds.some(e => e.title && e.title.includes('BẢNG ĐIỀU KHIỂN & ĐIỂM DANH'))) {
                await msg.delete().catch(() => {});
              }
            }
          }
          if (settings && settings.stickyChannelId && settings.stickyMessageId && settings.stickyChannelId !== message.channel.id) {
            const oldChan = message.guild.channels.cache.get(settings.stickyChannelId);
            if (oldChan) {
              const oldMsg = await oldChan.messages.fetch(settings.stickyMessageId).catch(() => null);
              if (oldMsg) await oldMsg.delete().catch(() => {});
            }
          }
          const panelPayload = createFeaturePanel();
          const newMsg = await message.channel.send(panelPayload);
          db.setGuildSettings(guildId, {
            stickyChannelId: message.channel.id,
            stickyMessageId: newMsg.id,
            checkinChannelId: message.channel.id,
            panelMessageId: newMsg.id
          });
          await message.delete().catch(() => {});
          return;
        } catch (e) {
          console.error('[TextCommand /choose] Lỗi:', e);
        }
      }
    }

    if (contentLower.startsWith('/setcoinpay') || contentLower.startsWith('!setcoinpay')) {
      if (message.member && (message.member.permissions.has('ManageGuild') || message.member.permissions.has('Administrator'))) {
        try {
          // Xóa tất cả các bảng coin pay cũ hoặc trùng lặp trong kênh
          const recentMessages = await message.channel.messages.fetch({ limit: 20 }).catch(() => null);
          if (recentMessages) {
            for (const [, msg] of recentMessages) {
              if (msg.author.id === message.client.user.id && msg.embeds.some(e => e.title && e.title.includes('CỔNG CHUYỂN TIỀN XCCOIN'))) {
                await msg.delete().catch(() => {});
              }
            }
          }
          if (settings && settings.coinPayChannelId && settings.coinPayMessageId && settings.coinPayChannelId !== message.channel.id) {
            const oldChan = message.guild.channels.cache.get(settings.coinPayChannelId);
            if (oldChan) {
              const oldMsg = await oldChan.messages.fetch(settings.coinPayMessageId).catch(() => null);
              if (oldMsg) await oldMsg.delete().catch(() => {});
            }
          }
          const panelPayload = createCoinPayPanel();
          const newMsg = await message.channel.send(panelPayload);
          db.setGuildSettings(guildId, {
            coinPayChannelId: message.channel.id,
            coinPayMessageId: newMsg.id,
            billChannelId: message.channel.id
          });
          await message.delete().catch(() => {});
          return;
        } catch (e) {
          console.error('[TextCommand /setcoinpay] Lỗi:', e);
        }
      }
    }

    if (contentLower.startsWith('/setupchannels') || contentLower.startsWith('!setupchannels')) {
      if (message.member && (message.member.permissions.has('ManageGuild') || message.member.permissions.has('Administrator'))) {
        try {
          const { setupGuildChannels } = require('../handlers/channelSetupHandler');
          const statusMsg = await message.channel.send('⏳ Đang tiến hành tạo danh mục và 4 kênh chuẩn quyền...');
          const result = await setupGuildChannels(message.guild);
          if (result.success) {
            await statusMsg.edit(`✅ **Thiết lập thành công!** Đã cấu hình danh mục **🎶 GIẢI TRÍ - GAME** với 4 kênh: ${result.channels.checkin}, ${result.channels.rank}, ${result.channels.game}, ${result.channels.trade}`);
          } else {
            await statusMsg.edit(`❌ **Không thể hoàn tất:** ${result.reason}`);
          }
          await message.delete().catch(() => {});
          return;
        } catch (e) {
          console.error('[TextCommand /setupchannels] Lỗi:', e);
        }
      }
    }

    if (contentLower.startsWith('/bill') || contentLower.startsWith('!bill')) {
      if (message.member && (message.member.permissions.has('ManageGuild') || message.member.permissions.has('Administrator'))) {
        try {
          const targetChannel = message.mentions.channels.first() || message.channel;
          db.setGuildSettings(guildId, {
            billChannelId: targetChannel.id
          });
          await message.channel.send(`✅ **Thiết lập thành công!** Đã cài đặt kênh ${targetChannel} làm nơi nhận lịch sử giao dịch và biên lai chuyển tiền XCCoin!`);
          await message.delete().catch(() => {});
          return;
        } catch (e) {
          console.error('[TextCommand /bill] Lỗi:', e);
        }
      }
    }

    if (!settings) return;

    // ==========================================
    // 2. Kênh Bảng Chọn & Menu: #xccoingame, #traide-xccoin, #điểm-danh-nhận-coin (#điểm-danh-ngày)
    // Tự động xóa mọi tin nhắn chat của người dùng để kênh CHỈ hiển thị bảng menu và thông báo của bot
    // Tuyệt đối không xóa/gửi lại bảng để tránh bảng bị ẩn hiện liên tục, chớp giật hay nhân đôi
    // ==========================================
    const isProtectedMenuChannel =
      (settings.gameChannelId && settings.gameChannelId === message.channel.id) ||
      (settings.coinPayChannelId && settings.coinPayChannelId === message.channel.id) ||
      (settings.stickyChannelId && settings.stickyChannelId === message.channel.id) ||
      (settings.checkinChannelId && settings.checkinChannelId === message.channel.id);

    if (isProtectedMenuChannel) {
      await message.delete().catch(() => {});
      return;
    }
  }
};
