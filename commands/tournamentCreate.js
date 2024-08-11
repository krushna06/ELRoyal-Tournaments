const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Load owner IDs from config
const CONFIG_FILE = path.join(__dirname, '../config.json');
let ownerIds = [];

function loadOwnerIds() {
    if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
        ownerIds = config.ownerIds || []; // Ensure `ownerIds` is an array
    }
}

// Initialize owner IDs loading
loadOwnerIds();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tournament-create')
        .setDescription('Create a new tournament'),
    async execute(interaction) {
        // Check if the user is an owner
        if (!ownerIds.includes(interaction.user.id)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('createTournamentModal')
            .setTitle('Create Tournament')
            .addComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new TextInputBuilder()
                            .setCustomId('tournamentName')
                            .setLabel('Tournament Name')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Enter the tournament name')
                            .setRequired(true),
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new TextInputBuilder()
                            .setCustomId('gameName')
                            .setLabel('Game')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Enter the game name')
                            .setRequired(true),
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new TextInputBuilder()
                            .setCustomId('tournamentDate')
                            .setLabel('Date (dd/mm/yyyy) or Duration (e.g., 30s, 1h)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Enter the date or duration')
                            .setRequired(true),
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new TextInputBuilder()
                            .setCustomId('prize')
                            .setLabel('Prize')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Enter the prize for the tournament')
                            .setRequired(true),
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new TextInputBuilder()
                            .setCustomId('numberOfGames')
                            .setLabel('Number of Games')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Enter the number of games in the tournament')
                            .setRequired(true),
                    ),
            );

        await interaction.showModal(modal);
    },
};
