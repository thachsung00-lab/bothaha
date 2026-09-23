const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/db');
const { createFeaturePanel } = require('../utils/panelBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('⚙️ (Admin) Chọn kênh để ghim bảng tính năng luôn hiển thị cuối mỗi tin nhắn')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Kênh text bạn muốn ghim bảng tính năng tự động (để trống nếu chọn kênh hiện tại)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const guildId = interaction.guildId;

    // Kiểm tra quyền gửi tin nhắn trong kênh mục tiêu
    if (!channel.permissionsFor(interaction.client.user)?.has(['SendMessages', 'EmbedLinks', 'ManageMessages'])) {
      return interaction.editReply({
        content: `⚠️ Bot cần quyền **Gửi tin nhắn (Send Messages)**, **Nhúng liên kết (Embed Links)** và **Quản lý tin nhắn (Manage Messages)** trong kênh ${channel} để duy trì bảng hiển thị ở cuối!`
      });
    }

    const currentSettings = db.getGuildSettings(guildId);

    // Xóa bảng cũ ở kênh trước (nếu có)
    if (currentSettings.stickyChannelId && currentSettings.stickyMessageId) {
      try {
        const oldChannel = interaction.guild.channels.cache.get(currentSettings.stickyChannelId);
        if (oldChannel) {
          const oldMsg = await oldChannel.messages.fetch(currentSettings.stickyMessageId).catch(() => null);
          if (oldMsg) await oldMsg.delete().catch(() => {});
        }
      } catch (e) {
        // Bỏ qua nếu tin nhắn cũ không còn
      }
    }

    // Gửi bảng tính năng mới vào kênh chỉ định
    const panelPayload = createFeaturePanel();
    const sentMessage = await channel.send(panelPayload);

    // Lưu cấu hình vào database
    db.setGuildSettings(guildId, {
      stickyChannelId: channel.id,
      stickyMessageId: sentMessage.id
    });

    return interaction.editReply({
      content: `✅ **Thiết lập thành công!** Bảng tính năng nhanh đã được gửi vào kênh ${channel}.\nBảng này sẽ **luôn luôn tự động hiển thị ở cuối** sau mỗi tin nhắn mới của thành viên!`
    });
  }
};
