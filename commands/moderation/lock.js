// commands/admin/lock.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Verrouille le salon actuel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        await interaction.reply('🔒 **Salon verrouillé.** Les membres ne peuvent plus envoyer de messages.');
    }
};
// Pour unlock.js, remplace false par null ou true.