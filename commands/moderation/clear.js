const { SlashCommandBuilder, PermissionflagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprime un nombre de messages')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Le nombre de messages à supprimer (1-99)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionflagsBits.ManageMessages), // Sécurité Discord

    async execute(interactionOrMessage, args) {
        // 1. Récupération du nombre
        let amount;
        
        if (interactionOrMessage.isCommand?.()) {
            amount = interactionOrMessage.options.getInteger('nombre');
        } else {
            // Pour le préfixe +clear 10
            if (!args[0] || isNaN(args[0])) return interactionOrMessage.reply("❌ Il faut un nombre ! Ex: `+clear 5`");
            amount = parseInt(args[0]);
            // On supprime aussi la commande "+clear" elle-même, donc on ajoute 1 au total
            // Mais on le fait manuellement après pour éviter les bugs
             try { await interactionOrMessage.delete(); } catch (e) {}
        }

        if (amount > 99 || amount < 1) {
            const msg = "❌ Je ne peux supprimer qu'entre 1 et 99 messages à la fois.";
            return interactionOrMessage.isCommand?.() ? interactionOrMessage.reply({ content: msg, flags: true }) : interactionOrMessage.channel.send(msg);
        }

        // 2. Suppression
        const channel = interactionOrMessage.channel;
        
        try {
            await channel.bulkDelete(amount, true); // true = ignore les messages trop vieux (+14 jours)

            const successMsg = `🧹 **${amount} messages supprimés !**`;
            
            // Réponse
            if (interactionOrMessage.isCommand?.()) {
                await interactionOrMessage.reply({ content: successMsg, flags: true });
            } else {
                const m = await channel.send(successMsg);
                // On supprime le message de confirmation après 3 secondes pour rester propre
                setTimeout(() => m.delete().catch(() => {}), 3000);
            }
        } catch (error) {
            console.error(error);
            const err = "❌ Erreur : Je n'ai pas la permission ou les messages sont trop vieux.";
            if (interactionOrMessage.isCommand?.()) interactionOrMessage.reply({ content: err, flags: true });
            else channel.send(err);
        }
    }
};