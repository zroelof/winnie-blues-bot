const { wom } = require('../WiseOldMan');
const { WOM_GROUP_NUMBER, WOM_SECURITY_CODE } = require('../config');

module.exports = {
	expression: '0 */6 * * *', // Every 6 hours
	async execute() {
		try {
			await wom.groups.updateAll(WOM_GROUP_NUMBER, WOM_SECURITY_CODE);
			console.log('WOM group data updated successfully.');
		} catch (e) {
			console.error('Failed updating WOM Group:', e);
		}
	},
};
