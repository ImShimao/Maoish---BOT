const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Donner de l\'argent à un autre membre')
        .addUserOption(o => o.setName('membre').setDescription('À qui ?').setRequired(true))
        .addIntegerOption(o => o.setName('montant').setDescription('Combien ?').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let sender, receiver, amount, replyFunc;
        
        // 1. DÉFINITION DE GUILDID
        const guildId = interactionOrMessage.guild.id;

        if (interactionOrMessage.isCommand?.()) {
            sender = interactionOrMessage.user;
            receiver = interactionOrMessage.options.getUser('membre');
            amount = interactionOrMessage.options.getInteger('montant');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            sender = interactionOrMessage.author;
            receiver = interactionOrMessage.mentions.users.first();
            amount = parseInt(args[1]);
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // --- VÉRIFICATIONS ---
        if (!receiver) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu dois mentionner quelqu'un !")] });
        }
        
        if (!amount || isNaN(amount) || amount <= 0) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Le montant indiqué est invalide.")] });
        }

        if (sender.id === receiver.id) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu ne peux pas t'envoyer de l'argent à toi-même.")] });
        }

        if (receiver.bot) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Les robots n'ont pas besoin d'argent !")] });
        }

        // --- TRANSACTION SÉCURISÉE (ATOMIQUE) ---
        // On utilise la fonction 'transfer' qui gère le retrait et l'ajout en même temps
        const success = await eco.transfer(sender.id, receiver.id, guildId, amount);

        if (!success) {
            // Si le transfert échoue, c'est forcément un manque de fonds
            // On récupère le solde juste pour l'affichage (lecture seule, sans risque)
            const senderData = await eco.get(sender.id, guildId);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `Fonds insuffisants !\nTu as seulement **${senderData?.cash || 0} €** en poche.`)] 
            });
        }

        // --- SUCCÈS ---
        const fmt = (n) => n.toLocaleString('fr-FR');
        const embed = embeds.success(interactionOrMessage, "Virement effectué", 
            `💸 **Transfert réussi !**\n\n` +
            `📤 **${sender.username}** a envoyé **${fmt(amount)} €**\n` +
            `📥 Reçu par **${receiver.username}**`
        );

        return replyFunc({ embeds: [embed] });
    }
};