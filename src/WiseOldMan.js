// WiseOldMan.js
const { WOMClient } = require('@wise-old-man/utils');
const NodeCache = require('node-cache');
const { WOM_API_KEY, WOM_USER_AGENT, WOM_GROUP_NUMBER } = require('./config');

const wom = new WOMClient({
	apiKey: WOM_API_KEY,
	userAgent: WOM_USER_AGENT,
});

// Initialize cache with a TTL of 1 hour
const cache = new NodeCache({ stdTTL: 60 * 60 });

async function fetchStats() {
	const cacheKey = 'fetchStats';
	const cachedData = cache.get(cacheKey);
	if (cachedData) {
		console.log('Returning cached stats.');
		return cachedData;
	}
	try {
		const [dets, stats] = await Promise.all([
			wom.groups.getGroupDetails(WOM_GROUP_NUMBER),
			wom.groups.getGroupStatistics(WOM_GROUP_NUMBER),
		]);
		const data = { dets, stats };
		cache.set(cacheKey, data);
		console.log('Fetched and cached fresh stats.');
		return data;
	} catch (error) {
		console.error('Error fetching stats:', error);
		if (cachedData) {
			console.log('Returning stale cached stats due to error.');
			return cachedData;
		}
		throw error;
	}
}

async function getWOMMembers() {
	try {
		const csv = await wom.groups.getMembersCSV(WOM_GROUP_NUMBER);
		const members = parseCSV(csv);
		console.log('Fetched and parsed WOM Members.');
		return members;
	} catch (error) {
		console.error('Error fetching WOM members:', error);
		return [];
	}
}

function parseCSV(csvData) {
	const rows = csvData.split('\n').filter(line => line.trim());
	return rows.slice(1).map(row => {
		const columns = row.split(',');
		return {
			rsn: columns[0].trim().toLowerCase(),
			rank: columns[1].trim().replace('_', ' ').toLowerCase(),
		};
	});
}

module.exports = { wom, fetchStats, getWOMMembers };
