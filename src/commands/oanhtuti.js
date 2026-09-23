const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createSoloRpsPromptPayload, executeSoloRps } = require('../handlers/rpsSoloHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('oanhtuti')
    .setDescription('✊✌️🖐️ Chơi Oẳn Tù Tì (Kéo Búa Bao) cùng Bot (Mức cược từ 1 đến 10,000 XCCoin)')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Số XCCoin đặt cược (Tối đa 10,000)')
        .setMinValue(1)
        .setMaxValue(10000)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('choice')
        .setDescription('Lựa chọn nước đi của bạn (Búa, Kéo hoặc Bao)')
        .setRequired(false)
        .addChoices(
          { name: '✊ Búa (Rock)', value: 'ROCK' },
          { name: '✌️ Kéo (Scissors)', value: 'SCISSORS' },
          { name: '🖐️ Bao (Paper)', value: 'PAPER' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount');
    const choice = interaction.options.getString('choice');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const user = db.getUser(userId, guildId);
    const balance = user.xccoin || 0;

    if (balance < amount) {
      return interaction.editReply({
        content: `❌ Số dư XCCoin của bạn không đủ! Bạn hiện có **${balance.toLocaleString()} XCCoin**, cần **${amount.toLocaleString()} XCCoin** để chơi.`
      });
    }

    // Nếu người chơi đã chọn trực tiếp trong lệnh
    if (choice) {
      await executeSoloRps(interaction, choice, amount);
      return;
    }

    // Nếu chưa chọn, gửi giao diện 3 nút để người chơi bấm
    const payload = createSoloRpsPromptPayload(userId, amount);
    await interaction.editReply(payload);
  }
};
