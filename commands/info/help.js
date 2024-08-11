const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const excludedFiles = ['findContextMenu.js'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays a list of all commands.'),
  async execute(interaction) {
    const commandFolders = fs.readdirSync('./commands');
    const allCommands = [];

    commandFolders.forEach(folder => {
      const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js') && !excludedFiles.includes(file));
      const commands = commandFiles.map(file => {
        const command = require(path.join(__dirname, `../${folder}/${file}`));
        return { name: command.data.name, description: command.data.description };
      });
      if (commands.length > 0) {
        allCommands.push({ folder, commands });
      }
    });

    let currentPage = -1;
    const totalPages = allCommands.length;

    const generateEmbed = (page) => {
      const embed = new EmbedBuilder().setColor("#2F3136");

      if (page === -1) {
        embed
          .setTitle('Help - Command List')
          .setDescription(`Total Commands: ${allCommands.reduce((acc, group) => acc + group.commands.length, 0)}`);
      } else {
        const group = allCommands[page];
        embed
          .setTitle(`Commands - ${group.folder}`)
          .setDescription(group.commands.map(cmd => `\`${cmd.name}\`: ${cmd.description}`).join('\n'));
      }

      return embed;
    };

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('previous')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('home')
          .setLabel('Home')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.reply({ embeds: [generateEmbed(currentPage)], components: [row] });

    const filter = i => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      if (i.customId === 'previous') {
        currentPage = currentPage > -1 ? currentPage - 1 : totalPages - 1;
      } else if (i.customId === 'next') {
        currentPage = currentPage < totalPages - 1 ? currentPage + 1 : -1;
      } else if (i.customId === 'home') {
        currentPage = -1;
      }

      await i.update({ embeds: [generateEmbed(currentPage)], components: [row] });
    });
  },
};