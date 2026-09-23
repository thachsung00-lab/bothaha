const fs = require('fs');
const path = require('path');

const dbFilePath = path.join(__dirname, '..', '..', 'database.json');

// Memory cache of users, guild settings & games
let store = {
  users: {}, // Key: `${guildId}_${userId}`
  guildSettings: {}, // Key: `${guildId}`
  lotteryBets: [], // Mảng lưu các vé cược XSMN
  lotteryResults: {} // Lưu kết quả XSMN theo ngày
};

// Load existing data if file exists
function loadDatabase() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, 'utf8');
      store = JSON.parse(raw);
      if (!store.users) store.users = {};
      if (!store.guildSettings) store.guildSettings = {};
      if (!store.lotteryBets) store.lotteryBets = [];
      if (!store.lotteryResults) store.lotteryResults = {};
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.error('[DB] Lỗi khi tải database:', err);
  }
}

// Save database to disk
function saveDatabase() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Lỗi khi lưu database:', err);
  }
}

// Khởi tạo
loadDatabase();

function getUserKey(userId, guildId) {
  return `${guildId}_${userId}`;
}

/**
 * Lấy thông tin người dùng (hoặc tạo mới nếu chưa tồn tại)
 */
function getUser(userId, guildId) {
  const key = getUserKey(userId, guildId);
  const now = Date.now();
  if (!store.users[key]) {
    store.users[key] = {
      userId,
      guildId,
      xp: 0,
      level: 0,
      voiceMinutes: 0,
      xccoin: 0,
      lastDaily: null,
      dailyStreak: 0,
      totalDaily: 0,
      lastVoiceActive: now,
      penalizedDays: 0
    };
    saveDatabase();
  } else {
    let modified = false;
    if (store.users[key].xccoin === undefined) {
      store.users[key].xccoin = 0;
      modified = true;
    }
    if (store.users[key].lastVoiceActive === undefined) {
      store.users[key].lastVoiceActive = now;
      modified = true;
    }
    if (store.users[key].penalizedDays === undefined) {
      store.users[key].penalizedDays = 0;
      modified = true;
    }
    if (modified) saveDatabase();
  }
  return { ...store.users[key] };
}

/**
 * Cập nhật thông tin người dùng
 */
function updateUser(userId, guildId, updates) {
  const key = getUserKey(userId, guildId);
  const current = getUser(userId, guildId);
  store.users[key] = {
    ...current,
    ...updates
  };
  saveDatabase();
  return { ...store.users[key] };
}

/**
 * Cộng XP, XCCoin và thời gian Voice
 */
function addVoiceActivity(userId, guildId, minutes, xp, coins = 0) {
  const user = getUser(userId, guildId);
  const updatedXp = (user.xp || 0) + xp;
  const updatedMinutes = (user.voiceMinutes || 0) + minutes;
  const updatedCoins = (user.xccoin || 0) + coins;
  
  return updateUser(userId, guildId, {
    xp: updatedXp,
    voiceMinutes: updatedMinutes,
    xccoin: updatedCoins
  });
}

/**
 * Thêm hoặc trừ XCCoin
 */
function addXCCoin(userId, guildId, amount) {
  const user = getUser(userId, guildId);
  const updatedCoins = Math.max(0, (user.xccoin || 0) + amount);
  return updateUser(userId, guildId, { xccoin: updatedCoins });
}

/**
 * Thêm XP cho người dùng
 */
function addXp(userId, guildId, amount) {
  const user = getUser(userId, guildId);
  const updatedXp = Math.max(0, (user.xp || 0) + amount);
  return updateUser(userId, guildId, { xp: updatedXp });
}

/**
 * Chuyển tiền XCCoin giữa 2 thành viên trong server
 */
function transferXCCoin(fromUserId, toUserId, guildId, amount) {
  if (amount <= 0) return { success: false, reason: 'Số tiền phải lớn hơn 0!' };
  const sender = getUser(fromUserId, guildId);
  if ((sender.xccoin || 0) < amount) {
    return { success: false, reason: 'Số dư XCCoin của bạn không đủ để thực hiện giao dịch!' };
  }

  addXCCoin(fromUserId, guildId, -amount);
  addXCCoin(toUserId, guildId, amount);

  return { success: true };
}

/**
 * Lưu điểm danh kèm XP và XCCoin
 */
function recordDaily(userId, guildId, xpBonus, newStreak, coinBonus = 0) {
  const user = getUser(userId, guildId);
  return updateUser(userId, guildId, {
    xp: (user.xp || 0) + xpBonus,
    xccoin: (user.xccoin || 0) + coinBonus,
    lastDaily: new Date().toISOString(),
    dailyStreak: newStreak,
    totalDaily: (user.totalDaily || 0) + 1
  });
}

/**
 * Lấy bảng xếp hạng theo Guild
 * @param {string} guildId
 * @param {'xp' | 'voiceMinutes'} sortBy
 * @param {number} limit
 */
function getLeaderboard(guildId, sortBy = 'xp', limit = 10) {
  const guildUsers = Object.values(store.users).filter(u => u.guildId === guildId);
  
  guildUsers.sort((a, b) => {
    return (b[sortBy] || 0) - (a[sortBy] || 0);
  });

  return guildUsers.slice(0, limit);
}

/**
 * Lấy vị trí xếp hạng của một người dùng trong Guild
 */
function getUserRank(userId, guildId) {
  const guildUsers = Object.values(store.users).filter(u => u.guildId === guildId);
  guildUsers.sort((a, b) => (b.xp || 0) - (a.xp || 0));
  
  const rankIndex = guildUsers.findIndex(u => u.userId === userId);
  return rankIndex !== -1 ? rankIndex + 1 : guildUsers.length + 1;
}

/**
 * Lấy cài đặt cấu hình cho Guild
 */
function getGuildSettings(guildId) {
  if (!store.guildSettings) store.guildSettings = {};
  if (!store.guildSettings[guildId]) {
    store.guildSettings[guildId] = {
      leaderboardChannelId: null,
      lastAutoLeaderboard: null,
      stickyChannelId: null,
      stickyMessageId: null,
      gameChannelId: null,
      gameMessageId: null
    };
    saveDatabase();
  }
  return { ...store.guildSettings[guildId] };
}

/**
 * Cập nhật cài đặt cấu hình cho Guild
 */
function setGuildSettings(guildId, updates) {
  if (!store.guildSettings) store.guildSettings = {};
  const current = getGuildSettings(guildId);
  store.guildSettings[guildId] = {
    ...current,
    ...updates
  };
  saveDatabase();
  return { ...store.guildSettings[guildId] };
}

/**
 * Lấy danh sách tất cả người dùng trong database
 */
function getAllUsers() {
  return Object.values(store.users);
}

/**
 * Lấy chuỗi ngày hôm nay theo múi giờ Việt Nam (YYYY-MM-DD)
 */
function getTodayVNDateString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/**
 * Đặt cược dự đoán XSMN (Giải 8)
 * @param {string} userId
 * @param {string} guildId
 * @param {string} number - 2 chữ số (00 - 99)
 * @param {number} amount - Số XCCoin cược
 */
function placeLotteryBet(userId, guildId, number, amount) {
  const user = getUser(userId, guildId);
  if ((user.xccoin || 0) < amount) {
    return { success: false, reason: 'Số dư XCCoin của bạn không đủ để đặt cược!' };
  }

  // Trừ tiền cược
  addXCCoin(userId, guildId, -amount);

  const formattedNum = String(number).trim().padStart(2, '0');
  const today = getTodayVNDateString();

  const newBet = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    guildId,
    number: formattedNum,
    amount,
    date: today,
    settled: false,
    won: false,
    payout: 0,
    createdAt: Date.now()
  };

  store.lotteryBets.push(newBet);
  saveDatabase();

  return { success: true, bet: newBet };
}

/**
 * Lấy các vé cược của một thành viên trong ngày
 */
function getUserLotteryBets(userId, guildId, date = getTodayVNDateString()) {
  return store.lotteryBets.filter(b => b.userId === userId && b.guildId === guildId && b.date === date);
}

/**
 * Lấy tất cả vé cược chưa trả thưởng của ngày
 */
function getUnsettledLotteryBets(date = getTodayVNDateString()) {
  return store.lotteryBets.filter(b => b.date === date && !b.settled);
}

/**
 * Trả thưởng kết quả XSMN cho ngày cụ thể
 * @param {string} date
 * @param {Array<{ stationName: string, g8: string }>} stationsWithG8
 */
function settleLotteryBets(date, stationsWithG8) {
  const winningNumbers = stationsWithG8.map(s => String(s.g8).trim().padStart(2, '0'));
  store.lotteryResults[date] = stationsWithG8;

  const winners = [];
  const losers = [];

  for (const bet of store.lotteryBets) {
    if (bet.date === date && !bet.settled) {
      if (winningNumbers.includes(bet.number)) {
        bet.won = true;
        bet.payout = bet.amount * 10; // Trả thưởng gấp 10 lần
        addXCCoin(bet.userId, bet.guildId, bet.payout);
        winners.push({ ...bet });
      } else {
        bet.won = false;
        bet.payout = 0;
        losers.push({ ...bet });
      }
      bet.settled = true;
    }
  }

  saveDatabase();
  return { date, stationsWithG8, winningNumbers, winners, losers };
}

/**
 * Lấy kết quả XSMN đã lưu theo ngày
 */
function getLotteryResults(date = getTodayVNDateString()) {
  return store.lotteryResults[date] || null;
}

module.exports = {
  getUser,
  updateUser,
  getAllUsers,
  addVoiceActivity,
  addXCCoin,
  addXp,
  transferXCCoin,
  recordDaily,
  getLeaderboard,
  getUserRank,
  getGuildSettings,
  setGuildSettings,
  getTodayVNDateString,
  placeLotteryBet,
  getUserLotteryBets,
  getUnsettledLotteryBets,
  settleLotteryBets,
  getLotteryResults
};
