const {ActionRowBuilder, ButtonBuilder} = require('discord.js');
const {wom} = require("./wom");
const {bot} = require("./bot");
const {ChannelType, ButtonStyle} = require("discord-api-types/v10");
const CHANNEL_NAME = 'time-based-ranks';

async function updateMessage() {
    const guilds = bot.guilds.cache.values();
    for (const guild of guilds) {
        let channel = guild.channels.cache.find(ch => ch.name === CHANNEL_NAME && ch.type === ChannelType.GuildText);
        if (!channel) {
            console.log(`Channel "${CHANNEL_NAME}" not found in guild ${guild.name}, skipping update.`);
            continue;
        }
        const emojis = guild.emojis.cache;
        const outdatedRanks = await checkTimeBasedRanks(process.env.WOM_GROUP_NUMBER);
        const pages = preparePages(outdatedRanks, emojis, 1500);
        let message = await findOrCreateMessage(channel);
        let components = prepareComponents(pages.length > 1, 0, pages.length);
        const title = "## Timed Rank Role Status\n";
        const footer = getFooterNote();
        let content = pages.length > 0 ? pages[0] : "\nAll ranks are up to date.";
        content = title + content + footer;
        await message.edit({
            content,
            components
        });
        await message.suppressEmbeds(true);
        let currentPage = 0;
        const collector = message.createMessageComponentCollector({idle: 55000});
        collector.on('collect', async interaction => {
            if (!interaction.isButton()) return;
            try {
                if (interaction.customId === 'previous') {
                    currentPage = Math.max(currentPage - 1, 0);
                } else if (interaction.customId === 'next') {
                    currentPage = Math.min(currentPage + 1, pages.length - 1);
                }
                await message.edit({
                    content: title + pages[currentPage] + footer,
                    components: prepareComponents(pages.length > 1, currentPage, pages.length)
                });
            } catch (error) {
                console.error('Error handling interaction:', error);
            }
        });
    }
}

function preparePages(outdatedMembers, emojis, maxCharsPerPage) {
    const pages = [];
    let currentPageContent = "";
    outdatedMembers.forEach(member => {
        const currentRankEmoji = getRankEmoji(emojis, member.currentRole);
        const requiredRankEmoji = getRankEmoji(emojis, member.requiredRole);
        const line = `[**${member.displayName}**](https://wiseoldman.net/players/${encodeURIComponent(member.displayName)}) | ${currentRankEmoji} -> ${requiredRankEmoji} (${member.daysSinceJoined}d).\n`;
        if ((currentPageContent.length + line.length) > maxCharsPerPage) {
            pages.push(currentPageContent);
            currentPageContent = line;
        } else {
            currentPageContent += line;
        }
    });
    if (currentPageContent.length > 0) {
        pages.push(currentPageContent);
    }
    return pages;
}

function getFooterNote() {
    const now = Math.floor(Date.now() / 1000);
    return `\n\n**Please Note:**` +
        `\nThis relies on the [WOM Group](https://wiseoldman.net/groups/${process.env.WOM_GROUP_NUMBER}) being synced.` +
        `\nUse the [WOM Plugin](https://runelite.net/plugin-hub/show/wom-utils) to sync after making any rank changes.` +
        `\nLast Updated <t:${now}:R>.`;
}

function getRankEmoji(emojis, rankName) {
    const emoji = emojis.find(e => e.name.toLowerCase() === rankName.toLowerCase());
    return emoji ? `<:${emoji.name}:${emoji.id}>` : `**${rankName}**`;
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
    return await channel.send('Initializing rank updates...');
}

function prepareComponents(hasMultiplePages, currentPage = 0, totalPages = 1) {
    const components = [];
    if (hasMultiplePages) {
        const buttons = [];
        if (currentPage > 0) {
            buttons.push(new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
            );
        }
        if (currentPage < totalPages - 1) {
            buttons.push(new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
            );
        }
        if (buttons.length > 0) {
            components.push(new ActionRowBuilder().addComponents(buttons));
        }
    }
    return components;
}

async function checkTimeBasedRanks(groupId) {
    let outdatedRanks = [];
    try {
        const group = await wom.groups.getGroupDetails(groupId);
        if (!group || !group.roleOrders || !group.memberships) {
            console.error('Invalid group data:', group);
            return;
        }
        const roles = group.roleOrders.reduce((acc, role) => ({...acc, [role.role]: role.index}), {});
        for (const member of group.memberships) {
            if (!member) continue;
            const displayName = member.player.displayName;
            const createdAt = member.createdAt;
            const currentRole = member.role;
            if (!displayName || !createdAt || !currentRole) continue;
            const daysSinceJoined = Math.floor((new Date() - new Date(createdAt)) / (1000 * 3600 * 24));
            const requiredRole = getRequiredRole(daysSinceJoined);
            if (needsRankUp(currentRole, requiredRole, roles)) {
                outdatedRanks.push({
                    displayName,
                    daysSinceJoined,
                    currentRole,
                    requiredRole
                });
            }
        }
    } catch (error) {
        console.error('Failed to checkTimeBasedRanks:', error);
    }
    return outdatedRanks;
}

function getRequiredRole(daysInClan) {
    //if (daysInClan >= 60) return 'captain';
    if (daysInClan >= 30) return 'sergeant';
    if (daysInClan >= 7) return 'corporal';
    return 'recruit';
}

function needsRankUp(rankNow, nextRank, hierarchy) {
    if (!rankNow || !nextRank || !hierarchy) {
        return false;
    }
    const rankIdx = hierarchy[rankNow];
    const nextRankIdx = hierarchy[nextRank];
    return rankIdx !== undefined && nextRankIdx !== undefined && rankIdx > nextRankIdx;
}

module.exports = {updateMessage};