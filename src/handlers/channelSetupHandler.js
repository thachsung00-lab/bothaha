const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { createFeaturePanel } = require('../utils/panelBuilder');
const { createGamePanel } = require('../utils/gamePanelBuilder');
const { createCoinPayPanel } = require('../utils/coinPayPanelBuilder');
const config = require('../config.json');

/**
 * Tự động tạo Danh mục và 4 Kênh kèm phân quyền chuẩn và bảng điều khiển
 * @param {import('discord.js').Guild} guild
 */
async function setupGuildChannels(guild) {
  try {
    const botUser = guild.client.user;
    const botMember = await guild.members.fetch(botUser.id).catch(() => null);

    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
      console.warn(`[ChannelSetup] Bot không có quyền ManageChannels trong server ${guild.name} (${guild.id})`);
      return { success: false, reason: 'Bot thiếu quyền ManageChannels (Quản lý Kênh)' };
    }

    const channels = await guild.channels.fetch();
    const channelList = channels.values ? Array.from(channels.values()) : Array.from(channels);
    const findChannel = (predicate) => channels.find ? channels.find(predicate) : channelList.find(predicate);

    // 1. Tìm hoặc tạo Category "🎶 GIẢI TRÍ - GAME"
    let category = findChannel(c => c && c.type === ChannelType.GuildCategory && c.name && c.name.includes('GIẢI TRÍ - GAME'));
    if (!category) {
      category = await guild.channels.create({
        name: '🎶 GIẢI TRÍ - GAME',
        type: ChannelType.GuildCategory
      });
      console.log(`[ChannelSetup] Đã tạo Danh mục "🎶 GIẢI TRÍ - GAME" trong ${guild.name}`);
    }

    // Lấy danh sách Member Roles (loại trừ @everyone và role của bot)
    const roleList = guild.roles.cache.values ? Array.from(guild.roles.cache.values()) : Array.from(guild.roles.cache);
    const memberRoles = roleList.filter(r => r.id !== guild.id && !r.managed);

    const botPermissions = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.ManageMessages
    ];

    // Cấu hình quyền cho xccoingame (Khóa @everyone, Member roles được xem & chat)
    const gameOverwrites = [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: botUser.id,
        allow: botPermissions
      }
    ];
    for (const role of memberRoles) {
      gameOverwrites.push({
        id: role.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
      });
    }

    // Cấu hình quyền cho traide-xccoin (Khóa @everyone, Member roles xem nhưng KHÔNG chat)
    const tradeOverwrites = [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: botUser.id,
        allow: botPermissions
      }
    ];
    for (const role of memberRoles) {
      tradeOverwrites.push({
        id: role.id,
        allow: [PermissionFlagsBits.ViewChannel],
        deny: [PermissionFlagsBits.SendMessages]
      });
    }

    const created = {};

    // 2. Kênh #điểm-danh-ngày (Công khai)
    let checkinChannel = findChannel(c => c && c.isTextBased() && c.name === 'điểm-danh-ngày');
    if (!checkinChannel) {
      checkinChannel = await guild.channels.create({
        name: 'điểm-danh-ngày',
        type: ChannelType.GuildText,
        parent: category.id,
        topic: '📅 Kênh điểm danh nhận thưởng hàng ngày & Bảng Tiện Ích Server'
      });
      console.log(`[ChannelSetup] Đã tạo kênh #điểm-danh-ngày`);
    }
    // Gửi Bảng Tiện Ích
    const featPayload = createFeaturePanel();
    const sentFeat = await checkinChannel.send(featPayload);
    db.setGuildSettings(guild.id, {
      checkinChannelId: checkinChannel.id,
      panelMessageId: sentFeat.id
    });
    created.checkin = checkinChannel;

    // 3. Kênh #rank (Công khai)
    let rankChannel = findChannel(c => c && c.isTextBased() && c.name === 'rank');
    if (!rankChannel) {
      rankChannel = await guild.channels.create({
        name: 'rank',
        type: ChannelType.GuildText,
        parent: category.id,
        topic: '📊 Kênh tra cứu cấp độ (/rank), tiến trình thăng hạng và vinh danh Top thành viên'
      });
      console.log(`[ChannelSetup] Đã tạo kênh #rank`);

      const rankEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('📊 KHU VỰC TRA CỨU CẤP BẬC & XẾP HẠNG SERVER 🏆')
        .setDescription(
          'Chào mừng bạn đến với kênh Xếp Hạng & Cấp Bậc:\n\n' +
          '• Gõ **/rank** — Xem hồ sơ cấp bậc, thanh tiến trình thăng cấp, số giờ Voice và ví XCCoin cá nhân.\n' +
          '• Gõ **/leaderboard** — Xem Top 10 thành viên sở hữu Tổng XP cao nhất, chăm ngồi Voice nhất hoặc Đại gia XCCoin.\n' +
          '• 🎙️ **Cơ chế Voice:** Tự động cộng **1,000 XCCoin** cho mỗi 1 giờ ngồi phòng voice online!'
        )
        .setFooter({ text: 'Hệ thống tự động đồng bộ theo thời gian thực' })
        .setTimestamp();

      await rankChannel.send({ embeds: [rankEmbed] }).catch(() => {});
    }
    created.rank = rankChannel;

    // 4. Kênh #xccoingame (Riêng tư - Có khóa 🔒)
    let gameChannel = findChannel(c => c && c.isTextBased() && c.name === 'xccoingame');
    if (!gameChannel) {
      gameChannel = await guild.channels.create({
        name: 'xccoingame',
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: gameOverwrites,
        topic: '🎰 Sòng bạc & Trò chơi XCCoin (Máy Quay Slot Nổ Hũ x20, Bài Cào 3 Lá, Oẳn Tù Tì)'
      });
      console.log(`[ChannelSetup] Đã tạo kênh #xccoingame`);
    } else {
      // Cập nhật permission overwrites nếu kênh đã có sẵn
      await gameChannel.permissionOverwrites.set(gameOverwrites).catch(() => {});
    }
    // Gửi Bảng Khu Trò Chơi
    const gamePayload = createGamePanel();
    const sentGame = await gameChannel.send(gamePayload).catch(() => null);
    if (sentGame) {
      db.setGuildSettings(guild.id, {
        gameChannelId: gameChannel.id,
        gameMessageId: sentGame.id
      });
    }
    created.game = gameChannel;

    // 5. Kênh #traide-xccoin (Riêng tư - Có khóa 🔒, Read-only cho member)
    let tradeChannel = findChannel(c => c && c.isTextBased() && (c.name === 'traide-xccoin' || c.name === 'giao-dịch-xccoin' || c.name === 'trade-coin'));
    if (!tradeChannel) {
      tradeChannel = await guild.channels.create({
        name: 'traide-xccoin',
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: tradeOverwrites,
        topic: '🪙 Kênh giao dịch chuyển tiền XCCoin & Lưu trữ biên lai giao dịch của server'
      });
      console.log(`[ChannelSetup] Đã tạo kênh #traide-xccoin`);
    } else {
      // Cập nhật permission overwrites nếu kênh đã có sẵn
      await tradeChannel.permissionOverwrites.set(tradeOverwrites).catch(() => {});
    }
    // Gửi Bảng Coin Pay
    const coinPayPayload = createCoinPayPanel();
    const sentCoinPay = await tradeChannel.send(coinPayPayload).catch(() => null);
    db.setGuildSettings(guild.id, {
      coinPayChannelId: tradeChannel.id,
      coinPayMessageId: sentCoinPay?.id || null,
      billChannelId: tradeChannel.id
    });
    created.trade = tradeChannel;

    return {
      success: true,
      category,
      channels: created
    };
  } catch (error) {
    console.error(`[ChannelSetup] Lỗi khi tạo kênh trong guild ${guild.name}:`, error);
    return { success: false, reason: error.message };
  }
}

module.exports = {
  setupGuildChannels
};
