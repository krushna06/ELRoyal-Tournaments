const { SlashCommandBuilder } = require('@discordjs/builders');
const { getProfileForGame } = require('../utils/database');
const { embedColor, errorColor } = require('../config/config.json');

function hexToDecimal(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

const games = ['VALORANT', 'COD', 'APEX LEGENDS', 'FORTNITE', 'ROBLOX', 'CS2'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('find')
    .setDescription('Find a user\'s gaming profile')
    .addUserOption(option =>
      option.setName('userid')
        .setDescription('The user to find')
        .setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser('userid');

    try {
      const profileFields = [];

      for (const game of games) {
        const profile = await getProfileForGame(user.id, game);
        profileFields.push({
          name: game,
          value: `Gamer Tag: ${profile ? profile.gamerTag : 'N/A'}\nClan Name: ${profile ? profile.clanName : 'N/A'}`,
          inline: true,
        });
      }

      const embed = {
        color: hexToDecimal(embedColor),
        title: `${user.username}'s Profiles`,
        fields: profileFields,
      };

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      await interaction.reply({ 
        content: 'There was an error retrieving the profile.', 
        ephemeral: true,
        embeds: [{
          color: hexToDecimal(errorColor),
          description: 'Please try again later.'
        }]
      });
    }
  },
};
