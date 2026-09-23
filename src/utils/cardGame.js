const SUITS = [
  { symbol: '♠', name: 'Bích', color: 'black' },
  { symbol: '♣', name: 'Chuồn', color: 'black' },
  { symbol: '♦', name: 'Rô', color: 'red' },
  { symbol: '♥', name: 'Cơ', color: 'red' }
];

const RANKS = [
  { name: 'A', value: 1, order: 1 },
  { name: '2', value: 2, order: 2 },
  { name: '3', value: 3, order: 3 },
  { name: '4', value: 4, order: 4 },
  { name: '5', value: 5, order: 5 },
  { name: '6', value: 6, order: 6 },
  { name: '7', value: 7, order: 7 },
  { name: '8', value: 8, order: 8 },
  { name: '9', value: 9, order: 9 },
  { name: '10', value: 0, order: 10 },
  { name: 'J', value: 0, order: 11, isFace: true },
  { name: 'Q', value: 0, order: 12, isFace: true },
  { name: 'K', value: 0, order: 13, isFace: true }
];

/**
 * Tạo bộ bài 52 lá đã xáo trộn ngẫu nhiên
 */
function createShuffledDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        rank: rank.name,
        suit: suit.symbol,
        value: rank.value,
        order: rank.order,
        isFace: rank.isFace || false,
        display: `[ ${rank.name}${suit.symbol} ]`
      });
    }
  }

  // Thuật toán Fisher-Yates xáo bài ngẫu nhiên hoàn toàn
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

/**
 * Đánh giá tay bài Cào 3 lá
 * Phân cấp: Sáp (Tier 3) > Ba Tây (Tier 2) > Nút điểm 9..0 (Tier 1)
 */
function evaluateHand(cards) {
  // 1. Kiểm tra Sáp (3 lá cùng Rank)
  if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
    return {
      tier: 3,
      score: cards[0].order,
      name: `👑 Sáp ${cards[0].rank}`,
      description: `Sáp ${cards[0].rank} (Cao nhất)`
    };
  }

  // 2. Kiểm tra Ba Tây (Cả 3 lá đều là J, Q, K)
  if (cards[0].isFace && cards[1].isFace && cards[2].isFace) {
    return {
      tier: 2,
      score: 10,
      name: '✨ Ba Tây (Ba Tiên)',
      description: 'Ba Tây (Thắng điểm thường)'
    };
  }

  // 3. Tính điểm nút thông thường (tổng % 10)
  const sum = cards[0].value + cards[1].value + cards[2].value;
  const points = sum % 10;

  let name = `${points} Nút`;
  if (points === 0) name = 'Bù (0 Nút)';
  else if (points === 9) name = '🔥 9 Nút (Tối Đa)';

  return {
    tier: 1,
    score: points,
    name: name,
    description: points === 0 ? 'Bù điểm' : `${points} điểm`
  };
}

/**
 * Chơi 1 ván Bài Cào ngẫu nhiên giữa Người chơi và Bot
 */
function playBaiCao() {
  const deck = createShuffledDeck();

  // Chia 3 lá cho người chơi và 3 lá cho Bot
  const playerCards = [deck.pop(), deck.pop(), deck.pop()];
  const botCards = [deck.pop(), deck.pop(), deck.pop()];

  const playerHand = evaluateHand(playerCards);
  const botHand = evaluateHand(botCards);

  let result = 'TIE'; // 'WIN' | 'LOSE' | 'TIE'

  // So sánh Tier
  if (playerHand.tier > botHand.tier) {
    result = 'WIN';
  } else if (playerHand.tier < botHand.tier) {
    result = 'LOSE';
  } else {
    // Cùng Tier, so điểm số
    if (playerHand.score > botHand.score) {
      result = 'WIN';
    } else if (playerHand.score < botHand.score) {
      result = 'LOSE';
    } else {
      result = 'TIE';
    }
  }

  return {
    playerCards,
    botCards,
    playerHand,
    botHand,
    result
  };
}

module.exports = {
  playBaiCao,
  createShuffledDeck,
  evaluateHand
};
