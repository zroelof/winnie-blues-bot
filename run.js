const { DISCORD_BOT_TOKEN } = require('./src/config');
const client = require('./src/bot');

client.login(DISCORD_BOT_TOKEN).then(() => {});
