const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

/**
 * Tạo giao diện Bảng Điều Khiển Điểm Danh & Tiện Ích (/choose)
 */
function createFeaturePanel() {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('⚡ BẢNG ĐIỀU KHIỂN & ĐIỂM DANH SERVER 📅')
    .setDescription(
      'Bấm vào các nút bên dưới để thực hiện thao tác nhanh:\n\n' +
      '📅 **Điểm Danh Ngày** — Nhận thưởng XP, cộng chuỗi Streak và nhận thêm XCCoin.\n' +
      '📊 **Xem Rank** — Tra cứu cấp độ hiện tại, thanh tiến trình thăng cấp & giờ online Voice.\n' +
      '🪙 **Kiểm Tra XCCoin** — Xem số dư ví tiền tệ (Ngồi voice nhận **+1,000 XCCoin/giờ**).\n' +
      '🏆 **Bảng Xếp Hạng** — Xem Top thành viên hoạt động năng nổ nhất Server.\n' +
      '💸 **Chuyển Tiền (Coin Pay)** — Chuyển XCCoin cho bạn bè qua giao diện chọn nút bấm.'
    )
    .setFooter({ text: '📌 Bảng tính năng này luôn tự động hiển thị ở cuối mỗi tin nhắn trong kênh' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_daily_checkin')
      .setLabel('Điểm Danh Ngày')
      .setEmoji('📅')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('btn_view_rank')
      .setLabel('Xem Rank')
      .setEmoji('📊')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('btn_view_coin')
      .setLabel('Kiểm Tra XCCoin')
      .setEmoji('🪙')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('btn_view_top')
      .setLabel('Bảng Xếp Hạng')
      .setEmoji('🏆')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('btn_coinpay_start')
      .setLabel('Chuyển Tiền')
      .setEmoji('💸')
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = {
  createFeaturePanel
};


