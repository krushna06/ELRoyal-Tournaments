const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tournament-list')
        .setDescription('Show all tournaments created till now'),
    async execute(interaction) {
        // Placeholder response
        await interaction.reply('Showing all tournaments created till now...');
    },
};
