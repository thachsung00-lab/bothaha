const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder } = require('discord.js');
const config = require('../config.json');

/**
 * Tạo giao diện Bảng Chuyển Tiền XCCoin (Coin Pay Panel - /setcoinpay)
 */
function createCoinPayPanel() {
  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🪙 BẢNG GIAO DỊCH & CHUYỂN TIỀN XCCOIN (COIN PAY) 💸')
    .setDescription(
      'Hệ thống chuyển tiền **XCCoin** nhanh chóng, an toàn giữa các thành viên trong Server:\n\n' +
      '✨ **Tính Năng Nổi Bật:**\n' +
      '• Chuyển tiền trực tiếp bằng cách **bấm nút chọn người nhận** (không cần gõ lệnh).\n' +
      '• ⚡ **Giao dịch tức thì**, cộng tiền ngay vào ví người nhận.\n' +
      '• 🛡️ **Phí giao dịch: 0%** (Chuyển bao nhiêu, nhận bấy nhiêu).\n' +
      '• 💰 **Mức chuyển tối thiểu:** **10 XCCoin**.\n' +
      '• 📝 Hỗ trợ kèm theo **lời nhắn gửi riêng** đến người nhận.\n\n' +
      '👉 *Bấm nút **[ 💸 Chuyển XCCoin ]** bên dưới để bắt đầu giao dịch!*'
    )
    .setFooter({ text: '🪙 Hệ Thống Giao Dịch XCCoin Tự Động • An Toàn & Bảo Mật' })
    .setTimestamp();

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_coinpay_start')
      .setLabel('Chuyển XCCoin')
      .setEmoji('💸')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('btn_coinpay_balance')
      .setLabel('Kiểm Tra Số Dư Ví')
      .setEmoji('💳')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('btn_coinpay_guide')
      .setLabel('Hướng Dẫn')
      .setEmoji('📖')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [rowButtons] };
}

/**
 * Tạo payload chứa Menu chọn người nhận (UserSelectMenu)
 */
function createSelectRecipientPayload() {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('💸 CHỌN NGƯỜI NHẬN XCCOIN')
    .setDescription(
      'Vui lòng **chọn thành viên** bạn muốn chuyển XCCoin trong danh sách bên dưới:\n\n' +
      '*(Bạn có thể gõ tên thành viên vào ô tìm kiếm để chọn nhanh)*'
    )
    .setFooter({ text: 'Menu tự động đóng sau 1 phút' });

  const selectMenu = new UserSelectMenuBuilder()
    .setCustomId('select_coinpay_target')
    .setPlaceholder('🔍 Chọn người nhận trong server...')
    .setMinValues(1)
    .setMaxValues(1);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return { embeds: [embed], components: [row] };
}

/**
 * Tạo Embed biên lai thông báo chuyển tiền thành công
 */
function createTransferReceiptEmbed({ senderUser, recipientTag, amount, note = '', remainingBalance = 0 }) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('💸 GIAO DỊCH CHUYỂN TIỀN THÀNH CÔNG!')
    .setDescription(
      `Đã thực hiện giao dịch chuyển **${amount.toLocaleString()} XCCoin**:\n\n` +
      `👤 **Người chuyển:** <@${senderUser.id}>\n` +
      `🎯 **Người nhận:** ${recipientTag}\n` +
      `💰 **Số tiền chuyển:** **${amount.toLocaleString()}** XCCoin\n` +
      (note ? `📝 **Lời nhắn:** *"${note}"*\n` : '') +
      `\n💳 **Số dư ví còn lại:** **${(remainingBalance || 0).toLocaleString()}** XCCoin`
    )
    .setFooter({ text: '🪙 Hệ Thống Giao Dịch XCCoin Tự Động • An Toàn & Bảo Mật' })
    .setTimestamp();

  return embed;
}

/**
 * Tìm kênh trade coin (ví dụ: #traide-xccoin, #trade-coin) hoặc kênh chỉ định cấu hình
 */
function getTradeOrNotifyChannel(guild, guildSettings) {
  if (!guild || !guild.channels || !guild.channels.cache) return null;

  // 1. Ưu tiên kênh chỉ định bởi Admin qua lệnh /bill
  if (guildSettings && guildSettings.billChannelId) {
    const ch = guild.channels.cache.get(guildSettings.billChannelId);
    if (ch && typeof ch.isTextBased === 'function' && ch.isTextBased()) return ch;
  }

  // 2. Kênh chỉ định bởi Admin qua lệnh /setcoinpay
  if (guildSettings && guildSettings.coinPayChannelId) {
    const ch = guild.channels.cache.get(guildSettings.coinPayChannelId);
    if (ch && typeof ch.isTextBased === 'function' && ch.isTextBased()) return ch;
  }

  // 2. Tìm kênh có tên traide-xccoin, trade-coin, trade, v.v.
  for (const c of guild.channels.cache.values()) {
    if (typeof c.isTextBased === 'function' && c.isTextBased()) {
      const name = (c.name || '').toLowerCase();
      if (
        name.includes('traide-xccoin') ||
        name.includes('trade-xccoin') ||
        name.includes('trade-coin') ||
        name.includes('tradecoin') ||
        name.includes('traide') ||
        name.includes('trade') ||
        name.includes('coin-pay') ||
        name.includes('chuyen-tien')
      ) {
        return c;
      }
    }
  }

  return null;
}

const coinPayTimeouts = new Map();

/**
 * Tự động xóa bảng Coin Pay cũ và gửi lại bảng mới ở cuối kênh để luôn nằm cuối danh sách
 * @param {import('discord.js').TextChannel} channel
 * @param {string} guildId
 */
async function refreshCoinPayPanel(channel, guildId) {
  if (!channel || !guildId) return;
  if (coinPayTimeouts.has(channel.id)) {
    clearTimeout(coinPayTimeouts.get(channel.id));
  }

  const timeout = setTimeout(async () => {
    coinPayTimeouts.delete(channel.id);
    try {
      const db = require('../database/db');
      const freshSettings = db.getGuildSettings(guildId);
      if (!freshSettings) return;

      if (freshSettings.coinPayMessageId) {
        const oldMsg = await channel.messages.fetch(freshSettings.coinPayMessageId).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => {});
      }

      const panelPayload = createCoinPayPanel();
      const newMsg = await channel.send(panelPayload);
      db.setGuildSettings(guildId, {
        coinPayChannelId: channel.id,
        coinPayMessageId: newMsg.id
      });
    } catch (err) {
      console.error(`[CoinPaySticky] Lỗi khi duy trì bảng Coin Pay ở kênh ${channel.id}:`, err);
    }
  }, 1000);

  coinPayTimeouts.set(channel.id, timeout);
}

module.exports = {
  createCoinPayPanel,
  createSelectRecipientPayload,
  createTransferReceiptEmbed,
  getTradeOrNotifyChannel,
  refreshCoinPayPanel
};

