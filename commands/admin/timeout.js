// commands/admin/timeout.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Exclure temporairement un membre')
        .addUserOption(o => o.setName('cible').setRequired(true))
        .addIntegerOption(o => o.setName('minutes').setDescription('Durée en minutes').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const member = interaction.options.getMember('cible');
        const duration = interaction.options.getInteger('minutes');
        await member.timeout(duration * 60 * 1000);
        await interaction.reply(`🤐 **${member.user.username}** a été réduit au silence pour ${duration} minutes.`);
    }
};