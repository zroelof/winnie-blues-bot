const capitalizeWords = metricName => {
	return metricName
		.replace(/_/g, ' ')
		.split(' ')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
};

function standardize(str) {
	return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function findOrCreateMessage(bot, channel) {
	const messages = await channel.messages.fetch({ limit: 10 });
	const botMessages = messages.filter(msg => msg.author.id === bot.user.id);
	if (botMessages.size > 0) {
		const sortedBotMessages = botMessages.sort(
			(a, b) => b.createdTimestamp - a.createdTimestamp,
		);
		const mostRecentMessage = sortedBotMessages.first();
		// Delete other bot messages
		for (const message of sortedBotMessages.values()) {
			if (message.id !== mostRecentMessage.id) {
				await message.delete();
			}
		}
		return mostRecentMessage;
	}
	return await channel.send('Initializing...');
}

module.exports = { standardize, capitalizeWords, findOrCreateMessage };
