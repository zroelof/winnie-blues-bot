const {REST} = require('discord.js');
const {Routes} = require('discord-api-types/v10');
const rest = new REST({version: '10'}).setToken(process.env.BOT_TOKEN);
const commands = [{
    name: 'rsn',
    description: 'Set your RSN in the server.',
    options: [{
        type: 3,
        name: 'rsn',
        description: 'Your RSN, use | or / to separate multiple RSNs.',
        required: true,
    }],
}];

async function registerCommands(bot) {
    try {
        console.log('Started refreshing application (/) commands.');
        const guilds = bot.guilds.cache.values();
        for (const guild of guilds) {
            await rest.put(Routes.applicationGuildCommands(bot.user.id, guild.id), {body: commands});
            console.log(`Successfully reloaded application (/) commands for guild ${guild.name}.`);
        }
    } catch (error) {
        console.error('Error refreshing commands:', error);
    }
}

module.exports = {registerCommands};