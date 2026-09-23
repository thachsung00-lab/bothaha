const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { playSlot, createSlotResultEmbed, createSlotActionRows, createSlotPromptPayload } = require('../utils/slotGame');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slot')
    .setDescription('🎰 Quay Máy Quay Xèng Slot Machine (Nổ Hũ x20 XCCoin)')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Số XCCoin đặt cược (Tối đa 10,000, để trống để chọn nút cược nhanh)')
        .setMinValue(1)
        .setMaxValue(10000)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const user = db.getUser(userId, guildId);
    const balance = user.xccoin || 0;

    // Nếu không nhập số tiền: hiển thị bảng chọn cược nhanh
    if (!amount) {
      const promptPayload = createSlotPromptPayload(interaction.user, balance);
      await interaction.editReply(promptPayload);
      setTimeout(() => {
        interaction.deleteReply().catch(() => {});
      }, 30000);
      return;
    }

    if (balance < amount) {
      return interaction.editReply({
        content: `❌ Số dư XCCoin của bạn không đủ! Bạn hiện có **${balance.toLocaleString()} XCCoin**, cần **${amount.toLocaleString()} XCCoin** để quay slot.`
      });
    }

    // Trừ tiền cược
    db.addXCCoin(userId, guildId, -amount);

    // Quay Slot
    const result = playSlot(amount);

    // Trả thưởng nếu thắng
    if (result.payout > 0) {
      db.addXCCoin(userId, guildId, result.payout);
    }

    // Cộng XP tu vi
    db.addXp(userId, guildId, result.earnedXp);

    const updatedUser = db.getUser(userId, guildId);
    const embed = createSlotResultEmbed(interaction.user, result, updatedUser.xccoin || 0);

    await interaction.editReply({ embeds: [embed], components: [createSlotActionRows()] });

    // Tự động xóa kết quả sau 15 giây để giữ kênh gọn gàng
    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, 15000);
  }
};
