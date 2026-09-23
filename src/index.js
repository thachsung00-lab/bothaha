require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { deployCommands, deployGuildCommands } = require('./deploy-commands');

// Bắt lỗi toàn cục ngăn bot bị crash do lỗi mạng hoặc interaction timeout
process.on('unhandledRejection', error => {
  console.error('[Unhandled Rejection]:', error);
});
process.on('uncaughtException', error => {
  console.error('[Uncaught Exception]:', error);
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ Lỗi: Không tìm thấy DISCORD_TOKEN trong file .env hoặc biến môi trường.');
  process.exit(1);
}

// Khởi tạo Discord Client với đầy đủ Intents cần thiết
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates, // Theo dõi phòng voice
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

// Collection chứa các Slash Commands
client.commands = new Collection();

// 1. Tải các lệnh (Commands)
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`[Command] Đã nạp lệnh /${command.data.name}`);
  } else {
    console.warn(`[Command] Bỏ qua file ${file} do thiếu cấu trúc hợp lệ.`);
  }
}

// 2. Tải các sự kiện (Events)
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`[Event] Đã đăng ký sự kiện: ${event.name}`);
}

// 3. Khởi động bot
(async () => {
  try {
    console.log('🔑 Đang đăng nhập vào Discord...');
    await client.login(token);
  } catch (error) {
    console.error('❌ Lỗi khi khởi động hoặc đăng nhập bot:', error);
  }
})();
