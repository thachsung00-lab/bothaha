const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bill')
    .setDescription('🧾 (Admin) Chọn kênh nhận lịch sử giao dịch và biên lai chuyển tiền XCCoin')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Kênh text nhận lịch sử giao dịch (để trống nếu muốn chọn kênh hiện tại)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const guildId = interaction.guildId;

    if (!channel.permissionsFor(interaction.client.user)?.has(['SendMessages', 'EmbedLinks'])) {
      return interaction.editReply({
        content: `⚠️ Bot cần quyền **Gửi tin nhắn** và **Nhúng liên kết** trong kênh ${channel}!`
      });
    }

    // Lưu vào guildSettings
    db.setGuildSettings(guildId, {
      billChannelId: channel.id
    });

    return interaction.editReply({
      content: `✅ **Thiết lập thành công!** Đã cài đặt kênh ${channel} làm nơi nhận **lịch sử giao dịch và biên lai chuyển tiền XCCoin**.\nTừ bây giờ, mọi thông báo giao dịch chuyển tiền trên server sẽ tự động được đưa về kênh này!`
    });
  }
};
