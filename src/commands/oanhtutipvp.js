const { SlashCommandBuilder } = require('discord.js');
const { createRpsRoom, cancelRpsRoom } = require('../handlers/rpsPvpHandler');
const { createRpsPvpLobbyPayload, createRpsPvpCancelledPayload } = require('../utils/rpsPvpPanelBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('oanhtutipvp')
    .setDescription('⚔️ Mở kèo Thách Đấu Oẳn Tù Tì (PvP 1 vs 1) cùng người khác trong Server')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Mức cược XCCoin cho mỗi người chơi (Tối đa 10,000)')
        .setMinValue(1)
        .setMaxValue(10000)
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('Chỉ định người muốn thách đấu (để trống nếu mở cho cả server)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount');
    const target = interaction.options.getUser('target');
    const hostUser = interaction.user;
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;

    if (target && target.id === hostUser.id) {
      return interaction.editReply({ content: '❌ Bạn không thể tự thách đấu chính mình!' });
    }

    if (target && target.bot) {
      return interaction.editReply({ content: '❌ Để chơi Oẳn Tù Tì với Bot, vui lòng dùng lệnh `/oanhtuti [amount]`!' });
    }

    const result = createRpsRoom(guildId, channelId, hostUser, amount, target);
    if (!result.success) {
      return interaction.editReply({ content: `❌ ${result.reason}` });
    }

    const room = result.room;
    const lobbyPayload = createRpsPvpLobbyPayload(room);
    const sentMsg = await interaction.editReply(lobbyPayload);
    room.message = sentMsg;

    // Đặt hẹn giờ tự hủy sau 60 giây nếu không có ai nhận kèo
    room.timeout = setTimeout(async () => {
      const cancelResult = cancelRpsRoom(room.id, null, 'Hết thời gian chờ đối thủ nhận kèo (60s).');
      if (cancelResult.success) {
        const cancelPayload = createRpsPvpCancelledPayload(room, cancelResult.reason);
        if (sentMsg && typeof sentMsg.edit === 'function') {
          await sentMsg.edit(cancelPayload).catch(() => {});
        }
        if (sentMsg && typeof sentMsg.delete === 'function') {
          setTimeout(() => sentMsg.delete().catch(() => {}), 10000);
        }
      }
    }, 60000);
  }
};
