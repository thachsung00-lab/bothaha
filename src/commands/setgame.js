const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/db');
const { createGamePanel } = require('../utils/gamePanelBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setgame')
    .setDescription('🎰 (Admin) Thiết lập kênh Khu Trò Chơi XCCoin (XSMN & Bài Cào)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Kênh text chỉ định để đặt Bảng Khu Trò Chơi (để trống nếu muốn chọn kênh hiện tại)')
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

    const currentSettings = db.getGuildSettings(guildId);

    // Xóa bảng cũ ở kênh trước nếu có
    if (currentSettings.gameChannelId && currentSettings.gameMessageId) {
      try {
        const oldChannel = interaction.guild.channels.cache.get(currentSettings.gameChannelId);
        if (oldChannel) {
          const oldMsg = await oldChannel.messages.fetch(currentSettings.gameMessageId).catch(() => null);
          if (oldMsg) await oldMsg.delete().catch(() => {});
        }
      } catch (e) {}
    }

    // Gửi Bảng Khu Trò Chơi mới
    const panelPayload = createGamePanel();
    const sentMessage = await channel.send(panelPayload);

    // Lưu vào database
    db.setGuildSettings(guildId, {
      gameChannelId: channel.id,
      gameMessageId: sentMessage.id
    });

    return interaction.editReply({
      content: `✅ **Thiết lập thành công!** Đã gửi Bảng Trò Chơi XCCoin vào kênh ${channel}.\nThành viên có thể tham gia **Dự đoán XSMN (x10)** và **Chơi Bài Cào** ngay tại kênh này!`
    });
  }
};
