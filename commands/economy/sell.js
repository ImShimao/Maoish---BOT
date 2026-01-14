const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Vendre des objets')
        .addStringOption(o => 
            o.setName('objet')
                .setDescription('Quoi vendre ?')
                .setRequired(true)
                .setAutocomplete(true))
        .addIntegerOption(o => 
            o.setName('quantité')
                .setDescription('Combien ? (Laisser vide pour 1)')
                .setMinValue(1)),

    async autocomplete(interaction) {
        try {
            const userData = await eco.get(interaction.user.id);
            const inventory = userData.inventory || new Map();
            const focusedValue = interaction.options.getFocused().toLowerCase();
            
            let choices = Array.from(inventory.keys())
                .map(id => itemsDb.find(i => i.id === id))
                .filter(item => item && item.sellPrice > 0)
                .map(item => ({ name: `${item.icon} ${item.name} (${item.sellPrice}€)`, value: item.id }));

            const globalOptions = [
                { name: '✨ Tout (Toutes les ressources)', value: 'all' },
                { name: '🐟 Tous les Poissons', value: 'fish' },
                { name: '⛏️ Tous les Minerais', value: 'mine' },
                { name: '💩 Tout ce que j\'ai creusé', value: 'dig' } // NOUVEAU
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
        
        let itemInput, amount;

        if (interactionOrMessage.isCommand?.()) {
            itemInput = interactionOrMessage.options.getString('objet');
            amount = interactionOrMessage.options.getInteger('quantité') || 1;
        } else {
            itemInput = args[0];
            amount = parseInt(args[1]) || 1;
        }

        if (!itemInput) return replyFunc("❌ Précise quoi vendre.");

        const userData = await eco.get(user.id);
        const input = itemInput.toLowerCase();

        const sellBatch = async (filterIds) => {
            let totalGain = 0;
            let count = 0;
            
            for (const [id, qty] of userData.inventory) {
                if (filterIds.includes(id)) {
                    const item = itemsDb.find(i => i.id === id);
                    if (item && item.sellPrice > 0) {
                        const gain = item.sellPrice * qty;
                        totalGain += gain;
                        count += qty;
                        await eco.removeItem(user.id, id, qty);
                    }
                }
            }
            return { totalGain, count };
        };

// --- DÉFINITION DES GROUPES ---
        const fishIds = ['trash', 'fish', 'crab', 'trout', 'puffer', 'shark', 'treasure'];
        const mineIds = ['stone', 'coal', 'iron', 'gold', 'ruby', 'diamond', 'emerald'];
        const digIds = ['worm', 'potato', 'trash', 'bone', 'old_coin', 'capsule', 'skull', 'treasure', 'fossil', 'sarcophagus'];
        // NOUVEAU : LISTE CHASSE
        const huntIds = ['meat', 'rabbit', 'duck', 'boar', 'deer_antlers', 'bear'];
        
        // "All" vend maintenant Fish + Mine + Dig + Hunt + Bouffe
        const allIds = [...fishIds, ...mineIds, ...digIds, ...huntIds, 'cookie', 'beer', 'pizza']; 
        // On utilise Set pour dédoublonner
        const uniqueAllIds = [...new Set(allIds)];

        let result = { totalGain: 0, count: 0 };
        let msgStart = "";

        if (input === 'all') {
            result = await sellBatch(uniqueAllIds);
            msgStart = "📦 Tout ton bric-à-brac";
        } 
        else if (input === 'fish') {
            result = await sellBatch(fishIds);
            msgStart = "🐟 Ta pêche";
        } 
        else if (input === 'mine') {
            result = await sellBatch(mineIds);
            msgStart = "⛏️ Tes minerais";
        } 
        else if (input === 'dig') {
            result = await sellBatch(digIds);
            msgStart = "💩 Tes fouilles";
        }
        else if (input === 'hunt') { // NOUVEAU
            result = await sellBatch(huntIds);
            msgStart = "🍖 Ton gibier";
        }
        else {
            const item = itemsDb.find(i => i.id === input || i.name.toLowerCase().includes(input));
            
            if (!item) return replyFunc("❌ Objet introuvable.");
            if (!item.sellPrice || item.sellPrice <= 0) return replyFunc(`❌ **${item.name}** ne peut pas être vendu.`);

            const userQty = userData.inventory.get(item.id) || 0;
            if (userQty < amount) return replyFunc(`❌ Tu n'as pas assez de **${item.name}** (Tu en as : ${userQty}).`);

            const gain = item.sellPrice * amount;
            await eco.removeItem(user.id, item.id, amount);
            
            result = { totalGain: gain, count: amount };
            msgStart = `${amount}x ${item.icon} **${item.name}**`;
        }

        if (result.totalGain <= 0) return replyFunc("❌ Rien à vendre correspondant à ta demande.");

        await eco.addCash(user.id, result.totalGain);
        
        const embed = new EmbedBuilder()
            .setColor(config.COLORS.SUCCESS || 0x2ECC71)
            .setDescription(`💰 **Vendu !**\n${msgStart} pour **${result.totalGain} €**.`);

        return replyFunc({ embeds: [embed] });
    }
};