const { ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { bot } = require('./Bot');
const { ChannelType, ButtonStyle } = require('discord-api-types/v10');
const { getAllUsers } = require('./WaitlistSQL');
const { findOrCreateMessage } = require('./Util');
const CHANNEL_NAME = 'waitlist';
let activeCollector = null;

async function updateWaitlist() {
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
		const waitlistMembers = await getAllUsers();
		const pages = preparePages(waitlistMembers, 1500);
		let message = await findOrCreateMessage(channel);
		let components = prepareComponents(pages.length > 1, 0, pages.length);
		const title = '## Waitlist\n';
		const footer = getFooterNote();
		let content = pages.length > 0 ? pages[0] : '\n**Nobody is on the waitlist.**';
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
				if (interaction.customId === 'waitlist-previous') {
					currentPage = Math.max(currentPage - 1, 0);
				} else if (interaction.customId === 'waitlist-next') {
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

function preparePages(waitlistMembers, maxCharsPerPage) {
	const pages = [];
	let currentPageContent = '';
	waitlistMembers.forEach((member, index) => {
		const line = `${index + 1}: <@${member.id}>\n`;
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
	return `\n\nLast Updated <t:${now}:R>.`;
}

function prepareComponents(hasMultiplePages, currentPage = 0, totalPages = 1) {
	const components = [];
	if (hasMultiplePages) {
		const buttons = [];
		if (currentPage > 0) {
			buttons.push(
				new ButtonBuilder()
					.setCustomId('waitlist-previous')
					.setLabel('Previous')
					.setStyle(ButtonStyle.Primary),
			);
		}
		if (currentPage < totalPages - 1) {
			buttons.push(
				new ButtonBuilder()
					.setCustomId('waitlist-next')
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

module.exports = { updateWaitlist };
