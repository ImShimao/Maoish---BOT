const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('migrate')
        .setDescription('ADMIN: Fusionne les anciens profils vers ce serveur (Anti-Doublon)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Sécurité supplémentaire : On s'assure que c'est bien un admin (même si Slash le gère)
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
             return interaction.reply({ 
                 embeds: [embeds.error(interaction, "Accès refusé", "Réservé aux administrateurs.")], 
                 ephemeral: true 
             });
        }

        await interaction.deferReply();
        const guildId = interaction.guild.id;

        // 1. Récupérer tous les "Vieux" profils (ceux sans guildId)
        // Ce sont les profils de la V1 qui traînent dans la base
        const oldProfiles = await User.find({ guildId: { $exists: false } });

        if (oldProfiles.length === 0) {
            return interaction.editReply({ 
                embeds: [embeds.info(interaction, "Migration inutile", "✅ Aucune donnée ancienne (V1) trouvée à migrer.")] 
            });
        }

        let migratedCount = 0;
        let mergedCount = 0;

        for (const oldUser of oldProfiles) {
            // 2. Chercher si ce joueur a DÉJÀ un profil "V2" sur ce serveur actuel
            const existingV2User = await User.findOne({ userId: oldUser.userId, guildId: guildId });

            if (existingV2User) {
                // CAS A : FUSION (Le joueur a déjà commencé à jouer sur la V2)
                // On ajoute l'ancien argent au nouveau
                existingV2User.cash += oldUser.cash;
                existingV2User.bank += oldUser.bank;
                existingV2User.xp += oldUser.xp;
                
                // On fusionne aussi l'inventaire (si l'ancien en avait un)
                if (oldUser.inventory && oldUser.inventory.length > 0) {
                    existingV2User.inventory.push(...oldUser.inventory);
                }

                // On sauvegarde le V2 et on SUPPRIME le vieux pour ne pas laisser de doublons
                await existingV2User.save();
                await User.deleteOne({ _id: oldUser._id });
                mergedCount++;
            } else {
                // CAS B : CONVERSION (Le joueur n'a pas encore joué en V2 sur ce serveur)
                // On transforme le vieux profil en profil V2 pour ce serveur
                oldUser.guildId = guildId;
                await oldUser.save();
                migratedCount++;
            }
        }

        const embed = embeds.success(interaction, 'Migration Terminée', 
            `La base de données a été mise à jour vers la structure Multi-Serveur.\n\n` +
            `🔄 **${mergedCount}** profils fusionnés (Argent/XP additionnés).\n` +
            `📂 **${migratedCount}** profils convertis (Assignés à ce serveur).\n` +
            `🗑️ Les anciennes données "globales" n'existent plus.`
        );

        return interaction.editReply({ embeds: [embed] });
    }
};