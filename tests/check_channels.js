const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`Log in as ${client.user.tag}`);
  for (const guild of client.guilds.cache.values()) {
    console.log(`\n=== GUILD: ${guild.name} (${guild.id}) ===`);
    const channels = await guild.channels.fetch();
    for (const channel of channels.values()) {
      if (!channel) continue;
      const isTarget = ['điểm-danh-ngày', 'rank', 'xccoingame', 'traide-xccoin'].includes(channel.name);
      if (isTarget) {
        console.log(`\nChannel: ${channel.name} (Type: ${channel.type}, ID: ${channel.id})`);
        console.log(`Parent: ${channel.parent ? channel.parent.name : 'None'} (${channel.parentId})`);
        console.log(`Position: ${channel.rawPosition}`);
        console.log(`Topic: ${channel.topic}`);
        console.log('Permission Overwrites:');
        for (const [id, overwrite] of channel.permissionOverwrites.cache.entries()) {
          console.log(`  - Target: ${id === guild.id ? '@everyone' : id} (Type: ${overwrite.type})`);
          console.log(`    Allow: ${overwrite.allow.toArray().join(', ')}`);
          console.log(`    Deny: ${overwrite.deny.toArray().join(', ')}`);
        }
      }
    }
  }
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
