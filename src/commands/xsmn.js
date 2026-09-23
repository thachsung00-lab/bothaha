const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { getTodayStations } = require('../handlers/lotteryHandler');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xsmn')
    .setDescription('🎰 Đặt cược dự đoán Giải 8 Xổ Số Miền Nam hôm nay (Trúng x10 XCCoin)')
    .addStringOption(opt =>
      opt.setName('number')
        .setDescription('2 chữ số bạn muốn dự đoán (từ 00 đến 99)')
        .setMinLength(1)
        .setMaxLength(2)
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Số lượng XCCoin đặt cược (tối thiểu 100)')
        .setMinValue(100)
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const rawNum = interaction.options.getString('number').trim();
    const amount = interaction.options.getInteger('amount');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    // Kiểm tra định dạng số hợp lệ
    const num = parseInt(rawNum, 10);
    if (isNaN(num) || num < 0 || num > 99) {
      return interaction.editReply({
        content: '❌ Số dự đoán không hợp lệ! Vui lòng chọn số từ **00** đến **99**.'
      });
    }

    const formattedNum = String(num).padStart(2, '0');
    const today = db.getTodayVNDateString();

    // Kiểm tra nếu đã qua giờ mở thưởng 16:30
    const nowVn = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    if (nowVn.getHours() > 16 || (nowVn.getHours() === 16 && nowVn.getMinutes() >= 30)) {
      const existingResults = db.getLotteryResults(today);
      if (existingResults) {
        return interaction.editReply({
          content: '⏳ Đài Miền Nam hôm nay đã mở thưởng rồi! Vui lòng chờ đến ngày mai để tiếp tục tham gia dự đoán nhé.'
        });
      }
    }

    // Đặt cược
    const result = db.placeLotteryBet(userId, guildId, formattedNum, amount);
    if (!result.success) {
      return interaction.editReply({
        content: `❌ ${result.reason}`
      });
    }

    const todayStations = getTodayStations();
    const potentialPayout = amount * 10;
    const updatedUser = db.getUser(userId, guildId);

    const embed = new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle('🎟️ ĐẶT CƯỢC XỔ SỐ MIỀN NAM THÀNH CÔNG!')
      .setDescription(
        `Chúc bạn may mắn! Vé dự đoán Giải 8 của bạn đã được ghi nhận vào hệ thống:\n\n` +
        `🎯 **Số bạn chọn:** ➡️ **[ ${formattedNum} ]**\n` +
        `💰 **Số tiền cược:** **${amount.toLocaleString()}** XCCoin\n` +
        `🎁 **Tiền thưởng nếu trúng (x10):** 🌟 **${potentialPayout.toLocaleString()} XCCoin**\n` +
        `📅 **Ngày mở thưởng:** **${today}** (lúc 16h35 chiều nay)\n` +
        `🏛️ **Các đài áp dụng:** ${todayStations.join(', ')}`
      )
      .addFields(
        { name: '💳 Số dư ví còn lại', value: `**${(updatedUser.xccoin || 0).toLocaleString()}** XCCoin`, inline: true },
        { name: '📜 Thể lệ', value: 'Chỉ cần trùng Giải 8 của **bất kỳ đài nào** trong ngày là trúng x10!', inline: true }
      )
      .setFooter({ text: 'Kết quả sẽ được công bố và trả thưởng tự động lúc 16h35' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
