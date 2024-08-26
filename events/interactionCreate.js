const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, InteractionType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ms = require('ms');

const DATA_FILE = path.join(__dirname, '../data/tournaments.json');
const CONFIG_FILE = path.join(__dirname, '../config.json');

let tournamentData = new Map();
const scheduledTasks = new Map();
let ownerIds = [];

function loadTournamentData() {
    if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        data.forEach(tournament => {
            tournamentData.set(tournament.id, tournament);
        });
    }
}

function loadOwnerIds() {
    if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
        ownerIds = config.ownerIds || [];
    }
}

function saveTournamentData() {
    const data = Array.from(tournamentData.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

loadTournamentData();
loadOwnerIds();

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (command) command.execute(interaction);
        } else if (interaction.isButton()) {
            if (interaction.customId === 'register') {
                const modal = new ModalBuilder()
                    .setCustomId('registerModal')
                    .setTitle('Register for Tournament')
                    .addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId('gamertag')
                                    .setLabel('Your Gamertag')
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true),
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId('clanname')
                                    .setLabel('Your Clan Name')
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true),
                            ),
                    );

                await interaction.showModal(modal);
            } else if (interaction.customId === 'list') {
                const tournament = tournamentData.get(interaction.message.id);
                if (!tournament) {
                    await interaction.reply({ content: 'No tournament data found for this message.', ephemeral: true });
                    return;
                }

                const description = tournament.registrations.length > 0
                    ? tournament.registrations.map((reg, index) => `${index + 1}. ${reg.gamertag} | ${reg.clanName}`).join('\n')
                    : 'No one has registered yet.';

                const embed = new EmbedBuilder()
                    .setTitle(`Registrations for ${tournament.name}`)
                    .setDescription(`Match against The Asylums.
\`\`\`
Players  | Clan Name
---------+---------
${description}
\`\`\`
**Game**: ${tournament.gameName}
**Duration or Date**: ${tournament.durationText}
**Prize**: ${tournament.prize}
**Number of Games**: ${tournament.numberOfGames}
                    `);

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            } else if (interaction.customId === 'select') {
                const modal = new ModalBuilder()
                    .setCustomId('selectPlayersModal')
                    .setTitle('Select Number of Players')
                    .addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId('numberOfPlayers')
                                    .setLabel('How many players to select?')
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true),
                            ),
                    );

                await interaction.showModal(modal);
            } else if (interaction.customId === 'winner') {
                const modal = new ModalBuilder()
                    .setCustomId('winnerModal')
                    .setTitle('Enter Winner Gamertag')
                    .addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId('winnerGamertag')
                                    .setLabel('Winner Gamertag')
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true),
                            ),
                    );

                await interaction.showModal(modal);
            }
        } else if (interaction.type === InteractionType.ModalSubmit) {
            if (interaction.customId === 'createTournamentModal') {
                const tournamentName = interaction.fields.getTextInputValue('tournamentName');
                const gameName = interaction.fields.getTextInputValue('gameName');
                const durationOrDate = interaction.fields.getTextInputValue('tournamentDate');
                const prize = interaction.fields.getTextInputValue('prize');
                const numberOfGames = interaction.fields.getTextInputValue('numberOfGames');
                const creator = interaction.user.id;

                let durationText = durationOrDate;
                let endTime = null;

                const durationMatch = durationOrDate.match(/^(\d+)(s|m|h)$/);
                if (durationMatch) {
                    const value = parseInt(durationMatch[1]);
                    const unit = durationMatch[2];

                    const now = Date.now();
                    switch (unit) {
                        case 's':
                            endTime = now + value * 1000;
                            break;
                        case 'm':
                            endTime = now + value * 60000;
                            break;
                        case 'h':
                            endTime = now + value * 3600000;
                            break;
                    }
                    durationText = `${value}${unit}`;
                } else {
                    endTime = new Date(durationOrDate).getTime();
                    durationText = `Date: ${durationOrDate}`;
                }

                const embed = new EmbedBuilder()
                    .setTitle(tournamentName)
                    .setDescription(`
Match against The Asylums.
**Prize**: ${prize}
**Game**: ${gameName}
**Number of Games**: ${numberOfGames}
**Duration or Date**: ${durationText}
**Winner**: N/A
                    `)
                    .setFooter({ text: 'Total Registrations: 0' });

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('register')
                            .setLabel('REGISTER')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('list')
                            .setLabel('LIST')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('select')
                            .setLabel('SELECT')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('winner')
                            .setLabel('WINNER')
                            .setStyle(ButtonStyle.Danger),
                    );

                const sentMessage = await interaction.reply({
                    content: 'Tournament created successfully!',
                    embeds: [embed],
                    components: [row],
                    fetchReply: true
                });

                tournamentData.set(sentMessage.id, {
                    id: sentMessage.id,
                    name: tournamentName,
                    gameName,
                    durationText,
                    prize,
                    numberOfGames,
                    endTime,
                    registrations: [],
                    selectedRegistrants: [],
                    winner: null 
                });

                saveTournamentData();

                if (endTime) {
                    const duration = endTime - Date.now();
                    if (duration > 0) {
                        const task = setTimeout(async () => {
                            const tournament = tournamentData.get(sentMessage.id);
                            if (!tournament) return;

                            const embed = new EmbedBuilder()
                                .setTitle(tournament.name)
                                .setDescription('The tournament has ended!')

                            await sentMessage.edit({
                                content: 'Tournament has ended!',
                                embeds: [embed],
                                components: []
                            });

                            tournamentData.delete(sentMessage.id);
                            saveTournamentData();

                        }, duration);

                        scheduledTasks.set(sentMessage.id, task);
                    }
                }
            } else if (interaction.customId === 'registerModal') {
                const gamertag = interaction.fields.getTextInputValue('gamertag');
                const clanName = interaction.fields.getTextInputValue('clanname');
                const tournament = tournamentData.get(interaction.message.id);

                if (!tournament) {
                    await interaction.reply({ content: 'Tournament data not found.', ephemeral: true });
                    return;
                }

                tournament.registrations.push({ gamertag, clanName });
                saveTournamentData();

                const embed = new EmbedBuilder()
                    .setTitle(tournament.name)
                    .setDescription(`
Match against The Asylums.
**Prize**: ${tournament.prize}
**Game**: ${tournament.gameName}
**Number of Games**: ${tournament.numberOfGames}
**Duration or Date**: ${tournament.durationText}
**Winner**: ${tournament.winner || 'N/A'}
                    `)
                    .setFooter({ text: `Total Registrations: ${tournament.registrations.length}` });

                await interaction.update({ embeds: [embed] });

                await interaction.followUp({ content: 'You have been registered!', ephemeral: true });
            } else if (interaction.customId === 'selectPlayersModal') {
                const numberOfPlayers = parseInt(interaction.fields.getTextInputValue('numberOfPlayers'));
                const tournament = tournamentData.get(interaction.message.id);

                if (!tournament) {
                    await interaction.reply({ content: 'Tournament data not found.', ephemeral: true });
                    return;
                }

                if (isNaN(numberOfPlayers) || numberOfPlayers <= 0) {
                    await interaction.reply({ content: 'Invalid number of players.', ephemeral: true });
                    return;
                }

                if (numberOfPlayers > tournament.registrations.length) {
                    await interaction.reply({ content: 'Number of players exceeds the total number of registrations.', ephemeral: true });
                    return;
                }

                tournament.selectedRegistrants = tournament.registrations.slice(0, numberOfPlayers);
                saveTournamentData();

                const selectedPlayers = tournament.selectedRegistrants.map((reg, index) => `${index + 1}. ${reg.gamertag} | ${reg.clanName}`).join('\n');
                const embed = new EmbedBuilder()
                    .setTitle(`${tournament.name} - Selected Players`)
                    .setDescription(`Match against The Asylums.
\`\`\`
Players  | Clan Name
---------+---------
${selectedPlayers}
\`\`\`
**Prize**: ${tournament.prize}
**Game**: ${tournament.gameName}
**Number of Games**: ${tournament.numberOfGames}
**Duration or Date**: ${tournament.durationText}
**Winner**: ${tournament.winner || 'N/A'}
                    `);

                await interaction.update({ embeds: [embed] });
                await interaction.followUp({ content: `Selected ${numberOfPlayers} players!`, ephemeral: true });
            } else if (interaction.customId === 'winnerModal') {
                const winnerGamertag = interaction.fields.getTextInputValue('winnerGamertag');
                const tournament = tournamentData.get(interaction.message.id);

                if (!tournament) {
                    await interaction.reply({ content: 'Tournament data not found.', ephemeral: true });
                    return;
                }

                tournament.winner = winnerGamertag;
                saveTournamentData();

                const embed = new EmbedBuilder()
                    .setTitle(tournament.name)
                    .setDescription(`
Match against The Asylums.
**Prize**: ${tournament.prize}
**Game**: ${tournament.gameName}
**Number of Games**: ${tournament.numberOfGames}
**Duration or Date**: ${tournament.durationText}
**Winner**: ${tournament.winner}
                    `);

                await interaction.update({ embeds: [embed] });

                await interaction.followUp({ content: `Winner has been set to ${winnerGamertag}!`, ephemeral: true });
            }
        }
    },
};
