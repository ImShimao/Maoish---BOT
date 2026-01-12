const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Vendre des objets (Uniquement les loots)')
        .addStringOption(o => 
            o.setName('objet')
                .setDescription('Quoi vendre ?')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        try {
            const userData = await eco.get(interaction.user.id);
            const inventory = userData.inventory || new Map();
            const focusedValue = interaction.options.getFocused().toLowerCase();
            
            // On prépare les choix (Filtre : pas d'objets du shop)
            let choices = Array.from(inventory.keys())
                .map(id => itemsDb.find(i => i.id === id))
                .filter(item => item && !item.inShop && item.sellable)
                .map(item => ({ name: item.name, value: item.id }));

            // Options globales
            const globalOptions = [
                { name: '✨ Tout (Loot)', value: 'all' },
                { name: '🐟 Tous les Poissons', value: 'fish' },
                { name: '⛏️ Tous les Minerais', value: 'mine' }
            ];

            const allChoices = [...globalOptions, ...choices];
            const filtered = allChoices
                .filter(c => c.name.toLowerCase().includes(focusedValue))
                .slice(0, 25);

            await interaction.respond(filtered);
        } catch (e) { console.error(e); }
    },

    async execute(interactionOrMessage, args) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const replyFunc = (p) => interactionOrMessage.reply ? interactionOrMessage.reply(p) : interactionOrMessage.channel.send(p);
        
        let itemInput = interactionOrMessage.isCommand?.() 
            ? interactionOrMessage.options.getString('objet') 
            : args[0];

        if (!itemInput) return replyFunc("❌ Précise quoi vendre.");

        const userData = await eco.get(user.id);
        const input = itemInput.toLowerCase();

        const sellBatch = async (filterFunc) => {
            let totalGain = 0;
            for (const [id, qty] of userData.inventory) {
                const item = itemsDb.find(i => i.id === id);
                if (item && filterFunc(item) && !item.inShop) {
                    totalGain += item.sellPrice * qty;
                    await eco.removeItem(user.id, id, qty);
                }
            }
            return totalGain;
        };

        let gain = 0;
        if (input === 'all') gain = await sellBatch(i => i.sellable);
        else if (input === 'fish') gain = await sellBatch(i => ['fish', 'trout', 'shark', 'trash'].includes(i.id));
        else if (input === 'mine') gain = await sellBatch(i => ['stone', 'coal', 'gold', 'diamond'].includes(i.id));
        else {
            const item = itemsDb.find(i => i.id === input || i.name.toLowerCase().includes(input));
            if (!item || item.inShop) return replyFunc("❌ Cet objet n'est pas vendable.");
            const qty = userData.inventory.get(item.id) || 0;
            if (qty <= 0) return replyFunc("❌ Tu n'en as pas.");
            gain = item.sellPrice * qty;
            await eco.removeItem(user.id, item.id, qty);
        }

        if (gain <= 0) return replyFunc("❌ Rien à vendre.");
        await eco.addCash(user.id, gain);
        replyFunc(`💰 **Vendu !** Tu as gagné **${gain} €**.`);
    }
};