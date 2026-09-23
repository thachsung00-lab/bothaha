const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const levelHandler = require('../handlers/levelHandler');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('📅 Điểm danh hàng ngày nhận XP và tích lũy chuỗi Streak!'),

  /**
   * Xử lý thực hiện điểm danh
   */
  async execute(interaction) {
    // ACK tương tác ngay lập tức trong 3 giây đầu tiên để tránh lỗi 10062
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const user = db.getUser(userId, guildId);

    const now = Date.now();
    const cooldownMs = config.daily.cooldownHours * 60 * 60 * 1000;
    const lastDailyTime = user.lastDaily ? new Date(user.lastDaily).getTime() : 0;
    const timeDiff = now - lastDailyTime;

    // Kiểm tra Cooldown
    if (lastDailyTime && timeDiff < cooldownMs) {
      const remainingMs = cooldownMs - timeDiff;
      const hoursLeft = Math.floor(remainingMs / (1000 * 60 * 60));
      const minsLeft = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

      const embedWait = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('⏳ Bạn đã điểm danh hôm nay rồi!')
        .setDescription(`Vui lòng quay lại sau **${hoursLeft} giờ ${minsLeft} phút** để điểm danh tiếp nhé!`)
        .addFields(
          { name: '🔥 Chuỗi hiện tại (Streak)', value: `${user.dailyStreak || 0} ngày liên tiếp`, inline: true },
          { name: '⭐ Tổng XP hiện có', value: `${user.xp || 0} XP`, inline: true }
        )
        .setFooter({ text: 'Giữ chuỗi liên tục để nhận thêm bonus XP! • Tự động đóng sau 1 phút' });

      await interaction.editReply({ embeds: [embedWait] });
      setTimeout(() => {
        interaction.deleteReply().catch(() => {});
      }, 60000);
      return;
    }

    // Tính toán chuỗi điểm danh
    let newStreak = 1;
    const maxStreakGraceMs = 48 * 60 * 60 * 1000; // Trong vòng 48h để giữ chuỗi
    if (lastDailyTime && timeDiff <= maxStreakGraceMs) {
      newStreak = (user.dailyStreak || 0) + 1;
    }

    const streakBonus = Math.min(newStreak * config.daily.streakBonus, config.daily.maxStreakBonus);
    const totalXpEarned = config.daily.baseXp + streakBonus;

    const streakCoinBonus = Math.min(newStreak * (config.daily.streakCoinBonus || 50), 300);
    const totalCoinsEarned = (config.daily.baseCoin || 200) + streakCoinBonus;

    // Lưu vào database
    const updatedUser = db.recordDaily(userId, guildId, totalXpEarned, newStreak, totalCoinsEarned);
    const levelInfo = levelHandler.getLevelInfo(updatedUser.xp);

    const embedSuccess = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('✅ Điểm Danh Thành Công!')
      .setDescription(`Chúc mừng **${interaction.user.username}** đã hoàn thành điểm danh ngày hôm nay!`)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🎁 Phần thưởng XP', value: `+**${config.daily.baseXp}** XP cơ bản\n+**${streakBonus}** XP (Streak bonus)\n➡️ Tổng: **+${totalXpEarned} XP**`, inline: true },
        { name: '🪙 Thưởng XCCoin', value: `+**${config.daily.baseCoin || 200}** cơ bản\n+**${streakCoinBonus}** (Streak bonus)\n➡️ Tổng: **+${totalCoinsEarned.toLocaleString()} XCCoin**`, inline: true },
        { name: '🔥 Chuỗi điểm danh', value: `**${newStreak}** ngày liên tiếp`, inline: true },
        { name: '🎖️ Cấp độ hiện tại', value: `Level **${levelInfo.level}** (${levelInfo.totalXp} XP)`, inline: true },
        { name: '💰 Số dư ví hiện tại', value: `**${(updatedUser.xccoin || 0).toLocaleString()}** XCCoin`, inline: true }
      )
      .setFooter({ text: 'Điểm danh đều đặn và online voice để nhận XCCoin! • Tự động đóng sau 1 phút' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embedSuccess] });
    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, 60000);
    return;
  },

  /**
   * Tạo tin nhắn điểm danh kèm nút bấm để đặt vào kênh thông báo
   */
  createCheckinCard() {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('📅 ĐIỂM DANH HÀNG NGÀY - NHẬN THƯỞNG XP & XCCOIN')
      .setDescription(
        'Nhấn vào nút **"Điểm Danh Ngay"** bên dưới mỗi ngày để nhận điểm kinh nghiệm (XP), XCCoin và duy trì chuỗi Streak của bạn!\n\n' +
        '⭐ **Phần thưởng mỗi ngày:**\n' +
        `• XP: **+${config.daily.baseXp} XP** (cộng thêm chuỗi tối đa +${config.daily.maxStreakBonus} XP)\n` +
        `• XCCoin: **+${config.daily.baseCoin || 200} XCCoin** (cộng thêm chuỗi tối đa +300 XCCoin)\n` +
        `• Ngồi phòng thoại Voice: **+${config.voice.coinsPerHour || 1000} XCCoin/giờ**`
      )
      .setFooter({ text: 'Hệ thống điểm danh tự động | Reset mỗi 24 giờ' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_daily_checkin')
        .setLabel('Điểm Danh Ngay')
        .setEmoji('📅')
        .setStyle(ButtonStyle.Success)
    );

    return { embeds: [embed], components: [row] };
  }
};
