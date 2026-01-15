const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Exclure temporairement un membre (Mute)')
        .addUserOption(o => 
            o.setName('cible')
                .setDescription('Le membre à exclure')
                .setRequired(true))
        .addIntegerOption(o => 
            o.setName('minutes')
                .setDescription('Durée en minutes (Max 40320 = 28 jours)')
                .setRequired(true))
        .addStringOption(o => 
            o.setName('raison')
                .setDescription('Raison de l\'exclusion'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interactionOrMessage, args) {
        let targetMember, minutes, reason, mod, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            targetMember = interactionOrMessage.options.getMember('cible');
            minutes = interactionOrMessage.options.getInteger('minutes');
            reason = interactionOrMessage.options.getString('raison') || 'Aucune raison fournie';
            mod = interactionOrMessage.member;
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            // Version Préfixe : +timeout @user 10 [raison]
            
            // 1. Permission
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Permission refusée", "Tu n'as pas le droit d'exclure des membres.")] 
                });
            }

            // 2. Arguments
            if (!args || args.length < 2) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Usage incorrect", "Utilisation : `+timeout <@membre> <minutes> [raison]`")] 
                });
            }

            targetMember = interactionOrMessage.mentions.members.first();
            minutes = parseInt(args[1]);
            reason = args.slice(2).join(' ') || 'Aucune raison fournie';
            mod = interactionOrMessage.member;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // --- SÉCURITÉ & VALIDATION ---

        // 1. Validité du membre
        if (!targetMember) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Membre introuvable.")] });

        // 2. Validité du temps
        if (isNaN(minutes) || minutes < 1 || minutes > 40320) { // 40320 min = 28 jours (Limite Discord API)
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Durée invalide", "La durée doit être entre **1 minute** et **28 jours** (40320 min).")] });
        }

        // 3. Hiérarchie (Mod vs Cible)
        if (targetMember.roles.highest.position >= mod.roles.highest.position && mod.id !== interactionOrMessage.guild.ownerId) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Accès refusé", "Ce membre est gradé plus haut (ou égal) que toi !")] });
        }

        // 4. Moderatable par le bot ?
        if (!targetMember.moderatable) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Impossible", "Je ne peux pas exclure ce membre (Rôle trop élevé pour moi).")] });
        }

        // --- ACTION ---
        
        // DM Préventif
        try {
            await targetMember.send({
                embeds: [embeds.warning(interactionOrMessage, `Tu as été exclu temporairement de ${interactionOrMessage.guild.name}`, `**Durée :** ${minutes} minutes\n**Raison :** ${reason}`)]
            });
        } catch (e) {}

        // Timeout effectif
        try {
            await targetMember.timeout(minutes * 60 * 1000, reason); // Conversion minutes -> ms

            const embed = embeds.success(interactionOrMessage, '🤐 Exclusion Appliquée', `**Membre :** ${targetMember.user.tag}\n**Durée :** ${minutes} minutes\n**Raison :** ${reason}`);
            return replyFunc({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Erreur système", "Une erreur est survenue lors de l'application du timeout.")] });
        }
    }
};