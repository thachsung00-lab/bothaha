const db = require('../database/db');
const { createShuffledDeck } = require('../utils/cardGame');
const { evaluateXiDachHand } = require('../utils/xidachGame');

const activeXiDachRooms = new Map();

/**
 * Kiểm tra xem người dùng có đang trong phòng chờ Xì Dách nào không
 */
function getActiveXiDachRoomByPlayer(userId) {
  for (const room of activeXiDachRooms.values()) {
    if (room.status === 'WAITING' && room.players.some(p => p.userId === userId)) {
      return room;
    }
  }
  return null;
}

/**
 * Lấy phòng Xì Dách theo ID
 */
function getXiDachRoom(roomId) {
  return activeXiDachRooms.get(roomId) || null;
}

/**
 * Tạo một phòng chơi Xì Dách PvP mới
 */
function createXiDachRoom({ hostId, hostUsername, guildId, channelId, amount, targetUserId = null, maxPlayers = 6 }) {
  const activeRoom = getActiveXiDachRoomByPlayer(hostId);
  if (activeRoom) {
    return {
      success: false,
      reason: `Bạn đang có một bàn Xì Dách đang chờ (Mã: \`${activeRoom.roomId}\`)! Vui lòng hoàn thành hoặc hủy bàn cũ trước.`
    };
  }

  const user = db.getUser(hostId, guildId);
  if ((user.xccoin || 0) < amount) {
    return {
      success: false,
      reason: `Số dư của bạn không đủ! Bạn có ${(user.xccoin || 0).toLocaleString()} XCCoin, cần ${amount.toLocaleString()} XCCoin.`
    };
  }

  // Trừ tiền cược của chủ phòng
  db.addXCCoin(hostId, guildId, -amount);

  const roomId = `xdroom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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
    status: 'WAITING',
    createdAt: Date.now(),
    timer: null
  };

  activeXiDachRooms.set(roomId, room);
  return { success: true, room };
}

/**
 * Người chơi tham gia phòng Xì Dách
 */
function joinXiDachRoom(roomId, userId, username) {
  const room = activeXiDachRooms.get(roomId);
  if (!room) return { success: false, reason: 'Phòng chơi không tồn tại hoặc đã kết thúc!' };
  if (room.status !== 'WAITING') return { success: false, reason: 'Ván bài đã bắt đầu hoặc đã kết thúc!' };

  if (room.targetUserId && room.targetUserId !== userId) {
    return { success: false, reason: 'Đây là phòng thách đấu riêng, bạn không thể tham gia!' };
  }

  if (room.players.some(p => p.userId === userId)) {
    return { success: false, reason: 'Bạn đã tham gia phòng này rồi!' };
  }

  const otherRoom = getActiveXiDachRoomByPlayer(userId);
  if (otherRoom && otherRoom.roomId !== roomId) {
    return { success: false, reason: `Bạn đang ở một bàn chơi khác (Mã: \`${otherRoom.roomId}\`)! Vui lòng rời hoặc hoàn tất bàn đó trước.` };
  }

  if (room.players.length >= room.maxPlayers) {
    return { success: false, reason: 'Phòng chơi đã đủ người!' };
  }

  const user = db.getUser(userId, room.guildId);
  if ((user.xccoin || 0) < room.amount) {
    return { success: false, reason: `Số dư của bạn không đủ! Cần ${room.amount.toLocaleString()} XCCoin để tham gia.` };
  }

  db.addXCCoin(userId, room.guildId, -room.amount);
  room.players.push({ userId, username });
  return { success: true, room };
}

/**
 * Người chơi rời phòng Xì Dách
 */
function leaveXiDachRoom(roomId, userId) {
  const room = activeXiDachRooms.get(roomId);
  if (!room) return { success: false, reason: 'Phòng chơi không tồn tại!' };
  if (room.status !== 'WAITING') return { success: false, reason: 'Ván bài đang diễn ra, không thể rời!' };

  if (room.hostId === userId) {
    return { success: false, reason: 'Chủ phòng không thể rời bàn, hãy chọn "Hủy Bàn" để hoàn tiền!' };
  }

  const idx = room.players.findIndex(p => p.userId === userId);
  if (idx === -1) return { success: false, reason: 'Bạn không có trong phòng này!' };

  db.addXCCoin(userId, room.guildId, room.amount);
  room.players.splice(idx, 1);
  return { success: true, room };
}

/**
 * Hủy phòng Xì Dách
 */
function cancelXiDachRoom(roomId, reason = 'Phòng chơi đã được hủy.') {
  const room = activeXiDachRooms.get(roomId);
  if (!room) return null;

  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }

  for (const p of room.players) {
    db.addXCCoin(p.userId, room.guildId, room.amount);
  }

  room.status = 'CANCELLED';
  activeXiDachRooms.delete(roomId);
  return { room, reason };
}

/**
 * Bắt đầu ván Xì Dách PvP
 */
function startXiDachRoomGame(roomId) {
  const room = activeXiDachRooms.get(roomId);
  if (!room) return { success: false, reason: 'Phòng chơi không tồn tại!' };
  if (room.players.length < 2) return { success: false, reason: 'Cần ít nhất 2 người chơi để bắt đầu!' };
  if (room.status !== 'WAITING') return { success: false, reason: 'Ván bài đã được bắt đầu trước đó!' };

  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }

  room.status = 'PLAYING';

  const deck = createShuffledDeck();
  const playerHands = [];

  // Chia 2 lá đầu tiên cho từng người
  for (const p of room.players) {
    const cards = [deck.pop(), deck.pop()];
    playerHands.push({
      userId: p.userId,
      username: p.username,
      cards
    });
  }

  // Kéo bài theo luật: Nếu chưa đủ 16 tuổi (< 16), người chơi tự động kéo đến khi >= 16 hoặc quắc/đủ 5 lá
  for (const p of playerHands) {
    let hand = evaluateXiDachHand(p.cards);

    // Nếu không phải Xì Hoa hoặc Xì Dách và điểm < 16, kéo bài tiếp
    while (!hand.isXiHoa && !hand.isBlackjack && hand.points < 16 && p.cards.length < 5) {
      p.cards.push(deck.pop());
      hand = evaluateXiDachHand(p.cards);
    }

    p.hand = hand;
  }

  // Sắp xếp tay bài:
  // Tier: 4 (Xì Hoa) > 3 (Xì Dách) > 2.5 (Ngũ Linh) > 2 (21 điểm) > 1 (Điểm thường >= 16) > 0 (Quắc)
  playerHands.sort((a, b) => {
    if (b.hand.tier !== a.hand.tier) {
      return b.hand.tier - a.hand.tier;
    }
    // Cùng Ngũ Linh: điểm nhỏ hơn thắng
    if (a.hand.isNguLinh && b.hand.isNguLinh) {
      return a.hand.points - b.hand.points;
    }
    // Cùng điểm thường: điểm lớn hơn thắng
    return b.hand.points - a.hand.points;
  });

  const bestTier = playerHands[0].hand.tier;
  const bestPoints = playerHands[0].hand.points;

  // Tìm người chiến thắng
  let winners = [];
  if (bestTier === 2.5) {
    // Ngũ linh: cùng tier 2.5 và cùng bestPoints
    winners = playerHands.filter(p => p.hand.tier === bestTier && p.hand.points === bestPoints);
  } else {
    winners = playerHands.filter(p => p.hand.tier === bestTier && p.hand.points === bestPoints);
  }

  const totalPot = room.amount * room.players.length;
  const payoutPerWinner = Math.floor(totalPot / winners.length);

  // Trả thưởng
  const winnerIds = new Set(winners.map(w => w.userId));
  for (const w of winners) {
    db.addXCCoin(w.userId, room.guildId, payoutPerWinner);
    const winXp = Math.floor(60 + totalPot * 0.01);
    db.addXp(w.userId, room.guildId, winXp);
    w.earnedXp = winXp;
  }

  for (const p of playerHands) {
    if (!winnerIds.has(p.userId)) {
      const partXp = Math.floor(25 + room.amount * 0.005);
      db.addXp(p.userId, room.guildId, partXp);
      p.earnedXp = partXp;
    }
  }

  room.status = 'ENDED';
  activeXiDachRooms.delete(roomId);

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
  activeXiDachRooms,
  getXiDachRoom,
  getActiveXiDachRoomByPlayer,
  createXiDachRoom,
  joinXiDachRoom,
  leaveXiDachRoom,
  cancelXiDachRoom,
  startXiDachRoomGame
};
