const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const levelHandler = require('../handlers/levelHandler');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('📊 Xem cấp độ, XP và thời gian online Voice của bạn hoặc thành viên khác')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Thành viên bạn muốn xem rank (để trống nếu muốn xem chính mình)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    if (targetUser.bot) {
      return interaction.editReply({ content: '🤖 Bot không tham gia hệ thống cấp bậc!' });
    }

    const userData = db.getUser(targetUser.id, guildId);
    const levelInfo = levelHandler.getLevelInfo(userData.xp || 0);
    const rank = db.getUserRank(targetUser.id, guildId);
    const progressBar = levelHandler.createProgressBar(levelInfo.currentProgressXp, levelInfo.neededXp, 10);
    const voiceTimeStr = levelHandler.formatVoiceTime(userData.voiceMinutes || 0);

    const progressTitle = levelInfo.isMaxLevel
      ? '🌟 Tiến trình tu vi'
      : `📈 Tiến trình lên Cấp ${levelInfo.level + 1} (${levelHandler.CULTIVATION_LEVELS[levelInfo.level + 1]?.title || ''})`;
    const progressDesc = levelInfo.isMaxLevel
      ? `${progressBar}\n*(Đã đạt cảnh giới tối cao: **Vượt Qua Tam Giới**)*`
      : `${progressBar}\n*(**${levelInfo.currentProgressXp.toLocaleString()}** / **${levelInfo.neededXp.toLocaleString()}** XP để đột phá)*`;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: `Hồ sơ Cấp Bậc | ${targetUser.username}`, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '🔮 Cảnh Giới Tu Tiên', value: `**[ ${levelInfo.realm} ]**\n➡️ Cấp **${levelInfo.level}**: **${levelInfo.title}**`, inline: false },
        { name: '🏆 Thứ hạng Server', value: `Top **#${rank}**`, inline: true },
        { name: '🎖️ Cấp độ (Level)', value: `Level **${levelInfo.level}**`, inline: true },
        { name: '⭐ Tổng XP', value: `**${(userData.xp || 0).toLocaleString()}** XP`, inline: true },
        {
          name: progressTitle,
          value: progressDesc,
          inline: false
        },
        { name: '🎙️ Thời gian Voice', value: `⏱️ **${voiceTimeStr}**`, inline: true },
        { name: '🪙 Ví XCCoin', value: `**${(userData.xccoin || 0).toLocaleString()}** XCCoin`, inline: true },
        { name: '🔥 Chuỗi Điểm Danh', value: `**${userData.dailyStreak || 0}** ngày`, inline: true },
        { name: '📅 Tổng số lần điểm danh', value: `**${userData.totalDaily || 0}** lần`, inline: true }
      )
      .setFooter({ text: 'Cứ mỗi 1 giờ online phòng voice bạn sẽ nhận được 1,000 XCCoin!' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
