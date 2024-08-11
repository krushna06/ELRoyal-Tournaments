const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with the bot\'s latency and API ping.'),
    async execute(interaction) {
        const startTime = Date.now();

        await interaction.reply({ content: 'Pinging...', ephemeral: true, fetchReply: true }).then(async (reply) => {
            const latency = reply.createdTimestamp - startTime;
            const apiPing = interaction.client.ws.ping;

            const embed = new EmbedBuilder()
                .setTitle('Pong!')
                .setColor('#2F3136')
                .addFields(
                    { name: 'Latency', value: `${latency}ms`, inline: true },
                    { name: 'API Ping', value: `${apiPing}ms`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ content: ' ', embeds: [embed], ephemeral: true });
        });
    },
};
