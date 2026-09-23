const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const config = require('../config.json');

// Danh sách các đài mở thưởng XSMN theo từng thứ trong tuần (0: Chủ Nhật, 1: Thứ 2, ...)
const SOUTHERN_STATIONS = {
  0: ['Tiền Giang', 'Kiên Giang', 'Đà Lạt (Lâm Đồng)'],
  1: ['TP. Hồ Chí Minh', 'Đồng Tháp', 'Cà Mau'],
  2: ['Bến Tre', 'Vũng Tàu', 'Bạc Liêu'],
  3: ['Đồng Nai', 'Cần Thơ', 'Sóc Trăng'],
  4: ['Tây Ninh', 'An Giang', 'Bình Thuận'],
  5: ['Vĩnh Long', 'Bình Dương', 'Trà Vinh'],
  6: ['TP. Hồ Chí Minh', 'Long An', 'Bình Phước', 'Hậu Giang']
};

/**
 * Lấy danh sách đài mở thưởng hôm nay theo múi giờ Việt Nam
 */
function getTodayStations() {
  const vnDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const dayOfWeek = vnDate.getDay();
  return SOUTHERN_STATIONS[dayOfWeek] || SOUTHERN_STATIONS[1];
}

/**
 * Tạo kết quả quay thưởng Giải 8 ngẫu nhiên cho các đài hôm nay
 */
function drawLotteryResults() {
  const stations = getTodayStations();
  return stations.map(stationName => {
    const randomG8 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    return {
      stationName,
      g8: randomG8
    };
  });
}

/**
 * Tiến hành quay thưởng, trả tiền và gửi thông báo kết quả vào kênh game
 */
async function processDailyLotteryDraw(client) {
  const today = db.getTodayVNDateString();
  const existingResults = db.getLotteryResults(today);

  // Nếu hôm nay đã mở thưởng rồi thì không mở lại
  if (existingResults) {
    console.log(`[Lottery] Ngày ${today} đã mở thưởng trước đó.`);
    return;
  }

  console.log(`[Lottery] Bắt đầu quay thưởng Giải 8 XSMN ngày ${today}...`);
  const stationsWithG8 = drawLotteryResults();
  const settlement = db.settleLotteryBets(today, stationsWithG8);

  console.log(`[Lottery] Kết quả Giải 8:`, stationsWithG8.map(s => `${s.stationName}: ${s.g8}`).join(' | '));
  console.log(`[Lottery] Số người trúng thưởng: ${settlement.winners.length}, Số người trượt: ${settlement.losers.length}`);

  // Gửi thông báo đến kênh game của tất cả các server đã cấu hình
  for (const [guildId, guild] of client.guilds.cache.entries()) {
    try {
      const settings = db.getGuildSettings(guildId);
      if (!settings || !settings.gameChannelId) continue;

      const channel = guild.channels.cache.get(settings.gameChannelId);
      if (!channel || !channel.isTextBased()) continue;

      const embed = createLotteryResultEmbed(guild, settlement);
      await channel.send({ embeds: [embed] });
      console.log(`[Lottery] Đã gửi thông báo kết quả XSMN vào kênh #${channel.name} (${guild.name})`);
    } catch (err) {
      console.error(`[Lottery] Lỗi gửi thông báo cho guild ${guildId}:`, err);
    }
  }

  return settlement;
}

/**
 * Tạo Embed Thông Báo Kết Quả Giải 8 XSMN
 */
function createLotteryResultEmbed(guild, settlement) {
  const { date, stationsWithG8, winningNumbers, winners } = settlement;

  let stationListText = '';
  for (const s of stationsWithG8) {
    stationListText += `🏛️ **${s.stationName}**: Giải 8 ➡️ 🎯 **[ ${s.g8} ]**\n`;
  }

  let winnerText = '';
  if (winners.length === 0) {
    winnerText = '*Hôm nay chưa có ai dự đoán chính xác Giải 8.*';
  } else {
    for (const w of winners) {
      winnerText += `🎉 <@${w.userId}>: Đoán số **${w.number}** ➡️ Cược **${w.amount.toLocaleString()}** nhận **+${w.payout.toLocaleString()} XCCoin** (x10)!\n`;
    }
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(`🎰 KẾT QUẢ XỔ SỐ MIỀN NAM (XSMN) - ${date}`)
    .setDescription(
      `🔔 **Đã đến giờ mở thưởng!** Dưới đây là kết quả Giải 8 của các đài Miền Nam hôm nay:\n\n` +
      `${stationListText}\n` +
      `🔥 **Các số may mắn trúng thưởng (x10 XCCoin):** ` +
      winningNumbers.map(n => `**[ ${n} ]**`).join(' , ')
    )
    .addFields(
      { name: '🏆 DANH SÁCH THÀNH VIÊN TRÚNG THƯỞNG X10', value: winnerText, inline: false }
    )
    .setFooter({ text: 'Tiền thưởng x10 đã được tự động cộng thẳng vào ví XCCoin của người thắng!' })
    .setTimestamp();

  return embed;
}

/**
 * Bộ đếm hẹn giờ tự động mở thưởng lúc 16h35 mỗi ngày (giờ Việt Nam)
 */
function startLotteryScheduler(client) {
  // Kiểm tra mỗi 1 phút
  setInterval(async () => {
    try {
      const nowVn = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
      const hours = nowVn.getHours();
      const minutes = nowVn.getMinutes();

      // Giờ mở thưởng XSMN là sau 16:30 (chạy lúc 16:35)
      if (hours === 16 && minutes === 35) {
        await processDailyLotteryDraw(client);
      }
    } catch (err) {
      console.error('[LotteryScheduler] Lỗi vòng lặp mở thưởng:', err);
    }
  }, 60000);

  console.log('[LotteryScheduler] Hệ thống tự động mở thưởng XSMN lúc 16h35 mỗi ngày đã kích hoạt.');
}

module.exports = {
  getTodayStations,
  drawLotteryResults,
  processDailyLotteryDraw,
  createLotteryResultEmbed,
  startLotteryScheduler
};
