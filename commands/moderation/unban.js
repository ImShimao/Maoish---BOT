const { SlashCommandBuilder, PermissionflagsBits } = require('discord.js');
const ui = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Débannir un membre via son ID')
        .addStringOption(o => o.setName('id').setDescription('L\'ID Discord de l\'utilisateur').setRequired(true))
        .setDefaultMemberPermissions(PermissionflagsBits.BanMembers),
    async execute(interaction) {
        const userId = interaction.options.getString('id');

        try {
            await interaction.guild.members.unban(userId);
            await interaction.reply({ embeds: [ui.template('🔨 Débannissement', `L'utilisateur avec l'ID \`${userId}\` a été débanni.`, 'SUCCESS')] });
        } catch (error) {
            await interaction.reply({ embeds: [ui.error("Impossible de débannir cet ID. Vérifie qu'il est correct ou que l'utilisateur est bien banni.")], flags: true });
        }
    }
};