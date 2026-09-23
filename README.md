# 🤖 Discord Voice Rank & Daily Check-In Bot

Bot Discord thông minh hỗ trợ:
1. **Điểm danh hàng ngày (Daily Check-in)**: Nhận thưởng XP và duy trì chuỗi Streak qua Nút bấm/Icon 📅.
2. **Hệ thống Voice Rank & XP**: Tự động tính thời gian thành viên ở trong các kênh thoại (Voice Channel) và cộng điểm kinh nghiệm (XP) sau mỗi mốc thời gian.
3. **Báo cáo Bảng Xếp Hạng tự động mỗi 24 giờ**: Tự động gửi bảng tổng kết vinh danh Top thành viên vào kênh chỉ định sau mỗi 24 tiếng.

---

## 🚀 Hướng Dẫn Nhanh

### 1. Mời Bot Vào Server
Để bot hoạt động đầy đủ, hãy cấp các quyền sau khi mời:
- **Bot Permissions**: `Administrator` (hoặc tối thiểu: Xem kênh, Gửi tin nhắn, Nhúng liên kết, Sử dụng Slash Commands, Kết nối Voice).
- **Link mời mẫu**:
  Thay thế `YOUR_CLIENT_ID` bằng Client ID của bot:
  ```
  https://discord.com/oauth2/authorize?client_id=1552148952353214534&permissions=8&scope=bot%20applications.commands
  ```

> ⚠️ **LƯU Ý QUAN TRỌNG VỀ DISCORD DEVELOPER PORTAL**:
> Trong mục **Bot** > **Privileged Gateway Intents**, hãy bật 3 tùy chọn:
> - ✅ **PRESENCE INTENT**
> - ✅ **SERVER MEMBERS INTENT**
> - ✅ **MESSAGE CONTENT INTENT**

---

### 2. Danh Sách Lệnh (Slash Commands)

| Lệnh | Mô tả | Ai có thể dùng |
|------|-------|----------------|
| `/daily` | Điểm danh nhận XP và tích lũy chuỗi Streak hôm nay. | Mọi thành viên |
| `/rank [user]` | Xem cấp bậc, tổng XP, số giờ online voice và tiến trình thăng hạng. | Mọi thành viên |
| `/leaderboard [category]` | Xem bảng xếp hạng Top 10 theo Tổng XP hoặc Thời gian Voice. | Mọi thành viên |
| `/help` | Xem danh sách lệnh và cơ chế hoạt động của bot. | Mọi thành viên |
| `/choose [channel]` | Thiết lập kênh text có bảng tính năng luôn bám dính ở cuối mỗi tin nhắn. | Quản trị viên (Admin) |
| `/postdaily` | Gửi bảng Điểm Danh cố định kèm Nút Bấm vào kênh thông báo để mọi người click. | Quản trị viên (Admin) |

---

### 3. Cách Khởi Động Bot

- **Chạy trực tiếp**:
  ```bash
  npm start
  ```
- **Chỉ đồng bộ lại Slash Commands**:
  ```bash
  npm run deploy
  ```

---

### 4. Cơ Chế Tính Điểm & Voice XP

- **Điểm danh `/daily`**:
  - Nhận **+100 XP** cơ bản.
  - Thưởng thêm **+20 XP** cho mỗi ngày liên tiếp duy trì chuỗi Streak (tối đa +200 XP).
  - Cooldown: 24 giờ giữa mỗi lần điểm danh.
- **Voice XP**:
  - Tự động cộng **10 XP mỗi phút** (tương đương **600 XP mỗi giờ**) khi ở trong phòng Voice.
  - Tự động bỏ qua nếu người dùng tự tắt tai nghe (Deafen).
  - Tự động gửi thông báo chúc mừng khi thành viên thăng cấp (Level Up).
- **Cấu hình tùy chỉnh**:
  Có thể điều chỉnh tỷ lệ XP, màu sắc embed trong file `src/config.json`.
