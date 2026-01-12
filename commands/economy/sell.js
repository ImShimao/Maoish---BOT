const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Vendre des objets')
        .addStringOption(o => o.setName('objet').setDescription('L\'objet à vendre (ou "all")').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let user, itemInput, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            itemInput = interactionOrMessage.options.getString('objet');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            itemInput = args[0];
            replyFunc = (p) => interactionOrMessage.channel.send(p);
            if (!itemInput) return replyFunc("❌ Usage: `+sell fish` ou `+sell all`");
        }

        const userData = await eco.get(user.id);
        const inventory = userData.inventory || {};

        // --- OPTION 1 : TOUT VENDRE (/sell all) ---
        if (['all', 'tout'].includes(itemInput.toLowerCase())) {
            let totalGain = 0;
            let soldLog = [];

            for (const [id, qty] of Object.entries(inventory)) {
                const itemInfo = itemsDb.find(i => i.id === id);
                
                // SÉCURITÉ : On ne vend pas si :
                // 1. L'item n'existe plus dans la DB
                // 2. Il n'est pas "sellable"
                // 3. Il est UNIQUE (Outils, Téléphone, etc.) -> Protection Tools
                if (itemInfo && itemInfo.sellable && !itemInfo.unique) {
                    const gain = itemInfo.sellPrice * qty;
                    totalGain += gain;
                    soldLog.push(`${qty}x ${itemInfo.name}`);
                    
                    // On retire tout
                    await eco.removeItem(user.id, id, qty);
                }
            }

            if (totalGain === 0) return replyFunc("❌ Tu n'as rien à vendre (je touche pas à tes outils !).");
            
            await eco.addCash(user.id, totalGain);
            return replyFunc(`💰 **Vente groupée terminée !**\nTu as vendu : ${soldLog.join(', ')}\n**Gain total : +${totalGain} €**`);
        }

        // --- OPTION 2 : VENDRE UN TYPE PRÉCIS (/sell fish) ---
        // On cherche l'item
        const itemInfo = itemsDb.find(i => i.id === itemInput.toLowerCase() || i.name.toLowerCase().includes(itemInput.toLowerCase()));

        if (!itemInfo) return replyFunc("❌ Cet objet n'existe pas.");
        
        // On vérifie combien le joueur en a
        const quantityOwned = inventory[itemInfo.id] || 0;

        if (quantityOwned <= 0) return replyFunc("❌ Tu n'en as pas dans ton inventaire.");
        if (!itemInfo.sellable) return replyFunc("❌ Cet objet ne peut pas être vendu.");

        // On calcule le gain total pour tout le stock
        const totalGain = itemInfo.sellPrice * quantityOwned;

        // On retire TOUT le stock de cet item
        await eco.removeItem(user.id, itemInfo.id, quantityOwned);
        await eco.addCash(user.id, totalGain);

        replyFunc(`✅ Tu as vendu tout ton stock : **${quantityOwned}x ${itemInfo.name}** pour **${totalGain} €**.`);
    }
};