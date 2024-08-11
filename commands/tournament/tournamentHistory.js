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
        .setName('tournament-history')
        .setDescription('Show all tournaments created till now'),
    async execute(interaction) {
        const tournaments = loadTournamentData();

        if (tournaments.length === 0) {
            await interaction.reply({ content: 'No tournaments have been created yet.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('Tournament History')
            .setDescription(tournaments.map(tournament => {
                const status = tournament.winner === null ? '🟢 Upcoming' : '🔴 Ended';
                return `**Name**: ${tournament.name}
**Game**: ${tournament.gameName}
**Date/Duration**: ${tournament.durationText}
**Prize**: ${tournament.prize || 'N/A'}
**Number of Games**: ${tournament.numberOfGames || 'N/A'}
**Total Registrations**: ${tournament.registrations.length}
**Status**: ${status}`;
            }).join('\n\n'));

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
