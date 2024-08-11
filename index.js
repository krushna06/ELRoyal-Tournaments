const { Client, GatewayIntentBits, REST, Routes, Events } = require('discord.js');
const { token, clientId, guildId } = require('./config.json');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.commands = new Map(); // Initialize commands collection
const rest = new REST({ version: '10' }).setToken(token);

// Command registration
async function deployCommands() {
    const commands = [];

    // Helper function to recursively read directories
    function readCommandsDir(dir) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // Recurse into subdirectories
                readCommandsDir(fullPath);
            } else if (file.endsWith('.js')) {
                // Load command file
                const command = require(fullPath);
                commands.push(command.data.toJSON());
                client.commands.set(command.data.name, command); // Store command in the collection
            }
        }
    }

    readCommandsDir(path.join(__dirname, 'commands'));

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
