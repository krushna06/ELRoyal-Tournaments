const { SlashCommandBuilder } = require('@discordjs/builders');
const { setProfile } = require('../utils/database');
const { successColor, errorColor } = require('../config/config.json');

function hexToDecimal(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setprofile')
    .setDescription('Set your gaming profile')
    .addStringOption(option => 
      option.setName('gamename')
        .setDescription('Select your game')
        .setRequired(true)
        .addChoices(
          { name: 'VALORANT', value: 'VALORANT' },
          { name: 'COD', value: 'COD' },
          { name: 'APEX LEGENDS', value: 'APEX LEGENDS' },
          { name: 'FORTNITE', value: 'FORTNITE' },
          { name: 'ROBLOX', value: 'ROBLOX' },
          { name: 'CS2', value: 'CS2' } // Added CS2 here
        ))
    .addStringOption(option => 
      option.setName('gamertag')
        .setDescription('Your gamer tag')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('clanname')
        .setDescription('Your clan name')
        .setRequired(true)),
  async execute(interaction) {
    const gameName = interaction.options.getString('gamename');
    const gamerTag = interaction.options.getString('gamertag');
    const clanName = interaction.options.getString('clanname');

    try {
      await setProfile(interaction.user.id, gameName, gamerTag, clanName);
      await interaction.reply({ 
        content: 'Profile updated successfully!', 
        ephemeral: true, 
        embeds: [{
          color: hexToDecimal(successColor),
          description: `Your profile for ${gameName} has been saved!`
        }]
      });
    } catch (error) {
      await interaction.reply({ 
        content: 'There was an error saving your profile.', 
        ephemeral: true,
        embeds: [{
          color: hexToDecimal(errorColor),
          description: 'Please try again later.'
        }]
      });
    }
  },
};
