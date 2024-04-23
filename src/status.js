const {ActivityType} = require("discord-api-types/v10");
const {fetchStats} = require("./wom");
const {capitalizeWords} = require("./util");
const {bot} = require("./bot");

let messageQueue = [];
let timer;

async function regenerateMessages() {
    try {
        const {dets, stats} = await fetchStats();
        if (!dets || !stats) {
            console.error("Failed to fetch details or statistics, cannot regenerate messages.");
            return;
        }
        messageQueue = generateStatusMessages(dets, stats);
        shuffleMessages(messageQueue);
    } catch (error) {
        console.error("Error during message regeneration:", error);
    }
}

async function updateStatus() {
    if (!messageQueue.length) {
        await regenerateMessages();
    }
    if (!messageQueue.length) {
        console.error("No valid data to update bot status.");
        return;
    }
    const state = messageQueue.pop();
    bot.user.setPresence({
        activities: [{
            name: 'status', type: ActivityType.Custom, state: state
        }]
    });
    console.log("Updated Bot Status to: " + state);
    if (!timer) {
        timer = setTimeout(() => {
            console.log("Hourly message queue regeneration.");
            regenerateMessages().finally(() => {
                clearTimeout(timer);
                timer = null;
            });
        }, 3600000);
    }
}

function generateStatusMessages(dets, stats) {
    const messages = [];
    addMemberStatsMessages(messages, dets, stats);
    addAverageStatsMessages(messages, stats.averageStats.data);
    addLeaderStatsMessages(messages, stats.metricLeaders);
    return messages;
}

function addMemberStatsMessages(messages, dets, stats) {
    if (dets) {
        messages.push(`Total members: ${dets.memberCount.toLocaleString()}.`);
    }
    if (stats.maxed200msCount) {
        messages.push(`${stats.maxed200msCount.toLocaleString()} members with a 200m skill.`);
    }
    if (stats.maxedTotalCount) {
        messages.push(`${stats.maxedTotalCount.toLocaleString()} members with maxed total.`);
    }
    if (stats.maxedCombatCount) {
        messages.push(`${stats.maxedCombatCount.toLocaleString()} members with 126 combat.`);
    }
}

function addAverageStatsMessages(messages, data) {
    const categoryLabels = {
        skills: 'Level', bosses: 'KC', activities: 'Score'
    };
    ['skills', 'bosses', 'activities'].forEach(category => {
        const item = selectRandomProperty(data[category]);
        if (item) {
            const label = categoryLabels[category];
            const value = (item.level || item.kills || item.score || 0).toLocaleString();
            if ("0" === value) {
                return;
            }
            messages.push(`Average ${capitalizeWords(item.metric)} ${label}: ${value}.`);
        }
    });
}

function addLeaderStatsMessages(messages, leaders) {
    const categoryLabels = {
        skills: 'XP', bosses: 'KC', activities: 'Score'
    };
    ['skills', 'bosses', 'activities'].forEach(category => {
        const item = selectRandomProperty(leaders[category]);
        if (item) {
            const label = categoryLabels[category];
            const value = (item.experience || item.kills || item.score || 0).toLocaleString();
            const rank = (item.rank || 0).toLocaleString();
            if ("0" === value || "0" === rank) {
                return;
            }
            messages.push(`Highest ${capitalizeWords(item.metric)} is ${item.player.displayName} | ${label}: ${value} | Rank: ${rank}.`);
        }
    });
}

function selectRandomProperty(obj) {
    const validEntries = Object.values(obj).filter(value => value.level > 0 || value.kills > 0 || value.score > 0);
    return validEntries[Math.floor(Math.random() * validEntries.length)];
}

function shuffleMessages(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

module.exports = {updateStatus};