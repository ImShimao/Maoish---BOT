const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveitem')
        .setDescription('Donner un objet à un autre joueur')
        .addUserOption(o => o.setName('joueur').setDescription('À qui ?').setRequired(true))
        .addStringOption(o => o.setName('objet').setDescription('ID de l\'objet').setRequired(true))
        .addIntegerOption(o => o.setName('quantite').setDescription('Combien ? (Défaut: 1)')),

    async execute(interactionOrMessage, args) {
        let user, target, itemId, qty, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            target = interactionOrMessage.options.getUser('joueur');
            itemId = interactionOrMessage.options.getString('objet');
            qty = interactionOrMessage.options.getInteger('quantite') || 1;
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            target = interactionOrMessage.mentions.users.first();
            itemId = args[1]; // +giveitem @Shimao fish 5
            qty = parseInt(args[2]) || 1;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
            if (!target || !itemId) return replyFunc("❌ Usage: `+giveitem @User [item] [quantité]`");
        }

        if (target.id === user.id || target.bot) return replyFunc("❌ Destinataire invalide.");
        if (qty <= 0) return replyFunc("❌ Quantité invalide.");

        // Vérif Item
        const itemInfo = itemsDb.find(i => i.id === itemId.toLowerCase() || i.name.toLowerCase().includes(itemId.toLowerCase()));
        if (!itemInfo) return replyFunc("❌ Cet objet n'existe pas.");

        // Vérif Possession
        const userData = eco.get(user.id);
        if (!userData.inventory || !userData.inventory[itemInfo.id] || userData.inventory[itemInfo.id] < qty) {
            return replyFunc(`❌ Tu n'as pas assez de **${itemInfo.name}**.`);
        }

        // Transaction
        eco.removeItem(user.id, itemInfo.id, qty);
        eco.addItem(target.id, itemInfo.id, qty);

        replyFunc(`📦 **Livraison !** Tu as donné **${qty}x ${itemInfo.name}** à ${target.username}.`);
    }
};