module.exports = {
	expression: '*/1 * * * *',
	async execute(client) {
		return await syncRoles(client);
	},
};

const { fetchStats, getWOMMembers } = require('../WiseOldMan');
const { standardize } = require('../utils');
const { EXCLUDED_ROLES } = require('../config');

let isSyncingRoles = false;

async function syncRoles(bot) {
	if (isSyncingRoles) {
		console.log('syncRoles is already running; skipping this call.');
		return;
	}
	isSyncingRoles = true;
	try {
		console.log('Starting role synchronization with WOM...');
		const startTime = Date.now();
		const womMembersArray = await getWOMMembers();
		if (!womMembersArray || !Array.isArray(womMembersArray) || [] === womMembersArray) {
			console.error('Failed to fetch members.');
			return;
		}
		//console.log('Fetched stats and WOM members.');
		const { dets } = await fetchStats();
		if (!dets) {
			console.error('Failed to fetch details.');
			return;
		}
		// Convert WOM members array to a Map for efficient lookup
		const womMemberMap = new Map(womMembersArray.map(member => [member.rsn, member.rank]));
		console.log(`Converted WOM members to map. Total members: ${womMemberMap.size}`);
		// Sort and prepare rank hierarchy
		const rankHierarchy = dets.roleOrders
			.sort((a, b) => a.index - b.index)
			.map(order => order.role.toLowerCase().replace('_', ' '));
		//console.log('Rank hierarchy:', rankHierarchy);
		// Iterate through each guild the bot is part of
		for (const guild of bot.guilds.cache.values()) {
			console.log(`Synchronizing roles for guild: ${guild.name}`);
			await syncGuildRoles(guild, womMemberMap, rankHierarchy, bot.user.id);
		}
		const duration = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(`Role synchronization completed in ${duration} seconds.`);
	} catch (error) {
		console.error('An unexpected error occurred during role synchronization:', error);
	} finally {
		isSyncingRoles = false;
		//console.log('syncRoles has completed and flag has been reset.');
	}
}

async function syncGuildRoles(guild, womMemberMap, rankHierarchy, botId) {
	const roles = await guild.roles.fetch();
	const guestRole = roles.find(r => r.name.toLowerCase() === 'guest');
	const winniesRole = roles.find(r => r.name.toLowerCase() === 'winnie blues');
	const rankRoles = new Map(
		rankHierarchy
			.map(rank => [rank, roles.find(r => r.name.toLowerCase() === rank.toLowerCase())])
			.filter(([_, role]) => role !== undefined),
	);
	if (!guestRole || !winniesRole) {
		console.error(`Failed finding guest/winnies role in guild: ${guild.name}`);
		return;
	}
	if (rankRoles.size !== rankHierarchy.length) {
		console.log(`Some rank roles are missing in guild: ${guild.name}`);
		console.log(`Found roles: ${[...rankRoles.keys()].join(', ')}`);
		console.log(`Expected roles: ${rankHierarchy.join(', ')}`);
	}
	const botMember = await guild.members.fetch(botId);
	const botRole = botMember.roles.highest;
	const members = await guild.members.fetch();
	// Preprocess WOM member map for efficient lookup
	const standardizedWOMMemberMap = new Map();
	for (const [womRsn, womRank] of womMemberMap) {
		standardizedWOMMemberMap.set(standardize(womRsn), womRank);
	}
	const updates = [];
	for (const member of members.values()) {
		if (member.user.bot) continue;
		const update = processMemberRoles(
			member,
			standardizedWOMMemberMap,
			rankHierarchy,
			guestRole,
			winniesRole,
			rankRoles,
		);
		if (update) updates.push(update);
	}
	await updateRoles(guild, updates, botRole);
}

function processMemberRoles(
	member,
	standardizedWOMMemberMap,
	rankHierarchy,
	guestRole,
	winniesRole,
	rankRoles,
) {
	const memberRoles = new Set(member.roles.cache.map(r => r.id));
	if (
		[...member.roles.cache.values()].some(role => EXCLUDED_ROLES.has(role.name.toLowerCase()))
	) {
		return handleExcludedMember(member.id, guestRole, winniesRole, memberRoles);
	}
	let displayNames = [
		member.nickname || '',
		member.user.globalName || '',
		member.user.username || '',
	]
		.flatMap(name => name.split(/\s-\s|[\/|\\]/).filter(part => part.trim() !== ''))
		.map(name => name.trim())
		.filter(name => name);
	const memberRanks = [];
	for (const name of displayNames) {
		const standardizedName = standardize(name);
		const womRank = standardizedWOMMemberMap.get(standardizedName);
		if (womRank) {
			memberRanks.push(womRank);
			break; // Found a match, no need to check other names
		}
	}
	if (memberRanks.length === 0) {
		return handleNonMember(member.id, guestRole, winniesRole, memberRoles, rankRoles);
	}
	const highestRank = memberRanks.reduce((highest, current) =>
		rankHierarchy.indexOf(current) > rankHierarchy.indexOf(highest) ? current : highest,
	);
	return synchronizeMemberRoles(
		member.id,
		highestRank,
		rankHierarchy,
		guestRole,
		winniesRole,
		rankRoles,
		memberRoles,
	);
}

function handleExcludedMember(memberId, guestRole, winniesRole, memberRoles) {
	const update = { memberId, rolesToAdd: [], rolesToRemove: [] };
	if (memberRoles.has(guestRole.id)) update.rolesToRemove.push(guestRole);
	if (!memberRoles.has(winniesRole.id)) update.rolesToAdd.push(winniesRole);
	return update.rolesToAdd.length > 0 || update.rolesToRemove.length > 0 ? update : null;
}

function handleNonMember(memberId, guestRole, winniesRole, memberRoles, rankRoles) {
	const update = { memberId, rolesToAdd: [], rolesToRemove: [] };
	if (!memberRoles.has(guestRole.id)) update.rolesToAdd.push(guestRole);
	if (memberRoles.has(winniesRole.id)) update.rolesToRemove.push(winniesRole);
	// Remove any existing rank roles
	for (const [_, role] of rankRoles) {
		if (memberRoles.has(role.id)) update.rolesToRemove.push(role);
	}
	return update.rolesToAdd.length > 0 || update.rolesToRemove.length > 0 ? update : null;
}

function synchronizeMemberRoles(
	memberId,
	highestRank,
	rankHierarchy,
	guestRole,
	winniesRole,
	rankRoles,
	memberRoles,
) {
	const update = { memberId, rolesToAdd: [], rolesToRemove: [], removeFromWaitlist: true };
	// Handle guest role
	if (memberRoles.has(guestRole.id)) {
		update.rolesToRemove.push(guestRole);
	}
	// Handle Winnie Blues role
	if (!memberRoles.has(winniesRole.id)) {
		update.rolesToAdd.push(winniesRole);
	}
	// Handle rank roles
	const highestRankRole = rankRoles.get(highestRank);
	if (highestRankRole) {
		if (!memberRoles.has(highestRankRole.id)) {
			update.rolesToAdd.push(highestRankRole);
		}
		// Remove other rank roles
		for (const [rank, role] of rankRoles) {
			if (rank !== highestRank && memberRoles.has(role.id)) {
				update.rolesToRemove.push(role);
			}
		}
	}
	return update.rolesToAdd.length > 0 || update.rolesToRemove.length > 0 ? update : null;
}

async function updateRoles(guild, updates, botRole) {
	for (const update of updates) {
		try {
			const member = await guild.members.fetch(update.memberId);
			if (!member) {
				console.log(`Member ${update.memberId} not found in guild.`);
				continue;
			}
			const highestRole = member.roles.highest;
			if (highestRole.position >= botRole.position) {
				console.log(`Skipping member ${member.user.tag} due to higher role position.`);
				continue;
			}
			// Remove roles
			for (const role of update.rolesToRemove) {
				if (role && role.position < botRole.position) {
					try {
						await member.roles.remove(role);
						console.log(
							`Removed ${role.name} from ${member.nickname || member.user.tag}`,
						);
					} catch (removeError) {
						console.error(
							`Failed to remove role ${role.name} from ${member.nickname || member.user.tag}:`,
							removeError,
						);
					}
				}
			}
			// Add roles
			for (const role of update.rolesToAdd) {
				if (role && role.position < botRole.position) {
					try {
						await member.roles.add(role);
						console.log(`Added ${role.name} to ${member.nickname || member.user.tag}`);
					} catch (addError) {
						console.error(
							`Failed to add role ${role.name} to ${member.nickname || member.user.tag}:`,
							addError,
						);
					}
				}
			}
		} catch (error) {
			console.error(`An error occurred while processing member ${update.memberId}:`, error);
		}
	}
}
