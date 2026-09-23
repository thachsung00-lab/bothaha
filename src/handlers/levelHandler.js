/**
 * Hệ thống 20 Cảnh Giới Tu Tiên & Cấp Độ XP
 */

// 4 Đại Cảnh Giới Tu Tiên tương ứng với 20 Cấp Độ
const CULTIVATION_LEVELS = [
  { level: 0, realm: 'Phàm Nhân', title: 'Chưa Nhập Đạo', requiredXp: 0 },

  // I. Phàm Trần Nhập Đạo (Khởi điểm tu hành)
  { level: 1, realm: 'Phàm Trần Nhập Đạo', title: 'Người Mới', requiredXp: 500 },
  { level: 2, realm: 'Phàm Trần Nhập Đạo', title: 'Luyện Khí', requiredXp: 1200 },
  { level: 3, realm: 'Phàm Trần Nhập Đạo', title: 'Trúc Cơ', requiredXp: 2200 },
  { level: 4, realm: 'Phàm Trần Nhập Đạo', title: 'Kết Đan', requiredXp: 3500 },
  { level: 5, realm: 'Phàm Trần Nhập Đạo', title: 'Nguyên Anh', requiredXp: 5200 },

  // II. Thông Thiên Triệt Địa (Đỉnh cao nhân giới)
  { level: 6, realm: 'Thông Thiên Triệt Địa', title: 'Hóa Thần', requiredXp: 7500 },
  { level: 7, realm: 'Thông Thiên Triệt Địa', title: 'Luyện Hư', requiredXp: 10500 },
  { level: 8, realm: 'Thông Thiên Triệt Địa', title: 'Hợp Thể', requiredXp: 14500 },
  { level: 9, realm: 'Thông Thiên Triệt Địa', title: 'Đại Thừa', requiredXp: 19500 },
  { level: 10, realm: 'Thông Thiên Triệt Địa', title: 'Độ Kiếp', requiredXp: 26000 },

  // III. Vãng Sinh Tiên Cảnh (Bước vào Tiên giới)
  { level: 11, realm: 'Vãng Sinh Tiên Cảnh', title: 'Phi Thăng', requiredXp: 34000 },
  { level: 12, realm: 'Vãng Sinh Tiên Cảnh', title: 'Chân Tiên', requiredXp: 44000 },
  { level: 13, realm: 'Vãng Sinh Tiên Cảnh', title: 'Kim Tiên', requiredXp: 56000 },
  { level: 14, realm: 'Vãng Sinh Tiên Cảnh', title: 'Thái Ất', requiredXp: 70000 },
  { level: 15, realm: 'Vãng Sinh Tiên Cảnh', title: 'Đại La', requiredXp: 86000 },

  // IV. Quy Chân Chứng Đạo (Thoát khỏi càn khôn)
  { level: 16, realm: 'Quy Chân Chứng Đạo', title: 'Tiên Vương', requiredXp: 105000 },
  { level: 17, realm: 'Quy Chân Chứng Đạo', title: 'Chuẩn Thánh', requiredXp: 128000 },
  { level: 18, realm: 'Quy Chân Chứng Đạo', title: 'Thánh Nhân', requiredXp: 155000 },
  { level: 19, realm: 'Quy Chân Chứng Đạo', title: 'Hỗn Nguyên', requiredXp: 187000 },
  { level: 20, realm: 'Quy Chân Chứng Đạo', title: 'Vượt Qua Tam Giới', requiredXp: 225000 }
];

const MAX_LEVEL = 20;

/**
 * Lấy mốc tổng XP tối thiểu để đạt level
 * @param {number} level
 * @returns {number}
 */
function getRequiredXpForLevel(level) {
  if (level <= 0) return 0;
  if (level > MAX_LEVEL) {
    // Ngoài cấp 20: mỗi cấp tăng thêm 45,000 XP
    return CULTIVATION_LEVELS[MAX_LEVEL].requiredXp + (level - MAX_LEVEL) * 45000;
  }
  return CULTIVATION_LEVELS[level].requiredXp;
}

/**
 * Tính thông tin cấp bậc & cảnh giới tu tiên từ tổng XP
 * @param {number} totalXp
 */
function getLevelInfo(totalXp) {
  if (!totalXp || totalXp < 0) totalXp = 0;

  let level = 0;
  while (level < MAX_LEVEL && totalXp >= getRequiredXpForLevel(level + 1)) {
    level++;
  }

  const isMaxLevel = level >= MAX_LEVEL;
  const currentLevelConfig = CULTIVATION_LEVELS[level] || CULTIVATION_LEVELS[0];
  const realm = currentLevelConfig.realm;
  const title = currentLevelConfig.title;
  const formattedTitle = level > 0 ? `[${realm}] Cấp ${level}: ${title}` : `Phàm Nhân - ${title}`;

  const currentLevelMinXp = getRequiredXpForLevel(level);
  const nextLevelMinXp = isMaxLevel ? currentLevelMinXp : getRequiredXpForLevel(level + 1);
  const neededXp = isMaxLevel ? 0 : nextLevelMinXp - currentLevelMinXp;
  const currentProgressXp = isMaxLevel ? totalXp - currentLevelMinXp : totalXp - currentLevelMinXp;
  const progressPercent = isMaxLevel ? 100 : Math.min(100, Math.floor((currentProgressXp / (neededXp || 1)) * 100));

  return {
    level,
    realm,
    title,
    formattedTitle,
    totalXp,
    currentProgressXp,
    neededXp,
    nextLevelMinXp,
    progressPercent,
    isMaxLevel
  };
}

/**
 * Tính toán XP thưởng sau mỗi ván Bài Cào với Bot
 * @param {'WIN' | 'LOSE' | 'TIE'} result
 * @param {object} hand (kết quả evaluateHand)
 * @param {number} betAmount (số tiền cược)
 * @returns {number} Số XP thưởng
 */
function calculateCardGameXp(result, hand, betAmount = 100) {
  const safeAmount = Math.max(0, betAmount);
  if (result === 'WIN') {
    let baseXp = 30;
    let rate = 0.008;

    if (hand && hand.tier === 3) {
      // Sáp
      baseXp = 120;
      rate = 0.02;
    } else if (hand && hand.tier === 2) {
      // Ba Tây
      baseXp = 80;
      rate = 0.015;
    } else if (hand && hand.score >= 8) {
      // 8 - 9 Nút
      baseXp = 50;
      rate = 0.01;
    }

    return Math.floor(baseXp + safeAmount * rate);
  } else if (result === 'TIE') {
    return Math.floor(15 + safeAmount * 0.005);
  } else {
    // LOSE
    return Math.floor(10 + safeAmount * 0.002);
  }
}

/**
 * Tính toán XP thưởng sau ván Bài Cào PvP (Nhiều người)
 * @param {boolean} isWinner
 * @param {object} hand
 * @param {number} potOrBet
 * @returns {number} Số XP thưởng
 */
function calculatePvpCardGameXp(isWinner, hand, potOrBet = 100) {
  const safeAmount = Math.max(0, potOrBet);
  if (isWinner) {
    let baseXp = 50;
    let rate = 0.005;

    if (hand && hand.tier === 3) {
      // Sáp
      baseXp = 150;
      rate = 0.015;
    } else if (hand && hand.tier === 2) {
      // Ba Tây
      baseXp = 100;
      rate = 0.01;
    } else if (hand && hand.score >= 8) {
      // 8 - 9 Nút
      baseXp = 70;
      rate = 0.008;
    }

    return Math.floor(baseXp + safeAmount * rate);
  } else {
    // Người tham gia khác
    return Math.floor(25 + safeAmount * 0.005);
  }
}

/**
 * Tạo thanh tiến trình (Progress Bar) trực quan
 * @param {number} current 
 * @param {number} max 
 * @param {number} size 
 * @returns {string}
 */
function createProgressBar(current, max, size = 10) {
  if (max <= 0) return '🟩'.repeat(size) + ' **100%**';
  const percentage = Math.min(1, Math.max(0, current / (max || 1)));
  const progress = Math.round(size * percentage);
  const emptyProgress = size - progress;

  const progressText = '🟩'.repeat(progress);
  const emptyProgressText = '⬛'.repeat(emptyProgress);

  return `${progressText}${emptyProgressText} **${Math.floor(percentage * 100)}%**`;
}

/**
 * Định dạng số phút voice thành định dạng đọc được (Ví dụ: "5 giờ 30 phút")
 * @param {number} totalMinutes 
 * @returns {string}
 */
function formatVoiceTime(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0 phút';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} phút`;
  if (mins === 0) return `${hours} giờ`;
  return `${hours} giờ ${mins} phút`;
}

module.exports = {
  CULTIVATION_LEVELS,
  MAX_LEVEL,
  getRequiredXpForLevel,
  getLevelInfo,
  calculateCardGameXp,
  calculatePvpCardGameXp,
  createProgressBar,
  formatVoiceTime
};
