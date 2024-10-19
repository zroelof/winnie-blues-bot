// WiseOldMan.js
const { WOMClient } = require('@wise-old-man/utils');
const NodeCache = require('node-cache');

const wom = new WOMClient({
	apiKey: process.env.WOM_API_KEY,
	userAgent: '@roelof',
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
			wom.groups.getGroupDetails(process.env.WOM_GROUP_NUMBER),
			wom.groups.getGroupStatistics(process.env.WOM_GROUP_NUMBER),
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
	const cacheKey = 'getWOMMembers';
	const cachedData = cache.get(cacheKey);
	if (cachedData) {
		console.log('Returning cached WOM members.');
		return cachedData;
	}
	try {
		const csv = await wom.groups.getMembersCSV(process.env.WOM_GROUP_NUMBER);
		const members = parseCSV(csv);
		cache.set(cacheKey, members);
		console.log('Fetched and cached fresh WOM members.');
		return members;
	} catch (error) {
		console.error('Error fetching WOM members:', error);
		if (cachedData) {
			console.log('Returning stale cached WOM members due to error.');
			return cachedData;
		}
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
