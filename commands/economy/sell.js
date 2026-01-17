const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

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
            // ✅ 1. GUILDID pour l'autocomplete
            const guildId = interaction.guild.id;
            
            // ✅ On récupère l'inventaire du serveur
            const userData = await eco.get(interaction.user.id, guildId);
            
            // Petite sécurité si inventory est undefined ou n'est pas une Map
            let inventory = new Map();
            if (userData && userData.inventory) {
                inventory = userData.inventory instanceof Map ? userData.inventory : new Map(Object.entries(userData.inventory));
            }

            const focusedValue = interaction.options.getFocused().toLowerCase();
            
            // On récupère les items vendables de l'inventaire
            let choices = Array.from(inventory.keys())
                .map(id => itemsDb.find(i => i.id === id))
                .filter(item => item && item.sellPrice > 0)
                .map(item => ({ name: `${item.icon} ${item.name} (${item.sellPrice}€)`, value: item.id }));

            const globalOptions = [
                { name: '✨ Tout (Toutes les ressources)', value: 'all' },
                { name: '🐟 Tous les Poissons', value: 'fish' },
                { name: '⛏️ Tous les Minerais', value: 'mine' },
                { name: '💩 Tout ce que j\'ai creusé', value: 'dig' },
                { name: '🍖 Tout le Gibier (Chasse)', value: 'hunt' }
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
        // ✅ 2. GUILDID pour l'exécution
        const guildId = interactionOrMessage.guild.id;
        
        const replyFunc = (p) => interactionOrMessage.reply ? interactionOrMessage.reply(p) : interactionOrMessage.channel.send(p);
        
        let itemInput, amount;

        if (interactionOrMessage.isCommand?.()) {
            itemInput = interactionOrMessage.options.getString('objet');
            amount = interactionOrMessage.options.getInteger('quantité') || 1;
        } else {
            itemInput = args[0];
            amount = parseInt(args[1]) || 1;
        }

        if (!itemInput) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Précise quoi vendre.")] });

        // ✅ On récupère les données avec guildId
        const userData = await eco.get(user.id, guildId);
        
        // Sécurité conversion Map
        if (!userData.inventory) userData.inventory = new Map();
        else if (!(userData.inventory instanceof Map)) userData.inventory = new Map(Object.entries(userData.inventory));

        const input = itemInput.toLowerCase();

        // Fonction pour vendre en masse (catégories)
        const sellBatch = async (filterIds) => {
            let totalGain = 0;
            let count = 0;
            
            // On itère sur l'inventaire
            for (const [id, qty] of userData.inventory) {
                if (filterIds.includes(id)) {
                    const item = itemsDb.find(i => i.id === id);
                    if (item && item.sellPrice > 0) {
                        const gain = item.sellPrice * qty;
                        totalGain += gain;
                        count += qty;
                        // ✅ Ajout de guildId ici
                        await eco.removeItem(user.id, guildId, id, qty);
                    }
                }
            }
            return { totalGain, count };
        };

        // --- DÉFINITION DES GROUPES ---
        const fishIds = ['trash', 'fish', 'crab', 'trout', 'puffer', 'shark', 'treasure'];
        const mineIds = ['stone', 'coal', 'iron', 'gold', 'ruby', 'diamond', 'emerald'];
        const digIds = ['worm', 'potato', 'trash', 'bone', 'old_coin', 'capsule', 'skull', 'treasure', 'fossil', 'sarcophagus'];
        const huntIds = ['meat', 'rabbit', 'duck', 'boar', 'deer_antlers', 'bear'];
        const bitcoinIds = ['bitcoin']; 

        // On ajoute tout dans la liste globale pour le 'sell all'
        const allIds = [...fishIds, ...mineIds, ...digIds, ...huntIds, ...bitcoinIds, 'cookie', 'beer', 'pizza']; 
        const uniqueAllIds = [...new Set(allIds)];

        let result = { totalGain: 0, count: 0 };
        let msgStart = "";

        // --- LOGIQUE DE VENTE ---
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
        else if (input === 'hunt') {
            result = await sellBatch(huntIds);
            msgStart = "🍖 Ton gibier";
        }
        else {
            // Recherche de l'objet unique
            const item = itemsDb.find(i => i.id === input || i.name.toLowerCase().includes(input));
            
            if (!item) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Objet introuvable.")] });
            if (!item.sellPrice || item.sellPrice <= 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `**${item.name}** ne peut pas être vendu.`)] });

            const userQty = userData.inventory.get(item.id) || 0;
            if (userQty < amount) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `Tu n'as pas assez de **${item.name}** (Tu en as : ${userQty}).`)] });

            const gain = item.sellPrice * amount;
            
            // ✅ Ajout de guildId
            await eco.removeItem(user.id, guildId, item.id, amount);
            
            result = { totalGain: gain, count: amount };
            msgStart = `${amount}x ${item.icon} **${item.name}**`;
        }

        if (result.totalGain <= 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Rien à vendre correspondant à ta demande.")] });

        // ✅ Ajout de guildId
        await eco.addCash(user.id, guildId, result.totalGain);
        
        const embed = embeds.success(interactionOrMessage, "Vente effectuée", 
            `💰 **Vendu !**\n${msgStart} pour **${result.totalGain.toLocaleString('fr-FR')} €**.`
        );

        return replyFunc({ embeds: [embed] });
    }
};