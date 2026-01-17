const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulser un membre du serveur')
        .addUserOption(o => o.setName('cible').setDescription('Le membre à expulser').setRequired(true))
        .addStringOption(o => o.setName('raison').setDescription('La raison de l\'expulsion'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interactionOrMessage, args) {
        let targetMember, reason, mod, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            targetMember = interactionOrMessage.options.getMember('cible');
            reason = interactionOrMessage.options.getString('raison') || 'Aucune raison fournie';
            mod = interactionOrMessage.member;
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            // Version Préfixe
            // 1. Vérif Permissions
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.KickMembers)) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Permission refusée", "Tu n'as pas le droit d'expulser des gens.")] 
                });
            }

            // 2. Arguments
            if (!args || args.length === 0) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Usage incorrect", "Utilisation : `+kick <@membre> [raison]`")] 
                });
            }

            targetMember = interactionOrMessage.mentions.members.first();
            reason = args.slice(1).join(' ') || 'Aucune raison fournie';
            mod = interactionOrMessage.member;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // --- SÉCURITÉ ---

        // 1. Membre introuvable
        if (!targetMember) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Introuvable", "Je ne trouve pas ce membre sur le serveur (ou tu ne l'as pas mentionné).")] 
            });
        }

        // 2. Anti-Self Kick
        if (targetMember.id === mod.id) {
            return replyFunc({ 
                embeds: [embeds.warning(interactionOrMessage, "Euh...", "Tu ne peux pas t'expulser toi-même.")] 
            });
        }

        // 3. Hiérarchie (Mod vs Cible)
        // Si la cible est plus gradée que le modérateur (sauf Owner)
        if (targetMember.roles.highest.position >= mod.roles.highest.position && mod.id !== interactionOrMessage.guild.ownerId) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Accès refusé", "Ce membre est gradé plus haut (ou égal) que toi !")] 
            });
        }

        // 4. Kickable par le bot ?
        if (!targetMember.kickable) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Impossible", "Je ne peux pas expulser ce membre.\n*Il est probablement gradé plus haut que moi.*")] 
            });
        }

        // --- ACTION ---

        // DM préventif
        try {
            await targetMember.send({
                embeds: [embeds.warning(interactionOrMessage, `Tu as été expulsé de ${interactionOrMessage.guild.name}`, `**Raison :** ${reason}\n**Par :** ${mod.user.tag}`)]
            });
        } catch (e) {
            // DM fermés, pas grave
        }

        // Kick effectif
        try {
            await targetMember.kick(reason);

            const embed = embeds.success(interactionOrMessage, 'Expulsion réussie', `👢 **${targetMember.user.tag}** a été expulsé.\n📄 **Raison :** ${reason}`);
            return replyFunc({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Erreur système", "Une erreur est survenue lors de l'expulsion.")] 
            });
        }
    }
};