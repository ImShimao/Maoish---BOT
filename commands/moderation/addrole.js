const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addrole')
        .setDescription('Ajouter un rôle à un membre')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre à qui ajouter le rôle')
                .setRequired(true))
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('Le rôle à ajouter')
                .setRequired(true)),

    async execute(interaction) {
        const member = interaction.options.getMember('membre');
        const role = interaction.options.getRole('role');

        // Vérifications de sécurité
        if (!member) return interaction.reply({ embeds: [embeds.error(interaction, 'Membre introuvable')], ephemeral: true });
        
        if (member.roles.cache.has(role.id)) {
            return interaction.reply({ 
                embeds: [embeds.warning(interaction, 'Rôle déjà possédé', `**${member.user.tag}** a déjà le rôle ${role}.`)], 
                ephemeral: true 
            });
        }

        // Vérification de la hiérarchie des rôles
        if (role.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ 
                embeds: [embeds.error(interaction, 'Hiérarchie', 'Tu ne peux pas ajouter un rôle supérieur ou égal au tien.')], 
                ephemeral: true 
            });
        }

        try {
            await member.roles.add(role);
            await interaction.reply({ 
                embeds: [embeds.success(interaction, 'Rôle ajouté', `Le rôle ${role} a été ajouté à **${member.user.tag}**.`)] 
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                embeds: [embeds.error(interaction, 'Erreur', 'Je n\'ai pas les permissions nécessaires (le rôle est peut-être plus haut que le mien).')], 
                ephemeral: true 
            });
        }
    }
};