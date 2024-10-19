const cron = require('node-cron');
const { wom } = require('./WiseOldMan');
const { bot } = require('./Bot');
const { updateStatus } = require('./Status');
const { syncRoles } = require('./RankRoles');
const { updateMessage } = require('./TimedRoles');
const { updateWaitlist } = require('./Waitlist');

const cronJobs = [
	{
		sched: '*/1 * * * *', // Every 1 minute
		run: () => syncRoles(bot),
		desc: 'role synchronization',
	},
	{
		sched: '*/1 * * * *', // Every minute
		run: () => updateMessage(),
		desc: 'timed role check',
	},
	{
		sched: '*/1 * * * *', // Every minute
		run: () => updateWaitlist(),
		desc: 'waitlist sync',
	},
	{
		sched: '0 */6 * * *', // Every 6 hours
		run: async () => {
			await wom.groups.updateAll(process.env.WOM_GROUP_NUMBER, process.env.WOM_SECURITY_CODE);
			console.log('WOM group data updated successfully.');
		},
		desc: 'WOM group data update',
	},
	{
		sched: '*/1 * * * *', // Every minute
		run: updateStatus,
		desc: 'status update',
	},
];

function handleCronError(taskName, error) {
	console.error(`Error during ${taskName}:`, error);
}

async function scheduleCron() {
	cronJobs.forEach(({ sched, run, desc }) => {
		cron.schedule(
			sched,
			async () => {
				try {
					await run();
				} catch (error) {
					handleCronError(desc, error);
				}
			},
			{
				scheduled: true,
				timezone: 'Australia/Brisbane',
			},
		);
	});
}

module.exports = { scheduleCron };
