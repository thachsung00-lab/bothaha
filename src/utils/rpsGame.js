const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const RPS_CHOICES = {
  ROCK: { id: 'ROCK', name: 'Búa', emoji: '✊', beats: 'SCISSORS' },
  SCISSORS: { id: 'SCISSORS', name: 'Kéo', emoji: '✌️', beats: 'PAPER' },
  PAPER: { id: 'PAPER', name: 'Bao', emoji: '🖐️', beats: 'ROCK' }
};

/**
 * Phân định kết quả giữa 2 lựa chọn (choice1 so với choice2)
 * @param {string} c1 ID lựa chọn 1 (ROCK | SCISSORS | PAPER)
 * @param {string} c2 ID lựa chọn 2 (ROCK | SCISSORS | PAPER)
 * @returns {'WIN' | 'LOSE' | 'TIE'}
 */
function determineWinner(c1, c2) {
  if (c1 === c2) return 'TIE';
  if (RPS_CHOICES[c1]?.beats === c2) return 'WIN';
  return 'LOSE';
}

/**
 * Xử lý ván chơi Solo Oẳn Tù Tì với Máy
 * @param {string} playerChoiceId ID lựa chọn của người chơi ('ROCK' | 'SCISSORS' | 'PAPER')
 * @param {number} betAmount Số tiền cược (1 - 10,000)
 */
function playSoloRps(playerChoiceId, betAmount = 1000) {
  const choices = ['ROCK', 'SCISSORS', 'PAPER'];
  const botChoiceId = choices[Math.floor(Math.random() * choices.length)];

  const playerChoice = RPS_CHOICES[playerChoiceId];
  const botChoice = RPS_CHOICES[botChoiceId];

  const result = determineWinner(playerChoiceId, botChoiceId);

  let payout = 0;
  let earnedXp = 0;

  if (result === 'WIN') {
    payout = betAmount * 2; // Nhận lại vốn + lời 100%
    earnedXp = 15;
  } else if (result === 'TIE') {
    payout = betAmount; // Hoàn lại 100% tiền cược
    earnedXp = 5;
  } else {
    payout = 0;
    earnedXp = 3; // XP an ủi
  }

  return {
    playerChoice,
    botChoice,
    result,
    betAmount,
    payout,
    earnedXp
  };
}

/**
 * Tạo Embed kết quả ván Oẳn Tù Tì Solo
 */
function createRpsResultEmbed(player, gameResult, newBalance, levelInfo) {
  const { playerChoice, botChoice, result, betAmount, payout, earnedXp } = gameResult;

  let color = config.colors.primary;
  let statusText = '';
  let balanceText = '';

  if (result === 'WIN') {
    color = config.colors.success;
    statusText = `🎉 **BẠN ĐÃ THẮNG CUỘC!**\nBạn đã dùng **${playerChoice.emoji} ${playerChoice.name}** khắc chế thành công **${botChoice.emoji} ${botChoice.name}** của Bot!`;
    balanceText = `+${betAmount.toLocaleString()} XCCoin (Thưởng x2 cược)`;
  } else if (result === 'TIE') {
    color = config.colors.gold;
    statusText = `🤝 **HÒA NHAU!**\nCả hai cùng ra **${playerChoice.emoji} ${playerChoice.name}**! Tiền cược đã được hoàn trả lại ví.`;
    balanceText = `±0 XCCoin (Hoàn lại 100% cược)`;
  } else {
    color = config.colors.error;
    statusText = `💀 **BẠN ĐÃ THUA CUỘC!**\nBot đã dùng **${botChoice.emoji} ${botChoice.name}** để đánh bại **${playerChoice.emoji} ${playerChoice.name}** của bạn!`;
    balanceText = `-${betAmount.toLocaleString()} XCCoin`;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('✊✌️🖐️ KẾT QUẢ OẲN TÙ TÌ (VS BOT)')
    .setDescription(
      `${statusText}\n\n` +
      `**Đấu Thủ:** ${player}\n` +
      `**Lựa chọn của bạn:** ${playerChoice.emoji} **${playerChoice.name}**\n` +
      `**Lựa chọn của Bot:** ${botChoice.emoji} **${botChoice.name}**\n\n` +
      `💰 **Tiền cược:** **${betAmount.toLocaleString()} XCCoin**\n` +
      `💵 **Biến động:** \`${balanceText}\`\n` +
      `🪙 **Số dư ví:** **${newBalance.toLocaleString()} XCCoin**\n` +
      `⭐ **Tu vi nhận được:** **+${earnedXp} XP**`
    )
    .setFooter({ text: '⏱️ Thông báo này sẽ tự động xóa sau 10 giây để giữ sạch kênh' })
    .setTimestamp();

  return embed;
}

module.exports = {
  RPS_CHOICES,
  determineWinner,
  playSoloRps,
  createRpsResultEmbed
};
