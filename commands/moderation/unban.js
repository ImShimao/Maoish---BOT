const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Débannir un membre via son ID')
        .addStringOption(o => 
            o.setName('id')
                .setDescription('L\'ID Discord de l\'utilisateur (Mode développeur requis)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interactionOrMessage, args) {
        let userId, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            userId = interactionOrMessage.options.getString('id');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            // Version Préfixe : +unban 123456789
            
            // 1. Permissions
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Permission refusée", "Tu n'as pas le droit de débannir des gens.")] 
                });
            }

            // 2. Arguments
            if (!args || args.length === 0) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "ID manquant", "Il me faut l'ID de l'utilisateur.\nEx: `+unban 123456789012345678`")] 
                });
            }

            userId = args[0];
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // --- ACTION ---
        try {
            // unban() retourne l'utilisateur débanni (User Object) si ça marche
            const user = await interactionOrMessage.guild.members.unban(userId);
            
            const embed = embeds.success(interactionOrMessage, 'Pardon accordé', `🕊️ L'utilisateur **${user ? user.tag : userId}** a été débanni du serveur.`);
            
            await replyFunc({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            
            let errorMsg = "Impossible de débannir cet ID.";
            // Erreur Discord : Utilisateur inconnu (10013) ou Ban inconnu (10026)
            if (error.code === 10026) errorMsg = "Cet utilisateur n'est pas banni.";
            if (error.code === 10013) errorMsg = "ID utilisateur invalide.";

            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Echec", errorMsg)] 
            });
        }
    }
};