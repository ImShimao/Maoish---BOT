const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delrole')
        .setDescription('Retirer un rôle à un membre')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre ciblé')
                .setRequired(true))
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('Le rôle à retirer')
                .setRequired(true)),

    async execute(interaction) {
        const member = interaction.options.getMember('membre');
        const role = interaction.options.getRole('role');

        if (!member.roles.cache.has(role.id)) {
            return interaction.reply({ 
                embeds: [embeds.error(interaction, 'Erreur', `**${member.user.tag}** ne possède pas le rôle ${role}.`)],
                ephemeral: true 
            });
        }

        try {
            await member.roles.remove(role);
            await interaction.reply({ 
                embeds: [embeds.success(interaction, 'Rôle retiré', `Le rôle ${role} a été retiré à **${member.user.tag}**.`)] 
            });
        } catch (error) {
            await interaction.reply({ 
                embeds: [embeds.error(interaction, 'Permissions', 'Je ne peux pas retirer ce rôle (il est probablement supérieur au mien).')],
                ephemeral: true 
            });
        }
    }
};