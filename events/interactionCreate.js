const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, InteractionType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ms = require('ms');

const DATA_FILE = path.join(__dirname, '../data/tournaments.json');
const CONFIG_FILE = path.join(__dirname, '../config.json');

// In-memory store for tournament data
let tournamentData = new Map();
const scheduledTasks = new Map();
let ownerIds = [];

// Load tournament data from file
function loadTournamentData() {
    if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        data.forEach(tournament => {
            tournamentData.set(tournament.id, tournament);
        });
    }
}

// Load owner IDs from config
function loadOwnerIds() {
    if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
        ownerIds = config.ownerIds || []; // Ensure `ownerIds` is an array
    }
}

// Save tournament data to file
function saveTournamentData() {
    const data = Array.from(tournamentData.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Initialize data loading
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
**Prize**: ${tournament.prize}
**Number of Games**: ${tournament.numberOfGames}
                    `);

                // Respond with an ephemeral message showing registrants
                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            } else if (interaction.customId === 'select' || interaction.customId === 'winner') {
                if (!ownerIds.includes(interaction.user.id)) {
                    await interaction.reply({ content: 'You do not have permission to use this button.', ephemeral: true });
                    return;
                }

                if (interaction.customId === 'select') {
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
ELRoyal  | ${selectedRegistrant.gamertag || 'N/A'}

Clan:
---------+---------
ELRoyal  | ${selectedRegistrant.clanName || 'N/A'}
\`\`\`
**Prize**: ${tournament.prize}
**Game**: ${tournament.gameName}
**Number of Games**: ${tournament.numberOfGames}
**Duration or Date**: ${tournament.durationText}
**Winner**: ${tournament.winner || 'N/A'}
                    `);

                    // Send updated embed
                    tournament.selectedRegistrant = selectedRegistrant;
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
                                    .setStyle(ButtonStyle.Danger),
                            )]
                    });

                    await interaction.followUp({ content: 'Player 2 has been randomly selected!', ephemeral: true });
                    saveTournamentData();
                } else if (interaction.customId === 'winner') {
                    // Show a modal to collect the winner's gamertag
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
            }
        } else if (interaction.type === InteractionType.ModalSubmit) {
            if (interaction.customId === 'createTournamentModal') {
                const tournamentName = interaction.fields.getTextInputValue('tournamentName');
                const gameName = interaction.fields.getTextInputValue('gameName');
                const durationOrDate = interaction.fields.getTextInputValue('tournamentDate');
                const prize = interaction.fields.getTextInputValue('prize'); // Get the Prize input
                const numberOfGames = interaction.fields.getTextInputValue('numberOfGames'); // Get the Number of Games input
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

                // Send message with embed and buttons
                const sentMessage = await interaction.reply({
                    content: 'Tournament created successfully!',
                    embeds: [embed],
                    components: [row],
                    fetchReply: true
                });

                const tournament = {
                    id: sentMessage.id,
                    name: tournamentName,
                    creator: creator,
                    gameName: gameName,
                    durationText: durationText,
                    prize: prize, // Save prize
                    numberOfGames: numberOfGames, // Save number of games
                    endTime: endTime,
                    registrations: [],
                    selectedRegistrant: null, // New field to track selected registrant
                    winner: null
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
**Prize**: ${prize}
**Game**: ${gameName}
**Number of Games**: ${numberOfGames}
**Duration or Date**: ${durationText}
**Winner**: N/A
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
                const gamertag = interaction.fields.getTextInputValue('gamertag');
                const clanName = interaction.fields.getTextInputValue('clanname');
                const userId = interaction.user.id; // Capture the user's Discord ID
            
                const tournament = tournamentData.get(interaction.message.id);
                if (!tournament) {
                    await interaction.reply({ content: 'No tournament data found for this message.', ephemeral: true });
                    return;
                }
            
                tournament.registrations.push({ gamertag, clanName, userId }); // Include the userId in the registration
            
                const originalMessage = await interaction.channel.messages.fetch(interaction.message.id);
                const embed = originalMessage.embeds[0];
                const updatedEmbed = EmbedBuilder.from(embed)
                    .setFooter({ text: `Total Registrations: ${tournament.registrations.length}` });
            
                await originalMessage.edit({
                    embeds: [updatedEmbed]
                });
            
                await interaction.reply({ content: `${gamertag} from ${clanName} registered successfully!`, ephemeral: true });
                saveTournamentData();
            } else if (interaction.customId === 'winnerModal') {
                const winnerGamertag = interaction.fields.getTextInputValue('winnerGamertag');

                const tournament = tournamentData.get(interaction.message.id);
                if (!tournament) {
                    await interaction.reply({ content: 'No tournament data found for this message.', ephemeral: true });
                    return;
                }

                tournament.winner = winnerGamertag;

                const originalMessage = await interaction.channel.messages.fetch(interaction.message.id);
                const embed = originalMessage.embeds[0];
                const updatedEmbed = EmbedBuilder.from(embed)
                    .setColor('#FF0000') // Set embed color to red
                    .setDescription(`
\`\`\`
Player 1 | Player 2
---------+---------
ELRoyal  | ${tournament.selectedRegistrant ? tournament.selectedRegistrant.gamertag : 'N/A'}

Clan:
---------+---------
ELRoyal  | ${tournament.selectedRegistrant ? tournament.selectedRegistrant.clanName : 'N/A'}
\`\`\`
**Prize**: ${tournament.prize}
**Game**: ${tournament.gameName}
**Number of Games**: ${tournament.numberOfGames}
**Duration or Date**: ${tournament.durationText}
**Winner**: ${winnerGamertag}
                    `);

                await originalMessage.edit({
                    embeds: [updatedEmbed]
                });

                await interaction.reply({ content: `The winner has been set to ${winnerGamertag}!`, ephemeral: true });
                saveTournamentData();
            }
        }
    }
};
