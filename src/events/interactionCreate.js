const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction, client) {
		if (interaction.isChatInputCommand()) {
			const command = client.commands.get(interaction.commandName);
			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}
			try {
				switch (interaction.commandName) {
					default:
						await command.execute(interaction);
						break;
				}
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}:`, error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: `Something went wrong using ${interaction.commandName}...`,
						ephemeral: true,
					});
				} else {
					await interaction.reply({
						content: `Something went wrong using ${interaction.commandName}...`,
						ephemeral: true,
					});
				}
			}
		}
	},
};
