const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

/**
 * Tạo giao diện Phòng Chờ Xì Dách PvP
 */
function createXiDachPvpLobbyPayload(room) {
  const totalPot = room.amount * room.players.length;

  let playerListText = '';
  room.players.forEach((p, index) => {
    const isHost = p.userId === room.hostId;
    const roleIcon = isHost ? '👑 (Chủ bàn)' : '👤';
    playerListText += `**${index + 1}.** ${roleIcon} <@${p.userId}> (${p.username})\n`;
  });

  const targetNote = room.targetUserId
    ? `\n🎯 **Thách đấu riêng với:** <@${room.targetUserId}>`
    : '\n🌐 **Phòng mở:** Bất kỳ ai cũng có thể tham gia!';

  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🃏 PHÒNG CHỜ KÉO XÌ DÁCH NHÓM (PVP) 👥')
    .setDescription(
      `Chủ phòng **${room.hostUsername}** đã mở một bàn Xì Dách nhiều người:\n\n` +
      `💰 **Mức cược mỗi người:** **${room.amount.toLocaleString()}** XCCoin\n` +
      `🏆 **Tổng hũ thưởng (Pot):** 🌟 **${totalPot.toLocaleString()}** XCCoin\n` +
      `👥 **Số người hiện tại:** **${room.players.length} / ${room.maxPlayers}**\n` +
      targetNote + '\n\n' +
      `📋 **DANH SÁCH THÀNH VIÊN VÀO BÀN:**\n${playerListText}\n` +
      `⏳ *Bàn chơi sẽ tự hủy sau 2 phút nếu không đủ người. Khi có từ 2 người trở lên, chủ bàn có thể bấm [Bắt Đầu] hoặc tự động bắt đầu sau 2 phút.*`
    )
    .setFooter({ text: 'Bấm nút bên dưới để tham gia hoặc rời bàn!' })
    .setTimestamp();

  const isFull = room.players.length >= room.maxPlayers;
  const canStart = room.players.length >= 2;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_xdpvp_join_${room.roomId}`)
      .setLabel(`Tham Gia (${room.players.length}/${room.maxPlayers})`)
      .setEmoji('✋')
      .setStyle(ButtonStyle.Success)
      .setDisabled(isFull),

    new ButtonBuilder()
      .setCustomId(`btn_xdpvp_leave_${room.roomId}`)
      .setLabel('Rời Bàn')
      .setEmoji('🚪')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`btn_xdpvp_start_${room.roomId}`)
      .setLabel('Bắt Đầu')
      .setEmoji('🚀')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!canStart),

    new ButtonBuilder()
      .setCustomId(`btn_xdpvp_cancel_${room.roomId}`)
      .setLabel('Hủy Bàn')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Tạo giao diện Công Bố Kết Quả Xì Dách PvP
 */
function createXiDachPvpResultPayload(gameResult) {
  const { room, playerHands, winners, totalPot, payoutPerWinner, isTie } = gameResult;

  let winnerText = '';
  if (isTie) {
    winnerText = `🤝 **HÒA ĐIỂM!** Đồng hạng nhất: ` +
      winners.map(w => `<@${w.userId}> (+${(w.earnedXp || 0).toLocaleString()} XP)`).join(' & ') +
      `\n🎁 Mỗi người chia đều: **+${payoutPerWinner.toLocaleString()} XCCoin**!`;
  } else {
    winnerText = `👑 **CHIẾN THẮNG:** <@${winners[0].userId}> (${winners[0].username})\n` +
      `🎉 **Ẵm trọn Hũ thưởng:** 🌟 **+${totalPot.toLocaleString()} XCCoin** | ⭐ **+${(winners[0].earnedXp || 0).toLocaleString()} XP Tu Vi**!`;
  }

  let handsDetail = '';
  playerHands.forEach((p, idx) => {
    const isWinner = winners.some(w => w.userId === p.userId);
    const medal = isWinner ? '🥇 **THẮNG**' : `**#${idx + 1}**`;
    const cardStr = p.cards.map(c => `\`${c.display}\``).join(' ');
    const xpStr = p.earnedXp ? ` • ⭐ **+${p.earnedXp.toLocaleString()} XP**` : '';

    handsDetail += `${medal} <@${p.userId}>: ${cardStr}\n` +
      `   ➡️ **${p.hand.name}** (${p.hand.description})${xpStr}\n\n`;
  });

  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🎉 KẾT QUẢ VÁN KÉO XÌ DÁCH NHÓM (PVP) 🏆')
    .setDescription(
      `💰 **Mức cược:** **${room.amount.toLocaleString()}** XCCoin / người\n` +
      `🏆 **Tổng hũ thưởng:** **${totalPot.toLocaleString()}** XCCoin\n\n` +
      `${winnerText}\n\n` +
      `══════════════════════════════\n` +
      `📜 **CHI TIẾT TAY BÀI TỪNG NGƯỜI CHƠI:**\n\n` +
      handsDetail
    )
    .setFooter({ text: 'Bộ bài tây 52 lá chuẩn • Tự động xóa bàn chơi sau 15 giây' })
    .setTimestamp();

  return { embeds: [embed], components: [] };
}

/**
 * Giao diện khi bàn bị hủy
 */
function createXiDachPvpCancelledPayload(room, reason) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle('🚫 BÀN XÌ DÁCH ĐÃ ĐƯỢC HỦY')
    .setDescription(
      `Bàn chơi của **${room.hostUsername}** đã bị hủy.\n` +
      `📝 **Lý do:** ${reason}\n\n` +
      `💰 **Tiền cược (${room.amount.toLocaleString()} XCCoin) đã được hoàn trả lại 100% vào ví của tất cả người chơi.**`
    )
    .setTimestamp();

  return { embeds: [embed], components: [] };
}

module.exports = {
  createXiDachPvpLobbyPayload,
  createXiDachPvpResultPayload,
  createXiDachPvpCancelledPayload
};
