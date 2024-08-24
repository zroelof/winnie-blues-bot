const { WOMClient } = require('@wise-old-man/utils');

const wom = new WOMClient({
	apiKey: process.env.WOM_API_KEY,
	userAgent: '@roelof',
});

let dets = null;
let stats = null;
let lastFetchTime = 0;
let fetchPromise = null;

async function fetchStats(forceRefresh = false) {
	const currentTime = Date.now();
	const sixHours = 6 * 60 * 60 * 1000; // 6 hours
	// Check if a fetch is necessary based on timing and data validity
	if (!forceRefresh && dets && stats && currentTime - lastFetchTime <= sixHours) {
		return { dets, stats };
	}
	// If a fetch is already ongoing, return the existing promise
	if (fetchPromise) {
		return fetchPromise;
	}
	// Otherwise, start a new fetch process
	fetchPromise = (async () => {
		try {
			dets = await wom.groups.getGroupDetails(process.env.WOM_GROUP_NUMBER);
			stats = await wom.groups.getGroupStatistics(process.env.WOM_GROUP_NUMBER);
			lastFetchTime = currentTime;
			console.log('Stats have been updated.');
			return { dets, stats };
		} catch (error) {
			console.error('Failed to fetch stats:', error);
			throw error;
		} finally {
			fetchPromise = null;
		}
	})();
	return fetchPromise;
}

async function getWOMMembers() {
	try {
		let csv = await wom.groups.getMembersCSV(process.env.WOM_GROUP_NUMBER);
		return parseCSV(csv);
	} catch (error) {
		console.error('Error fetching CSV:', error);
		return [];
	}
}

function parseCSV(csvData) {
	const rows = csvData.split('\n').filter(line => line.trim());
	return rows.slice(1).map(row => {
		const columns = row.split(',');
		return {
			rsn: columns[0].trim().toLowerCase(),
			rank: columns[1].trim().toLowerCase(),
		};
	});
}

module.exports = { wom, fetchStats, getWOMMembers };
