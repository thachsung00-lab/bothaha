const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');
const { RPS_CHOICES } = require('./rpsGame');

/**
 * Tạo Payload Giao Diện Sảnh Chờ Thách Đấu Oẳn Tù Tì PvP
 */
function createRpsPvpLobbyPayload(room) {
  const targetText = room.targetId ? `<@${room.targetId}>` : 'Bất kỳ thành viên nào';

  const embed = new EmbedBuilder()
    .setColor(config.colors.gold || 0xf1c40f)
    .setTitle('⚔️ THÁCH ĐẤU OẲN TÙ TÌ (PVP 1 VS 1)')
    .setDescription(
      `**Chủ Kèo:** <@${room.hostId}>\n` +
      `**Đối Thủ Thách Đấu:** ${targetText}\n` +
      `💰 **Mức cược:** **${room.amount.toLocaleString()} XCCoin** / người\n` +
      `🏆 **Tổng Hũ Tiền Thắng (Pot):** **${(room.amount * 2).toLocaleString()} XCCoin**\n\n` +
      `⏳ *Bấm nút **[ ⚔️ Nhận Kèo ]** bên dưới để bước lên võ đài so tài Kéo - Búa - Bao! Kèo sẽ tự động hủy và hoàn tiền sau 60 giây nếu không có ai nhận.*`
    )
    .setFooter({ text: `Phòng ID: ${room.id} • Tự hủy sau 60s nếu không ai nhận` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_rpspvp_join_${room.id}`)
      .setLabel('⚔️ Nhận Kèo')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`btn_rpspvp_cancel_${room.id}`)
      .setLabel('❌ Hủy Kèo (Chủ phòng)')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Tạo Payload Giao Diện Khi 2 Người Đang Ra Đòn Bí Mật
 */
function createRpsPvpBattlePayload(room) {
  const hostStatus = room.hostChoice ? '✅ **Đã ra đòn** *(Bí mật)*' : '⏳ *Đang suy nghĩ...*';
  const challengerStatus = room.challengerChoice ? '✅ **Đã ra đòn** *(Bí mật)*' : '⏳ *Đang suy nghĩ...*';

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🥊 VÕ ĐÀI OẲN TÙ TÌ ĐANG DIỄN RA!')
    .setDescription(
      `Hai đấu thủ hãy bấm nút bên dưới để ra đòn của mình!\n` +
      `*(Lựa chọn của bạn hoàn toàn bí mật, chỉ công bố khi cả hai đã ra đòn)*\n\n` +
      `🥋 **Đấu Thủ 1:** <@${room.hostId}> ➡️ ${hostStatus}\n` +
      `🥋 **Đấu Thủ 2:** <@${room.challengerId}> ➡️ ${challengerStatus}\n\n` +
      `💰 **Tổng Hũ Tiền Thưởng (Pot):** **${(room.amount * 2).toLocaleString()} XCCoin**`
    )
    .setFooter({ text: `Phòng ID: ${room.id} • Hai bên hãy chọn nhanh trong 60s` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_rpspvp_choice_ROCK_${room.id}`)
      .setLabel('Ra Búa')
      .setEmoji('✊')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`btn_rpspvp_choice_SCISSORS_${room.id}`)
      .setLabel('Ra Kéo')
      .setEmoji('✌️')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`btn_rpspvp_choice_PAPER_${room.id}`)
      .setLabel('Ra Bao')
      .setEmoji('🖐️')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Tạo Payload Kết Quả Trận Đấu Oẳn Tù Tì PvP
 */
function createRpsPvpResultPayload(room, resultData) {
  const { winnerId, isTie, hostChoice, challengerChoice, pot } = resultData;

  const hChoiceObj = RPS_CHOICES[hostChoice];
  const cChoiceObj = RPS_CHOICES[challengerChoice];

  let title = '🏆 KẾT QUẢ OẲN TÙ TÌ PVP 🏆';
  let description = '';
  let color = config.colors.success;

  if (isTie) {
    color = config.colors.gold || 0xf1c40f;
    title = '🤝 KẾT QUẢ OẲN TÙ TÌ: HÒA NHAU! 🤝';
    description =
      `Cả hai đấu thủ đều chọn **${hChoiceObj.emoji} ${hChoiceObj.name}**!\n\n` +
      `🥋 <@${room.hostId}>: ${hChoiceObj.emoji} **${hChoiceObj.name}**\n` +
      `🥋 <@${room.challengerId}>: ${cChoiceObj.emoji} **${cChoiceObj.name}**\n\n` +
      `💰 **Tiền cược (${room.amount.toLocaleString()} XCCoin/người) đã được hoàn trả lại 100% vào ví của cả hai!**`;
  } else {
    const isHostWin = winnerId === room.hostId;
    const loserId = isHostWin ? room.challengerId : room.hostId;
    const winChoice = isHostWin ? hChoiceObj : cChoiceObj;
    const loseChoice = isHostWin ? cChoiceObj : hChoiceObj;

    description =
      `👑 **XIN CHÚC MỪNG CHIẾN THẦN:** <@${winnerId}>\n` +
      `Đã dùng **${winChoice.emoji} ${winChoice.name}** khắc chế ngoạn mục **${loseChoice.emoji} ${loseChoice.name}** của <@${loserId}>!\n\n` +
      `🥋 <@${room.hostId}>: ${hChoiceObj.emoji} **${hChoiceObj.name}**\n` +
      `🥋 <@${room.challengerId}>: ${cChoiceObj.emoji} **${cChoiceObj.name}**\n\n` +
      `🏆 **Thắng cược nhận trọn Hũ Pot:** **+${pot.toLocaleString()} XCCoin** và **+30 XP Tu Vi**!`;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: '⏱️ Thông báo kết quả sẽ tự động xóa sau 15 giây để giữ sạch kênh' })
    .setTimestamp();

  return { embeds: [embed], components: [] };
}

/**
 * Tạo Payload Khi Kèo PvP Bị Hủy
 */
function createRpsPvpCancelledPayload(room, reason = 'Kèo thách đấu đã bị hủy.') {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🚫 KÈO THÁCH ĐẤU ĐÃ BỊ HỦY')
    .setDescription(
      `${reason}\n\n` +
      `💰 **Tiền cược (${room.amount.toLocaleString()} XCCoin) đã được hoàn trả lại ví an toàn.**`
    )
    .setFooter({ text: '⏱️ Tin nhắn này sẽ tự động xóa sau 10 giây' })
    .setTimestamp();

  return { embeds: [embed], components: [] };
}

module.exports = {
  createRpsPvpLobbyPayload,
  createRpsPvpBattlePayload,
  createRpsPvpResultPayload,
  createRpsPvpCancelledPayload
};
