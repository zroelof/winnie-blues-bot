const {fetchStats, getWOMMembers} = require('./WiseOldMan');
const {capitalizeWords, standardize} = require("./Util");
const {removeUser, getUser} = require("./WaitlistSQL");
const excludedRoles = ['owner', 'deputy owner', 'saviour', 'server bots'];

async function syncRoles(bot) {
    console.log("Syncing roles with WOM...");
    const womMembers = await getWOMMembers();
    const {dets, stats} = await fetchStats();
    if (!dets || !stats) {
        console.error("Failed to fetch details or statistics, cannot proceed with assigning roles.");
        return;
    }
    bot.guilds.cache.forEach(guild => {
        guild.members.fetch().then(members => {
            members.forEach(member => {
                processMemberRoles(member, womMembers, dets, guild);
            });
        }).catch(err => console.error('Error fetching members:', err));
    });
}

async function processMemberRoles(member, womMembers, dets, guild) {
    if (member.user.bot) return; // Skip bots
    const guestRole = await ensureRoleExists(guild, 'Guest');
    const rankHierarchy = dets.roleOrders.sort((a, b) => a.index - b.index).map(order => order.role.toLowerCase());
    if (member.roles.cache.some(role => excludedRoles.includes(role.name.toLowerCase()))) {
        if (member.roles.cache.has(guestRole.id)) {
            member.roles.remove(guestRole).catch(error => {
                console.error(`Failed to remove 'Guest' role from ${member.displayName} in ${guild.name}: ${error}`);
            });
        }
        return;
    }
    await updateMemberRank(member, womMembers, rankHierarchy, guestRole);
}

async function updateMemberRank(member, womMembers, rankHierarchy, guestRole) {
    const displayNameParts = member.displayName.split(/[|/&]/);
    const highestRank = displayNameParts.reduce((highest, namePart) => {
        const trimmedName = namePart.trim().toLowerCase();
        const memberRank = womMembers.find(womMember => new RegExp('^' + standardize(womMember.rsn) + '$').test(trimmedName));
        return (memberRank && (!highest || compareRanks(memberRank.rank, highest.rank, rankHierarchy) > 0)) ? memberRank : highest;
    }, null);
    if (!highestRank) {
        if (!member.roles.cache.has(guestRole.id)) {
            member.roles.add(guestRole).catch(error => {
                console.error(`Failed to assign 'Guest' role to ${member.displayName} in ${guild.name}: ${error}`);
            });
        }
        return;
    }
    if (excludedRoles.includes(standardize(highestRank.rank))) {
        return;
    }
    await synchronizeMemberRoles(member, highestRank.rank, rankHierarchy, guestRole);
}

async function synchronizeMemberRoles(member, rank, rankHierarchy, guestRole) {
    const rolesToRemove = member.roles.cache.filter(role => rankHierarchy.includes(role.name.toLowerCase()) && role.name.toLowerCase() !== rank.toLowerCase());
    rolesToRemove.forEach(role => {
        member.roles.remove(role).catch(error => {
            console.error(`Error removing '${role.name}' from '${member.displayName}': ${error}`);
        });
    });
    const rankRole = await ensureRoleExists(member.guild, rank);
    if (!member.roles.cache.has(rankRole.id)) {
        member.roles.add(rankRole).catch(error => {
            console.error(`Error adding '${rank}' to '${member.displayName}': ${error}`);
        });
    }
    if (member.roles.cache.has(guestRole.id)) {
        member.roles.remove(guestRole).catch(error => {
            console.error(`Error removing 'Guest' role from '${member.displayName}': ${error}`);
        });
    }
    if (await getUser(member.id)) {
        await removeUser(member.id);
    }
}

function compareRanks(rank1, rank2, rankHierarchy) {
    return rankHierarchy.indexOf(rank2.toLowerCase()) - rankHierarchy.indexOf(rank1.toLowerCase());
}

async function ensureRoleExists(guild, roleName) {
    let role = guild.roles.cache.find(r => standardize(r.name) === standardize(roleName));
    if (!role) {
        role = await guild.roles.create({
            name: capitalizeWords(roleName), hoist: true, mentionable: false,
            reason: 'Needed for auto role assignment via WOM.'
        }).catch(error => {
            console.error(`Failed to create role '${roleName}':`, error);
        });
    }
    return role;
}

module.exports = {syncRoles};