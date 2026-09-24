const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../database/db');
const config = require('../config.json');

/**
 * Định dạng thời gian theo kiểu 'X phút trước' hoặc ngày giờ VN
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Gần đây';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 172800) return 'Hôm qua';
  const d = new Date(timestamp);
  return d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' });
}

/**
 * Lấy nhãn của bộ lọc game
 */
function getFilterLabel(filter) {
  switch (filter) {
    case 'BAICAO': return '🃏 Bài Cào (Solo & PvP)';
    case 'SLOT': return '🎰 Máy Quay Slot';
    case 'RPS': return '✊ Oẳn Tù Tì (Solo & PvP)';
    default: return '🌟 Tất Cả Trò Chơi';
  }
}

/**
 * Tạo Embed hiển thị danh sách Lịch Sử Đấu
 */
function createHistoryListEmbed(targetUser, historyData, statsData, filter = 'ALL') {
  const { page, totalPages, total, items } = historyData;

  const profitText = statsData.totalProfit >= 0
    ? `+${statsData.totalProfit.toLocaleString()} XCCoin`
    : `${statsData.totalProfit.toLocaleString()} XCCoin`;

  let description = `👤 **Thành viên:** <@${targetUser.id}>\n` +
    `🎮 **Tổng trận:** **${statsData.totalGames}** | 🏆 **Thắng:** **${statsData.wins}** (${statsData.winRate}%) | 💀 **Thua:** **${statsData.losses}** | 🤝 **Hòa:** **${statsData.ties}**\n` +
    `🪙 **Tổng lời/lỗ:** **${profitText}**\n` +
    `🔍 **Bộ lọc:** \`${getFilterLabel(filter)}\`\n` +
    '──────────────────────────────\n';

  if (!items || items.length === 0) {
    description += '\n*Chưa có ván đấu nào được ghi nhận trong danh mục này! Hãy tham gia chơi tại kênh trò chơi nhé!*';
  } else {
    items.forEach((item, idx) => {
      const num = (page - 1) * 10 + idx + 1;
      let badge = '⚪';
      let outcomeStr = '';

      if (item.result === 'WIN' || item.result === 'JACKPOT') {
        badge = item.result === 'JACKPOT' ? '🔥' : '🟢';
        outcomeStr = `**+${Math.abs(item.profit).toLocaleString()}** Coin (Thắng)`;
      } else if (item.result === 'LOSE') {
        badge = '🔴';
        outcomeStr = `**-${Math.abs(item.profit).toLocaleString()}** Coin (Thua)`;
      } else {
        badge = '🟡';
        outcomeStr = `**±0** Coin (Hòa)`;
      }

      const timeStr = formatTimeAgo(item.timestamp);
      description += `**${num}.** ${badge} **${item.gameName}** • *${timeStr}*\n` +
        `   💰 Cược: **${item.betAmount.toLocaleString()}** Coin ➡️ ${outcomeStr}\n` +
        `   📝 *${item.details || 'Không có mô tả chi tiết'}*\n\n`;
    });
  }

  const embed = new EmbedBuilder()
    .setColor(statsData.totalProfit >= 0 ? config.colors.success : config.colors.primary)
    .setAuthor({
      name: `Lịch Sử Đấu Game XCCoin | ${targetUser.username}`,
      iconURL: targetUser.displayAvatarURL({ dynamic: true })
    })
    .setTitle(`📜 LỊCH SỬ ĐẤU TRÒ CHƠI (${total} VÁN)`)
    .setDescription(description)
    .setFooter({ text: `Trang ${page}/${totalPages} • Dữ liệu lưu trữ thời gian thực` })
    .setTimestamp();

  return embed;
}

/**
 * Tạo Embed hiển thị Thống Kê Tổng Quan
 */
function createStatsEmbed(targetUser, statsData) {
  const profitColor = statsData.totalProfit > 0
    ? config.colors.success
    : (statsData.totalProfit < 0 ? config.colors.error : config.colors.gold);

  const profitText = statsData.totalProfit >= 0
    ? `+${statsData.totalProfit.toLocaleString()} XCCoin`
    : `${statsData.totalProfit.toLocaleString()} XCCoin`;

  const embed = new EmbedBuilder()
    .setColor(profitColor)
    .setAuthor({
      name: `Thống Kê Thần Bài | ${targetUser.username}`,
      iconURL: targetUser.displayAvatarURL({ dynamic: true })
    })
    .setTitle('📊 BẢNG THỐNG KÊ CHIẾN TÍCH TOÀN BỘ GAME')
    .setDescription(
      `Tổng kết phong độ và biến động tài sản của <@${targetUser.id}>:\n\n` +
      `🎮 **Tổng số trận đã đấu:** **${statsData.totalGames.toLocaleString()}** ván\n` +
      `🏆 **Thắng:** **${statsData.wins.toLocaleString()}** trận (**${statsData.winRate}%** tỷ lệ thắng)\n` +
      `💀 **Thua:** **${statsData.losses.toLocaleString()}** trận | 🤝 **Hòa:** **${statsData.ties.toLocaleString()}** trận\n` +
      `💰 **Tổng tiền đã cược:** **${statsData.totalWagered.toLocaleString()}** XCCoin\n` +
      `🪙 **Lãi / Lỗ ròng:** **${profitText}**\n` +
      '──────────────────────────────'
    );

  // Thêm breakdown từng trò chơi
  const gameEntries = Object.entries(statsData.byGame);
  if (gameEntries.length === 0) {
    embed.addFields({
      name: '🎲 Chi tiết từng trò chơi',
      value: '*Chưa tham gia trò chơi nào.*'
    });
  } else {
    for (const [key, g] of gameEntries) {
      const gWinRate = g.count > 0 ? Math.round((g.wins / g.count) * 100) : 0;
      const gProfitText = g.profit >= 0 ? `+${g.profit.toLocaleString()}` : `${g.profit.toLocaleString()}`;
      embed.addFields({
        name: `${g.name} (${g.count} ván)`,
        value: `• Thắng: **${g.wins}** (${gWinRate}%) | Thua: **${g.losses}** | Hòa: **${g.ties}**\n` +
               `• Lãi ròng: **${gProfitText}** XCCoin`,
        inline: true
      });
    }
  }

  embed.setFooter({ text: 'Dữ liệu tính từ tất cả các ván game ghi nhận trên hệ thống.' });
  embed.setTimestamp();

  return embed;
}

/**
 * Tạo các hàng nút chuyển trang và đổi góc nhìn
 */
function createHistoryActionRows(targetUserId, currentPage, totalPages, currentFilter = 'ALL', currentView = 'HISTORY') {
  const rows = [];

  // Hàng 1: Nút phân trang (chỉ khi đang ở chế độ xem danh sách)
  if (currentView === 'HISTORY' && totalPages > 1) {
    const rowPagination = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_hist_first_${targetUserId}_${currentFilter}`)
        .setLabel('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage <= 1),

      new ButtonBuilder()
        .setCustomId(`btn_hist_prev_${targetUserId}_${currentFilter}_${currentPage - 1}`)
        .setLabel('◀️ Trang trước')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage <= 1),

      new ButtonBuilder()
        .setCustomId('btn_hist_page_indicator')
        .setLabel(`${currentPage}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),

      new ButtonBuilder()
        .setCustomId(`btn_hist_next_${targetUserId}_${currentFilter}_${currentPage + 1}`)
        .setLabel('Trang sau ▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage >= totalPages),

      new ButtonBuilder()
        .setCustomId(`btn_hist_last_${targetUserId}_${currentFilter}_${totalPages}`)
        .setLabel('⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages)
    );
    rows.push(rowPagination);
  }

  // Hàng 2: Nút chuyển chế độ (Xem Thống Kê / Xem Danh Sách) & Lọc nhanh
  const rowControls = new ActionRowBuilder();

  if (currentView === 'HISTORY') {
    rowControls.addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_hist_mode_stats_${targetUserId}_${currentFilter}`)
        .setLabel('📊 Xem Thống Kê')
        .setStyle(ButtonStyle.Success)
    );
  } else {
    rowControls.addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_hist_mode_list_${targetUserId}_${currentFilter}`)
        .setLabel('📜 Xem Lịch Sử Đấu')
        .setStyle(ButtonStyle.Primary)
    );
  }

  // Nút lọc: Tất Cả, Bài Cào, Slot, Oẳn Tù Tì
  rowControls.addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_hist_filter_${targetUserId}_ALL_${currentView}`)
      .setLabel('Tất Cả')
      .setStyle(currentFilter === 'ALL' ? ButtonStyle.Primary : ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`btn_hist_filter_${targetUserId}_BAICAO_${currentView}`)
      .setLabel('Bài Cào')
      .setStyle(currentFilter === 'BAICAO' ? ButtonStyle.Primary : ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`btn_hist_filter_${targetUserId}_SLOT_${currentView}`)
      .setLabel('Slot')
      .setStyle(currentFilter === 'SLOT' ? ButtonStyle.Primary : ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`btn_hist_filter_${targetUserId}_RPS_${currentView}`)
      .setLabel('Oẳn Tù Tì')
      .setStyle(currentFilter === 'RPS' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  rows.push(rowControls);

  return rows;
}

/**
 * Xây dựng payload hoàn chỉnh cho Lịch Sử Đấu
 */
function buildHistoryPayload({ targetUser, guildId, page = 1, filter = 'ALL', viewMode = 'HISTORY' }) {
  const statsData = db.getUserGameStats(targetUser.id, guildId);
  const historyData = db.getUserGameHistory(targetUser.id, guildId, { limit: 10, page, game: filter });

  const embed = viewMode === 'STATS'
    ? createStatsEmbed(targetUser, statsData)
    : createHistoryListEmbed(targetUser, historyData, statsData, filter);

  const components = createHistoryActionRows(targetUser.id, historyData.page, historyData.totalPages, filter, viewMode);

  return {
    embeds: [embed],
    components
  };
}

module.exports = {
  formatTimeAgo,
  getFilterLabel,
  createHistoryListEmbed,
  createStatsEmbed,
  createHistoryActionRows,
  buildHistoryPayload
};
