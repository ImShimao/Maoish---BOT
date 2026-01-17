const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Donner de l\'argent à un autre membre')
        .addUserOption(o => o.setName('membre').setDescription('À qui ?').setRequired(true))
        .addIntegerOption(o => o.setName('montant').setDescription('Combien ?').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let sender, receiver, amount, replyFunc;
        
        // ✅ 1. DÉFINITION DE GUILDID (Indispensable)
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
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu ne peux pas t'envoyer de l'argent à toi-même (Triste réalité...).")] });
        }

        if (receiver.bot) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Les robots n'ont pas besoin d'argent !")] });
        }

        // --- VÉRIFICATION FONDS ---
        // ✅ Ajout de guildId ici pour vérifier le solde SUR CE SERVEUR
        const senderData = await eco.get(sender.id, guildId);
        const fmt = (n) => n.toLocaleString('fr-FR');

        if (senderData.cash < amount) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `Fonds insuffisants !\nTu as seulement **${fmt(senderData.cash)} €** en poche.`)] 
            });
        }

        // --- TRANSACTION ---
        // ✅ guildId est maintenant bien défini ligne 16, donc ça fonctionne
        await eco.addCash(sender.id, guildId, -amount);
        await eco.addCash(receiver.id, guildId, amount);

        // --- SUCCÈS ---
        const embed = embeds.success(interactionOrMessage, "Virement effectué", 
            `💸 **Transfert réussi !**\n\n` +
            `📤 **${sender.username}** a envoyé **${fmt(amount)} €**\n` +
            `📥 Reçu par **${receiver.username}**`
        );

        return replyFunc({ embeds: [embed] });
    }
};