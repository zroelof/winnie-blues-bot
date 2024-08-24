const { ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { wom } = require('./WiseOldMan');
const { bot } = require('./Bot');
const { ChannelType, ButtonStyle } = require('discord-api-types/v10');
const { findOrCreateMessage } = require('./Util');
const CHANNEL_NAME = 'time-based-ranks';
const excludedRsns = ['baford'];
let activeCollector = null;

async function updateMessage() {
	const guilds = bot.guilds.cache.values();
	for (const guild of guilds) {
		let channel = guild.channels.cache.find(
			ch => ch.name.endsWith(CHANNEL_NAME) && ch.type === ChannelType.GuildText,
		);
		if (!channel) {
			console.log(
				`Channel "${CHANNEL_NAME}" not found in guild ${guild.name}, skipping update.`,
			);
			continue;
		}
		const emojis = guild.emojis.cache;
		const outdatedRanks = await checkTimeBasedRanks(process.env.WOM_GROUP_NUMBER);
		const pages = preparePages(outdatedRanks, emojis, 1500);
		let message = await findOrCreateMessage(channel);
		let components = prepareComponents(pages.length > 1, 0, pages.length);
		const title = '## Timed Rank Role Status\n';
		const footer = getFooterNote();
		let content = pages.length > 0 ? pages[0] : '\n**All ranks are up to date.**';
		content = title + content + footer;
		await message.edit({
			content,
			components,
		});
		await message.suppressEmbeds(true);
		let currentPage = 0;
		if (activeCollector) {
			activeCollector.stop();
			activeCollector = null;
		}
		activeCollector = message.createMessageComponentCollector({ idle: 60000 });
		activeCollector.on('collect', async interaction => {
			if (!interaction.isButton()) return;
			try {
				if (interaction.customId === 'timerole-previous') {
					currentPage = Math.max(currentPage - 1, 0);
				} else if (interaction.customId === 'timerole-next') {
					currentPage = Math.min(currentPage + 1, pages.length - 1);
				}
				await interaction.update({
					content: title + pages[currentPage] + footer,
					components: prepareComponents(pages.length > 1, currentPage, pages.length),
				});
			} catch (error) {
				console.error('Error handling interaction:', error);
			}
		});
	}
}

function preparePages(outdatedMembers, emojis, maxCharsPerPage) {
	// Sort the members by highest to lowest days since joined
	outdatedMembers.sort((a, b) => b.daysSinceJoined - a.daysSinceJoined);
	const pages = [];
	let currentPageContent = '';
	outdatedMembers.forEach(member => {
		if (excludedRsns.includes(member.displayName)) {
			return;
		}
		const currentRankEmoji = getRankEmoji(emojis, member.currentRole);
		const requiredRankEmoji = getRankEmoji(emojis, member.requiredRole);
		const line = `[**${member.displayName}**](https://wiseoldman.net/players/${encodeURIComponent(member.displayName)}) | ${currentRankEmoji} -> ${requiredRankEmoji} (${member.daysSinceJoined}d).\n`;
		if (currentPageContent.length + line.length > maxCharsPerPage) {
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
	return (
		`\n\n**Please Note:**` +
		`\nThis relies on the [WOM Group](https://wiseoldman.net/groups/${process.env.WOM_GROUP_NUMBER}) being synced.` +
		`\nUse the [WOM Plugin](https://runelite.net/plugin-hub/show/wom-utils) to sync after making any rank changes.` +
		`\nLast Updated <t:${now}:R>.`
	);
}

function getRankEmoji(emojis, rankName) {
	const emoji = emojis.find(e => e.name.toLowerCase() === rankName.toLowerCase());
	return emoji ? `<:${emoji.name}:${emoji.id}>` : `**${rankName}**`;
}

function prepareComponents(hasMultiplePages, currentPage = 0, totalPages = 1) {
	const components = [];
	if (hasMultiplePages) {
		const buttons = [];
		if (currentPage > 0) {
			buttons.push(
				new ButtonBuilder()
					.setCustomId('timerole-previous')
					.setLabel('Previous')
					.setStyle(ButtonStyle.Primary),
			);
		}
		if (currentPage < totalPages - 1) {
			buttons.push(
				new ButtonBuilder()
					.setCustomId('timerole-next')
					.setLabel('Next')
					.setStyle(ButtonStyle.Primary),
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
		const roles = group.roleOrders.reduce(
			(acc, role) => ({ ...acc, [role.role]: role.index }),
			{},
		);
		for (const member of group.memberships) {
			if (!member) continue;
			const displayName = member.player.displayName;
			const createdAt = member.createdAt;
			const currentRole = member.role;
			if (!displayName || !createdAt || !currentRole) continue;
			const daysSinceJoined = Math.floor(
				(new Date() - new Date(createdAt)) / (1000 * 3600 * 24),
			);
			const requiredRole = getRequiredRole(daysSinceJoined);
			if (needsRankUp(currentRole, requiredRole, roles)) {
				outdatedRanks.push({
					displayName,
					daysSinceJoined,
					currentRole,
					requiredRole,
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

module.exports = { updateMessage };
