const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannir un membre du serveur')
        .addUserOption(o => o.setName('cible').setDescription('Le membre à bannir').setRequired(true))
        .addStringOption(o => o.setName('raison').setDescription('La raison du bannissement'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

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
            // 1. Vérification Permission
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Permission refusée", "Tu n'as pas le droit de bannir des gens.")] 
                });
            }

            // 2. Récupération Arguments
            if (!args || args.length === 0) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Usage incorrect", "Utilisation : `+ban <@membre> [raison]`")] 
                });
            }

            targetMember = interactionOrMessage.mentions.members.first();
            // On récupère tout ce qui est après la mention pour la raison
            reason = args.slice(1).join(' ') || 'Aucune raison fournie';
            mod = interactionOrMessage.member;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // --- SÉCURITÉ ET VÉRIFICATIONS ---

        // 1. Membre introuvable
        if (!targetMember) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Introuvable", "Je ne trouve pas ce membre sur le serveur.")] 
            });
        }

        // 2. Anti-Self Ban
        if (targetMember.id === mod.id) {
            return replyFunc({ 
                embeds: [embeds.warning(interactionOrMessage, "Euh...", "Tu ne peux pas te bannir toi-même.")] 
            });
        }

        // 3. Hiérarchie des rôles (Modérateur vs Cible)
        // Si la cible a un rôle égal ou supérieur au modérateur -> Erreur
        if (targetMember.roles.highest.position >= mod.roles.highest.position && mod.id !== interactionOrMessage.guild.ownerId) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Accès refusé", "Ce membre est gradé plus haut (ou égal) que toi !")] 
            });
        }

        // 4. Bannable par le bot ? (Hiérarchie Bot vs Cible)
        if (!targetMember.bannable) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Impossible", "Je ne peux pas bannir ce membre.\n*Il est probablement gradé plus haut que moi ou c'est le propriétaire.*")] 
            });
        }

        // --- ACTION ---
        
        // Etape A : Envoi du DM (On tente, mais on ne bloque pas si ça rate)
        try {
            await targetMember.send({
                embeds: [embeds.warning(interactionOrMessage, `Tu as été banni de ${interactionOrMessage.guild.name}`, `**Raison :** ${reason}\n**Par :** ${mod.user.tag}`)]
            });
        } catch (err) {
            // Le membre a sûrement fermé ses DMs, tant pis
        }

        // Etape B : Le BAN
        try {
            await targetMember.ban({ reason: reason });

            // Etape C : Confirmation
            const embed = embeds.success(interactionOrMessage, 'Le marteau a frappé !', `🔨 **${targetMember.user.tag}** a été banni.\n📄 **Raison :** ${reason}`);
            return replyFunc({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Erreur système", "Une erreur est survenue lors du bannissement.")] 
            });
        }
    }
};