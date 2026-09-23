const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/db');
const { sendDailyLeaderboard } = require('../handlers/leaderboardScheduler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setleaderboard')
    .setDescription('⚙️ (Admin) Cài đặt kênh tự động báo cáo bảng xếp hạng mỗi 24 giờ')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Kênh văn bản sẽ nhận bảng xếp hạng tự động')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('send_now')
        .setDescription('Có muốn gửi ngay một bản báo cáo mẫu ngay bây giờ không? (Mặc định: Có)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetChannel = interaction.options.getChannel('channel');
    const sendNow = interaction.options.getBoolean('send_now') ?? true;
    const guildId = interaction.guildId;

    // Lưu vào database
    db.setGuildSettings(guildId, {
      leaderboardChannelId: targetChannel.id
    });

    let extraNote = '';
    if (sendNow) {
      const sent = await sendDailyLeaderboard(interaction.guild, targetChannel);
      extraNote = sent
        ? `\n\n🚀 Đã gửi thử nghiệm ngay 1 bản báo cáo vào kênh ${targetChannel}!`
        : `\n\n⚠️ Đã lưu cài đặt nhưng không thể gửi tin nhắn thử nghiệm (vui lòng kiểm tra quyền gửi tin của bot trong kênh ${targetChannel}).`;
    }

    return interaction.editReply({
      content: `✅ Đã thiết lập thành công! Kênh **${targetChannel.name}** sẽ tự động nhận Báo cáo Bảng Xếp Hạng sau mỗi **24 giờ**.${extraNote}`
    });
  }
};
