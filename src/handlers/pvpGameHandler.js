const db = require('../database/db');
const { createShuffledDeck, evaluateHand } = require('../utils/cardGame');

// Lưu trữ các phòng chơi PvP đang hoạt động theo roomId
const activeRooms = new Map();

/**
 * Tạo một phòng chơi Bài Cào PvP mới
 */
function createRoom({ hostId, hostUsername, guildId, channelId, amount, targetUserId = null, maxPlayers = 6 }) {
  const user = db.getUser(hostId, guildId);
  if ((user.xccoin || 0) < amount) {
    return { success: false, reason: `Số dư của bạn không đủ! Bạn có ${(user.xccoin || 0).toLocaleString()} XCCoin, cần ${amount.toLocaleString()} XCCoin.` };
  }

  // Trừ tiền cược của chủ phòng
  db.addXCCoin(hostId, guildId, -amount);

  const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const room = {
    roomId,
    hostId,
    hostUsername,
    guildId,
    channelId,
    messageId: null,
    amount,
    targetUserId: targetUserId || null,
    maxPlayers: Math.min(Math.max(2, maxPlayers), 8),
    players: [
      { userId: hostId, username: hostUsername }
    ],
    status: 'WAITING', // 'WAITING' | 'PLAYING' | 'ENDED' | 'CANCELLED'
    createdAt: Date.now(),
    timer: null
  };

  activeRooms.set(roomId, room);
  return { success: true, room };
}

/**
 * Lấy phòng chơi theo ID
 */
function getRoom(roomId) {
  return activeRooms.get(roomId) || null;
}

/**
 * Lấy phòng chơi theo Message ID
 */
function getRoomByMessageId(messageId) {
  for (const room of activeRooms.values()) {
    if (room.messageId === messageId) return room;
  }
  return null;
}

/**
 * Kiểm tra xem người dùng có đang trong phòng chờ nào không
 */
function getActiveRoomByPlayer(userId) {
  for (const room of activeRooms.values()) {
    if (room.status === 'WAITING' && room.players.some(p => p.userId === userId)) {
      return room;
    }
  }
  return null;
}

/**
 * Người chơi tham gia phòng
 */
function joinRoom(roomId, userId, username) {
  const room = activeRooms.get(roomId);
  if (!room) return { success: false, reason: 'Phòng chơi không tồn tại hoặc đã kết thúc!' };
  if (room.status !== 'WAITING') return { success: false, reason: 'Ván bài đã bắt đầu hoặc đã kết thúc!' };

  // Nếu phòng có người được chỉ định thách đấu
  if (room.targetUserId && room.targetUserId !== userId) {
    return { success: false, reason: 'Đây là phòng thách đấu riêng, bạn không thể tham gia!' };
  }

  // Kiểm tra đã vào chưa
  if (room.players.some(p => p.userId === userId)) {
    return { success: false, reason: 'Bạn đã tham gia phòng này rồi!' };
  }

  // Kiểm tra phòng đầy
  if (room.players.length >= room.maxPlayers) {
    return { success: false, reason: 'Phòng chơi đã đủ người!' };
  }

  // Kiểm tra số dư
  const user = db.getUser(userId, room.guildId);
  if ((user.xccoin || 0) < room.amount) {
    return { success: false, reason: `Số dư của bạn không đủ! Cần ${room.amount.toLocaleString()} XCCoin để tham gia.` };
  }

  // Trừ tiền cược
  db.addXCCoin(userId, room.guildId, -room.amount);

  room.players.push({ userId, username });
  return { success: true, room };
}

/**
 * Người chơi rời phòng
 */
function leaveRoom(roomId, userId) {
  const room = activeRooms.get(roomId);
  if (!room) return { success: false, reason: 'Phòng chơi không tồn tại!' };
  if (room.status !== 'WAITING') return { success: false, reason: 'Ván bài đang diễn ra, không thể rời!' };

  if (room.hostId === userId) {
    return { success: false, reason: 'Chủ phòng không thể rời bàn, hãy chọn "Hủy Bàn" để hoàn tiền!' };
  }

  const idx = room.players.findIndex(p => p.userId === userId);
  if (idx === -1) return { success: false, reason: 'Bạn không có trong phòng này!' };

  // Hoàn tiền cược cho người rời
  db.addXCCoin(userId, room.guildId, room.amount);
  room.players.splice(idx, 1);

  return { success: true, room };
}

/**
 * Hủy phòng chơi và hoàn tiền cho tất cả mọi người
 */
function cancelRoom(roomId, reason = 'Phòng chơi đã được hủy.') {
  const room = activeRooms.get(roomId);
  if (!room) return null;

  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }

  // Hoàn tiền cho tất cả người chơi trong phòng
  for (const p of room.players) {
    db.addXCCoin(p.userId, room.guildId, room.amount);
  }

  room.status = 'CANCELLED';
  activeRooms.delete(roomId);

  return { room, reason };
}

/**
 * Bắt đầu ván bài và phân định thắng thua
 */
function startRoomGame(roomId) {
  const room = activeRooms.get(roomId);
  if (!room) return { success: false, reason: 'Phòng chơi không tồn tại!' };
  if (room.players.length < 2) return { success: false, reason: 'Cần ít nhất 2 người chơi để bắt đầu!' };
  if (room.status !== 'WAITING') return { success: false, reason: 'Ván bài đã được bắt đầu trước đó!' };

  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }

  room.status = 'PLAYING';

  // 1. Chia bài từ 1 bộ 52 lá duy nhất
  const deck = createShuffledDeck();
  const playerHands = [];

  for (const p of room.players) {
    const cards = [deck.pop(), deck.pop(), deck.pop()];
    const hand = evaluateHand(cards);
    playerHands.push({
      userId: p.userId,
      username: p.username,
      cards,
      hand
    });
  }

  // 2. Tìm người chiến thắng: so Tier trước, rồi so Score
  // Sắp xếp giảm dần theo điểm
  playerHands.sort((a, b) => {
    if (b.hand.tier !== a.hand.tier) {
      return b.hand.tier - a.hand.tier;
    }
    return b.hand.score - a.hand.score;
  });

  const bestTier = playerHands[0].hand.tier;
  const bestScore = playerHands[0].hand.score;

  // Lấy tất cả người chơi có cùng điểm cao nhất (trường hợp hòa)
  const winners = playerHands.filter(p => p.hand.tier === bestTier && p.hand.score === bestScore);
  const totalPot = room.amount * room.players.length;
  const payoutPerWinner = Math.floor(totalPot / winners.length);

  // 3. Trả thưởng XCCoin và XP cho người chơi
  const levelHandler = require('./levelHandler');
  const winnerIds = new Set(winners.map(w => w.userId));

  // Người thắng nhận XCCoin và XP lớn
  for (const w of winners) {
    db.addXCCoin(w.userId, room.guildId, payoutPerWinner);
    const winXp = levelHandler.calculatePvpCardGameXp(true, w.hand, totalPot);
    db.addXp(w.userId, room.guildId, winXp);
    w.earnedXp = winXp;
  }

  // Các người chơi khác nhận XP an ủi (tu vi cọ xát)
  for (const p of playerHands) {
    if (!winnerIds.has(p.userId)) {
      const partXp = levelHandler.calculatePvpCardGameXp(false, p.hand, room.amount);
      db.addXp(p.userId, room.guildId, partXp);
      p.earnedXp = partXp;
    }
  }

  room.status = 'ENDED';
  activeRooms.delete(roomId);

  return {
    success: true,
    room,
    playerHands,
    winners,
    totalPot,
    payoutPerWinner,
    isTie: winners.length > 1
  };
}

module.exports = {
  activeRooms,
  createRoom,
  getRoom,
  getRoomByMessageId,
  getActiveRoomByPlayer,
  joinRoom,
  leaveRoom,
  cancelRoom,
  startRoomGame
};
