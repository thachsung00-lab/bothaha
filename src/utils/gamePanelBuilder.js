const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

/**
 * Tạo giao diện Bảng Khu Trò Chơi XCCoin (Mini-Game Panel - /setgame)
 * Tích hợp cả 2 game: Xổ Số Miền Nam (x10) và Bài Cào 3 Lá (100 - 10k)
 */
function createGamePanel() {
  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🎰 SÒNG BẠC & KHU TRÒ CHƠI XCCOIN 🎲')
    .setDescription(
      'Chào mừng bạn đến với Khu Trò Chơi! Thử vận may và nhân số dư XCCoin của bạn:\n\n' +
      '1️⃣ 🎰 **DỰ ĐOÁN XỔ SỐ MIỀN NAM (XSMN)**\n' +
      '• Dự đoán **2 chữ số (từ 00 đến 99)** khớp với **Giải 8** các đài Miền Nam hôm nay.\n' +
      '• Trùng Giải 8 bất kỳ đài nào trong ngày ➡️ **NHẬN THƯỞNG GẤP x10 SỐ TIỀN CƯỢC**!\n' +
      '• Tự động cập nhật kết quả và trả thưởng vào **16h35 hàng ngày**.\n\n' +
      '2️⃣ 🃏 **BÀI CÀO 3 LÁ CÙNG BOT (BA CÀO)**\n' +
      '• Đọ điểm ngẫu nhiên 3 lá cùng Bot (100 - 10,000 Coin). Thắng nhận ngay **x2 tiền cược**!\n\n' +
      '3️⃣ 👥 **BÀI CÀO NHÓM (PVP ĐẤU NHIỀU NGƯỜI)**\n' +
      '• Mở bàn cào từ 2 đến 8 người chơi trong Server! Dùng 1 bộ 52 lá chia bài minh bạch.\n' +
      '• Người thắng có bài cao nhất **ẵm trọn toàn bộ Hũ Tiền Cược (Pot)** của cả bàn!\n'
    )
    .setFooter({ text: '🎲 Bấm vào các nút bên dưới để tham gia đặt cược ngay!' })
    .setTimestamp();

  const rowGames = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_game_xsmn')
      .setLabel('Dự Đoán XSMN (x10)')
      .setEmoji('🎰')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('btn_game_baicao')
      .setLabel('Bài Cào vs Bot')
      .setEmoji('🃏')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('btn_game_pvp_create')
      .setLabel('Bàn Cào PvP (Nhóm)')
      .setEmoji('👥')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('btn_game_mybets')
      .setLabel('Vé Cược Của Tôi')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('btn_game_stations')
      .setLabel('Đài Mở Thưởng')
      .setEmoji('🏛️')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [rowGames] };
}

module.exports = {
  createGamePanel
};


