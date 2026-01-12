const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Vendre des objets (all, fish, mine, ou un objet précis)')
        .addStringOption(o => o.setName('objet').setDescription('Quoi vendre ? (all, fish, mine, nom_objet)').setRequired(true)),

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
        const inventory = userData.inventory || new Map(); // On s'assure que c'est une Map

        const input = itemInput.toLowerCase();

        // --- FONCTION INTERNE DE VENTE ---
        // Permet de vendre une liste d'IDs d'un coup
        const sellBatch = async (filterFunc) => {
            let totalGain = 0;
            let soldLog = [];

            // Inventory est une Map, il faut l'itérer comme ça
            for (const [id, qty] of inventory) {
                const item = itemsDb.find(i => i.id === id);
                
                // On vérifie si l'item existe et correspond au filtre (All, Fish, etc.)
                // CRITÈRE CLÉ : item.inShop === false (pour 'all')
                if (item && filterFunc(item)) {
                    const gain = item.sellPrice * qty;
                    totalGain += gain;
                    soldLog.push(`${qty}x ${item.name}`);
                    
                    await eco.removeItem(user.id, id, qty);
                }
            }
            return { totalGain, soldLog };
        };

        // --- 1. SHORTCUTS (All, Fish, Mine) ---
        let result = null;

        if (['all', 'tout'].includes(input)) {
            // Règle : Vendable + Pas Unique + PAS DANS LE SHOP
            result = await sellBatch(i => i.sellable && !i.unique && !i.inShop);
        }
        else if (['fish', 'poisson', 'peche'].includes(input)) {
            const fishIds = ['fish', 'trout', 'shark', 'trash'];
            result = await sellBatch(i => fishIds.includes(i.id));
        }
        else if (['mine', 'minerais', 'mining'].includes(input)) {
            const mineIds = ['stone', 'coal', 'gold', 'diamond'];
            result = await sellBatch(i => mineIds.includes(i.id));
        }

        // Si on a utilisé un shortcut
        if (result) {
            if (result.totalGain === 0) return replyFunc("❌ Rien à vendre dans cette catégorie (ou inventaire vide).");
            
            await eco.addCash(user.id, result.totalGain);
            return replyFunc(`💰 **Vente terminée !**\nTu as vendu : ${result.soldLog.join(', ')}\n**Gain total : +${result.totalGain} €**`);
        }

        // --- 2. VENTE D'UN OBJET PRÉCIS ---
        const itemInfo = itemsDb.find(i => i.id === input || i.name.toLowerCase().includes(input));

        if (!itemInfo) return replyFunc("❌ Cet objet n'existe pas.");
        
        // Avec une Map, on utilise .get()
        const quantityOwned = inventory.get(itemInfo.id) || 0;

        if (quantityOwned <= 0) return replyFunc("❌ Tu n'en as pas.");
        if (!itemInfo.sellable) return replyFunc("❌ Invendable.");

        const totalGain = itemInfo.sellPrice * quantityOwned;
        await eco.removeItem(user.id, itemInfo.id, quantityOwned);
        await eco.addCash(user.id, totalGain);

        replyFunc(`✅ Tu as vendu tout ton stock : **${quantityOwned}x ${itemInfo.name}** pour **${totalGain} €**.`);
    }
};