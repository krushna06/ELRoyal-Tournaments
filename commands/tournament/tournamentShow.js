const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/tournaments.json');

function loadTournamentData() {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE));
    }
    return [];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tournament-show')
        .setDescription('Show upcoming tournaments'),
    async execute(interaction) {
        const tournaments = loadTournamentData();
        const now = Date.now();

        const upcomingTournaments = tournaments.filter(tournament => tournament.winner === null && tournament.endTime > now);

        if (upcomingTournaments.length === 0) {
            await interaction.reply({ content: 'No upcoming tournaments.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('Upcoming Tournaments')
            .setDescription(upcomingTournaments.map(tournament => 
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
