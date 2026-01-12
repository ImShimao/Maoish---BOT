// commands/admin/ban.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannir un membre')
        .addUserOption(o => o.setName('cible').setDescription('Membre à bannir').setRequired(true))
        .addStringOption(o => o.setName('raison').setDescription('Pourquoi ?'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        const user = interaction.options.getMember('cible');
        const reason = interaction.options.getString('raison') || 'Aucune raison';
        if (!user.bannable) return interaction.reply({ content: "❌ Je ne peux pas bannir ce membre.", ephemeral: true });
        
        await user.ban({ reason });
        await interaction.reply(`🔨 **${user.user.username}** a été banni. Raison : ${reason}`);
    }
};