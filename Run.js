require('dotenv').config();
const { bot } = require('./src/Bot');
const { scheduleCron } = require('./src/Cron');

function main() {
	bot.login(process.env.BOT_TOKEN).then(async () => {
		await scheduleCron();
	});
}

main();
