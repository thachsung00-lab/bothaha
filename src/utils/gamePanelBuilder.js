const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

/**
 * Tạo giao diện Bảng Khu Trò Chơi XCCoin (Mini-Game Panel - /setgame)
 * Gồm: Slot Game Nổ Hũ, Bài Cào (Bot & PvP), Kéo Xì Dách (Bot & PvP)
 */
function createGamePanel() {
  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🎰 SÒNG BẠC & KHU TRÒ CHƠI XCCOIN 🎲')
    .setDescription(
      'Chào mừng bạn đến với Khu Trò Chơi! Thử vận may và nhân số dư XCCoin của bạn:\n\n' +
      '1️⃣ 🎰 **MÁY QUAY SLOT GAME (NỔ HŨ XCCOIN)**\n' +
      '• Quay trúng 3x 7️⃣7️⃣7️⃣ ➡️ **JACKPOT NỔ HŨ GẤP x20 LẦN CƯỢC**!\n' +
      '• 💎 Kim Cương x10 | 👑 Vương Miện x7 | 🔔 Chuông Vàng x5 | 🍇 Nho x4 | 🍒 Cherry x3 | 2 hình trùng x1.5!\n\n' +
      '2️⃣ 🃏 **BÀI CÀO 3 LÁ CÙNG BOT (BA CÀO)**\n' +
      '• Đọ điểm ngẫu nhiên 3 lá cùng Bot (100 - 10,000 Coin). Thắng nhận ngay **x2 tiền cược**!\n' +
      '• *Tự động xóa ván cũ sau 10 giây để giữ sạch kênh.*\n\n' +
      '3️⃣ 👥 **BÀI CÀO NHÓM (PVP ĐẤU NHIỀU NGƯỜI)**\n' +
      '• Mở bàn cào từ 2 đến 8 người chơi trong Server! Dùng 1 bộ 52 lá chia bài minh bạch.\n' +
      '• Người thắng có bài cao nhất **ẵm trọn toàn bộ Hũ Tiền Cược (Pot)** của cả bàn!\n\n' +
      '4️⃣ 🎴 **KÉO XÌ DÁCH 21 ĐIỂM (BLACKJACK)**\n' +
      '• Đấu với Bot hoặc mở bàn PvP nhóm! Rút thêm bài (Hit) hoặc Dằn bài (Stand).\n' +
      '• Xì Hoa (2 Át), Xì Dách (Át + Tây), Ngũ Linh (5 lá <= 21) ăn thưởng lớn!\n'
    )
    .setFooter({ text: '🎲 Bấm vào các nút bên dưới để tham gia đặt cược ngay!' })
    .setTimestamp();

  // Hàng nút 1: Slot Game & Bài Cào
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_game_slot')
      .setLabel('Quay Slot (x20)')
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
      .setStyle(ButtonStyle.Success)
  );

  // Hàng nút 2: Kéo Xì Dách & Tiện ích
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_game_xidach')
      .setLabel('Xì Dách vs Bot')
      .setEmoji('🎴')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('btn_game_xdpvp_create')
      .setLabel('Xì Dách PvP (Nhóm)')
      .setEmoji('👥')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('btn_game_slot_rules')
      .setLabel('Tỷ Lệ Slot')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2] };
}

module.exports = {
  createGamePanel
};
