const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { fetchStats, getClogHighscores } = require('../WiseOldMan');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('highscore')
		.setDescription('Display clan highscores from Wise Old Man')
		.addStringOption(option =>
			option
				.setName('type')
				.setDescription('Type of highscores to display')
				.setRequired(true)
				.addChoices(
					{ name: 'Skills', value: 'skills' },
					{ name: 'Bosses', value: 'bosses' },
					{
						name: 'Minigames',
						value: 'minigames',
					},
					{ name: 'Collection Log', value: 'clog' },
				),
		),
	execute: executeHighscoreCommand,
};

const config = {
	// Colors for Discord embeds (hex color as decimal)
	skillsColor: 0x00aa00, // Green
	bossesColor: 0xaa0000, // Red
	minigamesColor: 0x0000aa, // Blue
	clogColor: 0xaa00aa, // Purple

	// Discord embed settings
	fieldsPerRow: 3, // Always use 3 columns
	showPageNumbers: false,

	// Experience threshold for level 99 (will hide level display above this)
	level99Exp: 13034431,
	maxTotal: 2277,
};

// Capitalize first letter of a string
function capitalize(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

// Format metric names to be more readable
function formatMetricName(metricName) {
	return metricName.split('_').map(capitalize).join(' ');
}

// Format numbers with commas
function formatNumber(num) {
	if (num === undefined || num === null) return '0';
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Find an emoji from the client or guild cache
function findEmoji(client, guild, emojiName) {
	if (!emojiName) {
		console.error("No Emoji Name!")
		return null;
	}
	try {
		// Try to find in client's emoji cache (global bot emojis)
		let emoji = client.emojis.cache.find(
			emoji => emoji.name.toLowerCase() === emojiName.trim().toLowerCase(),
		);
		// If not found in client's emojis, check guild's emojis
		if (!emoji && guild) {
			emoji = guild.emojis.cache.find(
				emoji => emoji.name.toLowerCase() === emojiName.trim().toLowerCase(),
			);
		}
		// Return the emoji in the format Discord expects, or null if not found
		return emoji ? `<:${emoji.name}:${emoji.id}>` : null;
	} catch (e) {
		console.error('Failed finding emoji:', emojiName.toLowerCase());
		return null;
	}
}

// Process metrics (skills, bosses, activities) from statistics data
function processMetrics(stats, metricType) {
	const highscores = {};
	// Check if we have the metricLeaders and the specific metric type data
	if (!stats || !stats.metricLeaders || !stats.metricLeaders[metricType]) {
		console.error(`No metricLeaders.${metricType} data found in stats`);
		return highscores;
	}
	// Process each metric from the API data
	for (const metric in stats.metricLeaders[metricType]) {
		const topPlayer = stats.metricLeaders[metricType][metric];
		if (!topPlayer.player) continue;
		// Create a leader entry based on metric type
		let leader = {
			username: topPlayer.player.displayName || topPlayer.player.username,
			rank: topPlayer.rank || 0,
		};
		// Add metric-specific properties
		if (metricType === 'skills') {
			leader.experience = topPlayer.experience;
			leader.level = topPlayer.level || 99;
		} else if (metricType === 'bosses') {
			leader.kills = topPlayer.kills;
		} else if (metricType === 'activities') {
			leader.score = topPlayer.score;
		}
		highscores[metric] = [leader];
	}
	return highscores;
}

// Create Discord embed fields based on metric type
function createFields(highscores, metricType, client, guild) {
	return Object.keys(highscores).map(metric => {
		const leaders = highscores[metric];
		// Get emoji if available
		const emojiString = findEmoji(client, guild, metric);
		// Format field name with emoji if available
		let displayName;
		if (emojiString) {
			displayName = `${emojiString} ${metricType === 'skills' ? capitalize(metric) : formatMetricName(metric)}`;
		} else {
			// No emoji, just the name
			displayName = metricType === 'skills' ? capitalize(metric) : formatMetricName(metric);
		}
		if (!leaders || leaders.length === 0) {
			return {
				name: displayName,
				value: 'No data available',
				inline: true,
			};
		}
		const leader = leaders[0];
		// Create content with proper spacing for better alignment
		let lines = [`**${leader.username}**`];
		// Add metric-specific details
		if (metricType === 'skills') {
			if (metric === 'overall') {
				// Only show total level if they aren't maxed
				if (leader.level !== config.maxTotal) {
					lines.push(`Total Level: ${leader.level}`);
				}
			} else {
				// Only show level for skills below level 99 threshold
				if (leader.experience < config.level99Exp) {
					lines.push(`Level: ${leader.level || 99}`);
				}
			}
			lines.push(`XP: ${formatNumber(leader.experience)}`);
		} else if (metricType === 'bosses') {
			lines.push(`KC: ${formatNumber(leader.kills)}`);
		} else if (metricType === 'activities') {
			lines.push(`Score: ${formatNumber(leader.score)}`);
		}
		lines.push(`Rank: ${formatNumber(leader.rank || 0)}`);
		// Join lines with newlines
		const value = lines.join('\n');
		return {
			name: displayName,
			value: value,
			inline: true,
		};
	});
}

// Create fields for collection log entries
function createClogFields(clogEntries, client, guild) {
	return clogEntries.map((entry, index) => {
		const accountEmojiStr = findEmoji(client, guild, entry.player.type);
		const value = [
			`**${entry.player.displayName}** ${accountEmojiStr ? accountEmojiStr : ''}`,
			`Logs: ${formatNumber(entry.data.score)}`,
			`Rank: ${formatNumber(entry.data.rank)}`,
		].join('\n');
		return {
			name: `#${index + 1}`,
			value: value,
			inline: true,
		};
	});
}

// Insert blank fields for proper alignment
function insertBlankFields(fields, fieldsPerRow) {
	const result = [...fields];
	const remainder = fields.length % fieldsPerRow;
	if (remainder > 0) {
		const blankCount = fieldsPerRow - remainder;
		for (let i = 0; i < blankCount; i++) {
			result.push({
				name: '\u200B', // Zero-width space
				value: '\u200B', // Zero-width space
				inline: true,
			});
		}
	}
	return result;
}

// Split fields into chunks for multiple embeds
// Ensures each chunk has complete rows (divisible by fieldsPerRow)
function chunkFields(fields, fieldsPerRow) {
	// Add blank fields first to ensure proper alignment
	const fieldsWithBlanks = insertBlankFields(fields, fieldsPerRow);
	// Calculate max fields per embed (ensuring it's divisible by fieldsPerRow)
	const maxFieldsPerEmbed = Math.floor(25 / fieldsPerRow) * fieldsPerRow;
	// Split into chunks
	const chunks = [];
	for (let i = 0; i < fieldsWithBlanks.length; i += maxFieldsPerEmbed) {
		chunks.push(fieldsWithBlanks.slice(i, i + maxFieldsPerEmbed));
	}
	return chunks;
}

// Format Discord embeds from highscores data
function prepareDiscordEmbeds(highscores, groupDetails, metricType, client, guild) {
	// Create fields for each metric
	const fields = createFields(highscores, metricType, client, guild);
	// Split fields into chunks to keep within Discord's limits
	const fieldChunks = chunkFields(fields, config.fieldsPerRow);
	if (fieldChunks.length === 0) {
		return [];
	}
	// Determine title and thumbnail based on metric type
	let title, thumbnail, color, eachName;
	if (metricType === 'skills') {
		title = `Skill Highscores`;
		eachName = 'skill';
		thumbnail =
			'https://oldschool.runescape.wiki/images/thumb/Stats_icon.png/800px-Stats_icon.png';
		color = config.skillsColor;
	} else if (metricType === 'bosses') {
		title = `Boss Highscores`;
		eachName = 'boss';
		thumbnail = 'https://oldschool.runescape.wiki/images/thumb/Boss.png/1024px-Boss.png';
		color = config.bossesColor;
	} else if (metricType === 'activities') {
		title = `Minigame & Activity Highscores`;
		eachName = 'activity';
		thumbnail =
			'https://oldschool.runescape.wiki/images/thumb/Minigames.png/1024px-Minigames.png';
		color = config.minigamesColor;
	}
	// Create embeds for each chunk
	return fieldChunks.map((chunk, index) => {
		const embed = new EmbedBuilder().setColor(color).addFields(chunk);
		// Add title and description only to the first embed
		if (index === 0) {
			embed
				.setTitle(title)
				.setDescription(
					`Top players in each ${eachName} for ${groupDetails.name}\nData from the [Wise Old Man](https://wiseoldman.net/groups/7154)`,
				)
				.setThumbnail(thumbnail);
		}
		// Add footer only to the last embed
		if (index === fieldChunks.length - 1) {
			let footerText = `Total Members: ${groupDetails.memberCount}`;
			// Add page numbers if enabled
			if (config.showPageNumbers && fieldChunks.length > 1) {
				footerText += ` | Page ${index + 1}/${fieldChunks.length}`;
			}
			embed.setFooter({ text: footerText }).setTimestamp();
		} else if (config.showPageNumbers) {
			// Add page numbering to intermediate embeds if enabled
			embed.setFooter({ text: `Page ${index + 1}/${fieldChunks.length}` });
		}
		return embed;
	});
}

// Format collection log embeds
function prepareClogEmbeds(clogEntries, groupDetails, client, guild) {
	if (!clogEntries || clogEntries.length === 0) {
		return [];
	}
	// Create fields for collection log entries
	const fields = createClogFields(clogEntries);
	// Split fields into chunks to keep within Discord's limits
	const fieldChunks = chunkFields(fields, config.fieldsPerRow);
	// Create embeds for each chunk
	return fieldChunks.map((chunk, index) => {
		const embed = new EmbedBuilder().setColor(config.clogColor).addFields(chunk);
		// Add title and description only to the first embed
		if (index === 0) {
			embed
				.setTitle(`Collection Log Highscores`)
				.setDescription(
					`Top 25 Collection Log hunters for ${groupDetails.name}\nData from the [Wise Old Man](https://wiseoldman.net/groups/7154)`,
				)
				.setThumbnail('https://oldschool.runescape.wiki/images/Collection_log.png');
		}
		// Add footer only to the last embed
		if (index === fieldChunks.length - 1) {
			let footerText = `Total Members: ${groupDetails.memberCount}`;
			// Add page numbers if enabled
			if (config.showPageNumbers && fieldChunks.length > 1) {
				footerText += ` | Page ${index + 1}/${fieldChunks.length}`;
			}
			embed.setFooter({ text: footerText }).setTimestamp();
		} else if (config.showPageNumbers) {
			// Add page numbering to intermediate embeds if enabled
			embed.setFooter({ text: `Page ${index + 1}/${fieldChunks.length}` });
		}
		return embed;
	});
}

// Handle the highscore command execution
async function executeHighscoreCommand(interaction) {
	try {
		const hasPermission = interaction.member.permissions.has(
			PermissionsBitField.Flags.Administrator,
		);
		if (!hasPermission) {
			return interaction.reply({
				content: '❌ You do not have permission to use this command.',
				ephemeral: true,
			});
		}
		await interaction.deferReply(); // Let Discord know we're working on it
		const metricType = interaction.options.getString('type');
		// Handle collection log option separately
		if (metricType === 'clog') {
			const { dets } = await fetchStats();
			const clogEntries = await getClogHighscores();
			if (!clogEntries || clogEntries.length === 0) {
				return interaction.editReply('No collection log data available.');
			}
			// Create Discord embeds for collection log
			const discordEmbeds = prepareClogEmbeds(
				clogEntries,
				dets,
				interaction.client,
				interaction.guild,
			);
			// Discord has a limit of 10 embeds per message
			const MAX_EMBEDS_PER_MESSAGE = 10;
			// Send the first batch
			await interaction.editReply({ embeds: discordEmbeds.slice(0, MAX_EMBEDS_PER_MESSAGE) });
			// If there are more than 10 embeds, send them as follow-up messages
			for (
				let i = MAX_EMBEDS_PER_MESSAGE;
				i < discordEmbeds.length;
				i += MAX_EMBEDS_PER_MESSAGE
			) {
				const embedBatch = discordEmbeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE);
				await interaction.followUp({ embeds: embedBatch });
			}
			return;
		}
		// For other metric types, proceed as before
		// Map "minigames" option to the correct API value
		const apiMetricType = metricType === 'minigames' ? 'activities' : metricType;
		// Fetch the data
		const { dets, stats } = await fetchStats();
		// Process the metrics
		const highscores = processMetrics(stats, apiMetricType);
		if (Object.keys(highscores).length === 0) {
			return interaction.editReply(`No ${metricType} data available.`);
		}
		// Create Discord embeds
		const discordEmbeds = prepareDiscordEmbeds(
			highscores,
			dets,
			apiMetricType,
			interaction.client,
			interaction.guild,
		);
		// Discord has a limit of 10 embeds per message
		const MAX_EMBEDS_PER_MESSAGE = 10;
		// Send the first batch
		await interaction.editReply({ embeds: discordEmbeds.slice(0, MAX_EMBEDS_PER_MESSAGE) });
		// If there are more than 10 embeds, send them as follow-up messages
		for (
			let i = MAX_EMBEDS_PER_MESSAGE;
			i < discordEmbeds.length;
			i += MAX_EMBEDS_PER_MESSAGE
		) {
			const embedBatch = discordEmbeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE);
			await interaction.followUp({ embeds: embedBatch });
		}
	} catch (error) {
		console.error('Error executing highscore command:', error);
		await interaction.editReply(
			'There was an error fetching the highscores. Please try again later.',
		);
	}
}
