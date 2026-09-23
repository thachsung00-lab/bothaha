const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const config = require('../config.json');
const { createTransferReceiptEmbed, getTradeOrNotifyChannel, refreshCoinPayPanel } = require('../utils/coinPayPanelBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coin')
    .setDescription('🪙 Quản lý và giao dịch tiền tệ XCCoin')
    .addSubcommand(sub =>
      sub.setName('balance')
        .setDescription('Xem số dư ví XCCoin của bạn hoặc người khác')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Thành viên muốn xem số dư (để trống nếu xem chính mình)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('pay')
        .setDescription('Chuyển tiền XCCoin cho thành viên khác trong server')
        .addUserOption(opt =>
          opt.setName('recipient')
            .setDescription('Thành viên nhận tiền')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('Số lượng XCCoin muốn chuyển')
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('grant')
        .setDescription('👑 (Admin) Cộng thêm hoặc trừ XCCoin của thành viên')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Thành viên cần điều chỉnh số dư')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('Số lượng XCCoin (nhập số âm để trừ, số dương để cộng)')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    // Phản hồi tương tác ngay lập tức
    await interaction.deferReply({ ephemeral: sub === 'grant' });

    // 1. Xem số dư
    if (sub === 'balance') {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      if (targetUser.bot) {
        return interaction.editReply({ content: '🤖 Bot không sở hữu ví XCCoin!' });
      }

      const userData = db.getUser(targetUser.id, guildId);
      const balance = (userData.xccoin || 0).toLocaleString();

      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setAuthor({ name: `Ví Tiền Tệ | ${targetUser.username}`, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/217/217853.png')
        .addFields(
          { name: '🪙 Số dư khả dụng', value: `**${balance}** XCCoin`, inline: true },
          { name: '🎙️ Tỷ lệ kiếm tiền Voice', value: `**+${config.voice.coinsPerHour || 1000}** XCCoin/giờ`, inline: true },
          { name: '📅 Điểm danh hàng ngày', value: `**+${config.daily.baseCoin || 200}** XCCoin/ngày`, inline: true }
        )
        .setFooter({ text: 'Tham gia các kênh Voice để tích lũy thêm XCCoin!' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // 2. Chuyển tiền (Pay / Transfer)
    if (sub === 'pay') {
      const recipient = interaction.options.getUser('recipient');
      const amount = interaction.options.getInteger('amount');

      if (recipient.id === interaction.user.id) {
        return interaction.editReply({ content: '❌ Bạn không thể tự chuyển tiền cho chính mình!' });
      }
      if (recipient.bot) {
        return interaction.editReply({ content: '❌ Bạn không thể chuyển tiền cho Bot!' });
      }

      const result = db.transferXCCoin(interaction.user.id, recipient.id, guildId, amount);
      if (!result.success) {
        return interaction.editReply({ content: `❌ Thất bại: ${result.reason}` });
      }

      const senderData = db.getUser(interaction.user.id, guildId);
      const recipientTag = `<@${recipient.id}> (${recipient.username})`;

      const receiptEmbed = createTransferReceiptEmbed({
        senderUser: interaction.user,
        recipientTag,
        amount,
        note: '',
        remainingBalance: senderData.xccoin || 0
      });

      const guildSettings = db.getGuildSettings(guildId);
      const tradeChannel = getTradeOrNotifyChannel(interaction.guild, guildSettings);

      if (tradeChannel && tradeChannel.id !== interaction.channelId) {
        await tradeChannel.send({ embeds: [receiptEmbed] }).catch(() => {});
        refreshCoinPayPanel(tradeChannel, guildId);
        return interaction.editReply({
          content: `✅ Bạn đã chuyển thành công **${amount.toLocaleString()} XCCoin** cho ${recipientTag}!\n📜 Thông báo giao dịch đã được đưa về kênh ${tradeChannel}.`
        });
      } else {
        if (tradeChannel) {
          refreshCoinPayPanel(tradeChannel, guildId);
        }
        return interaction.editReply({ embeds: [receiptEmbed] });
      }
    }

    // 3. Admin tặng/trừ tiền (Grant)
    if (sub === 'grant') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.editReply({ content: '⛔ Bạn cần quyền Quản lý Server (Manage Guild) để dùng lệnh này!' });
      }

      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');

      const updated = db.addXCCoin(target.id, guildId, amount);
      const action = amount >= 0 ? 'cộng' : 'trừ';

      return interaction.editReply({
        content: `✅ Đã ${action} **${Math.abs(amount).toLocaleString()} XCCoin** cho thành viên ${target}. Số dư mới: **${(updated.xccoin || 0).toLocaleString()} XCCoin**.`
      });
    }
  }
};
