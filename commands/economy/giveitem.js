const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveitem')
        .setDescription('Donner un objet à un autre joueur')
        .addUserOption(o => o.setName('joueur').setDescription('À qui ?').setRequired(true))
        .addStringOption(o => 
            o.setName('objet')
                .setDescription('Quel objet donner ?')
                .setRequired(true)
                .setAutocomplete(true)) // On active l'autocomplétion ici
        .addIntegerOption(o => o.setName('quantite').setDescription('Combien ? (Défaut: 1)')),

    // Ajout de la fonction d'autocomplétion (copiée et adaptée de sell.js)
    async autocomplete(interaction) {
        try {
            const userData = await eco.get(interaction.user.id);
            const inventory = userData.inventory || new Map();
            const focusedValue = interaction.options.getFocused().toLowerCase();
            
            // On récupère les objets que le joueur possède
            let choices = Array.from(inventory.keys())
                .map(id => itemsDb.find(i => i.id === id))
                .filter(item => item) // On s'assure que l'item existe dans la DB
                .map(item => ({ name: item.name, value: item.id }));

            const filtered = choices
                .filter(c => c.name.toLowerCase().includes(focusedValue))
                .slice(0, 25); // Discord limite à 25 choix max

            await interaction.respond(filtered);
        } catch (e) { console.error(e); }
    },

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
            itemId = args[1]; 
            qty = parseInt(args[2]) || 1;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        const sendEmbed = (text, color) => replyFunc({ embeds: [new EmbedBuilder().setColor(color).setDescription(text)] });

        if (!target || !itemId) return sendEmbed("❌ Commande invalide. Usage: `/giveitem @User [objet]`", config.COLORS.ERROR);
        if (target.id === user.id || target.bot) return sendEmbed("❌ Destinataire invalide.", config.COLORS.ERROR);
        if (qty <= 0) return sendEmbed("❌ Quantité invalide.", config.COLORS.ERROR);

        const itemInfo = itemsDb.find(i => i.id === itemId.toLowerCase() || i.name.toLowerCase().includes(itemId.toLowerCase()));
        if (!itemInfo) return sendEmbed("❌ Cet objet n'existe pas.", config.COLORS.ERROR);

        const userData = await eco.get(user.id);
        const userQty = userData.inventory.get(itemInfo.id) || 0;

        if (userQty < qty) {
            return sendEmbed(`❌ Tu n'as pas assez de **${itemInfo.name}** (En stock: ${userQty}).`, config.COLORS.ERROR);
        }

        // Transaction
        await eco.removeItem(user.id, itemInfo.id, qty);
        await eco.addItem(target.id, itemInfo.id, qty);

        sendEmbed(`📦 **Colis livré !**\nTu as donné **${qty}x ${itemInfo.name}** à **${target.username}**.`, config.COLORS.SUCCESS);
    }
};