const { SlashCommandBuilder } = require('discord.js');
const { createXiDachRoom, startXiDachRoomGame, cancelXiDachRoom } = require('../handlers/xidachPvpHandler');
const { createXiDachPvpLobbyPayload, createXiDachPvpResultPayload } = require('../utils/xidachPvpPanelBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xidachpvp')
    .setDescription('👥 Tạo bàn Kéo Xì Dách nhiều người trong Server (PvP / Đấu Nhóm)')
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
      return interaction.editReply({ content: '❌ Để chơi với Bot, vui lòng dùng lệnh `/xidach [amount]`!' });
    }

    const roomRes = createXiDachRoom({
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
    const lobbyPayload = createXiDachPvpLobbyPayload(room);
    const sentMsg = await interaction.editReply(lobbyPayload);
    room.messageId = sentMsg.id;

    // Hẹn giờ tự động 2 phút
    room.timer = setTimeout(async () => {
      try {
        if (room.status !== 'WAITING') return;

        if (room.players.length >= 2) {
          const gameResult = startXiDachRoomGame(room.roomId);
          if (gameResult.success) {
            const resultPayload = createXiDachPvpResultPayload(gameResult);
            await sentMsg.edit(resultPayload).catch(() => {});
            setTimeout(() => {
              interaction.deleteReply().catch(() => sentMsg.delete().catch(() => {}));
            }, 15000);
          }
        } else {
          const cancelRes = cancelXiDachRoom(room.roomId, 'Hết thời gian chờ 2 phút mà không có ai tham gia.');
          if (cancelRes) {
            interaction.deleteReply().catch(() => sentMsg.delete().catch(() => {}));
          }
        }
      } catch (err) {
        console.error('[XiDachPvpTimer] Lỗi khi xử lý timer ván bài:', err);
      }
    }, 120000);
  }
};
