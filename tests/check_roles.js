const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  for (const guild of client.guilds.cache.values()) {
    console.log(`\n=== ROLES IN ${guild.name} ===`);
    const roles = await guild.roles.fetch();
    const roleIds = [
      '1530282285843349524',
      '1524759983055700008',
      '1496769662115905619',
      '1496769440476303431',
      '1525830026895818872',
      '1501691740841705644'
    ];
    for (const rId of roleIds) {
      const r = roles.get(rId);
      if (r) console.log(`Role ${r.name} (${r.id}) - Position: ${r.position}`);
    }
  }
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
