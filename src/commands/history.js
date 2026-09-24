const { SlashCommandBuilder } = require('discord.js');
const { buildHistoryPayload } = require('../utils/historyPanelBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('📜 Xem lịch sử đấu và thống kê các trò chơi của bạn hoặc thành viên khác')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Thành viên muốn xem lịch sử (để trống để xem của bạn)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('game')
        .setDescription('Loại trò chơi muốn lọc')
        .setRequired(false)
        .addChoices(
          { name: '🌟 Tất Cả Trò Chơi', value: 'ALL' },
          { name: '🃏 Bài Cào (Solo & PvP)', value: 'BAICAO' },
          { name: '🎰 Máy Quay Slot', value: 'SLOT' },
          { name: '✊ Oẳn Tù Tì (Solo & PvP)', value: 'RPS' }
        )
    )
    .addStringOption(opt =>
      opt.setName('view')
        .setDescription('Góc nhìn muốn xem')
        .setRequired(false)
        .addChoices(
          { name: '📜 Danh Sách Lịch Sử Đấu', value: 'HISTORY' },
          { name: '📊 Thống Kê Tổng Quan & Phong Độ', value: 'STATS' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const filter = interaction.options.getString('game') || 'ALL';
    const viewMode = interaction.options.getString('view') || 'HISTORY';
    const guildId = interaction.guildId;

    if (targetUser.bot) {
      return interaction.editReply({
        content: '🤖 Bot không tham gia các ván đấu cá nhân!'
      });
    }

    const payload = buildHistoryPayload({
      targetUser,
      guildId,
      page: 1,
      filter,
      viewMode
    });

    await interaction.editReply(payload);
  }
};
