const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/db');
const { createCoinPayPanel } = require('../utils/coinPayPanelBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setcoinpay')
    .setDescription('🪙 (Admin) Thiết lập Bảng Chuyển Tiền XCCoin (Coin Pay) cố định tại kênh chỉ định')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Kênh text chỉ định để đặt Bảng Coin Pay (để trống nếu muốn chọn kênh hiện tại)')
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

    // Xóa tất cả các bảng coin pay cũ hoặc trùng lặp trong kênh mục tiêu
    try {
      const recentMessages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
      if (recentMessages) {
        for (const [, msg] of recentMessages) {
          if (msg.author.id === interaction.client.user.id && msg.embeds.some(e => e.title && e.title.includes('CỔNG CHUYỂN TIỀN XCCOIN'))) {
            await msg.delete().catch(() => {});
          }
        }
      }
      if (currentSettings && currentSettings.coinPayChannelId && currentSettings.coinPayMessageId && currentSettings.coinPayChannelId !== channel.id) {
        const oldChannel = interaction.guild.channels.cache.get(currentSettings.coinPayChannelId);
        if (oldChannel) {
          const oldMsg = await oldChannel.messages.fetch(currentSettings.coinPayMessageId).catch(() => null);
          if (oldMsg) await oldMsg.delete().catch(() => {});
        }
      }
    } catch (e) {}

    // Gửi Bảng Coin Pay mới
    const panelPayload = createCoinPayPanel();
    const sentMessage = await channel.send(panelPayload);

    // Lưu vào database
    db.setGuildSettings(guildId, {
      coinPayChannelId: channel.id,
      coinPayMessageId: sentMessage.id
    });

    return interaction.editReply({
      content: `✅ **Thiết lập thành công!** Đã gửi Bảng Chuyển Tiền XCCoin (Coin Pay) vào kênh ${channel}.\nThành viên có thể bấm nút **[ 💸 Chuyển XCCoin ]** để chuyển tiền cho nhau bất cứ lúc nào mà không cần dùng lệnh!`
    });
  }
};
