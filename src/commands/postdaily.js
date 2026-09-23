const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const dailyCommand = require('./daily');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('postdaily')
    .setDescription('📌 (Admin) Gửi khung Điểm Danh cố định kèm Nút Bấm vào kênh hiện tại')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const card = dailyCommand.createCheckinCard();
    await interaction.channel.send(card);
    return interaction.editReply({
      content: '✅ Đã gửi khung Điểm Danh thành công vào kênh này! Thành viên có thể click nút để nhận thưởng mỗi ngày.'
    });
  }
};
