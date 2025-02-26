const { DISCORD_BOT_TOKEN } = require('./src/config');
const client = require('./src/bott');

client.login(DISCORD_BOT_TOKEN).then(() => {});
