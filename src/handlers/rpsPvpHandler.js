const db = require('../database/db');
const levelHandler = require('./levelHandler');
const { determineWinner } = require('../utils/rpsGame');

// Lưu trữ các phòng Thách Đấu Oẳn Tù Tì đang hoạt động
const rpsRooms = new Map();

/**
 * Lấy phòng RPS đang hoạt động của người chơi (tránh mở nhiều phòng cùng lúc)
 */
function getActiveRpsRoomByPlayer(userId) {
  for (const [, room] of rpsRooms) {
    if (
      (room.hostId === userId || room.challengerId === userId) &&
      ['WAITING', 'BATTLING'].includes(room.status)
    ) {
      return room;
    }
  }
  return null;
}

/**
 * Lấy thông tin phòng theo ID
 */
function getRpsRoom(roomId) {
  return rpsRooms.get(roomId);
}

/**
 * Tạo phòng Thách Đấu Oẳn Tù Tì PvP mới
 */
function createRpsRoom(guildId, channelId, hostUser, amount, targetUser = null) {
  const existingRoom = getActiveRpsRoomByPlayer(hostUser.id);
  if (existingRoom) {
    return {
      success: false,
      reason: `Bạn đang có một phòng thách đấu Oẳn Tù Tì chưa kết thúc (Phòng #${existingRoom.id})! Vui lòng hoàn thành hoặc hủy phòng trước.`
    };
  }

  const hostData = db.getUser(hostUser.id, guildId);
  if ((hostData.xccoin || 0) < amount) {
    return {
      success: false,
      reason: `Số dư XCCoin của bạn không đủ! Bạn có ${(hostData.xccoin || 0).toLocaleString()} XCCoin, cần ${amount.toLocaleString()} XCCoin để tạo kèo.`
    };
  }

  // Trừ tiền cược của Host
  db.addXCCoin(hostUser.id, guildId, -amount);

  const roomId = `rps_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const room = {
    id: roomId,
    guildId,
    channelId,
    hostId: hostUser.id,
    hostUsername: hostUser.username,
    targetId: targetUser ? targetUser.id : null,
    targetUsername: targetUser ? targetUser.username : null,
    amount,
    status: 'WAITING', // WAITING -> BATTLING -> FINISHED -> CANCELLED
    challengerId: null,
    challengerUsername: null,
    hostChoice: null,
    challengerChoice: null,
    createdAt: Date.now(),
    timeout: null,
    message: null
  };

  rpsRooms.set(roomId, room);
  return { success: true, room };
}

/**
 * Người chơi 2 nhận kèo thách đấu
 */
function joinRpsRoom(roomId, challengerUser) {
  const room = rpsRooms.get(roomId);
  if (!room) {
    return { success: false, reason: 'Phòng thách đấu không tồn tại hoặc đã kết thúc!' };
  }

  if (room.status !== 'WAITING') {
    return { success: false, reason: 'Kèo thách đấu này đã có người tham gia hoặc đã kết thúc!' };
  }

  if (challengerUser.id === room.hostId) {
    return { success: false, reason: 'Bạn không thể tự nhận kèo thách đấu của chính mình!' };
  }

  if (room.targetId && room.targetId !== challengerUser.id) {
    return { success: false, reason: `Kèo này được tạo riêng để thách đấu <@${room.targetId}>!` };
  }

  const existing = getActiveRpsRoomByPlayer(challengerUser.id);
  if (existing) {
    return {
      success: false,
      reason: 'Bạn đang tham gia một trận đấu Oẳn Tù Tì khác! Hãy hoàn thành trận đó trước.'
    };
  }

  const challengerData = db.getUser(challengerUser.id, room.guildId);
  if ((challengerData.xccoin || 0) < room.amount) {
    return {
      success: false,
      reason: `Số dư XCCoin của bạn không đủ! Bạn có ${(challengerData.xccoin || 0).toLocaleString()} XCCoin, cần ${room.amount.toLocaleString()} XCCoin để nhận kèo.`
    };
  }

  // Trừ tiền cược của Challenger
  db.addXCCoin(challengerUser.id, room.guildId, -room.amount);

  // Xóa timeout phòng chờ
  if (room.timeout) clearTimeout(room.timeout);

  room.challengerId = challengerUser.id;
  room.challengerUsername = challengerUser.username;
  room.status = 'BATTLING';

  return { success: true, room };
}

/**
 * Ghi nhận lựa chọn bí mật của đấu thủ (Búa, Kéo, Bao)
 */
function makeRpsChoice(roomId, userId, choiceId) {
  const room = rpsRooms.get(roomId);
  if (!room) {
    return { success: false, reason: 'Trận đấu không tồn tại hoặc đã kết thúc!' };
  }

  if (room.status !== 'BATTLING') {
    return { success: false, reason: 'Trận đấu chưa bắt đầu hoặc đã kết thúc!' };
  }

  if (userId !== room.hostId && userId !== room.challengerId) {
    return { success: false, reason: 'Bạn không phải là đấu thủ trong trận đấu này!' };
  }

  // Ghi nhận lựa chọn
  if (userId === room.hostId) {
    if (room.hostChoice) {
      return { success: false, reason: 'Bạn đã ra đòn rồi, không thể đổi lại!' };
    }
    room.hostChoice = choiceId;
  } else {
    if (room.challengerChoice) {
      return { success: false, reason: 'Bạn đã ra đòn rồi, không thể đổi lại!' };
    }
    room.challengerChoice = choiceId;
  }

  // Kiểm tra nếu cả hai đã ra đòn -> Kết thúc trận đấu
  if (room.hostChoice && room.challengerChoice) {
    if (room.timeout) clearTimeout(room.timeout);
    room.status = 'FINISHED';

    const result = determineWinner(room.hostChoice, room.challengerChoice);
    const pot = room.amount * 2;
    let winnerId = null;
    let isTie = false;

    if (result === 'WIN') {
      // Host thắng
      winnerId = room.hostId;
      db.addXCCoin(room.hostId, room.guildId, pot);
      db.addXp(room.hostId, room.guildId, 30);
      db.addXp(room.challengerId, room.guildId, 5);
    } else if (result === 'LOSE') {
      // Challenger thắng
      winnerId = room.challengerId;
      db.addXCCoin(room.challengerId, room.guildId, pot);
      db.addXp(room.challengerId, room.guildId, 30);
      db.addXp(room.hostId, room.guildId, 5);
    } else {
      // Hòa nhau -> Hoàn lại 100% tiền cược cho cả hai
      isTie = true;
      db.addXCCoin(room.hostId, room.guildId, room.amount);
      db.addXCCoin(room.challengerId, room.guildId, room.amount);
      db.addXp(room.hostId, room.guildId, 10);
      db.addXp(room.challengerId, room.guildId, 10);
    }

    // Xóa phòng khỏi danh sách sau 30 giây
    setTimeout(() => {
      rpsRooms.delete(roomId);
    }, 30000);

    return {
      success: true,
      finished: true,
      room,
      resultData: {
        winnerId,
        isTie,
        hostChoice: room.hostChoice,
        challengerChoice: room.challengerChoice,
        pot
      }
    };
  }

  return {
    success: true,
    finished: false,
    room,
    chosenPlayerId: userId
  };
}

/**
 * Hủy phòng và hoàn tiền
 */
function cancelRpsRoom(roomId, requestingUserId = null, reason = 'Chủ phòng đã hủy kèo thách đấu.') {
  const room = rpsRooms.get(roomId);
  if (!room) return { success: false, reason: 'Phòng không tồn tại!' };

  if (requestingUserId && requestingUserId !== room.hostId) {
    return { success: false, reason: 'Chỉ chủ phòng mới có quyền hủy kèo thách đấu!' };
  }

  if (room.status === 'FINISHED') {
    return { success: false, reason: 'Trận đấu đã kết thúc, không thể hủy!' };
  }

  if (room.timeout) clearTimeout(room.timeout);

  // Hoàn lại tiền cho host
  if (room.status === 'WAITING' || room.status === 'BATTLING') {
    db.addXCCoin(room.hostId, room.guildId, room.amount);
  }

  // Hoàn tiền cho challenger nếu đã vào trận
  if (room.status === 'BATTLING' && room.challengerId) {
    db.addXCCoin(room.challengerId, room.guildId, room.amount);
  }

  room.status = 'CANCELLED';
  rpsRooms.delete(roomId);

  return { success: true, room, reason };
}

module.exports = {
  createRpsRoom,
  joinRpsRoom,
  makeRpsChoice,
  cancelRpsRoom,
  getRpsRoom,
  getActiveRpsRoomByPlayer
};
