const { SlashCommandBuilder, PermissionFlagsBits, parseEmoji } = require('discord.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delemoji')
        .setDescription('Supprimer un émoji du serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
        .addStringOption(option => 
            option.setName('emoji')
                .setDescription('L\'émoji à supprimer (Nom, ID ou l\'émoji lui-même)')
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let input, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            input = interactionOrMessage.options.getString('emoji');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            // Version Prefix : +delemoji <emoji/id/nom>
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Permission refusée", "Tu dois avoir la permission `Gérer les émojis` pour faire ça.")] 
                });
            }

            if (!args || args.length === 0) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Usage incorrect", "Utilisation : `+delemoji <emoji ou ID ou nom>`")] 
                });
            }

            input = args[0];
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // --- RECHERCHE DE L'ÉMOJI ---
        let emojiToDelete;
        const guild = interactionOrMessage.guild;

        // 1. Essayer de parser si c'est un émoji custom (<:nom:id>)
        const parsed = parseEmoji(input);
        
        if (parsed && parsed.id) {
            emojiToDelete = guild.emojis.resolve(parsed.id);
        } 
        
        // 2. Si pas trouvé via parse, on cherche dans le cache par ID ou par Nom
        if (!emojiToDelete) {
            emojiToDelete = guild.emojis.cache.find(e => e.id === input || e.name === input);
        }

        // --- VÉRIFICATION ---
        if (!emojiToDelete) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Introuvable", "Je ne trouve pas cet émoji sur ce serveur.\nVérifie que j'y ai bien accès et que l'ID/Nom est correct.")] 
            });
        }

        // --- SUPPRESSION ---
        try {
            const emojiName = emojiToDelete.name;
            await emojiToDelete.delete();
            
            return replyFunc({ 
                embeds: [embeds.success(interactionOrMessage, 'Emoji supprimé', `L'émoji **${emojiName}** a été supprimé avec succès.`)] 
            });

        } catch (error) {
            console.error(error);
            
            let errorMsg = "Une erreur inconnue est survenue.";
            if (error.code === 50013) errorMsg = "Je n'ai pas la permission `Gérer les émojis` pour faire ça.";

            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Echec de la suppression", errorMsg)] 
            });
        }
    }
};