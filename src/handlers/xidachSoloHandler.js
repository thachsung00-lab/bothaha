const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { createShuffledDeck } = require('../utils/cardGame');
const { evaluateXiDachHand } = require('../utils/xidachGame');
const config = require('../config.json');

// Lưu trữ các ván Xì Dách chơi với Bot đang diễn ra
const activeSoloGames = new Map();

/**
 * Tạo Embed hiển thị bàn chơi Xì Dách với Bot
 */
function createSoloGameEmbed(game, isFinished = false, outcomeInfo = null) {
  const playerCardStr = game.playerCards.map(c => `\`${c.display}\``).join(' ');
  const playerHand = evaluateXiDachHand(game.playerCards);

  let botCardStr = '';
  let botHandDesc = '';

  if (!isFinished) {
    // Bot đang úp 1 lá
    botCardStr = `\`${game.botCards[0].display}\` \`[ 🎴 ??? ]\``;
    botHandDesc = 'Đang úp 1 lá bài';
  } else {
    // Đã lật hết
    botCardStr = game.botCards.map(c => `\`${c.display}\``).join(' ');
    const botHand = evaluateXiDachHand(game.botCards);
    botHandDesc = `**${botHand.description}** (${botHand.name})`;
  }

  let color = config.colors.primary;
  let title = '🃏 BÀN XÌ DÁCH 21 ĐIỂM VỚI BOT 🤖';

  if (isFinished && outcomeInfo) {
    title = outcomeInfo.title;
    color = outcomeInfo.color;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `Sòng Xì Dách | ${game.username}`, iconURL: game.avatarUrl })
    .setTitle(title)
    .addFields(
      {
        name: `👤 Bài của bạn (${playerHand.name})`,
        value: `${playerCardStr}\n➡️ **${playerHand.description}**`,
        inline: false
      },
      {
        name: `🤖 Bài của Bot`,
        value: `${botCardStr}\n➡️ ${botHandDesc}`,
        inline: false
      },
      {
        name: '💰 Tiền cược',
        value: `**${game.amount.toLocaleString()}** XCCoin`,
        inline: true
      }
    );

  if (isFinished && outcomeInfo) {
    embed.addFields(
      {
        name: '🪙 Kết quả cược',
        value: outcomeInfo.balanceText,
        inline: true
      },
      {
        name: '⭐ Tu vi nhận được',
        value: `+**${outcomeInfo.earnedXp.toLocaleString()}** XP`,
        inline: true
      },
      {
        name: '💳 Số dư ví mới',
        value: `**${outcomeInfo.newBalance.toLocaleString()}** XCCoin`,
        inline: true
      }
    );
    embed.setFooter({ text: '⏱️ Ván bài sẽ tự động xóa sau 10 giây để giữ sạch kênh.' });
  } else {
    embed.setFooter({ text: '🃏 Bấm [Rút Bài] để lấy thêm lá hoặc [Dằn Bài] (khi đủ từ 16 điểm trở lên)' });
  }

  embed.setTimestamp();
  return embed;
}

/**
 * Tạo các nút hành động cho người chơi (Rút / Dằn)
 */
function createSoloActionRow(gameId, playerHand) {
  const canHit = playerHand.points < 21 && !playerHand.isBusted;
  const canStand = playerHand.points >= 16 && !playerHand.isBusted;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_xd_hit_${gameId}`)
      .setLabel('Rút Bài')
      .setEmoji('🃏')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!canHit),

    new ButtonBuilder()
      .setCustomId(`btn_xd_stand_${gameId}`)
      .setLabel('Dằn Bài')
      .setEmoji('✋')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!canStand)
  );

  return row;
}

/**
 * Bắt đầu một ván Xì Dách mới với Bot
 */
function startSoloGame({ userId, username, avatarUrl, guildId, amount }) {
  const deck = createShuffledDeck();

  const playerCards = [deck.pop(), deck.pop()];
  const botCards = [deck.pop(), deck.pop()];

  const gameId = `xd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const game = {
    gameId,
    userId,
    username,
    avatarUrl,
    guildId,
    amount,
    deck,
    playerCards,
    botCards,
    status: 'PLAYING',
    createdAt: Date.now()
  };

  activeSoloGames.set(gameId, game);

  // Kiểm tra ăn ngay khi chia 2 lá
  const pHand = evaluateXiDachHand(playerCards);
  const bHand = evaluateXiDachHand(botCards);

  // 1. Cả 2 cùng Xì Hoa / Xì Dách
  if ((pHand.isXiHoa || pHand.isBlackjack) && (bHand.isXiHoa || bHand.isBlackjack)) {
    if (pHand.tier === bHand.tier) {
      return settleGame(game, 'TIE', '🤝 CẢ HAI CÙNG XÌ DÁCH / XÌ HOA! (HÒA)');
    } else if (pHand.tier > bHand.tier) {
      return settleGame(game, 'WIN', '👑 BẠN CÓ XÌ HOA THẮNG XÌ DÁCH CỦA BOT!');
    } else {
      return settleGame(game, 'LOSE', '💀 BOT CÓ XÌ HOA THẮNG XÌ DÁCH CỦA BẠN!');
    }
  }

  // 2. Người chơi có Xì Hoa hoặc Xì Dách
  if (pHand.isXiHoa) {
    return settleGame(game, 'WIN', '👑 BẠN CÓ XÌ HOA (2 CON ÁT) - THẮNG TUYỆT ĐỐI!');
  }
  if (pHand.isBlackjack) {
    return settleGame(game, 'WIN', '🔥 BẠN CÓ XÌ DÁCH (BLACKJACK 21) - THẮNG NGAY!');
  }

  // 3. Bot có Xì Hoa hoặc Xì Dách
  if (bHand.isXiHoa) {
    return settleGame(game, 'LOSE', '💀 BOT CÓ XÌ HOA (2 CON ÁT) - BOT THẮNG!');
  }
  if (bHand.isBlackjack) {
    return settleGame(game, 'LOSE', '💀 BOT CÓ XÌ DÁCH (BLACKJACK 21) - BOT THẮNG!');
  }

  return { isInstant: false, game, embed: createSoloGameEmbed(game), row: createSoloActionRow(gameId, pHand) };
}

/**
 * Xử lý người chơi Rút Thêm Bài
 */
function handlePlayerHit(gameId, userId) {
  const game = activeSoloGames.get(gameId);
  if (!game || game.userId !== userId || game.status !== 'PLAYING') return null;

  if (game.playerCards.length >= 5) {
    return { success: false, reason: 'Bạn đã rút tối đa 5 lá bài!' };
  }

  const drawnCard = game.deck.pop();
  game.playerCards.push(drawnCard);

  const pHand = evaluateXiDachHand(game.playerCards);

  // Kiểm tra Quắc (> 21)
  if (pHand.isBusted) {
    return settleGame(game, 'LOSE', '💀 BẠN ĐÃ BỊ QUẮC (BÙ) VÌ VƯỢT QUÁ 21 ĐIỂM!');
  }

  // Kiểm tra Ngũ Linh (5 lá <= 21)
  if (pHand.isNguLinh) {
    return settleGame(game, 'WIN', '🌟 CHÚC MỪNG! BẠN ĐÃ ĐẠT NGŨ LINH (5 LÁ KHÔNG QUẮC)!');
  }

  return {
    isInstant: false,
    game,
    embed: createSoloGameEmbed(game),
    row: createSoloActionRow(gameId, pHand)
  };
}

/**
 * Xử lý người chơi Dằn Bài & Lượt của Bot
 */
function handlePlayerStand(gameId, userId) {
  const game = activeSoloGames.get(gameId);
  if (!game || game.userId !== userId || game.status !== 'PLAYING') return null;

  const pHand = evaluateXiDachHand(game.playerCards);
  if (pHand.points < 16) {
    return { success: false, reason: '❌ Bạn chưa đủ tuổi (cần tối thiểu 16 điểm mới được dằn bài)!' };
  }

  // Lượt Bot rút bài: Bot phải rút cho đến khi >= 16 điểm
  let bHand = evaluateXiDachHand(game.botCards);
  while (bHand.points < 16 && game.botCards.length < 5) {
    const newCard = game.deck.pop();
    game.botCards.push(newCard);
    bHand = evaluateXiDachHand(game.botCards);
  }

  // So sánh kết quả
  // 1. Bot bị quắc
  if (bHand.isBusted) {
    return settleGame(game, 'WIN', '🎉 BOT ĐÃ BỊ QUẮC (BÙ)! BẠN CHIẾN THẮNG!');
  }

  // 2. Bot đạt ngũ linh
  if (bHand.isNguLinh && !pHand.isNguLinh) {
    return settleGame(game, 'LOSE', '💀 BOT ĐẠT NGŨ LINH! BOT CHIẾN THẮNG!');
  }

  // 3. So điểm
  if (pHand.points > bHand.points) {
    return settleGame(game, 'WIN', `🎉 BẠN ĐẠT ${pHand.points} ĐIỂM THẮNG BOT (${bHand.points} ĐIỂM)!`);
  } else if (pHand.points < bHand.points) {
    return settleGame(game, 'LOSE', `💀 BOT ĐẠT ${bHand.points} ĐIỂM THẮNG BẠN (${pHand.points} ĐIỂM)!`);
  } else {
    // Bằng điểm
    return settleGame(game, 'TIE', `🤝 HÒA ĐIỂM (${pHand.points} ĐIỂM)! HOÀN TIỀN CƯỢC!`);
  }
}

/**
 * Kết toán ván bài, cộng trừ tiền và XP
 */
function settleGame(game, result, title) {
  game.status = 'ENDED';
  activeSoloGames.delete(game.gameId);

  const { userId, guildId, amount } = game;
  let color = config.colors.primary;
  let balanceText = '';
  let earnedXp = 15;

  if (result === 'WIN') {
    color = config.colors.success;
    db.addXCCoin(userId, guildId, amount);
    balanceText = `+**${amount.toLocaleString()}** XCCoin (Thắng cược)`;
    earnedXp = Math.floor(40 + amount * 0.01);
  } else if (result === 'LOSE') {
    color = config.colors.error;
    db.addXCCoin(userId, guildId, -amount);
    balanceText = `-**${amount.toLocaleString()}** XCCoin (Thua cược)`;
    earnedXp = Math.floor(15 + amount * 0.003);
  } else {
    color = config.colors.gold;
    balanceText = '±0 XCCoin (Hoàn lại 100% cược)';
    earnedXp = Math.floor(20 + amount * 0.005);
  }

  db.addXp(userId, guildId, earnedXp);
  const updatedUser = db.getUser(userId, guildId);

  const outcomeInfo = {
    title,
    color,
    balanceText,
    earnedXp,
    newBalance: updatedUser.xccoin || 0
  };

  return {
    isInstant: true,
    game,
    embed: createSoloGameEmbed(game, true, outcomeInfo),
    row: null
  };
}

module.exports = {
  activeSoloGames,
  startSoloGame,
  handlePlayerHit,
  handlePlayerStand
};
