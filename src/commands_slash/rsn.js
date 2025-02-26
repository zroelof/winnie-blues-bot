const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('rsn')
		.setDescription('Set your nickname as your RSN in the server.')
		.addStringOption(option =>
			option
				.setName('rsn')
				.setDescription('Your RSN, use | or / to separate multiple RSNs.')
				.setRequired(true),
		),
	async execute(interaction) {
		const { options } = interaction;
		await interaction.deferReply({ ephemeral: true });
		const rsn = options.getString('rsn');
		console.log('Setting RSN for:', interaction.member.user.username, 'to:', rsn);
		await interaction.member.setNickname(rsn);
		return interaction.editReply(`Your nickname has been set to \`\`${rsn}\`\``);
	},
};
