const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const levelHandler = require('./levelHandler');
const { playSoloRps, createRpsResultEmbed } = require('../utils/rpsGame');
const config = require('../config.json');

/**
 * Tạo giao diện để người chơi bấm nút chọn Búa / Kéo / Bao
 */
function createSoloRpsPromptPayload(userId, betAmount) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('✊✌️🖐️ OẲN TÙ TÌ CÙNG BOT')
    .setDescription(
      `Chào <@${userId}>! Bạn đang đặt cược **${betAmount.toLocaleString()} XCCoin**.\n\n` +
      `Hãy lựa chọn nước đi của bạn bằng cách bấm vào một trong các nút bên dưới:\n` +
      `• ✊ **Búa** — Đập gãy Kéo\n` +
      `• ✌️ **Kéo** — Cắt đứt Bao\n` +
      `• 🖐️ **Bao** — Bọc lấy Búa\n\n` +
      `*Thắng nhận ngay **x2 tiền cược** (+${betAmount.toLocaleString()} Coin)!*`
    )
    .setFooter({ text: '⏱️ Vui lòng chọn trong vòng 30 giây' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_rps_solo_ROCK_${betAmount}`)
      .setLabel('Búa')
      .setEmoji('✊')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`btn_rps_solo_SCISSORS_${betAmount}`)
      .setLabel('Kéo')
      .setEmoji('✌️')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`btn_rps_solo_PAPER_${betAmount}`)
      .setLabel('Bao')
      .setEmoji('🖐️')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Xử lý ván chơi Oẳn Tù Tì Solo với Máy
 */
async function executeSoloRps(interaction, playerChoiceId, betAmount) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId;

  const user = db.getUser(userId, guildId);
  const currentBalance = user.xccoin || 0;

  if (currentBalance < betAmount) {
    const errorMsg = `❌ Số dư XCCoin của bạn không đủ! Bạn có **${currentBalance.toLocaleString()} XCCoin**, cần **${betAmount.toLocaleString()} XCCoin**.`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMsg, embeds: [], components: [] }).catch(() => {});
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
    }
    return;
  }

  // Trừ tiền cược
  db.addXCCoin(userId, guildId, -betAmount);

  // Tiến hành chơi
  const gameResult = playSoloRps(playerChoiceId, betAmount);

  // Xử lý cộng thưởng / hoàn tiền
  if (gameResult.payout > 0) {
    db.addXCCoin(userId, guildId, gameResult.payout);
  }

  // Cộng XP tu vi
  db.addXp(userId, guildId, gameResult.earnedXp);

  const updatedUser = db.getUser(userId, guildId);
  const newBalance = updatedUser.xccoin || 0;
  const levelInfo = levelHandler.getLevelInfo(updatedUser.xp || 0);

  const resultEmbed = createRpsResultEmbed(interaction.user, gameResult, newBalance, levelInfo);

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ embeds: [resultEmbed], components: [] }).catch(() => {});
  } else if (typeof interaction.update === 'function') {
    await interaction.update({ embeds: [resultEmbed], components: [] }).catch(() => {});
  } else {
    await interaction.reply({ embeds: [resultEmbed], components: [] }).catch(() => {});
  }

  // Tự động xóa ván đấu sau 10 giây để giữ sạch kênh
  setTimeout(() => {
    interaction.deleteReply().catch(() => {});
  }, 10000);
}

module.exports = {
  createSoloRpsPromptPayload,
  executeSoloRps
};
