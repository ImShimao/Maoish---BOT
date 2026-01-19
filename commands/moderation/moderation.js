const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Commandes de modération centralisées')
        // Permission minimale : Timeout (ModerateMembers). 
        // Les actions plus graves (Ban/Kick) sont vérifiées manuellement dans le code.
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

        // --- 1. BAN ---
        .addSubcommand(sub =>
            sub.setName('ban')
               .setDescription('Bannir un membre')
               .addUserOption(o => o.setName('membre').setDescription('Le membre à bannir').setRequired(true))
               .addStringOption(o => o.setName('raison').setDescription('Raison du bannissement')))

        // --- 2. UNBAN ---
        .addSubcommand(sub =>
            sub.setName('unban')
               .setDescription('Débannir un membre via son ID')
               .addStringOption(o => o.setName('id').setDescription('L\'ID Discord de l\'utilisateur').setRequired(true)))

        // --- 3. BAN LIST (NOUVEAU) ---
        .addSubcommand(sub =>
            sub.setName('banlist')
               .setDescription('Voir la liste des membres bannis (avec ID)'))

        // --- 4. KICK ---
        .addSubcommand(sub =>
            sub.setName('kick')
               .setDescription('Expulser un membre')
               .addUserOption(o => o.setName('membre').setDescription('Le membre à expulser').setRequired(true))
               .addStringOption(o => o.setName('raison').setDescription('Raison de l\'expulsion')))

        // --- 5. TIMEOUT ---
        .addSubcommand(sub =>
            sub.setName('timeout')
               .setDescription('Exclure temporairement (Mute)')
               .addUserOption(o => o.setName('membre').setDescription('Le membre à exclure').setRequired(true))
               .addIntegerOption(o => o.setName('minutes').setDescription('Durée en minutes').setRequired(true))
               .addStringOption(o => o.setName('raison').setDescription('Raison de l\'exclusion')))

        // --- 6. UNTIMEOUT ---
        .addSubcommand(sub =>
            sub.setName('untimeout')
               .setDescription('Rendre la parole (Unmute)')
               .addUserOption(o => o.setName('membre').setDescription('Le membre à rétablir').setRequired(true))
               .addStringOption(o => o.setName('raison').setDescription('Raison'))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const mod = interaction.member;

        // Fonction pour répondre rapidement avec une erreur
        const errorReply = (title, msg) => interaction.reply({ embeds: [embeds.error(interaction, title, msg)], ephemeral: true });

        // ====================================================
        // 📜 BAN LIST
        // ====================================================
        if (sub === 'banlist') {
            if (!mod.permissions.has(PermissionFlagsBits.BanMembers)) return errorReply("Refusé", "Tu dois avoir la permission de Bannir pour voir cette liste.");

            // On diffère la réponse car récupérer la liste peut être long
            await interaction.deferReply({ ephemeral: true });

            const bans = await interaction.guild.bans.fetch();
            if (bans.size === 0) {
                return interaction.editReply({ embeds: [embeds.info(interaction, "Liste des Bans", "Aucun membre n'est banni actuellement.")] });
            }

            // Formatage intelligent pour copier l'ID facilement
            const list = bans.map(b => `👤 **${b.user.tag}**\n🆔 \`${b.user.id}\``).join('\n\n');

            // Si la liste est trop longue pour un seul message (limite Discord 4096 chars)
            if (list.length > 4000) {
                const truncated = list.substring(0, 4000) + `\n\n... et ${bans.size - list.split('\n\n').length} autres.`;
                const embed = embeds.info(interaction, `🔨 Liste des Bannis (${bans.size})`, truncated);
                return interaction.editReply({ embeds: [embed] });
            }

            const embed = embeds.info(interaction, `🔨 Liste des Bannis (${bans.size})`, list);
            return interaction.editReply({ embeds: [embed] });
        }

        // ====================================================
        // 🔨 BAN
        // ====================================================
        if (sub === 'ban') {
            if (!mod.permissions.has(PermissionFlagsBits.BanMembers)) return errorReply("Refusé", "Tu n'as pas la permission de Bannir.");
            
            const target = interaction.options.getMember('membre');
            const reason = interaction.options.getString('raison') || 'Aucune raison';

            if (!target) return errorReply("Erreur", "Membre introuvable.");
            if (target.id === mod.id) return errorReply("Stop", "Tu ne peux pas te bannir toi-même.");
            if (!target.bannable) return errorReply("Impossible", "Je ne peux pas le bannir (il est gradé plus haut que moi).");
            if (target.roles.highest.position >= mod.roles.highest.position && mod.id !== interaction.guild.ownerId) return errorReply("Refusé", "Ce membre est gradé plus haut que toi.");

            // DM Préventif
            await target.send({ embeds: [embeds.warning(interaction, `Tu as été banni de ${interaction.guild.name}`, `**Raison :** ${reason}\n**Par :** ${mod.user.tag}`)] }).catch(() => {});

            await target.ban({ reason });
            return interaction.reply({ embeds: [embeds.success(interaction, "Le marteau a frappé", `🔨 **${target.user.tag}** a été banni.\n📄 ${reason}`)] });
        }

        // ====================================================
        // 🕊️ UNBAN
        // ====================================================
        if (sub === 'unban') {
            if (!mod.permissions.has(PermissionFlagsBits.BanMembers)) return errorReply("Refusé", "Tu n'as pas la permission de Bannir/Débannir.");
            
            const id = interaction.options.getString('id');

            try {
                const user = await interaction.guild.members.unban(id);
                return interaction.reply({ embeds: [embeds.success(interaction, "Pardon accordé", `🕊️ **${user.tag}** a été débanni.`)] });
            } catch (e) {
                return errorReply("Erreur", "ID invalide ou cet utilisateur n'est pas banni.");
            }
        }

        // ====================================================
        // 👢 KICK
        // ====================================================
        if (sub === 'kick') {
            if (!mod.permissions.has(PermissionFlagsBits.KickMembers)) return errorReply("Refusé", "Tu n'as pas la permission d'Expulser.");
            
            const target = interaction.options.getMember('membre');
            const reason = interaction.options.getString('raison') || 'Aucune raison';

            if (!target) return errorReply("Erreur", "Membre introuvable.");
            if (!target.kickable) return errorReply("Impossible", "Je ne peux pas l'expulser.");
            if (target.roles.highest.position >= mod.roles.highest.position && mod.id !== interaction.guild.ownerId) return errorReply("Refusé", "Ce membre est gradé plus haut que toi.");

            await target.send({ embeds: [embeds.warning(interaction, `Tu as été expulsé de ${interaction.guild.name}`, `**Raison :** ${reason}\n**Par :** ${mod.user.tag}`)] }).catch(() => {});
            
            await target.kick(reason);
            return interaction.reply({ embeds: [embeds.success(interaction, "Expulsion", `👢 **${target.user.tag}** a été expulsé.\n📄 ${reason}`)] });
        }

        // ====================================================
        // 🤐 TIMEOUT
        // ====================================================
        if (sub === 'timeout') {
            if (!mod.permissions.has(PermissionFlagsBits.ModerateMembers)) return errorReply("Refusé", "Tu n'as pas la permission d'exclure temporairement.");
            
            const target = interaction.options.getMember('membre');
            const minutes = interaction.options.getInteger('minutes');
            const reason = interaction.options.getString('raison') || 'Aucune raison';

            if (!target) return errorReply("Erreur", "Membre introuvable.");
            if (!target.moderatable) return errorReply("Impossible", "Je ne peux pas l'exclure (Rôle trop haut).");
            if (target.roles.highest.position >= mod.roles.highest.position && mod.id !== interaction.guild.ownerId) return errorReply("Refusé", "Ce membre est gradé plus haut que toi.");
            if (minutes > 40320) return errorReply("Erreur", "La durée max est de 28 jours (40320 min).");

            await target.send({ embeds: [embeds.warning(interaction, `Exclu temporairement (Timeout)`, `**Durée :** ${minutes} minutes\n**Raison :** ${reason}`)] }).catch(() => {});
            
            await target.timeout(minutes * 60_000, reason);
            return interaction.reply({ embeds: [embeds.success(interaction, "Timeout", `🤐 **${target.user.tag}** a été rendu muet.\n⏱️ **Durée :** ${minutes} min\n📄 ${reason}`)] });
        }

        // ====================================================
        // 🔊 UNTIMEOUT
        // ====================================================
        if (sub === 'untimeout') {
            if (!mod.permissions.has(PermissionFlagsBits.ModerateMembers)) return errorReply("Refusé", "Tu n'as pas la permission de gérer les exclusions.");
            
            const target = interaction.options.getMember('membre');
            const reason = interaction.options.getString('raison') || 'Sanction levée';

            if (!target.isCommunicationDisabled()) return errorReply("Erreur", "Ce membre n'est pas exclu actuellement.");
            
            await target.timeout(null, reason);
            return interaction.reply({ embeds: [embeds.success(interaction, "Parole rendue", `🔊 **${target.user.tag}** peut à nouveau parler.`)] });
        }
    }
};