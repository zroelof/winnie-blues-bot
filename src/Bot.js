const {Client, GatewayIntentBits} = require('discord.js');
const {registerCommands} = require("./Commands");
const {addUser, removeUser} = require("./WaitlistSQL");

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
    try {
        if (commandName === 'rsn') {
            const rsn = options.getString('rsn');
            console.log("Setting RSN for:", interaction.member.user.username, "to:", rsn);
            await interaction.member.setNickname(rsn);
            await interaction.editReply(`Your nickname has been set to \`\`${rsn}\`\``);
        } else if (commandName === 'waitlist') {
            const id = interaction.member.user.id;
            const message = addUser(id);
            await interaction.editReply(`${message}`);
        } else if (commandName === 'waitlist-leave') {
            const id = interaction.member.user.id;
            const message = removeUser(id);
            await interaction.editReply(`${message}`);
        } else if (commandName === 'waitlist-remove') {
            const user = options.getUser('user');
            const userId = user ? user.id : options.getString('id');
            if (!userId) {
                await interaction.editReply("No user specified.");
                return;
            }
            const message = await removeUser(userId);
            await interaction.editReply(`${message}`);
        }
    } catch (error) {
        console.error(error);
        await interaction.editReply("There was an error trying to execute your command:\n``" + error + "``");
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

module.exports = {bot};
