const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { startSoloGame } = require('../handlers/xidachSoloHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xidach')
    .setDescription('🃏 Chơi Kéo Xì Dách (Blackjack 21 Điểm) cùng Bot')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Số XCCoin đặt cược (100 - 10,000)')
        .setMinValue(100)
        .setMaxValue(10000)
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const user = db.getUser(userId, guildId);
    const balance = user.xccoin || 0;

    if (balance < amount) {
      return interaction.editReply({
        content: `❌ Số dư XCCoin của bạn không đủ! Bạn hiện có **${balance.toLocaleString()} XCCoin**, cần **${amount.toLocaleString()} XCCoin** để chơi.`
      });
    }

    const res = startSoloGame({
      userId,
      username: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL({ dynamic: true }),
      guildId,
      amount
    });

    const payload = { embeds: [res.embed] };
    if (res.row) {
      payload.components = [res.row];
    } else {
      payload.components = [];
    }

    await interaction.editReply(payload);

    // Nếu ván bài kết thúc ngay lập tức (Xì Dách / Xì Hoa): tự động xóa sau 10 giây
    if (res.isInstant) {
      setTimeout(() => {
        interaction.deleteReply().catch(() => {});
      }, 10000);
    }
  }
};
