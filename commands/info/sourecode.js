const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config/config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sourcecode')
    .setDescription('Displays the source code info of the bot.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Sourcecode Of This Bot')
      .setDescription('If you wish to purchase a similar copy of this bot, please creatre a ticket in the support server.')
      .setColor(config.embedColor);

    const button = new ButtonBuilder()
      .setLabel('Server')
      .setURL('https://discord.gg/gWRhsZHHeb')
      .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};