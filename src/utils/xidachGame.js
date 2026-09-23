const { createShuffledDeck } = require('./cardGame');

/**
 * Tính điểm bộ bài Xì Dách (Blackjack phong cách Việt Nam)
 * @param {Array} cards Mảng các lá bài
 * @returns {object} { points, isBlackjack, isXiHoa, isNguLinh, isBusted, description, name }
 */
function evaluateXiDachHand(cards) {
  const numCards = cards.length;
  const aceCount = cards.filter(c => c.rank === 'A').length;

  // 1. Kiểm tra 2 lá đặc biệt
  if (numCards === 2) {
    // Xì Hoa (2 Át)
    if (aceCount === 2) {
      return {
        points: 21,
        tier: 4, // Cao nhất
        isXiHoa: true,
        isBlackjack: false,
        isNguLinh: false,
        isBusted: false,
        name: '👑 XÌ HOA (2 Con Át)',
        description: 'Xì Hoa - Thắng Tuyệt Đối'
      };
    }
    // Xì Dách (1 Át + 1 Con 10/J/Q/K)
    if (aceCount === 1) {
      const otherCard = cards.find(c => c.rank !== 'A');
      if (['10', 'J', 'Q', 'K'].includes(otherCard.rank)) {
        return {
          points: 21,
          tier: 3,
          isXiHoa: false,
          isBlackjack: true,
          isNguLinh: false,
          isBusted: false,
          name: '🔥 XÌ DÁCH (Blackjack)',
          description: 'Xì Dách 21 Điểm'
        };
      }
    }
  }

  // 2. Tính điểm thông thường (A có thể là 1, 10 hoặc 11)
  // Tính tổng điểm các lá không phải A trước
  let nonAceSum = 0;
  for (const c of cards) {
    if (c.rank !== 'A') {
      if (['J', 'Q', 'K'].includes(c.rank)) {
        nonAceSum += 10;
      } else {
        nonAceSum += c.value;
      }
    }
  }

  // Thử các giá trị của A: 11, 10, 1
  let bestPoints = -1;

  if (aceCount === 0) {
    bestPoints = nonAceSum;
  } else {
    // Duyệt qua các tổ hợp điểm có thể có của A
    // Với n lá A: mỗi lá có thể là 1, 10, 11 (thường chỉ tối đa 1 lá là 10 hoặc 11, các lá còn lại là 1)
    const possibleSums = [];

    function generateSums(aceIndex, currentSum) {
      if (aceIndex === aceCount) {
        possibleSums.push(currentSum);
        return;
      }
      // Rút từ 3 lá trở lên, Át thường tính 1, 10, hoặc 11
      const aceValues = numCards <= 3 ? [11, 10, 1] : [10, 1];
      for (const val of aceValues) {
        generateSums(aceIndex + 1, currentSum + val);
      }
    }

    generateSums(0, nonAceSum);

    // Tìm tổng điểm tốt nhất <= 21, nếu không có thì lấy điểm nhỏ nhất (ít quắc nhất)
    const validSums = possibleSums.filter(s => s <= 21);
    if (validSums.length > 0) {
      bestPoints = Math.max(...validSums);
    } else {
      bestPoints = Math.min(...possibleSums);
    }
  }

  const isBusted = bestPoints > 21;
  const isNguLinh = numCards === 5 && !isBusted;

  let tier = 1;
  let name = `${bestPoints} Điểm`;
  let description = `${bestPoints} điểm`;

  if (isNguLinh) {
    tier = 2.5; // Ngũ linh ăn điểm thường 21
    name = `🌟 NGŨ LINH (${bestPoints} Điểm)`;
    description = 'Ngũ Linh (5 lá không quắc)';
  } else if (isBusted) {
    tier = 0;
    name = `💀 QUẮC (BÙ) - ${bestPoints} Điểm`;
    description = 'Bù điểm (> 21)';
  } else if (bestPoints === 21) {
    tier = 2;
    name = '🎯 21 ĐIỂM (Tối Đa)';
    description = '21 Điểm chuẩn';
  } else if (bestPoints < 16) {
    description = `${bestPoints} điểm (Chưa đủ tuổi < 16)`;
  }

  return {
    points: bestPoints,
    tier,
    isXiHoa: false,
    isBlackjack: false,
    isNguLinh,
    isBusted,
    name,
    description
  };
}

module.exports = {
  evaluateXiDachHand
};
