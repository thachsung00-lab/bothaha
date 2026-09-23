const { Events } = require('discord.js');
const { setupGuildChannels } = require('../handlers/channelSetupHandler');
const { deployGuildCommands } = require('../deploy-commands');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    console.log(`[GuildCreate] Bot đã tham gia server mới: ${guild.name} (ID: ${guild.id})`);
    try {
      // 1. Đăng ký Slash Commands trực tiếp vào Guild để thành viên dùng được ngay lập tức (0s delay)
      await deployGuildCommands(guild.id, guild.client.user.id).catch(() => {});

      // 2. Tự động khởi tạo danh mục và 4 kênh chuẩn quyền
      const result = await setupGuildChannels(guild);
      if (result && result.success) {
        console.log(`[GuildCreate] ✅ Đã hoàn tất khởi tạo danh mục và kênh tự động cho server ${guild.name}`);
      } else {
        console.warn(`[GuildCreate] ⚠️ Khởi tạo kênh cho server ${guild.name} không thành công: ${result?.reason || 'Không rõ lý do'}`);
      }
    } catch (error) {
      console.error(`[GuildCreate] ❌ Lỗi xử lý setupGuildChannels cho server ${guild.name}:`, error);
    }
  }
};
