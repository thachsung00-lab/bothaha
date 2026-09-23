require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

function loadCommandData() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    }
  }
  return commands;
}

async function deployGuildCommands(guildId, clientId = null) {
  const token = process.env.DISCORD_TOKEN;
  if (!token) return;
  if (!clientId) {
    try {
      const base64Id = token.split('.')[0];
      clientId = Buffer.from(base64Id, 'base64').toString('ascii');
    } catch (e) {
      return;
    }
  }
  const commands = loadCommandData();
  const rest = new REST().setToken(token);
  try {
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log(`[Deploy] ✅ Đã nạp ${data.length} Slash Command tức thì cho server ${guildId}`);
    return data;
  } catch (err) {
    console.error(`[Deploy] ❌ Lỗi đăng ký lệnh cho server ${guildId}:`, err?.message || err);
  }
}

async function deployCommands() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error('❌ Chưa cấu hình DISCORD_TOKEN trong file .env');
    process.exit(1);
  }

  let clientId = process.env.CLIENT_ID;
  if (!clientId) {
    try {
      const base64Id = token.split('.')[0];
      clientId = Buffer.from(base64Id, 'base64').toString('ascii');
      console.log(`[Deploy] Đã tự động nhận diện Client ID từ token: ${clientId}`);
    } catch (e) {
      console.error('❌ Không thể tự động trích xuất Client ID từ token. Vui lòng điền CLIENT_ID vào .env');
      process.exit(1);
    }
  }

  const commands = loadCommandData();
  const rest = new REST().setToken(token);

  try {
    console.log(`⏳ Bắt đầu tải lên ${commands.length} Slash Command lên Discord API...`);

    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log(`✅ Đã đăng ký thành công ${data.length} Slash Command toàn cầu!`);
    return data;
  } catch (error) {
    console.error('❌ Lỗi khi đăng ký Slash Commands:', error);
    throw error;
  }
}

if (require.main === module) {
  deployCommands();
}

module.exports = {
  deployCommands,
  deployGuildCommands,
  loadCommandData
};
