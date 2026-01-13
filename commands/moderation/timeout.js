const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ui = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Exclure temporairement un membre (Mute)')
        .addUserOption(o => o.setName('cible').setDescription('Le membre à exclure').setRequired(true)) // Description ajoutée ici !
        .addIntegerOption(o => o.setName('minutes').setDescription('Durée de l\'exclusion en minutes').setRequired(true))
        .addStringOption(o => o.setName('raison').setDescription('Raison de l\'exclusion'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const member = interaction.options.getMember('cible');
        const minutes = interaction.options.getInteger('minutes');
        const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

        if (!member) return interaction.reply({ embeds: [ui.error("Membre introuvable.")], flags: true });
        if (!member.moderatable) return interaction.reply({ embeds: [ui.error("Je ne peux pas exclure ce membre (Rôle trop élevé).")], flags: true });

        await member.timeout(minutes * 60 * 1000, reason);
        
        const embed = ui.template('🤐 Exclusion Temporaire', `**Membre :** ${member.user.tag}\n**Durée :** ${minutes} minutes\n**Raison :** ${reason}`, 'SUCCESS');
        await interaction.reply({ embeds: [embed] });
    }
};