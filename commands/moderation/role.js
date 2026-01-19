const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Gérer les rôles des membres')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        
        // --- SOUS-COMMANDE : AJOUTER ---
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Ajouter un rôle à un membre')
                .addUserOption(o => o.setName('membre').setDescription('Le membre').setRequired(true))
                .addRoleOption(o => o.setName('role').setDescription('Le rôle à ajouter').setRequired(true)))
        
        // --- SOUS-COMMANDE : RETIRER ---
        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Retirer un rôle à un membre')
                .addUserOption(o => o.setName('membre').setDescription('Le membre').setRequired(true))
                .addRoleOption(o => o.setName('role').setDescription('Le rôle à retirer').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const member = interaction.options.getMember('membre');
        const role = interaction.options.getRole('role');

        // 1. Vérification Membre (Si l'utilisateur a quitté entre temps)
        if (!member) return interaction.reply({ embeds: [embeds.error(interaction, 'Membre introuvable')], ephemeral: true });

        // 2. Vérification Hiérarchie (Sécurité)
        // L'utilisateur ne peut pas toucher à un rôle supérieur au sien
        if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ 
                embeds: [embeds.error(interaction, 'Hiérarchie', 'Tu ne peux pas gérer un rôle supérieur ou égal au tien.')], 
                ephemeral: true 
            });
        }

        // Le BOT ne peut pas toucher à un rôle supérieur au sien
        if (!role.editable) {
            return interaction.reply({ 
                embeds: [embeds.error(interaction, 'Erreur Bot', 'Je ne peux pas gérer ce rôle (il est placé plus haut que le mien).')], 
                ephemeral: true 
            });
        }

        // --- ACTION : AJOUTER ---
        if (sub === 'add') {
            if (member.roles.cache.has(role.id)) {
                return interaction.reply({ 
                    embeds: [embeds.warning(interaction, 'Déjà possédé', `**${member.user.tag}** a déjà le rôle ${role}.`)], 
                    ephemeral: true 
                });
            }

            try {
                await member.roles.add(role);
                return interaction.reply({ 
                    embeds: [embeds.success(interaction, 'Rôle ajouté', `Le rôle ${role} a été donné à **${member.user.tag}**.`)] 
                });
            } catch (error) {
                return interaction.reply({ embeds: [embeds.error(interaction, 'Erreur Inconnue', `Impossible d'ajouter le rôle : ${error.message}`)], ephemeral: true });
            }
        }

        // --- ACTION : RETIRER ---
        if (sub === 'remove') {
            if (!member.roles.cache.has(role.id)) {
                return interaction.reply({ 
                    embeds: [embeds.error(interaction, 'Erreur', `**${member.user.tag}** ne possède pas le rôle ${role}.`)],
                    ephemeral: true 
                });
            }

            try {
                await member.roles.remove(role);
                return interaction.reply({ 
                    embeds: [embeds.success(interaction, 'Rôle retiré', `Le rôle ${role} a été retiré à **${member.user.tag}**.`)] 
                });
            } catch (error) {
                return interaction.reply({ embeds: [embeds.error(interaction, 'Erreur Inconnue', `Impossible de retirer le rôle : ${error.message}`)], ephemeral: true });
            }
        }
    }
};