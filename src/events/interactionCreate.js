const { Events, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const dailyCommand = require('../commands/daily');
const db = require('../database/db');
const levelHandler = require('../handlers/levelHandler');
const { playBaiCao } = require('../utils/cardGame');
const { createRoom, joinRoom, leaveRoom, cancelRoom, startRoomGame, getRoom } = require('../handlers/pvpGameHandler');
const { createPvpLobbyPayload, createPvpResultPayload, createPvpCancelledPayload } = require('../utils/pvpPanelBuilder');
const { playSlot, createSlotResultEmbed, createSlotRulesEmbed } = require('../utils/slotGame');
const { handlePlayerHit, handlePlayerStand } = require('../handlers/xidachSoloHandler');
const { joinXiDachRoom, leaveXiDachRoom, cancelXiDachRoom, startXiDachRoomGame, getXiDachRoom } = require('../handlers/xidachPvpHandler');
const { createXiDachPvpLobbyPayload, createXiDachPvpResultPayload, createXiDachPvpCancelledPayload } = require('../utils/xidachPvpPanelBuilder');
const { createSelectRecipientPayload, createTransferReceiptEmbed, getTradeOrNotifyChannel, refreshCoinPayPanel } = require('../utils/coinPayPanelBuilder');
const config = require('../config.json');

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

/**
 * Phản hồi tin nhắn riêng tư và tự động xóa sau 15 giây
 */
async function replyEphemeralAutoDelete(interaction, content, delay = 15000) {
  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content, ephemeral: true }).catch(() => { });
    } else if (interaction.deferred) {
      await interaction.editReply({ content }).catch(() => { });
    } else {
      await interaction.followUp({ content, ephemeral: true }).catch(() => { });
    }
    setTimeout(() => interaction.deleteReply().catch(() => { }), delay);
  } catch (e) { }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // ==========================================
    // 1. Xử lý Slash Commands
    // ==========================================
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`Không tìm thấy lệnh ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Lỗi khi thực thi lệnh ${interaction.commandName}:`, error);
        await replyEphemeralAutoDelete(interaction, '❌ Đã xảy ra lỗi khi thực thi lệnh này!');
      }
    }

    // ==========================================
    // 2. Xử lý Click Nút Bấm (Button Interaction)
    // ==========================================
    else if (interaction.isButton()) {
      const userId = interaction.user.id;
      const guildId = interaction.guildId;

      try {
        // --- Nút trên Bảng Tiện Ích (/choose) ---
        if (interaction.customId === 'btn_daily_checkin') {
          await dailyCommand.execute(interaction);
        }
        else if (interaction.customId === 'btn_view_rank') {
          await interaction.deferReply({ ephemeral: true });

          const userData = db.getUser(userId, guildId);
          const levelInfo = levelHandler.getLevelInfo(userData.xp || 0);
          const rank = db.getUserRank(userId, guildId);
          const progressBar = levelHandler.createProgressBar(levelInfo.currentProgressXp, levelInfo.neededXp, 10);
          const voiceTimeStr = levelHandler.formatVoiceTime(userData.voiceMinutes || 0);

          const progressTitle = levelInfo.isMaxLevel
            ? '🌟 Tiến trình tu vi'
            : `📈 Tiến trình lên Cấp ${levelInfo.level + 1} (${levelHandler.CULTIVATION_LEVELS[levelInfo.level + 1]?.title || ''})`;
          const progressDesc = levelInfo.isMaxLevel
            ? `${progressBar}\n*(Đã đạt cảnh giới tối cao: **Vượt Qua Tam Giới**)*`
            : `${progressBar}\n*(**${levelInfo.currentProgressXp.toLocaleString()}** / **${levelInfo.neededXp.toLocaleString()}** XP để đột phá)*`;

          const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setAuthor({ name: `Hồ sơ Cấp Bậc | ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
              { name: '🔮 Cảnh Giới Tu Tiên', value: `**[ ${levelInfo.realm} ]**\n➡️ Cấp **${levelInfo.level}**: **${levelInfo.title}**`, inline: false },
              { name: '🏆 Thứ hạng Server', value: `Top **#${rank}**`, inline: true },
              { name: '🎖️ Cấp độ (Level)', value: `Level **${levelInfo.level}**`, inline: true },
              { name: '⭐ Tổng XP', value: `**${(userData.xp || 0).toLocaleString()}** XP`, inline: true },
              {
                name: progressTitle,
                value: progressDesc,
                inline: false
              },
              { name: '🎙️ Thời gian Voice', value: `⏱️ **${voiceTimeStr}**`, inline: true },
              { name: '🪙 Ví XCCoin', value: `**${(userData.xccoin || 0).toLocaleString()}** XCCoin`, inline: true },
              { name: '🔥 Chuỗi Điểm Danh', value: `**${userData.dailyStreak || 0}** ngày`, inline: true },
              { name: '📅 Tổng số lần điểm danh', value: `**${userData.totalDaily || 0}** lần`, inline: true }
            )
            .setFooter({ text: 'Cứ mỗi 1 giờ online phòng voice bạn sẽ nhận được 1,000 XCCoin! • Tự động đóng sau 1 phút' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          setTimeout(() => interaction.deleteReply().catch(() => { }), 60000);
        }
        else if (interaction.customId === 'btn_view_coin') {
          await interaction.deferReply({ ephemeral: true });

          const userData = db.getUser(userId, guildId);
          const balance = (userData.xccoin || 0).toLocaleString();

          const embed = new EmbedBuilder()
            .setColor(config.colors.gold)
            .setAuthor({ name: `Ví XCCoin | ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/217/217853.png')
            .addFields(
              { name: '🪙 Số dư khả dụng', value: `**${balance}** XCCoin`, inline: true },
              { name: '🎙️ Tỷ lệ kiếm tiền Voice', value: `**+${config.voice.coinsPerHour || 1000}** XCCoin/giờ`, inline: true },
              { name: '📅 Điểm danh hàng ngày', value: `**+${config.daily.baseCoin || 200}** XCCoin/ngày`, inline: true }
            )
            .setFooter({ text: 'Tham gia các kênh Voice để tích lũy thêm XCCoin! • Tự động đóng sau 1 phút' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          setTimeout(() => interaction.deleteReply().catch(() => { }), 60000);
        }
        else if (interaction.customId === 'btn_view_top') {
          await interaction.deferReply({ ephemeral: true });

          const topUsers = db.getLeaderboard(guildId, 'xp', 10);
          let description = '';

          if (!topUsers.length) {
            description = 'Chưa có dữ liệu xếp hạng nào trong server.';
          } else {
            for (let i = 0; i < topUsers.length; i++) {
              const u = topUsers[i];
              const medal = MEDALS[i] || `**#${i + 1}**`;
              const levelInfo = levelHandler.getLevelInfo(u.xp || 0);
              const voiceTime = levelHandler.formatVoiceTime(u.voiceMinutes || 0);
              const coins = (u.xccoin || 0).toLocaleString();

              const realmTag = levelInfo.level > 0 ? `[${levelInfo.realm}] ` : '';
              description += `${medal} <@${u.userId}>\n`;
              description += `   ⭐ **${(u.xp || 0).toLocaleString()} XP** • 🔮 **${realmTag}Cấp ${levelInfo.level}: ${levelInfo.title}** • 🪙 ${coins} XCCoin\n\n`;
            }
          }

          const embed = new EmbedBuilder()
            .setColor(config.colors.gold)
            .setTitle('🏆 BẢNG XẾP HẠNG TOP THÀNH VIÊN SERVER')
            .setDescription(description)
            .setFooter({ text: 'Gõ /leaderboard để xem thêm theo Voice hoặc XCCoin! • Tự động đóng sau 15 giây' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          setTimeout(() => interaction.deleteReply().catch(() => { }), 15000);
        }

        // --- Nút trên Bảng Khu Trò Chơi XCCoin (/setgame) ---
        else if (interaction.customId === 'btn_game_slot') {
          // Mở Modal nhập tiền cược quay Slot
          const modal = new ModalBuilder()
            .setCustomId('modal_bet_slot')
            .setTitle('🎰 Quay Slot Machine (100 - 10,000 Coin)');

          const amountInput = new TextInputBuilder()
            .setCustomId('input_slot_amount')
            .setLabel('Số XCCoin Đặt Cược (100 đến 10,000)')
            .setPlaceholder('Ví dụ: 500')
            .setMinLength(3)
            .setMaxLength(5)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
          await interaction.showModal(modal);
        }
        else if (interaction.customId === 'btn_game_slot_quick_500' || interaction.customId === 'btn_game_slot_quick_1000') {
          const betAmount = interaction.customId === 'btn_game_slot_quick_500' ? 500 : 1000;
          const user = db.getUser(userId, guildId);
          if ((user.xccoin || 0) < betAmount) {
            return replyEphemeralAutoDelete(
              interaction,
              `❌ Số dư của bạn không đủ! Bạn có **${(user.xccoin || 0).toLocaleString()} XCCoin**, cần **${betAmount.toLocaleString()} XCCoin** để cược.`
            );
          }

          // Trừ tiền cược & quay
          db.addXCCoin(userId, guildId, -betAmount);
          const result = playSlot(betAmount);

          if (result.payout > 0) {
            db.addXCCoin(userId, guildId, result.payout);
          }
          db.addXp(userId, guildId, result.earnedXp);

          const updatedUser = db.getUser(userId, guildId);
          const embed = createSlotResultEmbed(interaction.user, result, updatedUser.xccoin || 0);

          await interaction.reply({ embeds: [embed] });
          setTimeout(() => interaction.deleteReply().catch(() => { }), 15000);
        }
        else if (interaction.customId === 'btn_game_slot_rules') {
          await interaction.deferReply({ ephemeral: true });
          const embed = createSlotRulesEmbed();
          await interaction.editReply({ embeds: [embed] });
          setTimeout(() => interaction.deleteReply().catch(() => { }), 60000);
        }
        else if (interaction.customId === 'btn_game_baicao') {
          const modal = new ModalBuilder()
            .setCustomId('modal_bet_baicao')
            .setTitle('🃏 Bài Cào 3 Lá (100 - 10,000 Coin)');

          const amountInput = new TextInputBuilder()
            .setCustomId('input_baicao_amount')
            .setLabel('Số XCCoin Đặt Cược (100 đến 10,000)')
            .setPlaceholder('Ví dụ: 500')
            .setMinLength(3)
            .setMaxLength(5)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
          await interaction.showModal(modal);
        }
        else if (interaction.customId === 'btn_game_pvp_create') {
          const modal = new ModalBuilder()
            .setCustomId('modal_create_pvp')
            .setTitle('👥 Mở Bàn Cào Nhóm (PvP)');

          const amountInput = new TextInputBuilder()
            .setCustomId('input_pvp_amount')
            .setLabel('Số XCCoin Cược / Người (100 - 10,000)')
            .setPlaceholder('Ví dụ: 1000')
            .setMinLength(3)
            .setMaxLength(5)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const maxPlayersInput = new TextInputBuilder()
            .setCustomId('input_pvp_max_players')
            .setLabel('Số Người Tối Đa (Từ 2 đến 8, mặc định: 6)')
            .setPlaceholder('Ví dụ: 4')
            .setMinLength(1)
            .setMaxLength(1)
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

          modal.addComponents(
            new ActionRowBuilder().addComponents(amountInput),
            new ActionRowBuilder().addComponents(maxPlayersInput)
          );

          await interaction.showModal(modal);
        }
        else if (interaction.customId === 'btn_game_xidach') {
          const modal = new ModalBuilder()
            .setCustomId('modal_bet_xidach')
            .setTitle('🎴 Kéo Xì Dách vs Bot (100 - 10,000 Coin)');

          const amountInput = new TextInputBuilder()
            .setCustomId('input_xidach_amount')
            .setLabel('Số XCCoin Đặt Cược (100 đến 10,000)')
            .setPlaceholder('Ví dụ: 500')
            .setMinLength(3)
            .setMaxLength(5)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
          await interaction.showModal(modal);
        }
        else if (interaction.customId === 'btn_game_xdpvp_create') {
          const modal = new ModalBuilder()
            .setCustomId('modal_create_xdpvp')
            .setTitle('👥 Mở Bàn Xì Dách Nhóm (PvP)');

          const amountInput = new TextInputBuilder()
            .setCustomId('input_xdpvp_amount')
            .setLabel('Số XCCoin Cược / Người (100 - 10,000)')
            .setPlaceholder('Ví dụ: 1000')
            .setMinLength(3)
            .setMaxLength(5)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const maxPlayersInput = new TextInputBuilder()
            .setCustomId('input_xdpvp_max_players')
            .setLabel('Số Người Tối Đa (Từ 2 đến 8, mặc định: 6)')
            .setPlaceholder('Ví dụ: 4')
            .setMinLength(1)
            .setMaxLength(1)
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

          modal.addComponents(
            new ActionRowBuilder().addComponents(amountInput),
            new ActionRowBuilder().addComponents(maxPlayersInput)
          );

          await interaction.showModal(modal);
        }
        else if (interaction.customId.startsWith('btn_pvp_join_')) {
          const roomId = interaction.customId.replace('btn_pvp_join_', '');
          const res = joinRoom(roomId, userId, interaction.user.username);
          if (!res.success) {
            return replyEphemeralAutoDelete(interaction, `❌ ${res.reason}`);
          }

          const payload = createPvpLobbyPayload(res.room);
          await interaction.update(payload);
        }
        else if (interaction.customId.startsWith('btn_pvp_leave_')) {
          const roomId = interaction.customId.replace('btn_pvp_leave_', '');
          const res = leaveRoom(roomId, userId);
          if (!res.success) {
            return replyEphemeralAutoDelete(interaction, `❌ ${res.reason}`);
          }

          const payload = createPvpLobbyPayload(res.room);
          await interaction.update(payload);
        }
        else if (interaction.customId.startsWith('btn_pvp_start_')) {
          const roomId = interaction.customId.replace('btn_pvp_start_', '');
          const room = getRoom(roomId);
          if (!room) {
            return replyEphemeralAutoDelete(interaction, '❌ Bàn chơi không tồn tại hoặc đã kết thúc!');
          }
          if (room.hostId !== userId) {
            return replyEphemeralAutoDelete(interaction, '❌ Chỉ chủ bàn mới có thể bắt đầu ván bài!');
          }
          if (room.players.length < 2) {
            return replyEphemeralAutoDelete(interaction, '❌ Cần ít nhất 2 người chơi để bắt đầu!');
          }

          const result = startRoomGame(roomId);
          if (!result.success) {
            return replyEphemeralAutoDelete(interaction, `❌ ${result.reason}`);
          }

          const payload = createPvpResultPayload(result);
          await interaction.update(payload);

          // Sau khi kết thúc ván tự động xóa bàn chơi sau 15 giây
          setTimeout(async () => {
            try {
              if (interaction.message) {
                await interaction.message.delete().catch(() => { });
              }
            } catch (e) { }
          }, 15000);
        }
        else if (interaction.customId.startsWith('btn_pvp_cancel_')) {
          const roomId = interaction.customId.replace('btn_pvp_cancel_', '');
          const room = getRoom(roomId);
          if (!room) {
            return replyEphemeralAutoDelete(interaction, '❌ Bàn chơi không tồn tại hoặc đã kết thúc!');
          }
          const isHost = room.hostId === userId;
          const isAdmin = interaction.memberPermissions && interaction.memberPermissions.has('Administrator');
          if (!isHost && !isAdmin) {
            return replyEphemeralAutoDelete(interaction, '❌ Chỉ chủ bàn (hoặc Quản trị viên) mới có quyền hủy bàn!');
          }

          const cancelRes = cancelRoom(roomId, `Chủ bàn ${interaction.user.username} đã hủy bàn.`);
          if (cancelRes) {
            const payload = createPvpCancelledPayload(cancelRes.room, cancelRes.reason);
            await interaction.update(payload);
            // Tự động xóa thông báo hủy sau 10 giây
            setTimeout(async () => {
              try {
                if (interaction.message) {
                  await interaction.message.delete().catch(() => { });
                }
              } catch (e) { }
            }, 10000);
          } else {
            return replyEphemeralAutoDelete(interaction, '❌ Không thể hủy bàn chơi!');
          }
        }

        // --- Nút Xì Dách Solo với Bot (Hit & Stand) ---
        else if (interaction.customId.startsWith('btn_xd_hit_')) {
          const gameId = interaction.customId.replace('btn_xd_hit_', '');
          const res = handlePlayerHit(gameId, userId);
          if (!res) {
            return replyEphemeralAutoDelete(interaction, '❌ Ván bài không tồn tại hoặc không phải lượt của bạn!');
          }
          if (res.success === false) {
            return replyEphemeralAutoDelete(interaction, res.reason);
          }

          if (res.isInstant) {
            // Đã kết thúc (Quắc hoặc Ngũ Linh) -> Xóa buttons và tự xóa sau 10 giây
            await interaction.update({ embeds: [res.embed], components: [] });
            setTimeout(() => {
              if (interaction.message) {
                interaction.message.delete().catch(() => { });
              }
            }, 10000);
          } else {
            // Tiếp tục chơi
            await interaction.update({ embeds: [res.embed], components: [res.row] });
          }
        }
        else if (interaction.customId.startsWith('btn_xd_stand_')) {
          const gameId = interaction.customId.replace('btn_xd_stand_', '');
          const res = handlePlayerStand(gameId, userId);
          if (!res) {
            return replyEphemeralAutoDelete(interaction, '❌ Ván bài không tồn tại hoặc không phải lượt của bạn!');
          }
          if (res.success === false) {
            return replyEphemeralAutoDelete(interaction, res.reason);
          }

          // Dằn bài -> kết thúc ván, tự xóa sau 10 giây
          await interaction.update({ embeds: [res.embed], components: [] });
          setTimeout(() => {
            if (interaction.message) {
              interaction.message.delete().catch(() => { });
            }
          }, 10000);
        }

        // --- Nút Xì Dách PvP (Đấu nhóm) ---
        else if (interaction.customId.startsWith('btn_xdpvp_join_')) {
          const roomId = interaction.customId.replace('btn_xdpvp_join_', '');
          const res = joinXiDachRoom(roomId, userId, interaction.user.username);
          if (!res.success) {
            return replyEphemeralAutoDelete(interaction, `❌ ${res.reason}`);
          }

          const payload = createXiDachPvpLobbyPayload(res.room);
          await interaction.update(payload);
        }
        else if (interaction.customId.startsWith('btn_xdpvp_leave_')) {
          const roomId = interaction.customId.replace('btn_xdpvp_leave_', '');
          const res = leaveXiDachRoom(roomId, userId);
          if (!res.success) {
            return replyEphemeralAutoDelete(interaction, `❌ ${res.reason}`);
          }

          const payload = createXiDachPvpLobbyPayload(res.room);
          await interaction.update(payload);
        }
        else if (interaction.customId.startsWith('btn_xdpvp_start_')) {
          const roomId = interaction.customId.replace('btn_xdpvp_start_', '');
          const room = getXiDachRoom(roomId);
          if (!room) {
            return replyEphemeralAutoDelete(interaction, '❌ Bàn chơi không tồn tại hoặc đã kết thúc!');
          }
          if (room.hostId !== userId) {
            return replyEphemeralAutoDelete(interaction, '❌ Chỉ chủ bàn mới có thể bắt đầu ván bài!');
          }
          if (room.players.length < 2) {
            return replyEphemeralAutoDelete(interaction, '❌ Cần ít nhất 2 người chơi để bắt đầu!');
          }

          const result = startXiDachRoomGame(roomId);
          if (!result.success) {
            return replyEphemeralAutoDelete(interaction, `❌ ${result.reason}`);
          }

          const payload = createXiDachPvpResultPayload(result);
          await interaction.update(payload);

          // Tự động xóa bàn chơi sau khi kết thúc ván 15 giây
          setTimeout(async () => {
            try {
              if (interaction.message) {
                await interaction.message.delete().catch(() => { });
              }
            } catch (e) { }
          }, 15000);
        }
        else if (interaction.customId.startsWith('btn_xdpvp_cancel_')) {
          const roomId = interaction.customId.replace('btn_xdpvp_cancel_', '');
          const room = getXiDachRoom(roomId);
          if (!room) {
            return replyEphemeralAutoDelete(interaction, '❌ Bàn chơi không tồn tại hoặc đã kết thúc!');
          }
          const isHost = room.hostId === userId;
          const isAdmin = interaction.memberPermissions && interaction.memberPermissions.has('Administrator');
          if (!isHost && !isAdmin) {
            return replyEphemeralAutoDelete(interaction, '❌ Chỉ chủ bàn (hoặc Quản trị viên) mới có quyền hủy bàn!');
          }

          const cancelRes = cancelXiDachRoom(roomId, `Chủ bàn ${interaction.user.username} đã hủy bàn.`);
          if (cancelRes) {
            const payload = createXiDachPvpCancelledPayload(cancelRes.room, cancelRes.reason);
            await interaction.update(payload);
            setTimeout(async () => {
              try {
                if (interaction.message) {
                  await interaction.message.delete().catch(() => { });
                }
              } catch (e) { }
            }, 10000);
          } else {
            return replyEphemeralAutoDelete(interaction, '❌ Không thể hủy bàn chơi!');
          }
        }

        // --- C. Nút trên Bảng Chuyển Tiền (Coin Pay) ---
        else if (interaction.customId === 'btn_coinpay_start') {
          try {
            await interaction.deferReply({ ephemeral: true });
            const payload = createSelectRecipientPayload();
            await interaction.editReply({
              embeds: payload.embeds.map(e => e.toJSON()),
              components: payload.components.map(c => c.toJSON())
            });
          } catch (err) {
            console.error('[CoinPay Button Error]', err);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi hệ thống: ' + err.message, embeds: [], components: [] }).catch(() => {});
          }
        }
        else if (interaction.customId === 'btn_coinpay_balance') {
          await interaction.deferReply({ ephemeral: true });
          const userData = db.getUser(userId, guildId);
          const balance = (userData.xccoin || 0).toLocaleString();

          const embed = new EmbedBuilder()
            .setColor(config.colors.gold)
            .setAuthor({ name: `Ví XCCoin | ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setTitle('💳 THÔNG TIN SỐ DƯ VÍ')
            .setDescription(`Số dư hiện tại của bạn là: **${balance}** XCCoin\n\n*(Ngồi phòng Voice nhận **+1,000 XCCoin/giờ**)*`)
            .setFooter({ text: 'Tự động đóng sau 1 phút' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          setTimeout(() => interaction.deleteReply().catch(() => { }), 60000);
        }
        else if (interaction.customId === 'btn_coinpay_guide') {
          await interaction.deferReply({ ephemeral: true });
          const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('📖 HƯỚNG DẪN CHUYỂN TIỀN XCCOIN (COIN PAY)')
            .setDescription(
              '**Cách thức thực hiện giao dịch chuyển tiền:**\n\n' +
              '1️⃣ Bấm nút **[ 💸 Chuyển XCCoin ]**.\n' +
              '2️⃣ Chọn người nhận từ Menu danh sách thành viên trong server.\n' +
              '3️⃣ Nhập số XCCoin muốn chuyển (Tối thiểu 10 Coin) và lời nhắn gửi kèm.\n' +
              '4️⃣ Bấm **Gửi** ➡️ Tiền sẽ được chuyển ngay lập tức cho người nhận!\n\n' +
              '🔒 **Lưu ý bảo mật:**\n' +
              '• Giao dịch không mất phí (0% tax).\n' +
              '• Không thể tự chuyển cho chính mình hoặc chuyển cho Bot.\n' +
              '• Mọi giao dịch đều được ghi nhận minh bạch trên hệ thống.'
            )
            .setFooter({ text: 'Tự động đóng sau 1 phút' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          setTimeout(() => interaction.deleteReply().catch(() => { }), 60000);
        }
      } catch (error) {
        console.error(`Lỗi khi xử lý nút bấm ${interaction.customId}:`, error);
        await replyEphemeralAutoDelete(interaction, '❌ Đã xảy ra lỗi khi thao tác, vui lòng thử lại!');
      }
    }

    // ==========================================
    // 3. Xử lý Gửi Biểu Mẫu (Modal Submit)
    // ==========================================
    else if (interaction.isModalSubmit()) {
      const userId = interaction.user.id;
      const guildId = interaction.guildId;

      try {
        // --- A. Modal Quay Slot Machine ---
        if (interaction.customId === 'modal_bet_slot') {
          if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
          }

          const rawAmount = interaction.fields.getTextInputValue('input_slot_amount').trim();
          const amount = parseInt(rawAmount, 10);

          if (isNaN(amount) || amount < 100 || amount > 10000) {
            return replyEphemeralAutoDelete(interaction, '❌ Mức cược không hợp lệ! Vui lòng nhập từ **100** đến **10,000 XCCoin**.');
          }

          const user = db.getUser(userId, guildId);
          if ((user.xccoin || 0) < amount) {
            return replyEphemeralAutoDelete(
              interaction,
              `❌ Số dư của bạn không đủ! Bạn hiện có **${(user.xccoin || 0).toLocaleString()} XCCoin**, cần **${amount.toLocaleString()} XCCoin**.`
            );
          }

          // Trừ cược & quay Slot
          db.addXCCoin(userId, guildId, -amount);
          const result = playSlot(amount);

          if (result.payout > 0) {
            db.addXCCoin(userId, guildId, result.payout);
          }
          db.addXp(userId, guildId, result.earnedXp);

          const updatedUser = db.getUser(userId, guildId);
          const embed = createSlotResultEmbed(interaction.user, result, updatedUser.xccoin || 0);

          await interaction.editReply({ embeds: [embed] });
          setTimeout(() => interaction.deleteReply().catch(() => { }), 15000);
        }

        // --- B. Modal Cược Bài Cào vs Bot ---
        else if (interaction.customId === 'modal_bet_baicao') {
          if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
          }

          const rawAmount = interaction.fields.getTextInputValue('input_baicao_amount').trim();
          const amount = parseInt(rawAmount, 10);

          if (isNaN(amount) || amount < 100 || amount > 10000) {
            return replyEphemeralAutoDelete(interaction, '❌ Mức cược không hợp lệ! Vui lòng nhập từ **100** đến **10,000 XCCoin**.');
          }

          const user = db.getUser(userId, guildId);
          if ((user.xccoin || 0) < amount) {
            return replyEphemeralAutoDelete(
              interaction,
              `❌ Số dư của bạn không đủ! Bạn hiện có **${(user.xccoin || 0).toLocaleString()} XCCoin**.`
            );
          }

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
              { name: '💰 Tiền cược', value: `**${amount.toLocaleString()}** XCCoin`, inline: true },
              { name: '🪙 Biến động số dư', value: balanceChangeText, inline: true },
              { name: '⭐ Tu vi (XP)', value: `+**${earnedXp.toLocaleString()}** XP`, inline: true },
              { name: '💳 Số dư ví mới', value: `**${(updatedUser.xccoin || 0).toLocaleString()}** XCCoin`, inline: true }
            )
            .setFooter({ text: 'Tỷ lệ thắng ngẫu nhiên chuẩn bài 52 lá • Tự động xóa ván sau 10 giây' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          setTimeout(() => interaction.deleteReply().catch(() => { }), 10000);
        }

        // --- C. Modal Mở Bàn Cào PvP ---
        else if (interaction.customId === 'modal_create_pvp') {
          const rawAmount = interaction.fields.getTextInputValue('input_pvp_amount').trim();
          const rawMaxPlayers = interaction.fields.getTextInputValue('input_pvp_max_players')?.trim() || '6';

          const amount = parseInt(rawAmount, 10);
          const maxPlayers = parseInt(rawMaxPlayers, 10) || 6;

          if (isNaN(amount) || amount < 100 || amount > 10000) {
            return replyEphemeralAutoDelete(interaction, '❌ Mức cược không hợp lệ! Vui lòng nhập từ **100** đến **10,000 XCCoin**.');
          }

          if (isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 8) {
            return replyEphemeralAutoDelete(interaction, '❌ Số người chơi tối đa không hợp lệ! Vui lòng nhập từ **2** đến **8** người.');
          }

          const roomRes = createRoom({
            hostId: userId,
            hostUsername: interaction.user.username,
            guildId,
            channelId: interaction.channelId,
            amount,
            maxPlayers
          });

          if (!roomRes.success) {
            return replyEphemeralAutoDelete(interaction, `❌ ${roomRes.reason}`);
          }

          const room = roomRes.room;
          const lobbyPayload = createPvpLobbyPayload(room);
          const sentMsg = await interaction.reply(lobbyPayload);
          room.messageId = sentMsg.id;

          room.timer = setTimeout(async () => {
            try {
              if (room.status !== 'WAITING') return;

              if (room.players.length >= 2) {
                const gameResult = startRoomGame(room.roomId);
                if (gameResult.success) {
                  const resultPayload = createPvpResultPayload(gameResult);
                  await interaction.editReply(resultPayload).catch(() => { });
                  setTimeout(() => {
                    interaction.deleteReply().catch(() => { });
                  }, 15000);
                }
              } else {
                const cancelRes = cancelRoom(room.roomId, 'Hết thời gian chờ 2 phút mà không có thêm người chơi tham gia.');
                if (cancelRes) {
                  interaction.deleteReply().catch(() => { });
                }
              }
            } catch (err) {
              console.error('[PvpModalTimer] Lỗi khi xử lý timer ván bài:', err);
            }
          }, 120000);
        }

        // --- D. Modal Cược Xì Dách vs Bot ---
        else if (interaction.customId === 'modal_bet_xidach') {
          const rawAmount = interaction.fields.getTextInputValue('input_xidach_amount').trim();
          const amount = parseInt(rawAmount, 10);

          if (isNaN(amount) || amount < 100 || amount > 10000) {
            return replyEphemeralAutoDelete(interaction, '❌ Mức cược không hợp lệ! Vui lòng nhập từ **100** đến **10,000 XCCoin**.');
          }

          const user = db.getUser(userId, guildId);
          if ((user.xccoin || 0) < amount) {
            return replyEphemeralAutoDelete(
              interaction,
              `❌ Số dư của bạn không đủ! Bạn hiện có **${(user.xccoin || 0).toLocaleString()} XCCoin**, cần **${amount.toLocaleString()} XCCoin**.`
            );
          }

          const res = startSoloGame({
            userId,
            username: interaction.user.username,
            avatarUrl: interaction.user.displayAvatarURL({ dynamic: true }),
            guildId,
            amount
          });

          const payload = { embeds: [res.embed] };
          if (res.row) {
            payload.components = [res.row];
          } else {
            payload.components = [];
          }

          await interaction.reply(payload);

          if (res.isInstant) {
            setTimeout(() => {
              interaction.deleteReply().catch(() => { });
            }, 10000);
          }
        }

        // --- E. Modal Mở Bàn Xì Dách PvP ---
        else if (interaction.customId === 'modal_create_xdpvp') {
          const rawAmount = interaction.fields.getTextInputValue('input_xdpvp_amount').trim();
          const rawMaxPlayers = interaction.fields.getTextInputValue('input_xdpvp_max_players')?.trim() || '6';

          const amount = parseInt(rawAmount, 10);
          const maxPlayers = parseInt(rawMaxPlayers, 10) || 6;

          if (isNaN(amount) || amount < 100 || amount > 10000) {
            return replyEphemeralAutoDelete(interaction, '❌ Mức cược không hợp lệ! Vui lòng nhập từ **100** đến **10,000 XCCoin**.');
          }

          if (isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 8) {
            return replyEphemeralAutoDelete(interaction, '❌ Số người chơi tối đa không hợp lệ! Vui lòng nhập từ **2** đến **8** người.');
          }

          const roomRes = createXiDachRoom({
            hostId: userId,
            hostUsername: interaction.user.username,
            guildId,
            channelId: interaction.channelId,
            amount,
            maxPlayers
          });

          if (!roomRes.success) {
            return replyEphemeralAutoDelete(interaction, `❌ ${roomRes.reason}`);
          }

          const room = roomRes.room;
          const lobbyPayload = createXiDachPvpLobbyPayload(room);
          const sentMsg = await interaction.reply(lobbyPayload);
          room.messageId = sentMsg.id;

          room.timer = setTimeout(async () => {
            try {
              if (room.status !== 'WAITING') return;

              if (room.players.length >= 2) {
                const gameResult = startXiDachRoomGame(room.roomId);
                if (gameResult.success) {
                  const resultPayload = createXiDachPvpResultPayload(gameResult);
                  await interaction.editReply(resultPayload).catch(() => { });
                  setTimeout(() => {
                    interaction.deleteReply().catch(() => { });
                  }, 15000);
                }
              } else {
                const cancelRes = cancelXiDachRoom(room.roomId, 'Hết thời gian chờ 2 phút mà không có ai tham gia.');
                if (cancelRes) {
                  interaction.deleteReply().catch(() => { });
                }
              }
            } catch (err) {
              console.error('[XiDachPvpTimer] Lỗi khi xử lý timer ván bài:', err);
            }
          }, 120000);
        }

        // --- D. Modal Chuyển Tiền XCCoin (Coin Pay) ---
        else if (interaction.customId.startsWith('modal_coinpay_')) {
          const targetId = interaction.customId.replace('modal_coinpay_', '');
          const userId = interaction.user.id;
          const guildId = interaction.guildId;

          const rawAmount = interaction.fields.getTextInputValue('input_coinpay_amount').trim();
          const note = interaction.fields.getTextInputValue('input_coinpay_note')?.trim() || '';

          const amount = parseInt(rawAmount, 10);
          if (isNaN(amount) || amount < 10) {
            return replyEphemeralAutoDelete(interaction, '❌ Số tiền không hợp lệ! Mức chuyển tối thiểu là **10 XCCoin**.');
          }

          const sender = db.getUser(userId, guildId);
          if ((sender.xccoin || 0) < amount) {
            return replyEphemeralAutoDelete(
              interaction,
              `❌ Số dư của bạn không đủ! Bạn hiện có **${(sender.xccoin || 0).toLocaleString()} XCCoin**.`
            );
          }

          // Trừ tiền người gửi, cộng tiền người nhận
          db.addXCCoin(userId, guildId, -amount);
          db.addXCCoin(targetId, guildId, amount);

          const updatedSender = db.getUser(userId, guildId);
          const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
          const targetTag = targetUser ? `<@${targetId}> (${targetUser.username})` : `<@${targetId}>`;

          const receiptEmbed = createTransferReceiptEmbed({
            senderUser: interaction.user,
            recipientTag: targetTag,
            amount,
            note,
            remainingBalance: updatedSender.xccoin || 0
          });

          const guildSettings = db.getGuildSettings(guildId);
          const tradeChannel = getTradeOrNotifyChannel(interaction.guild, guildSettings);

          if (tradeChannel && tradeChannel.id !== interaction.channelId) {
            // Gửi biên lai thông báo vào kênh trade coin (ví dụ #traide-xccoin hoặc kênh cấu hình)
            await tradeChannel.send({ embeds: [receiptEmbed] }).catch(() => { });
            refreshCoinPayPanel(tradeChannel, guildId);

            // Phản hồi riêng tư cho người chuyển
            return replyEphemeralAutoDelete(
              interaction,
              `✅ Bạn đã chuyển thành công **${amount.toLocaleString()} XCCoin** cho ${targetTag}!\n📜 Thông báo giao dịch đã được đưa về kênh ${tradeChannel}.`
            );
          } else {
            // Nếu người dùng thao tác ngay tại kênh trade coin (hoặc không tìm thấy kênh trade riêng)
            await interaction.reply({ embeds: [receiptEmbed] });
            setTimeout(() => interaction.deleteReply().catch(() => { }), 60000);
            if (tradeChannel) {
              refreshCoinPayPanel(tradeChannel, guildId);
            }
          }
        }
      } catch (modalErr) {
        console.error('Lỗi khi xử lý modal:', modalErr);
        await replyEphemeralAutoDelete(interaction, '❌ Đã xảy ra lỗi khi ghi nhận thông tin, vui lòng thử lại!');
      }
    }

    // ==========================================
    // 4. Xử lý Menu Chọn Người Dùng (User Select Menu)
    // ==========================================
    else if (interaction.isUserSelectMenu()) {
      if (interaction.customId === 'select_coinpay_target') {
        try {
          const targetId = interaction.values[0];
          const userId = interaction.user.id;

          if (targetId === userId) {
            return replyEphemeralAutoDelete(interaction, '❌ Bạn không thể tự chuyển XCCoin cho chính mình!');
          }

          const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
          if (targetUser && targetUser.bot) {
            return replyEphemeralAutoDelete(interaction, '❌ Bạn không thể chuyển XCCoin cho Bot!');
          }

          const targetName = targetUser ? targetUser.username : `User ${targetId}`;

          const modal = new ModalBuilder()
            .setCustomId(`modal_coinpay_${targetId}`)
            .setTitle(`💸 Chuyển XCCoin: ${targetName}`.substring(0, 45));

          const amountInput = new TextInputBuilder()
            .setCustomId('input_coinpay_amount')
            .setLabel('Số XCCoin Muốn Chuyển (Tối thiểu 10)')
            .setPlaceholder('Ví dụ: 500 hoặc 1000')
            .setMinLength(2)
            .setMaxLength(10)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const noteInput = new TextInputBuilder()
            .setCustomId('input_coinpay_note')
            .setLabel('Lời Nhắn Gửi Kèm (Tùy chọn)')
            .setPlaceholder('Ví dụ: Cảm ơn bạn / Tiền trả nợ')
            .setMaxLength(100)
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

          modal.addComponents(
            new ActionRowBuilder().addComponents(amountInput),
            new ActionRowBuilder().addComponents(noteInput)
          );

          await interaction.showModal(modal);
        } catch (err) {
          console.error('Lỗi khi xử lý select_coinpay_target:', err);
          await replyEphemeralAutoDelete(interaction, '❌ Đã xảy ra lỗi khi chọn người nhận, vui lòng thử lại!');
        }
      }
    }
  }
};
