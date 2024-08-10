const { Client, GatewayIntentBits, REST, Routes, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const { token, clientId, guildId } = require('./config.json');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.commands = new Map(); // Initialize commands collection
const rest = new REST({ version: '10' }).setToken(token);

// Command registration
async function deployCommands() {
    const commands = [];
    const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(__dirname, 'commands', file));
        commands.push(command.data.toJSON());
        client.commands.set(command.data.name, command); // Store command in the collection
    }

    try {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error(error);
    }
}

client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
    deployCommands();
});

// Load event handlers
const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(path.join(__dirname, 'events', file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

client.login(token);
