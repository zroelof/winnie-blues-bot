const { Events } = require('discord.js');

module.exports = {
	name: Events.MessageCreate,
	async execute(message, client) {
		if (message.author.id === client.user.id) {
			return;
		}
		if (message.channel.name.endsWith('newcomers')) {
			try {
				await message.react('🫡');
			} catch (error) {
				console.error('Failed to react to message:', error);
			}
		}
	},
};
