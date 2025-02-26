const { Events } = require('discord.js');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		console.log('Message Created');
		if (message.channel.name.endsWith('newcomers')) {
			try {
				await message.react('🫡');
			} catch (error) {
				console.error('Failed to react to message:', error);
			}
		}
	},
};
