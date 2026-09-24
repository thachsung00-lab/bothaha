const fs = require('fs');
const path = require('path');

const dbFilePath = path.join(__dirname, '..', '..', 'database.json');

// Memory cache of users, guild settings & games
let store = {
  users: {}, // Key: `${guildId}_${userId}`
  guildSettings: {}, // Key: `${guildId}`
  gameHistory: [] // Mảng lưu lịch sử đấu các trò chơi
};

// Load existing data if file exists
function loadDatabase() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, 'utf8');
      store = JSON.parse(raw);
      if (!store.users) store.users = {};
      if (!store.guildSettings) store.guildSettings = {};
      if (!store.gameHistory) store.gameHistory = [];
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
 * Lấy tên hiển thị theo mã trò chơi
 */
function getGameDisplayName(gameCode) {
  switch (gameCode) {
    case 'baicao_solo': return '🃏 Bài Cào (Solo)';
    case 'baicao_pvp': return '👥 Bài Cào (PvP)';
    case 'slot': return '🎰 Máy Quay Slot';
    case 'rps_solo': return '✊ Oẳn Tù Tì (Solo)';
    case 'rps_pvp': return '⚔️ Oẳn Tù Tì (PvP)';
    default: return '🎲 Trò Chơi';
  }
}

/**
 * Thêm một bản ghi lịch sử đấu trò chơi
 * @param {Object} record
 * @param {string} record.userId - ID người chơi
 * @param {string} record.guildId - ID Guild
 * @param {string} record.game - Mã trò chơi: 'baicao_solo' | 'baicao_pvp' | 'slot' | 'rps_solo' | 'rps_pvp'
 * @param {string} [record.gameName] - Tên hiển thị trò chơi
 * @param {number} record.betAmount - Số tiền cược
 * @param {'WIN' | 'LOSE' | 'TIE' | 'JACKPOT'} record.result - Kết quả
 * @param {number} record.profit - Số tiền lãi/lỗ ròng (+/- XCCoin)
 * @param {string} record.details - Diễn biến/kết quả chi tiết của ván
 * @param {string} [record.opponent] - Đối thủ (Bot, username người chơi khác, hoặc Server)
 * @param {number} [record.timestamp] - Thời gian diễn ra ván đấu
 */
function addGameHistory(record) {
  if (!store.gameHistory) store.gameHistory = [];

  const historyItem = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: record.userId,
    guildId: record.guildId,
    game: record.game,
    gameName: record.gameName || getGameDisplayName(record.game),
    betAmount: Number(record.betAmount) || 0,
    result: record.result || 'UNKNOWN',
    profit: Number(record.profit) || 0,
    details: record.details || '',
    opponent: record.opponent || 'Bot 🤖',
    timestamp: record.timestamp || Date.now()
  };

  store.gameHistory.unshift(historyItem);

  // Giữ tối đa 5000 bản ghi để tối ưu dung lượng và tốc độ
  if (store.gameHistory.length > 5000) {
    store.gameHistory = store.gameHistory.slice(0, 5000);
  }

  saveDatabase();
  return historyItem;
}

/**
 * Lấy lịch sử đấu của một thành viên (có phân trang & lọc loại game)
 */
function getUserGameHistory(userId, guildId, { limit = 10, page = 1, game = null } = {}) {
  if (!store.gameHistory) store.gameHistory = [];
  let list = store.gameHistory.filter(h => h.userId === userId && (!guildId || h.guildId === guildId));

  if (game && game !== 'ALL') {
    list = list.filter(h =>
      h.game === game ||
      (game === 'BAICAO' && h.game.startsWith('baicao')) ||
      (game === 'RPS' && h.game.startsWith('rps')) ||
      (game === 'SLOT' && h.game === 'slot')
    );
  }

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * limit;
  const items = list.slice(startIndex, startIndex + limit);

  return {
    total,
    totalPages,
    page: currentPage,
    items
  };
}

/**
 * Lấy thống kê tổng quan các ván đấu của thành viên
 */
function getUserGameStats(userId, guildId) {
  if (!store.gameHistory) store.gameHistory = [];
  const list = store.gameHistory.filter(h => h.userId === userId && (!guildId || h.guildId === guildId));

  const stats = {
    totalGames: list.length,
    wins: 0,
    losses: 0,
    ties: 0,
    totalWagered: 0,
    totalProfit: 0,
    winRate: 0,
    byGame: {}
  };

  for (const item of list) {
    stats.totalWagered += (item.betAmount || 0);
    stats.totalProfit += (item.profit || 0);

    if (item.result === 'WIN' || item.result === 'JACKPOT') {
      stats.wins++;
    } else if (item.result === 'LOSE') {
      stats.losses++;
    } else {
      stats.ties++;
    }

    const g = item.game || 'other';
    if (!stats.byGame[g]) {
      stats.byGame[g] = {
        name: item.gameName || getGameDisplayName(g),
        count: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        profit: 0
      };
    }
    stats.byGame[g].count++;
    stats.byGame[g].profit += (item.profit || 0);
    if (item.result === 'WIN' || item.result === 'JACKPOT') stats.byGame[g].wins++;
    else if (item.result === 'LOSE') stats.byGame[g].losses++;
    else stats.byGame[g].ties++;
  }

  if (stats.totalGames > 0) {
    stats.winRate = Math.round((stats.wins / stats.totalGames) * 100);
  }

  return stats;
}

/**
 * Lấy lịch sử đấu gần nhất toàn server
 */
function getGuildRecentGames(guildId, { limit = 10, game = null } = {}) {
  if (!store.gameHistory) store.gameHistory = [];
  let list = store.gameHistory.filter(h => h.guildId === guildId);
  if (game && game !== 'ALL') {
    list = list.filter(h =>
      h.game === game ||
      (game === 'BAICAO' && h.game.startsWith('baicao')) ||
      (game === 'RPS' && h.game.startsWith('rps')) ||
      (game === 'SLOT' && h.game === 'slot')
    );
  }
  return list.slice(0, limit);
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
  addGameHistory,
  getGameDisplayName,
  getUserGameHistory,
  getUserGameStats,
  getGuildRecentGames
};
