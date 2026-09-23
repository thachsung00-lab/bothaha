const { Events } = require('discord.js');
const db = require('../database/db');
const { createFeaturePanel } = require('../utils/panelBuilder');
const { createGamePanel } = require('../utils/gamePanelBuilder');

const { refreshCoinPayPanel } = require('../utils/coinPayPanelBuilder');

// Map lưu debounce cho từng kênh để tránh spam khi nhiều người chat cùng lúc
const stickyTimeouts = new Map();
const gameTimeouts = new Map();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild) return;

    const guildId = message.guild.id;
    const settings = db.getGuildSettings(guildId);

    // Không kích hoạt khi chính tin nhắn là bảng điều khiển (tránh vòng lặp vô tận)
    if (settings) {
      if (
        message.id === settings.stickyMessageId ||
        message.id === settings.gameMessageId ||
        message.id === settings.coinPayMessageId
      ) {
        return;
      }
    }

    // Các lệnh Admin chỉ xử lý khi người gửi không phải là Bot
    if (!message.author.bot) {
      const contentLower = message.content.trim().toLowerCase();
    if (contentLower.startsWith('/setgame') || contentLower.startsWith('!setgame')) {
      if (message.member && message.member.permissions.has('ManageGuild')) {
        try {
          const currentSettings = db.getGuildSettings(guildId);
          if (currentSettings.gameChannelId && currentSettings.gameMessageId) {
            const oldChan = message.guild.channels.cache.get(currentSettings.gameChannelId);
            if (oldChan) {
              const oldMsg = await oldChan.messages.fetch(currentSettings.gameMessageId).catch(() => null);
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

    // Hỗ trợ Admin gõ lệnh dạng văn bản (/choose hoặc !choose)
    if (contentLower.startsWith('/choose') || contentLower.startsWith('!choose')) {
      if (message.member && (message.member.permissions.has('ManageGuild') || message.member.permissions.has('Administrator'))) {
        try {
          const currentSettings = db.getGuildSettings(guildId);
          if (currentSettings.stickyChannelId && currentSettings.stickyMessageId) {
            const oldChan = message.guild.channels.cache.get(currentSettings.stickyChannelId);
            if (oldChan) {
              const oldMsg = await oldChan.messages.fetch(currentSettings.stickyMessageId).catch(() => null);
              if (oldMsg) await oldMsg.delete().catch(() => {});
            }
          }
          const panelPayload = createFeaturePanel();
          const newMsg = await message.channel.send(panelPayload);
          db.setGuildSettings(guildId, {
            stickyChannelId: message.channel.id,
            stickyMessageId: newMsg.id
          });
          await message.delete().catch(() => {});
          return;
        } catch (e) {
          console.error('[TextCommand /choose] Lỗi:', e);
        }
      }
    }

    // Hỗ trợ Admin gõ lệnh dạng văn bản (/setcoinpay hoặc !setcoinpay)
    if (contentLower.startsWith('/setcoinpay') || contentLower.startsWith('!setcoinpay')) {
      if (message.member && (message.member.permissions.has('ManageGuild') || message.member.permissions.has('Administrator'))) {
        try {
          const currentSettings = db.getGuildSettings(guildId);
          if (currentSettings.coinPayChannelId && currentSettings.coinPayMessageId) {
            const oldChan = message.guild.channels.cache.get(currentSettings.coinPayChannelId);
            if (oldChan) {
              const oldMsg = await oldChan.messages.fetch(currentSettings.coinPayMessageId).catch(() => null);
              if (oldMsg) await oldMsg.delete().catch(() => {});
            }
          }
          const { createCoinPayPanel } = require('../utils/coinPayPanelBuilder');
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

    // Hỗ trợ Admin gõ lệnh dạng văn bản (/setupchannels hoặc !setupchannels)
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

    // Hỗ trợ Admin gõ lệnh dạng văn bản (/bill hoặc !bill)
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
  } // Kết thúc khối kiểm tra !message.author.bot

    if (!settings) return;

    // 1. Kiểm tra kênh Bảng Tiện Ích (/choose)
    if (settings.stickyChannelId === message.channel.id && message.id !== settings.stickyMessageId) {
      if (stickyTimeouts.has(message.channel.id)) {
        clearTimeout(stickyTimeouts.get(message.channel.id));
      }

      const timeout = setTimeout(async () => {
        stickyTimeouts.delete(message.channel.id);
        try {
          const freshSettings = db.getGuildSettings(guildId);
          if (freshSettings.stickyMessageId) {
            const oldMsg = await message.channel.messages.fetch(freshSettings.stickyMessageId).catch(() => null);
            if (oldMsg) await oldMsg.delete().catch(() => {});
          }

          const panelPayload = createFeaturePanel();
          const newMsg = await message.channel.send(panelPayload);
          db.setGuildSettings(guildId, { stickyMessageId: newMsg.id });
        } catch (err) {
          console.error(`[StickyPanel] Lỗi khi duy trì bảng tiện ích ở kênh ${message.channel.id}:`, err);
        }
      }, 1200);

      stickyTimeouts.set(message.channel.id, timeout);
    }

    // 2. Kiểm tra kênh Khu Trò Chơi XCCoin (/setgame)
    if (settings.gameChannelId === message.channel.id && message.id !== settings.gameMessageId && settings.gameChannelId !== settings.stickyChannelId) {
      if (gameTimeouts.has(message.channel.id)) {
        clearTimeout(gameTimeouts.get(message.channel.id));
      }

      const timeout = setTimeout(async () => {
        gameTimeouts.delete(message.channel.id);
        try {
          const freshSettings = db.getGuildSettings(guildId);
          if (freshSettings.gameMessageId) {
            const oldMsg = await message.channel.messages.fetch(freshSettings.gameMessageId).catch(() => null);
            if (oldMsg) await oldMsg.delete().catch(() => {});
          }

          const panelPayload = createGamePanel();
          const newMsg = await message.channel.send(panelPayload);
          db.setGuildSettings(guildId, { gameMessageId: newMsg.id });
        } catch (err) {
          console.error(`[GamePanel] Lỗi khi duy trì bảng trò chơi ở kênh ${message.channel.id}:`, err);
        }
      }, 1200);

      gameTimeouts.set(message.channel.id, timeout);
    }

    // 3. Kiểm tra kênh Bảng Giao Dịch & Chuyển Tiền XCCoin (/setcoinpay)
    if (settings.coinPayChannelId === message.channel.id && message.id !== settings.coinPayMessageId) {
      refreshCoinPayPanel(message.channel, guildId);
    }
  }
};

