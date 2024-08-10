const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tournament-show')
        .setDescription('Show ongoing/upcoming tournaments'),
    async execute(interaction) {
        // Placeholder response
        await interaction.reply('Showing ongoing/upcoming tournaments...');
    },
};
