const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/tournaments.json');

// Load tournament data from file
function loadTournamentData() {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE));
    }
    return [];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tournament-show')
        .setDescription('Show ongoing or upcoming tournaments'),
    async execute(interaction) {
        // Load tournaments
        const tournaments = loadTournamentData();
        const now = Date.now();

        // Filter ongoing or upcoming tournaments
        const ongoingOrUpcoming = tournaments.filter(tournament => tournament.endTime > now);

        if (ongoingOrUpcoming.length === 0) {
            await interaction.reply({ content: 'No ongoing or upcoming tournaments.', ephemeral: true });
            return;
        }

        // Create the embed
        const embed = new EmbedBuilder()
            .setTitle('Ongoing/Upcoming Tournaments')
            .setDescription(ongoingOrUpcoming.map(tournament => 
                `**Name**: ${tournament.name}
**Game**: ${tournament.gameName}
**Date/Duration**: ${tournament.durationText}
**Prize**: ${tournament.prize || 'N/A'}
**Number of Games**: ${tournament.numberOfGames || 'N/A'}
**Registrations**: ${tournament.registrations.length}`
            ).join('\n\n'));

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
