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

    // Xóa tất cả các bảng tiện ích cũ hoặc trùng lặp trong kênh mục tiêu
    try {
      const recentMessages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
      if (recentMessages) {
        for (const [, msg] of recentMessages) {
          if (msg.author.id === interaction.client.user.id && msg.embeds.some(e => e.title && e.title.includes('BẢNG ĐIỀU KHIỂN & ĐIỂM DANH'))) {
            await msg.delete().catch(() => {});
          }
        }
      }
      if (currentSettings && currentSettings.stickyChannelId && currentSettings.stickyMessageId && currentSettings.stickyChannelId !== channel.id) {
        const oldChannel = interaction.guild.channels.cache.get(currentSettings.stickyChannelId);
        if (oldChannel) {
          const oldMsg = await oldChannel.messages.fetch(currentSettings.stickyMessageId).catch(() => null);
          if (oldMsg) await oldMsg.delete().catch(() => {});
        }
      }
    } catch (e) {
      // Bỏ qua lỗi dọn dẹp
    }

    // Gửi bảng tính năng mới vào kênh chỉ định
    const panelPayload = createFeaturePanel();
    const sentMessage = await channel.send(panelPayload);

    // Lưu cấu hình vào database
    db.setGuildSettings(guildId, {
      stickyChannelId: channel.id,
      stickyMessageId: sentMessage.id,
      checkinChannelId: channel.id,
      panelMessageId: sentMessage.id
    });

    return interaction.editReply({
      content: `✅ **Thiết lập thành công!** Bảng Điều Khiển & Điểm Danh đã được ghim cố định tại kênh ${channel}.\nBảng sẽ **cố định và không bị ẩn hiện làm mới liên tục**. Mọi tin nhắn chat của thành viên trong kênh này sẽ được tự động xóa để giữ kênh luôn sạch đẹp!`
    });
  }
};
