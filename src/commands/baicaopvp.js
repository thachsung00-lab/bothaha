const { SlashCommandBuilder } = require('discord.js');
const { createRoom, startRoomGame, cancelRoom } = require('../handlers/pvpGameHandler');
const { createPvpLobbyPayload, createPvpResultPayload, createPvpCancelledPayload } = require('../utils/pvpPanelBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('baicaopvp')
    .setDescription('👥 Tạo bàn chơi Bài Cào 3 lá cùng người khác trong Server (PvP / Đấu Nhóm)')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Mức cược XCCoin cho mỗi người chơi (100 - 10,000)')
        .setMinValue(100)
        .setMaxValue(10000)
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('Chỉ định người muốn thách đấu (để trống nếu mở cho cả server)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('max_players')
        .setDescription('Số lượng người chơi tối đa (từ 2 đến 8, mặc định: 6)')
        .setMinValue(2)
        .setMaxValue(8)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('target');
    const maxPlayers = interaction.options.getInteger('max_players') || 6;
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;

    if (targetUser && targetUser.id === userId) {
      return interaction.editReply({ content: '❌ Bạn không thể tự thách đấu chính mình!' });
    }
    if (targetUser && targetUser.bot) {
      return interaction.editReply({ content: '❌ Để chơi với Bot, vui lòng dùng nút "Chơi Bài Cào vs Bot" trên Bảng Trò Chơi!' });
    }

    const roomRes = createRoom({
      hostId: userId,
      hostUsername: interaction.user.username,
      guildId,
      channelId,
      amount,
      targetUserId: targetUser ? targetUser.id : null,
      maxPlayers
    });

    if (!roomRes.success) {
      return interaction.editReply({ content: `❌ ${roomRes.reason}` });
    }

    const room = roomRes.room;
    const lobbyPayload = createPvpLobbyPayload(room);
    const sentMsg = await interaction.editReply(lobbyPayload);
    room.messageId = sentMsg.id;

    // Hẹn giờ tự động: sau 2 phút nếu không ai tham gia tự xóa bàn; nếu có từ 2 người thì tự động bắt đầu
    room.timer = setTimeout(async () => {
      try {
        if (room.status !== 'WAITING') return;

        if (room.players.length >= 2) {
          // Tự động bắt đầu nếu có từ 2 người trở lên
          const gameResult = startRoomGame(room.roomId);
          if (gameResult.success) {
            const resultPayload = createPvpResultPayload(gameResult);
            await sentMsg.edit(resultPayload).catch(() => {});
            // Tự động xóa bàn chơi sau khi kết thúc ván 15 giây
            setTimeout(() => sentMsg.delete().catch(() => {}), 15000);
          }
        } else {
          // Sau 2 phút không ai tham gia: hoàn tiền cho chủ phòng và tự động xóa bàn
          const cancelRes = cancelRoom(room.roomId, 'Hết thời gian chờ 2 phút mà không có ai tham gia.');
          if (cancelRes) {
            await sentMsg.delete().catch(() => {});
          }
        }
      } catch (err) {
        console.error('[PvpTimer] Lỗi khi xử lý timer ván bài:', err);
      }
    }, 120000);
  }
};
