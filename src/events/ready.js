const { Events, REST, Routes, Collection } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const { DISCORD_BOT_TOKEN, CLEAR_BOT_COMMANDS, REGISTER_BOT_COMMANDS } = require('../config');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`🔹 Logged in as ${client.user.tag}.`);
		let commands = new Collection();
		let validCommands = true;
		try {
			const commandsPath = path.join(__dirname, '../commands_slash');
			const commandFiles = (await fs.readdir(commandsPath)).filter(file =>
				file.endsWith('.js'),
			);
			if (commandFiles.length === 0) {
				console.warn('⚠️ No command files found in the commands_slash directory.');
			}
			for (const file of commandFiles) {
				const filePath = path.join(commandsPath, file);
				try {
					const command = require(filePath);
					if ('data' in command && 'execute' in command) {
						commands.set(command.data.name, command);
						console.log(`✅ Loaded command: ${command.data.name}`);
					} else {
						console.warn(
							`⚠️ The command at ${filePath} is missing a required "data" or "execute" property.`,
						);
					}
				} catch (commandError) {
					console.error(`❌ Failed to load command ${file}:`, commandError);
					validCommands = false;
				}
			}
		} catch (err) {
			console.error('❌ Error reading commands directory:', err);
			validCommands = false;
		}
		commands.forEach(command => {
			if (!command.data || !command.data.toJSON || typeof command.execute !== 'function') {
				console.error(`❌ Malformed command: ${command.data?.name || 'unknown'}`);
				validCommands = false;
			}
		});
		if (validCommands) {
			client.commands = commands;
		}
		scheduleCronTasks(client);
		// Register Commands with Discord API
		const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
		const commandsData = commands.map(command => command.data.toJSON());
		try {
			const guilds = client.guilds.cache;
			if (guilds.size === 0) {
				console.warn('⚠️ The bot is not in any guilds.');
			}
			if (CLEAR_BOT_COMMANDS) {
				console.log(`🔄 Clearing commands in ${guilds.size} guild(s).`);
				for (const guild of guilds.values()) {
					await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), {
						body: [],
					});
					console.log(`✅ Cleared commands in guild: ${guild.name} (${guild.id})`);
				}
				console.log('🎉 Successfully cleared application commands in all guilds.');
			}
			if (REGISTER_BOT_COMMANDS) {
				console.log(
					`🔄 Registering ${commandsData.length} commands in ${guilds.size} guild(s).`,
				);
				for (const guild of guilds.values()) {
					await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), {
						body: commandsData,
					});
					console.log(`✅ Registered commands in guild: ${guild.name} (${guild.id})`);
				}
				console.log('🎉 Successfully registered application commands in all guilds.');
			}
		} catch (error) {
			console.error('❌ Error registering commands:', error.rawError || error);
		}
		console.log('🎉 Bot is fully initialized.');
	},
};

function scheduleCronTasks(client) {
	// Load and Schedule Cron Tasks
	const fs = require('fs');
	const cronPath = path.join(__dirname, '../cron');
	const cronFiles = fs.readdirSync(cronPath).filter(file => file.endsWith('.js'));
	for (const file of cronFiles) {
		try {
			const cronTask = require(`../cron/${file}`);
			if (cronTask.expression && cronTask.execute) {
				cron.schedule(
					cronTask.expression,
					() => {
						try {
							cronTask.execute(client);
						} catch (err) {
							console.error(`❌ Failed to run cron task ${file}:`, err);
						}
					},
					{
						scheduled: true,
						timezone: 'Australia/Brisbane',
					},
				);
				console.log(
					`✅ Scheduled cron task: ${file} with expression "${cronTask.expression}"`,
				);
			} else {
				console.warn(
					`⚠️ Cron task ${file} is missing "expression" or "execute" properties.`,
				);
			}
		} catch (error) {
			console.error(`❌ Failed to schedule cron task ${file}:`, error);
		}
	}
}
