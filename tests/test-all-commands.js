/**
 * Bộ kiểm tra toàn diện tất cả các lệnh và tính năng của Bot
 */
const assert = require('assert');
const path = require('path');
const db = require('../src/database/db');
const levelHandler = require('../src/handlers/levelHandler');
const { playBaiCao, createShuffledDeck, evaluateHand } = require('../src/utils/cardGame');
const { getTodayStations, drawLotteryResults, processDailyLotteryDraw } = require('../src/handlers/lotteryHandler');
const { createGamePanel } = require('../src/utils/gamePanelBuilder');
const { createFeaturePanel } = require('../src/utils/panelBuilder');

// Các lệnh
const baicaoCmd = require('../src/commands/baicao');
const baicaopvpCmd = require('../src/commands/baicaopvp');
const chooseCmd = require('../src/commands/choose');
const coinCmd = require('../src/commands/coin');
const dailyCmd = require('../src/commands/daily');
const helpCmd = require('../src/commands/help');
const leaderboardCmd = require('../src/commands/leaderboard');
const postdailyCmd = require('../src/commands/postdaily');
const quayxsmnCmd = require('../src/commands/quayxsmn');
const rankCmd = require('../src/commands/rank');
const setcoinpayCmd = require('../src/commands/setcoinpay');
const setgameCmd = require('../src/commands/setgame');
const setleaderboardCmd = require('../src/commands/setleaderboard');
const xsmnCmd = require('../src/commands/xsmn');
const { createRoom, joinRoom, leaveRoom, cancelRoom, startRoomGame } = require('../src/handlers/pvpGameHandler');
const { createCoinPayPanel, createSelectRecipientPayload } = require('../src/utils/coinPayPanelBuilder');

// Helper giả lập Interaction
function createMockInteraction(userId = 'test_user_1', guildId = 'test_guild_1', options = {}) {
  let repliedContent = null;
  let editedContent = null;
  let deferred = false;
  let ephemeral = false;

  return {
    user: {
      id: userId,
      username: 'TestUser',
      bot: false,
      displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
    },
    client: {
      user: { id: 'bot_test_id', tag: 'TestBot#0000' }
    },
    guildId,
    guild: {
      id: guildId,
      name: 'Test Guild',
      channels: {
        cache: new Map([
          ['channel_1', {
            id: 'channel_1',
            name: 'general',
            isTextBased: () => true,
            permissionsFor: () => ({ has: () => true }),
            send: async (payload) => ({ id: 'msg_test_1', ...payload }),
            messages: { fetch: async () => null }
          }]
        ])
      }
    },
    member: {
      permissions: {
        has: () => true
      }
    },
    options: {
      getString: (key) => options[key] !== undefined ? options[key] : null,
      getInteger: (key) => options[key] !== undefined ? options[key] : null,
      getBoolean: (key) => options[key] !== undefined ? options[key] : null,
      getUser: (key) => options[key] !== undefined ? options[key] : null,
      getChannel: (key) => options[key] !== undefined ? options[key] : {
        id: 'channel_1',
        name: 'test-channel',
        permissionsFor: () => ({ has: () => true }),
        send: async (p) => ({ id: 'msg_1', ...p })
      },
      getSubcommand: () => options.subcommand || null
    },
    isButton: () => false,
    isChatInputCommand: () => true,
    isModalSubmit: () => false,
    deferred: false,
    replied: false,
    deferReply: async (opts = {}) => {
      deferred = true;
      ephemeral = !!opts.ephemeral;
    },
    reply: async (payload) => {
      repliedContent = payload;
    },
    editReply: async (payload) => {
      editedContent = payload;
      return payload;
    },
    deleteReply: async () => {},
    getResults: () => ({ repliedContent, editedContent, deferred, ephemeral })
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU CHẠY KIỂM TRA TOÀN DIỆN HỆ THỐNG BOT DISCORD');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Kiểm tra 20 Cảnh Giới Tu Tiên & 4 Đại Cảnh Giới
  await test('Cultivation System: 20 Levels & 4 Great Realms', () => {
    assert.strictEqual(levelHandler.CULTIVATION_LEVELS.length, 21); // Cấp 0 -> 20
    assert.strictEqual(levelHandler.getRequiredXpForLevel(1), 500);
    assert.strictEqual(levelHandler.getRequiredXpForLevel(2), 1200);
    assert.strictEqual(levelHandler.getRequiredXpForLevel(5), 5200);
    assert.strictEqual(levelHandler.getRequiredXpForLevel(10), 26000);
    assert.strictEqual(levelHandler.getRequiredXpForLevel(15), 86000);
    assert.strictEqual(levelHandler.getRequiredXpForLevel(20), 225000);

    const info0 = levelHandler.getLevelInfo(0);
    assert.strictEqual(info0.level, 0);
    assert.strictEqual(info0.realm, 'Phàm Nhân');
    assert.strictEqual(info0.title, 'Chưa Nhập Đạo');
    assert.strictEqual(info0.neededXp, 500);

    const info1 = levelHandler.getLevelInfo(500);
    assert.strictEqual(info1.level, 1);
    assert.strictEqual(info1.realm, 'Phàm Trần Nhập Đạo');
    assert.strictEqual(info1.title, 'Người Mới');
    assert.strictEqual(info1.neededXp, 700);

    const info6 = levelHandler.getLevelInfo(7500);
    assert.strictEqual(info6.level, 6);
    assert.strictEqual(info6.realm, 'Thông Thiên Triệt Địa');
    assert.strictEqual(info6.title, 'Hóa Thần');

    const info11 = levelHandler.getLevelInfo(34000);
    assert.strictEqual(info11.level, 11);
    assert.strictEqual(info11.realm, 'Vãng Sinh Tiên Cảnh');
    assert.strictEqual(info11.title, 'Phi Thăng');

    const info20 = levelHandler.getLevelInfo(250000);
    assert.strictEqual(info20.level, 20);
    assert.strictEqual(info20.realm, 'Quy Chân Chứng Đạo');
    assert.strictEqual(info20.title, 'Vượt Qua Tam Giới');
    assert.strictEqual(info20.isMaxLevel, true);
    assert.strictEqual(info20.progressPercent, 100);

    // Kiểm tra tính XP thưởng bài cào vs bot
    const winSapXp = levelHandler.calculateCardGameXp('WIN', { tier: 3, score: 1 }, 1000);
    assert.ok(winSapXp >= 140, 'Thắng Sáp phải được nhiều XP');

    const winNormXp = levelHandler.calculateCardGameXp('WIN', { tier: 1, score: 5 }, 1000);
    assert.ok(winNormXp < winSapXp, 'Thắng thường ít XP hơn Sáp');

    const tieXp = levelHandler.calculateCardGameXp('TIE', { tier: 1, score: 5 }, 1000);
    const loseXp = levelHandler.calculateCardGameXp('LOSE', { tier: 1, score: 0 }, 1000);
    assert.ok(tieXp > 0 && loseXp > 0);

    // Kiểm tra tính XP thưởng bài cào PvP
    const pvpWinXp = levelHandler.calculatePvpCardGameXp(true, { tier: 3 }, 5000);
    const pvpPartXp = levelHandler.calculatePvpCardGameXp(false, { tier: 1 }, 1000);
    assert.ok(pvpWinXp > pvpPartXp, 'Người thắng PvP nhận nhiều XP hơn người tham gia');
  });

  // 1b. Kiểm tra thực thi Lệnh /daily
  await test('Command: /daily check-in & cooldown', async () => {
    const dailyUser = 'user_daily_test_' + Date.now();
    const intDaily = createMockInteraction(dailyUser, 'guild_1');
    await dailyCmd.execute(intDaily);
    assert.ok(intDaily.getResults().editedContent.embeds);
    // Điểm danh lần 2 sẽ gặp Cooldown
    const intDaily2 = createMockInteraction(dailyUser, 'guild_1');
    await dailyCmd.execute(intDaily2);
    assert.ok(intDaily2.getResults().editedContent.embeds);
  });

  // 2. Kiểm tra Hệ thống Bài Cào
  await test('Card Game: 52-card Deck & Hand Evaluation', () => {
    const deck = createShuffledDeck();
    assert.strictEqual(deck.length, 52);

    // Test Sáp
    const sap = evaluateHand([
      { rank: 'A', value: 1, order: 1, isFace: false },
      { rank: 'A', value: 1, order: 1, isFace: false },
      { rank: 'A', value: 1, order: 1, isFace: false }
    ]);
    assert.strictEqual(sap.tier, 3);

    // Test Ba Tây
    const batay = evaluateHand([
      { rank: 'J', value: 0, order: 11, isFace: true },
      { rank: 'Q', value: 0, order: 12, isFace: true },
      { rank: 'K', value: 0, order: 13, isFace: true }
    ]);
    assert.strictEqual(batay.tier, 2);

    // Test 9 Nút
    const chinNut = evaluateHand([
      { rank: '4', value: 4, order: 4, isFace: false },
      { rank: '5', value: 5, order: 5, isFace: false },
      { rank: 'K', value: 0, order: 13, isFace: true }
    ]);
    assert.strictEqual(chinNut.tier, 1);
    assert.strictEqual(chinNut.score, 9);

    // Test 1 ván chơi ngẫu nhiên
    const game = playBaiCao();
    assert.ok(['WIN', 'LOSE', 'TIE'].includes(game.result));
    assert.strictEqual(game.playerCards.length, 3);
    assert.strictEqual(game.botCards.length, 3);
  });

  // 3. Kiểm tra Hệ thống Xổ Số Miền Nam
  await test('Lottery Engine: Today Stations & Draw Generation', () => {
    const stations = getTodayStations();
    assert.ok(Array.isArray(stations) && stations.length >= 3);

    const draw = drawLotteryResults();
    assert.strictEqual(draw.length, stations.length);
    for (const d of draw) {
      assert.ok(d.stationName);
      assert.strictEqual(d.g8.length, 2);
      const val = parseInt(d.g8, 10);
      assert.ok(val >= 0 && val <= 99);
    }
  });

  // 4. Kiểm tra Database & Đặt cược XSMN x10
  await test('Database: Place Lottery Bet & Settle with x10 Payout', () => {
    const testUid = 'user_test_lottery_' + Date.now();
    const testGid = 'guild_test_lottery';

    // Cho 5000 coin
    db.addXCCoin(testUid, testGid, 5000);
    const userBefore = db.getUser(testUid, testGid);
    assert.strictEqual(userBefore.xccoin, 5000);

    // Đặt cược 500 coin vào số "88"
    const betRes = db.placeLotteryBet(testUid, testGid, '88', 500);
    assert.strictEqual(betRes.success, true);
    assert.strictEqual(db.getUser(testUid, testGid).xccoin, 4500);

    // Kết quả mở thưởng có "88"
    const mockResults = [
      { stationName: 'TP.HCM', g8: '88' },
      { stationName: 'Đồng Tháp', g8: '12' }
    ];
    const today = db.getTodayVNDateString();
    const settlement = db.settleLotteryBets(today, mockResults);

    // Xác nhận thắng x10 (500 * 10 = 5000)
    assert.strictEqual(settlement.winners.length >= 1, true);
    const myWin = settlement.winners.find(w => w.userId === testUid);
    assert.ok(myWin);
    assert.strictEqual(myWin.payout, 5000);
    assert.strictEqual(db.getUser(testUid, testGid).xccoin, 9500); // 4500 + 5000 = 9500
  });

  // 5. Kiểm tra thực thi Lệnh /help
  await test('Command: /help', async () => {
    const interaction = createMockInteraction();
    await helpCmd.execute(interaction);
    const res = interaction.getResults();
    assert.ok(res.editedContent && res.editedContent.embeds);
  });

  // 6. Kiểm tra thực thi Lệnh /rank
  await test('Command: /rank', async () => {
    const interaction = createMockInteraction('user_rank_test', 'guild_1');
    db.addVoiceActivity('user_rank_test', 'guild_1', 60, 600, 1000);
    await rankCmd.execute(interaction);
    const res = interaction.getResults();
    assert.ok(res.editedContent && res.editedContent.embeds);
  });

  // 7. Kiểm tra thực thi Lệnh /coin
  await test('Command: /coin balance & pay & grant', async () => {
    const userA = 'user_coin_a_' + Date.now();
    const userB = 'user_coin_b_' + Date.now();
    const gid = 'guild_1';

    // Grant
    const intGrant = createMockInteraction(userA, gid, {
      subcommand: 'grant',
      user: { id: userA, toString: () => `<@${userA}>` },
      amount: 2000
    });
    await coinCmd.execute(intGrant);
    assert.strictEqual(db.getUser(userA, gid).xccoin, 2000);

    // Balance
    const intBal = createMockInteraction(userA, gid, { subcommand: 'balance' });
    await coinCmd.execute(intBal);
    assert.ok(intBal.getResults().editedContent.embeds);

    // Pay
    const intPay = createMockInteraction(userA, gid, {
      subcommand: 'pay',
      recipient: { id: userB, toString: () => `<@${userB}>`, bot: false },
      amount: 500
    });
    await coinCmd.execute(intPay);
    assert.strictEqual(db.getUser(userA, gid).xccoin, 1500);
    assert.strictEqual(db.getUser(userB, gid).xccoin, 500);
  });

  // 8. Kiểm tra thực thi Lệnh /baicao
  await test('Command: /baicao', async () => {
    const uid = 'user_bc_test_' + Date.now();
    const gid = 'guild_bc';
    db.addXCCoin(uid, gid, 5000);

    const intBC = createMockInteraction(uid, gid, { amount: 500 });
    await baicaoCmd.execute(intBC);
    const res = intBC.getResults();
    assert.ok(res.editedContent && res.editedContent.embeds);
  });

  // 9. Kiểm tra thực thi Lệnh /xsmn
  await test('Command: /xsmn', async () => {
    const uid = 'user_xsmn_test_' + Date.now();
    const gid = 'guild_xsmn';
    db.addXCCoin(uid, gid, 1000);

    const intXSMN = createMockInteraction(uid, gid, { number: '79', amount: 300 });
    await xsmnCmd.execute(intXSMN);
    const res = intXSMN.getResults();
    assert.ok(res.editedContent && (res.editedContent.embeds || res.editedContent.content));
  });

  // 10. Kiểm tra thực thi Lệnh /leaderboard
  await test('Command: /leaderboard', async () => {
    const intLB = createMockInteraction('u1', 'guild_1', { category: 'xp' });
    await leaderboardCmd.execute(intLB);
    const res = intLB.getResults();
    assert.ok(res.editedContent);
  });

  // 11. Kiểm tra Bảng Điểm Danh, Bảng Trò Chơi và Bảng Coin Pay
  await test('Panels: Feature Panel, Game Panel & Coin Pay Panel', () => {
    // Bảng Điều Khiển Điểm Danh (/choose) - 5 nút
    const featPanel = createFeaturePanel();
    assert.ok(featPanel.embeds && featPanel.components);
    assert.strictEqual(featPanel.components.length, 1);
    assert.strictEqual(featPanel.components[0].components.length, 5); // 5 nút: Daily, Rank, Coin, Top, Chuyển Tiền

    // Bảng Khu Trò Chơi XCCoin (/setgame) - 5 nút
    const gamePanel = createGamePanel();
    assert.ok(gamePanel.embeds && gamePanel.components);
    assert.strictEqual(gamePanel.components.length, 1);
    assert.strictEqual(gamePanel.components[0].components.length, 5); // 5 nút: XSMN, Bot, PvP, Vé cược, Đài

    // Bảng Chuyển Tiền XCCoin (/setcoinpay) - 3 nút
    const coinPayPanel = createCoinPayPanel();
    assert.ok(coinPayPanel.embeds && coinPayPanel.components);
    assert.strictEqual(coinPayPanel.components.length, 1);
    assert.strictEqual(coinPayPanel.components[0].components.length, 3); // 3 nút: Chuyển tiền, Số dư ví, Hướng dẫn

    // Menu Chọn Người Nhận
    const selectPayload = createSelectRecipientPayload();
    assert.ok(selectPayload.embeds && selectPayload.components);
    assert.strictEqual(selectPayload.components[0].components[0].data.custom_id, 'select_coinpay_target');
  });

  // 12. Kiểm tra thực thi Lệnh /choose, /setgame và /setcoinpay
  await test('Command: /choose, /setgame and /setcoinpay', async () => {
    const intChoose = createMockInteraction('admin', 'guild_set', {});
    await chooseCmd.execute(intChoose);
    assert.ok(intChoose.getResults().editedContent.content.includes('Thiết lập thành công'));

    const intSetGame = createMockInteraction('admin', 'guild_set', {});
    await setgameCmd.execute(intSetGame);
    assert.ok(intSetGame.getResults().editedContent.content.includes('Thiết lập thành công'));

    const intSetCoinPay = createMockInteraction('admin', 'guild_set', {});
    await setcoinpayCmd.execute(intSetCoinPay);
    assert.ok(intSetCoinPay.getResults().editedContent.content.includes('Thiết lập thành công'));
  });

  // 13. Kiểm tra Cơ chế Phạt vắng mặt trừ 10% XP & XCCoin mỗi ngày
  await test('Decay: 10% penalty per inactive day', () => {
    const { checkInactivityDecay } = require('../src/handlers/decayHandler');
    const decayUser = 'user_decay_' + Date.now();
    const decayGuild = 'guild_decay';

    // Tạo user có 10,000 XP và 20,000 XCCoin
    db.updateUser(decayUser, decayGuild, {
      xp: 10000,
      xccoin: 20000,
      // Đã offline 50 tiếng (tương đương 2 ngày vắng)
      lastVoiceActive: Date.now() - (50 * 60 * 60 * 1000),
      penalizedDays: 0
    });

    checkInactivityDecay();

    const penalizedUser = db.getUser(decayUser, decayGuild);
    // Ngày 1: 10,000 * 0.9 = 9,000; 20,000 * 0.9 = 18,000
    // Ngày 2: 9,000 * 0.9 = 8,100; 18,000 * 0.9 = 16,200
    assert.strictEqual(penalizedUser.xp, 8100);
    assert.strictEqual(penalizedUser.xccoin, 16200);
    assert.strictEqual(penalizedUser.penalizedDays, 2);
  });

  // 14. Kiểm tra Cơ chế Bàn Cào PvP (Nhiều người chơi)
  await test('PvP: Room lifecycle, betting, dealing and winner resolution', () => {
    const guildId = 'guild_pvp_' + Date.now();
    const p1 = 'user_p1_' + Date.now();
    const p2 = 'user_p2_' + Date.now();
    const p3 = 'user_p3_' + Date.now();

    // Cấp vốn 5,000 XCCoin mỗi người
    db.updateUser(p1, guildId, { xccoin: 5000 });
    db.updateUser(p2, guildId, { xccoin: 5000 });
    db.updateUser(p3, guildId, { xccoin: 5000 });

    // 1. Tạo phòng cược 1,000 Coin
    const roomRes = createRoom({
      hostId: p1,
      hostUsername: 'Player1',
      guildId,
      channelId: 'chan_1',
      amount: 1000,
      maxPlayers: 4
    });
    assert.strictEqual(roomRes.success, true);
    const room = roomRes.room;
    assert.strictEqual(room.players.length, 1);
    assert.strictEqual(db.getUser(p1, guildId).xccoin, 4000); // Đã trừ 1000 cược

    // 2. Player 2 và 3 tham gia phòng
    const j2 = joinRoom(room.roomId, p2, 'Player2');
    assert.strictEqual(j2.success, true);
    assert.strictEqual(db.getUser(p2, guildId).xccoin, 4000);

    const j3 = joinRoom(room.roomId, p3, 'Player3');
    assert.strictEqual(j3.success, true);
    assert.strictEqual(db.getUser(p3, guildId).xccoin, 4000);
    assert.strictEqual(room.players.length, 3);

    // 3. Player 3 rời phòng -> hoàn tiền cược
    const l3 = leaveRoom(room.roomId, p3);
    assert.strictEqual(l3.success, true);
    assert.strictEqual(db.getUser(p3, guildId).xccoin, 5000); // Đã hoàn 1000
    assert.strictEqual(room.players.length, 2);

    // 4. Bắt đầu ván bài giữa Player 1 và Player 2 (Tổng pot = 2,000)
    const gameResult = startRoomGame(room.roomId);
    assert.strictEqual(gameResult.success, true);
    assert.strictEqual(gameResult.totalPot, 2000);
    assert.strictEqual(gameResult.playerHands.length, 2);

    // Kiểm tra mỗi người nhận đủ 3 lá không trùng nhau từ 1 bộ bài 52 lá
    const allCards = [...gameResult.playerHands[0].cards, ...gameResult.playerHands[1].cards];
    assert.strictEqual(allCards.length, 6);
    const cardSet = new Set(allCards.map(c => c.display));
    assert.strictEqual(cardSet.size, 6); // 6 lá bài hoàn toàn khác nhau

    // Kiểm tra tiền thưởng được trao cho người chiến thắng
    const totalCoinsNow = db.getUser(p1, guildId).xccoin + db.getUser(p2, guildId).xccoin;
    // Ban đầu 2 người có 10,000 tổng cộng. Cược 2,000, sau đó pot 2,000 được trả hết. Tổng vẫn phải bằng 10,000
    assert.strictEqual(totalCoinsNow, 10000);
  });

  // 15. Kiểm tra thực thi Lệnh /baicaopvp
  await test('Command: /baicaopvp', async () => {
    const guildId = 'guild_cmd_pvp';
    const hostId = 'host_' + Date.now();
    db.updateUser(hostId, guildId, { xccoin: 10000 });

    const intPvp = createMockInteraction(hostId, guildId, { amount: 500, max_players: 5 });
    await baicaopvpCmd.execute(intPvp);
    const res = intPvp.getResults();
    assert.ok(res.editedContent && res.editedContent.embeds);
    assert.ok(res.editedContent.components);
  });

  // 16. Kiểm tra Chuyển Tiền Coin Pay (Cộng trừ ví & Điều hướng kênh thông báo)
  await test('Coin Pay: Transfer execution, balance validation & channel routing', () => {
    const guildId = 'guild_pay_' + Date.now();
    const sender = 'sender_' + Date.now();
    const recipient = 'recipient_' + Date.now();

    db.updateUser(sender, guildId, { xccoin: 5000 });
    db.updateUser(recipient, guildId, { xccoin: 1000 });

    const transferAmount = 1500;
    // Kiểm tra số dư đủ
    assert.ok(db.getUser(sender, guildId).xccoin >= transferAmount);

    // Thực hiện trừ người gửi và cộng người nhận
    db.addXCCoin(sender, guildId, -transferAmount);
    db.addXCCoin(recipient, guildId, transferAmount);

    assert.strictEqual(db.getUser(sender, guildId).xccoin, 3500);
    assert.strictEqual(db.getUser(recipient, guildId).xccoin, 2500);

    // Kiểm tra tạo receipt embed
    const { createTransferReceiptEmbed, getTradeOrNotifyChannel } = require('../src/utils/coinPayPanelBuilder');
    const receipt = createTransferReceiptEmbed({
      senderUser: { id: sender, username: 'Sender' },
      recipientTag: `<@${recipient}>`,
      amount: 1500,
      note: 'test note',
      remainingBalance: 3500
    });
    assert.ok(receipt && receipt.data && receipt.data.title.includes('THÀNH CÔNG'));

    // Kiểm tra tìm kiếm kênh trade (như traide-xccoin)
    const mockGuildWithTrade = {
      channels: {
        cache: new Map([
          ['ch_trade', { id: 'ch_trade', name: 'traide-xccoin', isTextBased: () => true }],
          ['ch_general', { id: 'ch_general', name: 'general', isTextBased: () => true }]
        ])
      }
    };
    const foundTrade = getTradeOrNotifyChannel(mockGuildWithTrade, {});
    assert.ok(foundTrade);
    assert.strictEqual(foundTrade.name, 'traide-xccoin');
  });

  // TEST 18: Lệnh /bill thiết lập kênh nhận lịch sử giao dịch
  await test('Lệnh /bill thiết lập kênh nhận biên lai giao dịch', async () => {
    const billCmd = require('../src/commands/bill');
    const guildId = 'guild_bill_' + Date.now();
    const interaction = createMockInteraction('admin_user_1', guildId, {
      channel: {
        id: 'bill_chan_123',
        name: 'lich-su-bill',
        permissionsFor: () => ({ has: () => true })
      }
    });

    await billCmd.execute(interaction);
    const results = interaction.getResults();
    assert.ok(results.editedContent.content.includes('Thiết lập thành công'));

    // Kiểm tra đã lưu vào DB
    const settings = db.getGuildSettings(guildId);
    assert.strictEqual(settings.billChannelId, 'bill_chan_123');

    // Kiểm tra getTradeOrNotifyChannel ưu tiên billChannelId
    const { getTradeOrNotifyChannel } = require('../src/utils/coinPayPanelBuilder');
    const mockGuild = {
      channels: {
        cache: new Map([
          ['bill_chan_123', { id: 'bill_chan_123', name: 'lich-su-bill', isTextBased: () => true }],
          ['traide_chan', { id: 'traide_chan', name: 'traide-xccoin', isTextBased: () => true }]
        ])
      }
    };
    const routedChannel = getTradeOrNotifyChannel(mockGuild, settings);
    assert.strictEqual(routedChannel.id, 'bill_chan_123');
  });

  // TEST 19: Tự động khởi tạo danh mục và 4 kênh (setupGuildChannels)
  await test('Hệ thống tự động tạo 4 kênh & phân quyền (setupGuildChannels)', async () => {
    const { setupGuildChannels } = require('../src/handlers/channelSetupHandler');
    const testGuildId = 'guild_setup_' + Date.now();
    const createdChannels = new Map();
    let createdCategory = null;

    const mockGuild = {
      id: testGuildId,
      name: 'Server Tự Động Test',
      client: {
        user: { id: 'bot_id_123' }
      },
      members: {
        fetch: async () => ({
          permissions: { has: () => true }
        })
      },
      roles: {
        cache: new Map([
          ['role_member_1', { id: 'role_member_1', managed: false }],
          [testGuildId, { id: testGuildId, managed: false }] // @everyone
        ])
      },
      channels: {
        cache: createdChannels,
        fetch: async () => createdChannels,
        create: async (data) => {
          const ch = {
            id: 'ch_' + data.name,
            name: data.name,
            type: data.type,
            parent: data.parent,
            permissionOverwrites: data.permissionOverwrites || [],
            isTextBased: () => data.type !== 4, // 4 = Category
            send: async () => ({ id: 'msg_' + data.name })
          };
          createdChannels.set(ch.id, ch);
          if (data.type === 4) createdCategory = ch;
          return ch;
        }
      }
    };

    const res = await setupGuildChannels(mockGuild);
    assert.ok(res.success, `Setup failed: ${res.reason}`);
    assert.ok(createdCategory, 'Phải tạo danh mục');
    assert.ok(res.channels.checkin, 'Phải có kênh điểm danh');
    assert.ok(res.channels.rank, 'Phải có kênh rank');
    assert.ok(res.channels.game, 'Phải có kênh xccoingame');
    assert.ok(res.channels.trade, 'Phải có kênh traide-xccoin');

    // Kiểm tra quyền của xccoingame: @everyone bị deny ViewChannel
    const gameCh = createdChannels.get('ch_xccoingame');
    const everyoneGame = gameCh.permissionOverwrites.find(o => o.id === testGuildId);
    assert.ok(everyoneGame, 'xccoingame phải có overwrite cho @everyone');

    // Kiểm tra quyền của traide-xccoin: Member role bị deny SendMessages
    const tradeCh = createdChannels.get('ch_traide-xccoin');
    const memberTrade = tradeCh.permissionOverwrites.find(o => o.id === 'role_member_1');
    assert.ok(memberTrade, 'traide-xccoin phải có overwrite cho role_member_1');
    assert.ok(memberTrade.deny, 'traide-xccoin phải deny quyền cho member');

    // Kiểm tra settings được cập nhật
    const settings = db.getGuildSettings(testGuildId);
    assert.strictEqual(settings.billChannelId, tradeCh.id);
  });

  // TEST 20: Lệnh /setupchannels cho Admin
  await test('Lệnh /setupchannels khởi tạo hệ thống kênh cho Admin', async () => {
    const setupchannelsCmd = require('../src/commands/setupchannels');
    const testGuildId = 'guild_cmd_setup_' + Date.now();
    const createdChannels = new Map();

    const interaction = createMockInteraction('admin_user_2', testGuildId);
    interaction.guild.client = { user: { id: 'bot_id_123' } };
    interaction.guild.members = {
      fetch: async () => ({
        permissions: { has: () => true }
      })
    };
    interaction.guild.roles = {
      cache: new Map([
        ['role_mem', { id: 'role_mem', managed: false }],
        [testGuildId, { id: testGuildId, managed: false }]
      ])
    };
    interaction.guild.channels = {
      cache: createdChannels,
      fetch: async () => createdChannels,
      create: async (data) => {
        const ch = {
          id: 'ch_' + data.name,
          name: data.name,
          type: data.type,
          parent: data.parent,
          permissionOverwrites: data.permissionOverwrites || [],
          isTextBased: () => data.type !== 4,
          send: async () => ({ id: 'msg_' + data.name })
        };
        createdChannels.set(ch.id, ch);
        return ch;
      }
    };

    await setupchannelsCmd.execute(interaction);
    const results = interaction.getResults();
    assert.ok(results.editedContent.embeds, 'Phải gửi Embed xác nhận');
    assert.ok(results.editedContent.embeds[0].data.title.includes('THÀNH CÔNG'));
  });

  // TEST 21: Sự kiện guildCreate kích hoạt tự động thiết lập kênh
  await test('Sự kiện guildCreate tự động gọi setupGuildChannels', async () => {
    const guildCreateEvent = require('../src/events/guildCreate');
    let called = false;
    const mockGuild = {
      id: 'guild_event_' + Date.now(),
      name: 'New Server Test',
      client: { user: { id: 'bot_id_123' } },
      members: { fetch: async () => ({ permissions: { has: () => true } }) },
      roles: { cache: new Map() },
      channels: {
        cache: new Map(),
        fetch: async () => new Map(),
        create: async (d) => ({
          id: 'c_' + d.name,
          name: d.name,
          type: d.type,
          isTextBased: () => true,
          send: async () => ({ id: 'm_' + d.name })
        })
      }
    };

    await guildCreateEvent.execute(mockGuild);
    // Xác nhận không bị lỗi ném ra ngoại lệ
    assert.strictEqual(guildCreateEvent.name, 'guildCreate');
  });

  // TEST 22: Cơ chế duy trì Bảng Coin Pay luôn nằm cuối kênh (Sticky refresh)
  await test('Cơ chế refreshCoinPayPanel xóa bảng cũ và tạo bảng mới ở cuối kênh', async () => {
    const { refreshCoinPayPanel, createCoinPayPanel } = require('../src/utils/coinPayPanelBuilder');
    const testGuildId = 'guild_sticky_coinpay_' + Date.now();
    let deletedOldMsg = false;
    let sentNewMsg = false;

    db.setGuildSettings(testGuildId, {
      coinPayChannelId: 'ch_coinpay_1',
      coinPayMessageId: 'old_msg_coinpay'
    });

    const mockChannel = {
      id: 'ch_coinpay_1',
      name: 'traide-xccoin',
      messages: {
        fetch: async (id) => {
          if (id === 'old_msg_coinpay') {
            return {
              id: 'old_msg_coinpay',
              delete: async () => { deletedOldMsg = true; }
            };
          }
          return null;
        }
      },
      send: async (payload) => {
        sentNewMsg = true;
        return { id: 'new_msg_coinpay_at_bottom' };
      }
    };

    // Kích hoạt làm mới bảng
    await refreshCoinPayPanel(mockChannel, testGuildId);

    // Chờ 1.1s cho debounce timeout thực thi
    await new Promise(r => setTimeout(r, 1100));

    assert.ok(deletedOldMsg, 'Phải xóa tin nhắn bảng Coin Pay cũ');
    assert.ok(sentNewMsg, 'Phải gửi bảng Coin Pay mới xuống cuối kênh');

    // Kiểm tra settings được cập nhật ID tin nhắn mới
    const updatedSettings = db.getGuildSettings(testGuildId);
    assert.strictEqual(updatedSettings.coinPayMessageId, 'new_msg_coinpay_at_bottom');
  });

  console.log('\n====================================================');
  console.log(`🎉 KẾT QUẢ KIỂM TRA: ${passed} / ${passed + failed} PASS (${failed} FAIL)`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
