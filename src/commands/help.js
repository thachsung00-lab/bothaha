const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📖 Xem danh sách lệnh và hướng dẫn sử dụng bot'),

  async execute(interaction) {
    await interaction.deferReply();

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🤖 HƯỚNG DẪN SỬ DỤNG BOT')
      .setDescription(
        'Bot hỗ trợ tính năng **Điểm danh nhận thưởng** và **Tích lũy Rank/XP khi online phòng Voice**.\n' +
        'Dưới đây là các lệnh bạn có thể sử dụng:'
      )
      .addFields(
        {
          name: '📅 /daily',
          value: 'Điểm danh hàng ngày để nhận XP và tích lũy chuỗi Streak. Bấm vào icon/nút bấm để nhận thưởng.'
        },
        {
          name: '📊 /rank [user]',
          value: 'Xem thông tin cấp bậc, ví XCCoin, tổng XP, số giờ online Voice, chuỗi điểm danh và tiến trình thăng hạng.'
        },
        {
          name: '🪙 /coin [balance | pay | grant]',
          value: '• `/coin balance`: Xem số dư ví XCCoin.\n• `/coin pay`: Chuyển tiền XCCoin cho bạn bè.\n• `/coin grant` *(Admin)*: Điều chỉnh số dư thành viên.'
        },
        {
          name: '🏆 /leaderboard [category]',
          value: 'Xem bảng xếp hạng Top 10 theo Tổng XP, Thời gian Voice hoặc Đại Gia XCCoin.'
        },
        {
          name: '🎰 /setgame channel:[kênh] (Dành cho Admin)',
          value: 'Cài đặt Bảng Sòng Bạc & Máy Quay Slot XCCoin cố định tại kênh chỉ định kèm các nút cược nhanh.'
        },
        {
          name: '🎰 /slot amount:[tiền cược]',
          value: 'Quay Máy Quay Xèng Slot Machine (Cược 100 - 10,000 Coin). Nổ hũ 7️⃣7️⃣7️⃣ **x20 lần cược**, Kim Cương x10, Crown x7, Bell x5, trúng đôi x1.5!'
        },
        {
          name: '🃏 /baicao amount:[tiền cược]',
          value: 'Chơi Bài Cào 3 lá cùng Bot (Mức cược: 100 đến 10,000 XCCoin/ván). Tỷ lệ thắng x2. Tự động dọn ván sau 10 giây.'
        },
        {
          name: '👥 /baicaopvp amount:[tiền cược] [target] [max_players]',
          value: 'Tạo bàn chơi Bài Cào 3 lá cùng người khác trong Server (2 - 8 người). Người thắng có bài cao nhất ẵm trọn toàn bộ Hũ Tiền Cược (Pot)!'
        },
        {
          name: '🎴 /xidach amount:[tiền cược]',
          value: 'Chơi Kéo Xì Dách (Blackjack 21 Điểm) cùng Bot. Người chơi có thể Rút bài (Hit) hoặc Dằn bài (Stand). Tự động dọn ván sau 10 giây.'
        },
        {
          name: '👥 /xidachpvp amount:[tiền cược] [target] [max_players]',
          value: 'Tạo phòng Kéo Xì Dách nhiều người trong Server (2 - 8 người). Xì Hoa > Xì Dách > Ngũ Linh > Điểm cao nhất ẵm trọn Pot!'
        },
        {
          name: '⚙️ /choose channel:[kênh] (Dành cho Admin)',
          value: 'Cài đặt bảng tính năng tương tác tự động luôn hiển thị ở cuối mỗi tin nhắn trong kênh chỉ định (gồm nút Điểm danh, Xem rank, Kiểm tra XCCoin, Bảng xếp hạng, Chuyển tiền).'
        },
        {
          name: '🪙 /setcoinpay channel:[kênh] (Dành cho Admin)',
          value: 'Cài đặt Bảng Giao Dịch & Chuyển Tiền XCCoin (Coin Pay) cố định tại kênh chỉ định để thành viên bấm nút chuyển tiền không cần gõ lệnh.'
        },
        {
          name: '🧾 /bill [channel] (Dành cho Admin)',
          value: 'Chọn kênh lưu trữ lịch sử giao dịch và biên lai chuyển tiền XCCoin (mặc định vào #traide-xccoin).'
        },
        {
          name: '🛠️ /setupchannels (Dành cho Admin)',
          value: 'Tự động khởi tạo danh mục **GIẢI TRÍ - GAME** và 4 kênh chuẩn quyền & bảng điều khiển tương tác (hệ thống cũng tự chạy khi bot vừa vào server).'
        },
        {
          name: '🎙️ Cơ chế Voice XP & Tiền Tệ XCCoin',
          value: `• Tự động cộng **${config.voice.xpPerMinute} XP/phút** (${config.voice.xpPerHour} XP/giờ).\n` +
                 `• Tự động cộng **${config.voice.coinsPerHour || 1000} XCCoin** cho mỗi **1 giờ** ngồi phòng Voice!\n` +
                 '• **Cấp số nhân 2 thăng cấp**: Cấp 1 (500 XP), Cấp 2 (1,000 XP), Cấp 3 (2,000 XP), Cấp 4 (4,000 XP)...\n' +
                 '• ⚠️ **Phạt Vắng Mặt**: Không online phòng Voice quá 24h sẽ bị trừ **10% XCCoin** và **10% XP** cho mỗi ngày vắng mặt.'
        }
      )
      .setFooter({ text: 'Chúc bạn có những giây phút vui vẻ trên server!' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
