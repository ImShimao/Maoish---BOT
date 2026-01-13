// commands/admin/lock.js
const { SlashCommandBuilder, PermissionflagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Déverrouille le salon actuel')
        .setDefaultMemberPermissions(PermissionflagsBits.ManageChannels),
    async execute(interaction) {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
        await interaction.reply('🔓 **Salon déverrouillé.** Les membres peuvent à nouveau envoyer de messages.');
    }
};
// Pour unlock.js, remplace false par null ou true.