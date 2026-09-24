const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

// Danh sách biểu tượng Slot và trọng số xuất hiện
const SLOT_SYMBOLS = [
  { emoji: '7️⃣', name: 'Lucky 7', weight: 2, multiplier: 20, isJackpot: true },
  { emoji: '💎', name: 'Kim Cương', weight: 3, multiplier: 10 },
  { emoji: '👑', name: 'Vương Miện', weight: 4, multiplier: 7 },
  { emoji: '🔔', name: 'Chuông Vàng', weight: 5, multiplier: 5 },
  { emoji: '🍇', name: 'Nho May Mắn', weight: 6, multiplier: 4 },
  { emoji: '🍒', name: 'Cherry', weight: 7, multiplier: 3 }
];

// Tạo pool ngẫu nhiên dựa theo trọng số
const SYMBOL_POOL = [];
for (const s of SLOT_SYMBOLS) {
  for (let i = 0; i < s.weight; i++) {
    SYMBOL_POOL.push(s);
  }
}

/**
 * Chọn 1 biểu tượng ngẫu nhiên từ pool
 */
function getRandomSymbol() {
  const index = Math.floor(Math.random() * SYMBOL_POOL.length);
  return SYMBOL_POOL[index];
}

/**
 * Thực hiện quay 1 lượt Slot Machine
 * @param {number} betAmount Số tiền cược
 * @returns {object} Kết quả quay slot
 */
function playSlot(betAmount = 100) {
  const s1 = getRandomSymbol();
  const s2 = getRandomSymbol();
  const s3 = getRandomSymbol();

  const reels = [s1, s2, s3];
  const reelEmojis = reels.map(r => r.emoji);

  let winType = 'LOSE'; // 'JACKPOT' | 'TRIPLE' | 'DOUBLE' | 'LOSE'
  let multiplier = 0;
  let title = '';
  let winningSymbol = null;

  // 1. Kiểm tra 3 biểu tượng giống nhau
  if (s1.emoji === s2.emoji && s2.emoji === s3.emoji) {
    winningSymbol = s1;
    multiplier = s1.multiplier;
    if (s1.isJackpot) {
      winType = 'JACKPOT';
      title = '🔥 JACKPOT NỔ HŨ TOÀN SERVER! 🔥';
    } else {
      winType = 'TRIPLE';
      title = `🎉 THẮNG LỚN: 3x ${s1.emoji} (${s1.name})!`;
    }
  }
  // 2. Không đủ 3 hình trùng nhau -> Không trúng (đã bỏ cơ chế an ủi 2 hình 1.5x)
  else {
    winType = 'LOSE';
    multiplier = 0;
    title = '💨 KHÔNG TRÚNG! Chúc bạn may mắn lần sau!';
  }

  const payout = Math.floor(betAmount * multiplier);
  const netProfit = payout - betAmount;

  // Tính XP tu vi
  let earnedXp = 10;
  if (winType === 'JACKPOT') {
    earnedXp = Math.floor(150 + betAmount * 0.02);
  } else if (winType === 'TRIPLE') {
    earnedXp = Math.floor(80 + betAmount * 0.015);
  } else {
    earnedXp = Math.floor(10 + betAmount * 0.002);
  }

  return {
    reels,
    reelEmojis,
    winType,
    multiplier,
    title,
    winningSymbol,
    betAmount,
    payout,
    netProfit,
    earnedXp
  };
}

/**
 * Tạo Embed giao diện kết quả quay Slot
 */
function createSlotResultEmbed(user, slotResult, newBalance) {
  const { reelEmojis, winType, multiplier, title, betAmount, payout, netProfit, earnedXp } = slotResult;

  let color = config.colors.error;
  if (winType === 'JACKPOT') color = config.colors.gold;
  else if (winType === 'TRIPLE') color = config.colors.success;

  let outcomeText = '';
  if (winType === 'JACKPOT' || winType === 'TRIPLE') {
    outcomeText = `🎊 **THẮNG GẤP x${multiplier} LẦN CƯỢC**! 🎁 Nhận về: **+${payout.toLocaleString()} XCCoin**`;
  } else {
    outcomeText = `💀 **THUA CUỘC**! Mất cược: **-${betAmount.toLocaleString()} XCCoin**`;
  }

  const machineFrame =
    '```text\n' +
    '╔═════════════════════════════╗\n' +
    '║      🎰 MÁY QUAY XÈNG 🎰     ║\n' +
    '╠═════════════════════════════╣\n' +
    `║       [ ${reelEmojis[0]}  |  ${reelEmojis[1]}  |  ${reelEmojis[2]} ]       ║\n` +
    '╚═════════════════════════════╝\n' +
    '```';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: `Máy Quay Xèng Slot Machine | ${user.username}`,
      iconURL: user.displayAvatarURL({ dynamic: true })
    })
    .setTitle(title)
    .setDescription(
      machineFrame + '\n' +
      outcomeText + '\n\n' +
      `💰 **Tiền cược:** **${betAmount.toLocaleString()}** XCCoin\n` +
      `⭐ **Tu vi nhận được:** **+${earnedXp.toLocaleString()}** XP\n` +
      `💳 **Số dư ví hiện tại:** **${newBalance.toLocaleString()}** XCCoin`
    )
    .setFooter({ text: '⏱️ Thông báo này sẽ tự động xóa sau 15 giây để giữ sạch kênh.' })
    .setTimestamp();

  return embed;
}

/**
 * Tạo Embed hiển thị quá trình quay Slot (animation / hiệu ứng xoay trục hồi hộp)
 */
function createSlotSpinningEmbed(user, betAmount, displayedReels, stepText) {
  const machineFrame =
    '```text\n' +
    '╔═════════════════════════════╗\n' +
    '║      🎰 MÁY QUAY XÈNG 🎰     ║\n' +
    '╠═════════════════════════════╣\n' +
    `║       [ ${displayedReels[0]}  |  ${displayedReels[1]}  |  ${displayedReels[2]} ]       ║\n` +
    '╚═════════════════════════════╝\n' +
    '```';

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setAuthor({
      name: `Máy Quay Xèng Slot Machine | ${user.username}`,
      iconURL: user.displayAvatarURL({ dynamic: true })
    })
    .setTitle('🎰 ĐANG QUAY MÁY XÈNG...')
    .setDescription(
      machineFrame + '\n' +
      `⚡ **${stepText}**\n\n` +
      `💰 **Tiền cược:** **${betAmount.toLocaleString()}** XCCoin\n` +
      `🌟 *Nổ hũ 7️⃣7️⃣7️⃣ x20 lần cược | 💎 x10 | 👑 x7 | 🔔 x5 | 🍇 x4 | 🍒 x3!*`
    )
    .setFooter({ text: '🎲 Đang quay... Hãy chờ đợi kết quả!' })
    .setTimestamp();

  return embed;
}

/**
 * Bảng hiển thị tỷ lệ nổ hũ của Slot
 */
function createSlotRulesEmbed() {
  return new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🎰 BẢNG TỶ LỆ TRẢ THƯỞNG MÁY QUAY SLOT XCCOIN 🏆')
    .setDescription(
      '**Thử vận may với Máy Quay Xèng Slot Machine 3 Hàng!**\n\n' +
      '👑 **CÁC MỨC THẮNG KHI QUAY RA 3 BIỂU TƯỢNG TRÙNG NHAU:**\n' +
      '• 7️⃣ 7️⃣ 7️⃣ — **JACKPOT NỔ HŨ TOÀN SERVER**: 🌟 **Ăn gấp x20** tiền cược!\n' +
      '• 💎 💎 💎 — **KIM CƯƠNG TOÀN NĂNG**: 💎 **Ăn gấp x10** tiền cược!\n' +
      '• 👑 👑 👑 — **VƯƠNG MIỆN HOÀNG GIA**: 👑 **Ăn gấp x7** tiền cược!\n' +
      '• 🔔 🔔 🔔 — **CHUÔNG VÀNG MAY MẮN**: 🔔 **Ăn gấp x5** tiền cược!\n' +
      '• 🍇 🍇 🍇 — **NHO TRÀN ĐẦY**: 🍇 **Ăn gấp x4** tiền cược!\n' +
      '• 🍒 🍒 🍒 — **CHERRY TƯƠI ĐỎ**: 🍒 **Ăn gấp x3** tiền cược!\n\n' +
      '⭐ Mỗi lượt quay còn cộng thêm điểm **XP Tu Vi** giúp bạn nâng cấp cảnh giới tu tiên!\n' +
      '🎲 *Mức cược: Tự do (Tối đa 10,000 XCCoin/lần)*'
    )
    .setFooter({ text: 'Tự động đóng sau 1 phút' })
    .setTimestamp();
}

/**
 * Tạo hàng nút cược nhanh: 100, 500, 1000, 5000 và cược tùy ý
 */
function createSlotActionRows() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_game_slot_quick_100')
      .setLabel('100')
      .setEmoji('🪙')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('btn_game_slot_quick_500')
      .setLabel('500')
      .setEmoji('🪙')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('btn_game_slot_quick_1000')
      .setLabel('1,000')
      .setEmoji('🪙')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('btn_game_slot_quick_5000')
      .setLabel('5,000')
      .setEmoji('🪙')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('btn_game_slot_custom')
      .setLabel('Cược Tùy Ý')
      .setEmoji('🎰')
      .setStyle(ButtonStyle.Success)
  );

  return row;
}

/**
 * Tạo giao diện hiển thị chọn mức cược nhanh cho Slot Game
 */
function createSlotPromptPayload(user, currentBalance) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🎰 MÁY QUAY XÈNG SLOT MACHINE (NỔ HŨ x20)')
    .setDescription(
      `Chào <@${user.id}>! Thử vận may nhân số dư ví XCCoin của bạn:\n\n` +
      `💳 **Số dư ví hiện tại:** **${currentBalance.toLocaleString()}** XCCoin\n\n` +
      `⚡ **Chọn nhanh mức cược:**\n` +
      `• Bấm một trong các nút cược nhanh: **100**, **500**, **1,000**, **5,000** XCCoin.\n` +
      `• Hoặc bấm **🎰 Cược Tùy Ý** để nhập số tiền cược từ 1 đến 10,000 XCCoin.\n\n` +
      `🌟 *Nổ hũ 7️⃣7️⃣7️⃣ x20 lần cược | 💎 x10 | 👑 x7 | 🔔 x5 | 🍇 x4 | 🍒 x3!*`
    )
    .setFooter({ text: '⏱️ Tự động đóng sau 30 giây' })
    .setTimestamp();

  return {
    embeds: [embed],
    components: [createSlotActionRows()]
  };
}

module.exports = {
  SLOT_SYMBOLS,
  playSlot,
  createSlotSpinningEmbed,
  createSlotResultEmbed,
  createSlotRulesEmbed,
  createSlotActionRows,
  createSlotPromptPayload
};
