const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sayadvance')
        .setDescription('Fait parler le bot avec style (Choix du salon, Embed...)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(o => 
            o.setName('message')
                .setDescription('Le texte à envoyer')
                .setRequired(true))
        .addChannelOption(o => 
            o.setName('salon')
                .setDescription('Où envoyer le message ? (Vide = ici)')
                .addChannelTypes(ChannelType.GuildText))
        .addBooleanOption(o => 
            o.setName('embed')
                .setDescription('Envoyer sous forme d\'Embed ? (Défaut : Oui)')),

    async execute(interactionOrMessage, args) {
        let msgContent, targetChannel, useEmbed, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            msgContent = interactionOrMessage.options.getString('message');
            targetChannel = interactionOrMessage.options.getChannel('salon') || interactionOrMessage.channel;
            // Par défaut true pour "Advance"
            useEmbed = interactionOrMessage.options.getBoolean('embed') ?? true; 
            
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            // Version Préfixe : +sayadvance [#salon] <message>
            
            // 1. Sécurité Admin
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Permission refusée", "Réservé aux admins.")] 
                });
            }

            // 2. Parsing intelligent
            // On regarde si le premier argument est une mention de salon (<#123456...>)
            const firstArg = args[0];
            const mentionedChannel = interactionOrMessage.mentions.channels.first();

            if (mentionedChannel && firstArg.startsWith('<#')) {
                targetChannel = mentionedChannel;
                msgContent = args.slice(1).join(' '); // On enlève le salon du message
            } else {
                targetChannel = interactionOrMessage.channel;
                msgContent = args.join(' ');
            }

            if (!msgContent) return; // Pas de message vide

            useEmbed = true; // Par défaut true en préfixe pour différencier du +say classique
            
            // Suppression de la commande
            try { await interactionOrMessage.delete(); } catch (e) {}

            // Pour le feedback visuel (on ne répond pas directement, on envoie juste)
            replyFunc = async (p) => { /* Pas de réponse directe en prefix pour garder l'anonymat */ };
        }

        // --- ENVOI ---
        try {
            // Vérification des perms dans le salon cible
            if (!targetChannel.permissionsFor(interactionOrMessage.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                const errEmbed = embeds.error(interactionOrMessage, "Impossible", `Je n'ai pas le droit d'écrire dans ${targetChannel}.`);
                if (interactionOrMessage.isCommand?.()) return replyFunc({ embeds: [errEmbed], ephemeral: true });
                return;
            }

            if (useEmbed) {
                // On utilise l'usine pour créer un embed propre
                // On met "null" en titre pour n'avoir que le texte, ou on met un titre générique
                const embed = embeds.info(interactionOrMessage, null, msgContent)
                    .setColor(0x5865F2) // Blurple Discord
                    .setFooter(null)    // On retire le footer "Maoish" pour faire plus RP/Neutre
                    .setTimestamp(null); // Pas de date pour faire plus propre

                await targetChannel.send({ embeds: [embed] });
            } else {
                await targetChannel.send(msgContent);
            }

            // Confirmation (Uniquement en Slash pour dire "c'est fait")
            if (interactionOrMessage.isCommand?.()) {
                await replyFunc({ content: `✅ Message envoyé dans ${targetChannel}`, ephemeral: true });
            }

        } catch (error) {
            console.error(error);
            if (interactionOrMessage.isCommand?.()) {
                await replyFunc({ content: "❌ Une erreur est survenue.", ephemeral: true });
            }
        }
    }
};