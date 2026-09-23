const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { playBaiCao } = require('../utils/cardGame');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('baicao')
    .setDescription('🃏 Chơi Bài Cào 3 lá cùng Bot (Mức cược từ 100 đến 10,000 XCCoin)')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Số XCCoin đặt cược (100 - 10,000)')
        .setMinValue(100)
        .setMaxValue(10000)
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const user = db.getUser(userId, guildId);
    const balance = user.xccoin || 0;

    if (balance < amount) {
      return interaction.editReply({
        content: `❌ Số dư XCCoin của bạn không đủ! Bạn hiện có **${balance.toLocaleString()} XCCoin**, không đủ để cược **${amount.toLocaleString()} XCCoin**.`
      });
    }

    // Chơi ván bài
    const game = playBaiCao();
    let resultTitle = '';
    let resultColor = config.colors.primary;
    let balanceChangeText = '';

    if (game.result === 'WIN') {
      db.addXCCoin(userId, guildId, amount);
      resultTitle = '🎉 BẠN ĐÃ THẮNG CUỘC!';
      resultColor = config.colors.success;
      balanceChangeText = `+**${amount.toLocaleString()}** XCCoin (Nhận lại cược + thưởng)`;
    } else if (game.result === 'LOSE') {
      db.addXCCoin(userId, guildId, -amount);
      resultTitle = '💀 BẠN ĐÃ THUA CUỘC!';
      resultColor = config.colors.error;
      balanceChangeText = `-**${amount.toLocaleString()}** XCCoin`;
    } else {
      resultTitle = '🤝 KẾT QUẢ HÒA!';
      resultColor = config.colors.gold;
      balanceChangeText = '±0 XCCoin (Hoàn lại 100% tiền cược)';
    }

    const levelHandler = require('../handlers/levelHandler');
    const earnedXp = levelHandler.calculateCardGameXp(game.result, game.playerHand, amount);
    db.addXp(userId, guildId, earnedXp);

    const updatedUser = db.getUser(userId, guildId);

    const playerCardStr = game.playerCards.map(c => `\`${c.display}\``).join(' ');
    const botCardStr = game.botCards.map(c => `\`${c.display}\``).join(' ');

    const embed = new EmbedBuilder()
      .setColor(resultColor)
      .setAuthor({ name: `Sòng Bài Cào 3 Lá | ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTitle(resultTitle)
      .addFields(
        {
          name: `👤 Bài của bạn (${game.playerHand.name})`,
          value: `${playerCardStr}\n➡️ **${game.playerHand.description}**`,
          inline: false
        },
        {
          name: `🤖 Bài của Bot (${game.botHand.name})`,
          value: `${botCardStr}\n➡️ **${game.botHand.description}**`,
          inline: false
        },
        {
          name: '💰 Tiền cược',
          value: `**${amount.toLocaleString()}** XCCoin`,
          inline: true
        },
        {
          name: '🪙 Biến động số dư',
          value: balanceChangeText,
          inline: true
        },
        {
          name: '⭐ Tu vi (XP)',
          value: `+**${earnedXp.toLocaleString()}** XP`,
          inline: true
        },
        {
          name: '💳 Số dư ví mới',
          value: `**${(updatedUser.xccoin || 0).toLocaleString()}** XCCoin`,
          inline: true
        }
      )
      .setFooter({ text: 'Tỷ lệ thắng ngẫu nhiên chuẩn bài 52 lá • Tự động xóa ván sau 10 giây' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Tự động xóa ván cũ sau 10 giây khi đấu với máy
    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, 10000);
  }
};
