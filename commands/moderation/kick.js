// commands/admin/ban.js
const { SlashCommandBuilder, PermissionflagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick un membre')
        .addUserOption(o => o.setName('cible').setDescription('Membre à kick').setRequired(true))
        .addStringOption(o => o.setName('raison').setDescription('Pourquoi ?'))
        .setDefaultMemberPermissions(PermissionflagsBits.KickMembers),
    async execute(interaction) {
        const user = interaction.options.getMember('cible');
        const reason = interaction.options.getString('raison') || 'Aucune raison';
        if (!user.kickable) return interaction.reply({ content: "❌ Je ne peux pas kick ce membre.", flags: true });

        await user.kick({ reason });
        await interaction.reply(`🔨 **${user.user.username}** a été kick. Raison : ${reason}`);
    }
};