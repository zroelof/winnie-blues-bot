const {Client, GatewayIntentBits} = require('discord.js');
const {registerCommands} = require("./commands");

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent
    ]
});

bot.on('ready', async () => {
    await registerCommands(bot);
    console.log(`Logged in as ${bot.user.tag}!`);
});

bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) {
        return;
    }
    await interaction.deferReply({ephemeral: true});
    const {commandName, options} = interaction;
    if (commandName === 'rsn') {
        const rsn = options.getString('rsn');
        try {
            console.log("Setting RSN for:", interaction.member.user.username, "to:", rsn);
            await interaction.member.setNickname(rsn);
            await interaction.editReply(`Your nickname has been set to \`\`${rsn}\`\``);
        } catch (error) {
            console.error(error);
            await interaction.editReply("There was an error trying to execute that command:\n``" + error + "``");
        }
    }
});

bot.on('messageCreate', async message => {
    if (message.channel.name.endsWith("-⊱newcomers")) {
        try {
            await message.react('🫡');
        } catch (error) {
            console.error('Failed to react to message:', error);
        }
    }
});

module.exports = {bot: bot};
