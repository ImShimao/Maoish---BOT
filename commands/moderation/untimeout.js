const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Rendre la parole à un membre (Unmute)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('membre').setDescription('Le membre à rétablir').setRequired(true))
        .addStringOption(option => 
            option.setName('raison').setDescription('Raison').setRequired(false)),

    async execute(interaction) {
        const member = interaction.options.getMember('membre');
        const reason = interaction.options.getString('raison') || 'Sanction levée';

        if (!member.isCommunicationDisabled()) {
            return interaction.reply({ embeds: [embeds.warning(interaction, 'Non exclu', 'Ce membre n\'est pas exclu actuellement.')], ephemeral: true });
        }

        try {
            await member.timeout(null, reason); // null enlève le timeout
            await interaction.reply({ 
                embeds: [embeds.success(interaction, 'Parole rendue', `🔊 **${member.user.tag}** peut à nouveau parler.`)] 
            });
        } catch (error) {
            await interaction.reply({ embeds: [embeds.error(interaction, 'Erreur', 'Impossible de rendre la parole à ce membre.')], ephemeral: true });
        }
    }
};