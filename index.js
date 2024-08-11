const { Client, GatewayIntentBits, REST, Routes, Events } = require('discord.js');
const { token, clientId, guildId } = require('./config.json');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const server = spawn('node', ['server.js'], {
  stdio: 'inherit', 
});

server.on('error', (error) => {
  console.error(`Error starting server: ${error.message}`);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.commands = new Map();
const rest = new REST({ version: '10' }).setToken(token);

async function deployCommands() {
    const commands = [];

    function readCommandsDir(dir) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                readCommandsDir(fullPath);
            } else if (file.endsWith('.js')) {
                const command = require(fullPath);
                commands.push(command.data.toJSON());
                client.commands.set(command.data.name, command);
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
