const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { setupGuildChannels } = require('../handlers/channelSetupHandler');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupchannels')
    .setDescription('🛠️ (Admin) Tự động tạo danh mục GIẢI TRÍ - GAME và 4 kênh chuẩn quyền & bảng điều khiển')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const result = await setupGuildChannels(guild);

    if (!result.success) {
      return interaction.editReply({
        content: `❌ **Không thể hoàn tất thiết lập:** ${result.reason}\n\n*Vui lòng đảm bảo Bot có quyền Quản Lý Kênh (Manage Channels) và quyền cao hơn các role cần phân quyền!*`
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.success || '#00ff7f')
      .setTitle('✅ THIẾT LẬP DANH MỤC & KÊNH THÀNH CÔNG!')
      .setDescription(
        `Đã tự động khởi tạo và phân quyền cho danh mục **🎶 GIẢI TRÍ - GAME**:\n\n` +
        `• 📅 **Kênh Điểm Danh:** ${result.channels.checkin} (Công khai, Bảng Tiện Ích)\n` +
        `• 📊 **Kênh Xếp Hạng:** ${result.channels.rank} (Công khai, Hướng dẫn /rank & /leaderboard)\n` +
        `• 🔒🎰 **Kênh Mini-Game:** ${result.channels.game} (Khóa @everyone, chỉ Member chat, Bảng Game)\n` +
        `• 🔒🪙 **Kênh Chuyển Tiền / Bill:** ${result.channels.trade} (Khóa @everyone, Member chỉ đọc, Bot lưu biên lai)\n\n` +
        `💡 *Kênh biên lai giao dịch XCCoin đã được mặc định trỏ về ${result.channels.trade}. Bạn có thể đổi sang kênh khác bất kỳ lúc nào bằng lệnh </bill:1552148952353214534>.*`
      )
      .setFooter({ text: 'Hệ thống tự động đồng bộ - Chúc server hoạt động sôi nổi!' })
      .setTimestamp();

    return interaction.editReply({
      embeds: [embed]
    });
  }
};
