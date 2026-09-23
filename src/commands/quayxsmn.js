const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { processDailyLotteryDraw } = require('../handlers/lotteryHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quayxsmn')
    .setDescription('🎲 (Admin) Kích hoạt quay thưởng và trả thưởng XSMN ngay lập tức để kiểm tra')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const settlement = await processDailyLotteryDraw(interaction.client);
      if (!settlement) {
        return interaction.editReply({
          content: 'ℹ️ Ngày hôm nay đã được mở thưởng trước đó rồi.'
        });
      }

      return interaction.editReply({
        content: `✅ Đã tiến hành quay thưởng Giải 8 XSMN thành công!\n` +
                 `🎯 Các số trúng giải: **${settlement.winningNumbers.join(', ')}**\n` +
                 `🎉 Số người trúng x10: **${settlement.winners.length}** người.`
      });
    } catch (err) {
      console.error('Lỗi khi quay thưởng thủ công:', err);
      return interaction.editReply({
        content: `❌ Lỗi khi thực thi: ${err.message}`
      });
    }
  }
};
