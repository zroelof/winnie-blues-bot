const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { DISCORD_BOT_TOKEN } = require('./config');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildModeration,
	],
	partials: [
		Partials.Channel,
		Partials.Message,
		Partials.Reaction,
		Partials.User,
		Partials.GuildMember,
	],
});

// Load Events
const eventFiles = fs
	.readdirSync(path.join(__dirname, './events'))
	.filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const event = require(`./events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => {
			try {
				event.execute(...args, client);
			} catch (e) {
				console.error(`Threw exception handling event ${file}:\n${e}`);
			}
		});
	} else {
		client.on(event.name, (...args) => {
			try {
				event.execute(...args, client);
			} catch (e) {
				console.error(`Threw exception handling event ${file}:\n${e}`);
			}
		});
	}
}

if (!DISCORD_BOT_TOKEN || DISCORD_BOT_TOKEN === 'discord_bot_token_XXX') {
	console.error('Provide a valid discord bot token.');
	return;
}

module.exports = client;
