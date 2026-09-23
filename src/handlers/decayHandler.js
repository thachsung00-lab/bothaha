const db = require('../database/db');
const levelHandler = require('./levelHandler');
const { activeSessions } = require('./voiceHandler');
const config = require('../config.json');

/**
 * Kiểm tra và áp dụng cơ chế trừ phạt nếu không online voice quá 24h
 * Mỗi ngày vắng (24h offline): Trừ 10% XCCoin và 10% XP cho đến khi về 0 thì ngưng.
 */
function checkInactivityDecay() {
  const now = Date.now();
  const allUsers = db.getAllUsers();
  const penaltyRate = (config.decay?.penaltyPercent || 10) / 100; // 0.10 (10%)

  for (const user of allUsers) {
    try {
      const sessionKey = `${user.guildId}_${user.userId}`;

      // Nếu người dùng đang ngồi trong kênh voice thì bỏ qua và làm mới thời gian
      if (activeSessions.has(sessionKey)) {
        db.updateUser(user.userId, user.guildId, {
          lastVoiceActive: now,
          penalizedDays: 0
        });
        continue;
      }

      const lastActive = user.lastVoiceActive || now;
      const hoursInactive = (now - lastActive) / (1000 * 60 * 60);

      // Nếu không online voice quá 24 giờ
      if (hoursInactive >= 24) {
        const daysInactive = Math.floor(hoursInactive / 24);
        const alreadyPenalizedDays = user.penalizedDays || 0;

        if (daysInactive > alreadyPenalizedDays) {
          const daysToDeduct = daysInactive - alreadyPenalizedDays;

          // Kiểm tra nếu còn XP hoặc Coin để trừ
          if ((user.xp || 0) > 0 || (user.xccoin || 0) > 0) {
            let currentXp = user.xp || 0;
            let currentCoin = user.xccoin || 0;
            const startXp = currentXp;
            const startCoin = currentCoin;

            for (let i = 0; i < daysToDeduct; i++) {
              // Mỗi ngày trừ 10% số dư hiện có
              currentXp = Math.floor(currentXp * (1 - penaltyRate));
              currentCoin = Math.floor(currentCoin * (1 - penaltyRate));
            }

            const lostXp = startXp - currentXp;
            const lostCoin = startCoin - currentCoin;
            const updatedLevel = levelHandler.getLevelInfo(currentXp).level;

            db.updateUser(user.userId, user.guildId, {
              xp: currentXp,
              xccoin: currentCoin,
              level: updatedLevel,
              penalizedDays: daysInactive
            });

            console.log(
              `[InactivityDecay] User ${user.userId} (Guild ${user.guildId}) vắng ${daysInactive} ngày (${Math.floor(hoursInactive)}h). ` +
              `Đã trừ phạt 10%/ngày (-${lostXp} XP, -${lostCoin} XCCoin). Còn lại: ${currentXp} XP, ${currentCoin} XCCoin.`
            );
          } else {
            // Đã về 0, ghi nhận số ngày để không lặp lại
            db.updateUser(user.userId, user.guildId, {
              penalizedDays: daysInactive
            });
          }
        }
      }
    } catch (err) {
      console.error(`[InactivityDecay] Lỗi kiểm tra user ${user.userId}:`, err);
    }
  }
}

/**
 * Khởi động vòng lặp kiểm tra định kỳ mỗi 15 phút
 */
function startDecayTicker() {
  // Chạy ngay 1 lần khi bot khởi động
  checkInactivityDecay();

  // Định kỳ chạy mỗi 15 phút
  setInterval(() => {
    checkInactivityDecay();
  }, 15 * 60 * 1000);

  console.log('[InactivityDecay] Hệ thống trừ phạt không online voice quá 24h đã kích hoạt.');
}

module.exports = {
  checkInactivityDecay,
  startDecayTicker
};
