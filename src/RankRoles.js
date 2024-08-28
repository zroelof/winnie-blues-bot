const {fetchStats, getWOMMembers} = require('./WiseOldMan');
const {standardize} = require('./Util');
const {removeMultipleUsers} = require('./WaitlistSQL');

const EXCLUDED_ROLES = new Set([
    'owner',
    'deputy owner',
    'coordinator',
    'admin',
    'saviour',
    'server bots',
]);

async function syncRoles(bot) {
    console.log('Syncing roles with WOM...');
    const startTime = Date.now();
    const [womMembers, {dets}] = await Promise.all([getWOMMembers(), fetchStats()]);
    if (!dets || !womMembers) {
        console.error('Failed to fetch details or members, cannot proceed with assigning roles.');
        return;
    }
    const rankHierarchy = dets.roleOrders
        .sort((a, b) => a.index - b.index)
        .map(order => order.role.toLowerCase().replace('_', ' '));
    const womMemberMap = new Map(
        womMembers.map(member => [member.rsn, member.rank.toLowerCase().replace('_', ' ')]),
    );
    for (const guild of bot.guilds.cache.values()) {
        await syncGuildRoles(guild, womMemberMap, rankHierarchy, bot.user.id);
    }
    console.log(`Synced roles in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds.`);
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
        console.error(`Failed finding required roles in guild: ${guild.name}`);
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
    const updates = [];
    for (const member of members.values()) {
        if (member.user.bot) continue;
        const update = processMemberRoles(
            member,
            womMemberMap,
            rankHierarchy,
            guestRole,
            winniesRole,
            rankRoles,
            botRole.position,
        );
        if (update) updates.push(update);
    }
    await updateRoles(guild, updates, botRole);
    const usersToRemoveFromWaitlist = updates
        .filter(update => update.removeFromWaitlist)
        .map(update => update.memberId);
    if (usersToRemoveFromWaitlist.length > 0) {
        await removeMultipleUsers(usersToRemoveFromWaitlist);
    }
}

function processMemberRoles(
    member,
    womMemberMap,
    rankHierarchy,
    guestRole,
    winniesRole,
    rankRoles,
    botRolePosition,
) {
    const memberRoles = new Set(member.roles.cache.map(r => r.id));
    const memberHighestRolePosition = Math.max(...member.roles.cache.map(r => r.position));
    if (memberHighestRolePosition >= botRolePosition) {
        return null;
    }
    if ([...memberRoles].some(roleId => EXCLUDED_ROLES.has(roleId))) {
        return handleExcludedMember(member.id, guestRole, winniesRole, memberRoles);
    }
    let displayNames = [member.nickname || '', member.user.username || '']
        .flatMap(name => name.split(/\s-\s|[\/|\\]/).filter(part => part.trim() !== ''))
        .map(name => name.trim())
        .filter(name => name);
    const memberRanks = [];
    for (const name of displayNames) {
        const standardizedName = standardize(name);
        for (const [womName, rank] of womMemberMap) {
            const standardizedWomName = standardize(womName);
            if (standardizedName === standardizedWomName) {
                memberRanks.push(rank);
                break;
            }
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
    const update = {memberId, rolesToAdd: [], rolesToRemove: []};
    if (memberRoles.has(guestRole.id)) update.rolesToRemove.push(guestRole);
    if (!memberRoles.has(winniesRole.id)) update.rolesToAdd.push(winniesRole);
    console.log(
        `Excluded member update: Add roles: ${update.rolesToAdd.map(r => r.name).join(', ')}, Remove roles: ${update.rolesToRemove.map(r => r.name).join(', ')}`,
    );
    return update.rolesToAdd.length > 0 || update.rolesToRemove.length > 0 ? update : null;
}

function handleNonMember(memberId, guestRole, winniesRole, memberRoles, rankRoles) {
    const update = {memberId, rolesToAdd: [], rolesToRemove: []};
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
    const update = {memberId, rolesToAdd: [], rolesToRemove: [], removeFromWaitlist: true};
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
        // Only remove other rank roles if they are lower than the highest rank
        for (const [rank, role] of rankRoles) {
            if (
                rank !== highestRank &&
                memberRoles.has(role.id) &&
                rankHierarchy.indexOf(rank) < rankHierarchy.indexOf(highestRank)
            ) {
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

module.exports = {syncRoles};
