const { SlashCommandBuilder } = require('@discordjs/builders');
const { getProfile } = require('../utils/database');
const { embedColor, errorColor } = require('../config/config.json');

function hexToDecimal(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

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
      const profile = await getProfile(user.id);
      if (profile) {
        const embed = {
          color: hexToDecimal(embedColor),
          title: `${user.username}'s Profile`,
          fields: [
            { name: 'Game Name', value: profile.gameName, inline: true },
            { name: 'Gamer Tag', value: profile.gamerTag, inline: true },
            { name: 'Clan Name', value: profile.clanName, inline: true }
          ]
        };
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ 
          content: 'Profile not found.', 
          ephemeral: true,
          embeds: [{
            color: hexToDecimal(errorColor),
            description: 'This user has not set up a profile yet.'
          }]
        });
      }
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
