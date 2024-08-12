const {bot} = require("./Bot");
const capitalizeWords = (metricName) => {
    return metricName.replace(/_/g, ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

function standardize(str) {
    // First escape regex special characters
    const escapedStr = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Then replace all non-alphanumeric characters with regex '.*'
    return escapedStr.replace(/[^a-z0-9\\]/gi, '.*').toLowerCase();
}

async function findOrCreateMessage(channel) {
    const messages = await channel.messages.fetch({limit: 10});
    const botMessages = messages.filter(msg => msg.author.id === bot.user.id);
    if (botMessages.size > 0) {
        const sortedBotMessages = botMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
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

module.exports = {standardize, capitalizeWords, findOrCreateMessage}