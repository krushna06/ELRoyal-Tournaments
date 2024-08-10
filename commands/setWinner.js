const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwinner')
        .setDescription('Set the winner of a tournament')
        .addStringOption(option =>
            option.setName('msgid')
                .setDescription('Message ID of the tournament')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('usertag')
                .setDescription('User tag of the winner')
                .setRequired(true)),
    async execute(interaction) {
        const msgId = interaction.options.getString('msgid');
        const userTag = interaction.options.getString('usertag');
        const channel = await client.channels.fetch(interaction.channelId);
        const message = await channel.messages.fetch(msgId);

        await message.edit({
            content: message.content.replace('**Winner**: N/A', `**Winner**: ${userTag}`),
        });

        await interaction.reply(`Winner updated to ${userTag}`);
    },
};
