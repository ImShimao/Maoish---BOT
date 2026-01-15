const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprime un nombre de messages (Max 100)')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Le nombre de messages à supprimer')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interactionOrMessage, args) {
        let amount, replyFunc;
        const channel = interactionOrMessage.channel;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            amount = interactionOrMessage.options.getInteger('nombre');
            // Pour les slashs, on répond en éphémère (visible que par le modérateur)
            replyFunc = (p) => interactionOrMessage.reply({ ...p, ephemeral: true });
        } else {
            // Version Préfixe : +clear 10
            // 1. Sécurité Permission (Vital !)
            if (!interactionOrMessage.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Permission refusée", "Tu dois avoir la permission `Gérer les messages` pour faire ça.")] 
                });
            }

            // 2. Récupération nombre
            if (!args[0] || isNaN(args[0])) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Usage incorrect", "Il faut un nombre ! Ex: `+clear 10`")] 
                });
            }
            amount = parseInt(args[0]);

            // 3. Nettoyage de la commande elle-même
            try { await interactionOrMessage.delete(); } catch (e) {}

            // Pour les messages, on envoie, puis on supprimera la confirmation après
            replyFunc = async (p) => {
                const msg = await channel.send(p);
                setTimeout(() => msg.delete().catch(() => {}), 3000); // Auto-delete après 3s
            };
        }

        // Validation
        if (amount > 100 || amount < 1) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Limite atteinte", "Je ne peux supprimer qu'entre 1 et 100 messages à la fois.")] 
            });
        }

        // --- ACTION ---
        try {
            // bulkDelete(nombre, true) -> le 'true' signifie "filterOld":
            // Il ignore automatiquement les messages de +14 jours sans faire planter le bot.
            const deleted = await channel.bulkDelete(amount, true);

            // Si 0 messages supprimés (car tous trop vieux)
            if (deleted.size === 0) {
                return replyFunc({ 
                    embeds: [embeds.warning(interactionOrMessage, "Aucun message supprimé", "Les messages sont trop vieux (plus de 14 jours) et Discord m'empêche de les supprimer en masse.")] 
                });
            }

            // Succès
            // Si on a demandé 10 mais qu'il en a supprimé que 8 (car 2 trop vieux), on affiche le vrai chiffre (deleted.size)
            const embed = embeds.success(interactionOrMessage, 'Nettoyage terminé', `🧹 **${deleted.size}** messages ont été supprimés.`);
            
            await replyFunc({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Erreur", "Une erreur est survenue (Permissions manquantes ou problème Discord).")] 
            });
        }
    }
};