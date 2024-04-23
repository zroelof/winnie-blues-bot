require('dotenv').config();
const {bot} = require("./src/bot");
const {scheduleCron} = require("./src/cron");

function main() {
    bot.login(process.env.BOT_TOKEN).then(async () => {
        await scheduleCron();
    });
}

main();