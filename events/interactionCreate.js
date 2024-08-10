const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, InteractionType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ms = require('ms');

const DATA_FILE = path.join(__dirname, '../data/tournaments.json');

// In-memory store for tournament data
let tournamentData = new Map();
const scheduledTasks = new Map();

// Load tournament data from file
function loadTournamentData() {
    if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        data.forEach(tournament => {
            tournamentData.set(tournament.id, tournament);
        });
    }
}

// Save tournament data to file
function saveTournamentData() {
    const data = Array.from(tournamentData.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Initialize data loading
loadTournamentData();

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (command) command.execute(interaction);
        } else if (interaction.isButton()) {
            // Handle button interactions
            if (interaction.customId === 'register') {
                // Show a modal to collect user tag and clan name
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
                // Fetch tournament data
                const tournament = tournamentData.get(interaction.message.id);
                if (!tournament) {
                    await interaction.reply({ content: 'No tournament data found for this message.', ephemeral: true });
                    return;
                }

                // Check if there are any registrations
                const description = tournament.registrations.length > 0
                    ? tournament.registrations.map((reg, index) => `${index + 1}. ${reg.gamertag} | ${reg.clanName}`).join('\n')
                    : 'No one has registered yet.';

                const embed = new EmbedBuilder()
                    .setTitle(`Registrations for ${tournament.name}`)
                    .setDescription(`
\`\`\`
Players  | Clan Name
---------+---------
${description}
\`\`\`
**Game**: ${tournament.gameName}
**Duration or Date**: ${tournament.durationText}
**Winner**: ${tournament.winner || 'N/A'}
                `);

                // Respond with an ephemeral message showing registrants
                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            } else if (interaction.customId === 'select') {
                // Fetch tournament data
                const tournament = tournamentData.get(interaction.message.id);
                if (!tournament || tournament.registrations.length === 0) {
                    await interaction.reply({ content: 'No registrants to select from.', ephemeral: true });
                    return;
                }

                // Randomly select a registrant
                const randomIndex = Math.floor(Math.random() * tournament.registrations.length);
                const selectedRegistrant = tournament.registrations[randomIndex];

                // Update the embed with the selected registrant's details
                const originalMessage = await interaction.channel.messages.fetch(interaction.message.id);
                const embed = originalMessage.embeds[0];
                const updatedEmbed = EmbedBuilder.from(embed)
                    .setDescription(`
\`\`\`
Player 1 | Player 2
---------+---------
ELRoyal  | ${selectedRegistrant.gamertag || 'Waiting'}

Clan:
---------+---------
ELRoyal  | ${selectedRegistrant.clanName || 'Waiting'}
\`\`\`
**Game**: ${tournament.gameName}
**Duration or Date**: ${tournament.durationText}
**Winner**: ${tournament.winner || 'N/A'}
                `);

                // Send updated embed
                await interaction.update({
                    embeds: [updatedEmbed],
                    components: [new ActionRowBuilder()
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
                                .setStyle(ButtonStyle.Danger)
                        )]
                });
                await interaction.followUp({ content: 'Player 2 has been randomly selected!', ephemeral: true });
            } else if (interaction.customId === 'winner') {
                // Show a modal to input winner's gamertag
                const modal = new ModalBuilder()
                    .setCustomId('winnerModal')
                    .setTitle('Set Tournament Winner')
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
                // Handle tournament creation modal submission
                const tournamentName = interaction.fields.getTextInputValue('tournamentName');
                const gameName = interaction.fields.getTextInputValue('gameName');
                const durationOrDate = interaction.fields.getTextInputValue('tournamentDate');
                const creator = interaction.user.id; // Save creator's ID

                let durationText = durationOrDate;
                let endTime = null;

                // Parse the duration input
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
                    // If not a duration, assume it's a date
                    endTime = new Date(durationOrDate).getTime();
                    durationText = `Date: ${durationOrDate}`;
                }

                const embed = new EmbedBuilder()
                    .setTitle(tournamentName)
                    .setDescription(`
\`\`\`
Player 1 | Player 2
---------+---------
ELRoyal  | Waiting

Clan:
---------+---------
ELRoyal  | Waiting
\`\`\`
**Game**: ${gameName}
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
                            .setStyle(ButtonStyle.Danger)
                    );

                // Send message with embed and buttons
                const sentMessage = await interaction.reply({
                    content: 'Tournament created successfully!',
                    embeds: [embed],
                    components: [row],
                    fetchReply: true
                });

                // Save tournament data
                const tournament = {
                    id: sentMessage.id,
                    name: tournamentName,
                    creator: creator,
                    gameName: gameName,
                    durationText: durationText,
                    endTime: endTime,
                    registrations: [],
                    winner: 'N/A'
                };

                tournamentData.set(sentMessage.id, tournament);
                saveTournamentData();

                // Schedule a task to select a random player when the end time is reached
                const delay = endTime - Date.now();
                if (delay > 0) {
                    const timeoutId = setTimeout(async () => {
                        const tournament = tournamentData.get(sentMessage.id);
                        if (tournament && tournament.registrations.length > 0) {
                            const randomIndex = Math.floor(Math.random() * tournament.registrations.length);
                            const selectedRegistrant = tournament.registrations[randomIndex];
                            
                            const updatedEmbed = EmbedBuilder.from(embed)
                                .setDescription(`
\`\`\`
Player 1 | Player 2
---------+---------
ELRoyal  | ${selectedRegistrant.gamertag || 'N/A'}

Clan:
---------+---------
ELRoyal  | ${selectedRegistrant.clanName || 'N/A'}
\`\`\`
**Game**: ${tournament.gameName}
**Duration or Date**: ${tournament.durationText}
**Winner**: ${tournament.winner || 'N/A'}
                            `);

                            const originalMessage = await interaction.channel.messages.fetch(sentMessage.id);
                            await originalMessage.edit({
                                embeds: [updatedEmbed],
                                components: [row]
                            });
                        }
                        tournamentData.delete(sentMessage.id);
                        saveTournamentData();
                    }, delay);

                    scheduledTasks.set(sentMessage.id, timeoutId);
                }
            } else if (interaction.customId === 'registerModal') {
                // Handle registration modal submission
                const gamertag = interaction.fields.getTextInputValue('gamertag');
                const clanName = interaction.fields.getTextInputValue('clanname');

                try {
                    if (!interaction.message || !interaction.message.id) {
                        await interaction.reply({ content: 'Unable to process your registration at this time.', ephemeral: true });
                        return;
                    }

                    const tournament = tournamentData.get(interaction.message.id);
                    if (tournament) {
                        tournament.registrations.push({ gamertag, clanName });
                        tournamentData.set(interaction.message.id, tournament);
                        saveTournamentData();

                        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
                        const updatedEmbed = embed
                            .setFooter({ text: `Total Registrations: ${tournament.registrations.length}` });

                        await interaction.update({
                            embeds: [updatedEmbed],
                            components: [new ActionRowBuilder()
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
                                        .setStyle(ButtonStyle.Danger)
                                )]
                        });
                    } else {
                        await interaction.reply({ content: 'No tournament data found.', ephemeral: true });
                    }
                } catch (error) {
                    console.error('Error handling registration:', error);
                    await interaction.reply({ content: 'An error occurred while processing your registration.', ephemeral: true });
                }
            } else if (interaction.customId === 'winnerModal') {
                // Handle winner modal submission
                const winnerGamertag = interaction.fields.getTextInputValue('winnerGamertag');

                try {
                    if (!interaction.message || !interaction.message.id) {
                        await interaction.reply({ content: 'Unable to process your winner entry at this time.', ephemeral: true });
                        return;
                    }

                    const tournament = tournamentData.get(interaction.message.id);
                    if (tournament) {
                        // Update the embed with the winner's gamertag
                        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
                        const player2Details = tournament.registrations.length > 0
                            ? tournament.registrations[tournament.registrations.length - 1]
                            : { gamertag: 'Waiting', clanName: 'Waiting' };

                        const updatedEmbed = embed
                            .setDescription(`
\`\`\`
Player 1 | Player 2
---------+---------
ELRoyal  | ${player2Details.gamertag || 'Waiting'}

Clan:
---------+---------
ELRoyal  | ${player2Details.clanName || 'Waiting'}
\`\`\`
**Game**: ${tournament.gameName}
**Duration or Date**: ${tournament.durationText}
**Winner**: ${winnerGamertag || 'N/A'}
                            `);

                        await interaction.update({
                            embeds: [updatedEmbed],
                            components: [new ActionRowBuilder()
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
                                        .setStyle(ButtonStyle.Danger)
                                )]
                        });

                        // Save updated tournament data
                        tournament.winner = winnerGamertag;
                        tournamentData.set(interaction.message.id, tournament);
                        saveTournamentData();
                    } else {
                        await interaction.reply({ content: 'No tournament data found.', ephemeral: true });
                    }
                } catch (error) {
                    console.error('Error handling winner entry:', error);
                    await interaction.reply({ content: 'An error occurred while processing the winner entry.', ephemeral: true });
                }
            }
        }
    },
};
