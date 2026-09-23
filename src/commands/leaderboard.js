const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const levelHandler = require('../handlers/levelHandler');
const config = require('../config.json');

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('🏆 Xem Bảng Xếp Hạng thành viên nổi bật nhất Server')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Loại bảng xếp hạng cần xem')
        .setRequired(false)
        .addChoices(
          { name: '⭐ Tổng Điểm Kinh Nghiệm (XP)', value: 'xp' },
          { name: '🎙️ Thời Gian Ngồi Voice', value: 'voiceMinutes' },
          { name: '🪙 Đại Gia XCCoin', value: 'xccoin' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const category = interaction.options.getString('category') || 'xp';
    const guildId = interaction.guildId;
    const topUsers = db.getLeaderboard(guildId, category, 10);

    if (!topUsers.length) {
      return interaction.editReply({
        content: 'Chưa có dữ liệu xếp hạng nào trong server. Hãy tham gia voice hoặc điểm danh để bắt đầu!'
      });
    }

    let title = '⭐ BẢNG XẾP HẠNG CẤP ĐỘ & KINH NGHIỆM (XP)';
    if (category === 'voiceMinutes') {
      title = '🎙️ BẢNG XẾP HẠNG THỜI GIAN ONLINE VOICE';
    } else if (category === 'xccoin') {
      title = '🪙 BẢNG XẾP HẠNG ĐẠI GIA XCCOIN';
    }

    let description = '';
    for (let i = 0; i < topUsers.length; i++) {
      const u = topUsers[i];
      const medal = MEDALS[i] || `**#${i + 1}**`;
      const levelInfo = levelHandler.getLevelInfo(u.xp || 0);
      const voiceTime = levelHandler.formatVoiceTime(u.voiceMinutes || 0);
      const coins = (u.xccoin || 0).toLocaleString();

      const realmTag = levelInfo.level > 0 ? `[${levelInfo.realm}] ` : '';
      description += `${medal} <@${u.userId}>\n`;
      if (category === 'voiceMinutes') {
        description += `   ⏱️ **${voiceTime}** • 🔮 **${realmTag}Cấp ${levelInfo.level}: ${levelInfo.title}** • 🪙 ${coins} XCCoin\n\n`;
      } else if (category === 'xccoin') {
        description += `   💰 **${coins} XCCoin** • 🔮 **${realmTag}Cấp ${levelInfo.level}: ${levelInfo.title}** • ⏱️ ${voiceTime}\n\n`;
      } else {
        description += `   ⭐ **${(u.xp || 0).toLocaleString()} XP** • 🔮 **${realmTag}Cấp ${levelInfo.level}: ${levelInfo.title}** • 🪙 ${coins} XCCoin\n\n`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: `Yêu cầu bởi ${interaction.user.username} | Cập nhật theo thời gian thực` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
