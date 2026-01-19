const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js');

// 🚫 LISTE DES OBJETS INTERDITS À LA VENTE CLASSIQUE (Bourse uniquement)
const BOURSE_ITEMS = ['bitcoin', 'gold_bar'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Vendre des objets (sauf Crypto/Or)')
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
            const guildId = interaction.guild.id;
            const userData = await eco.getUser(interaction.user.id, guildId);
            
            let inventory = new Map();
            if (userData && userData.inventory) {
                inventory = userData.inventory instanceof Map ? userData.inventory : new Map(Object.entries(userData.inventory));
            }

            const focusedValue = interaction.options.getFocused().toLowerCase();
            
            let choices = Array.from(inventory.keys())
                // 🚫 ON FILTRE LES ITEMS DE BOURSE ICI
                .filter(id => !BOURSE_ITEMS.includes(id)) 
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

        // 🚫 PROTECTION MANUELLE
        if (BOURSE_ITEMS.includes(itemInput.toLowerCase())) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "Action impossible", 
                `❌ Tu ne peux pas vendre **${itemInput}** ici !\n👉 Utilise la commande \`/bourse vendre\` pour trader au prix du marché.`)] 
            });
        }

        const userData = await eco.getUser(user.id, guildId);
        
        if (!userData.inventory) userData.inventory = new Map();
        else if (!(userData.inventory instanceof Map)) userData.inventory = new Map(Object.entries(userData.inventory));

        const input = itemInput.toLowerCase();

        const sellBatch = async (filterIds) => {
            let totalGain = 0;
            let count = 0;
            
            for (const [id, qty] of userData.inventory) {
                // 🚫 ON S'ASSURE DE NE PAS VENDRE DE BITCOIN MÊME AVEC "ALL"
                if (filterIds.includes(id) && !BOURSE_ITEMS.includes(id)) {
                    const item = itemsDb.find(i => i.id === id);
                    if (item && item.sellPrice > 0) {
                        const gain = item.sellPrice * qty;
                        totalGain += gain;
                        count += qty;
                        await eco.removeItem(user.id, guildId, id, qty);
                    }
                }
            }
            return { totalGain, count };
        };

        // --- GROUPES ---
        const fishIds = ['trash', 'fish', 'crab', 'trout', 'puffer', 'shark', 'treasure'];
        // On garde les minerais classiques, mais on fait gaffe à l'Or si c'est le même ID
        const mineIds = ['stone', 'coal', 'iron', 'ruby', 'diamond', 'emerald']; 
        // Note: Si 'gold' est ton minerai et 'gold_bar' est l'item de bourse, c'est bon. 
        // Si tu utilises le même ID pour les deux, il faut choisir ! 
        // (Dans items.js tu as 'gold' (pépite) et 'gold_bar' (lingot) ? Si oui c'est ok).

        const digIds = ['worm', 'potato', 'trash', 'bone', 'old_coin', 'capsule', 'skull', 'treasure', 'fossil', 'sarcophagus'];
        const huntIds = ['meat', 'rabbit', 'duck', 'boar', 'deer_antlers', 'bear'];

        // On construit la liste "ALL" en excluant explicitement la Bourse
        const allIds = [...fishIds, ...mineIds, ...digIds, ...huntIds, 'cookie', 'beer', 'pizza']
            .filter(id => !BOURSE_ITEMS.includes(id)); 
        
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
        else if (input === 'hunt') {
            result = await sellBatch(huntIds);
            msgStart = "🍖 Ton gibier";
        }
        else {
            const item = itemsDb.find(i => i.id === input || i.name.toLowerCase().includes(input));
            
            if (!item) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Objet introuvable.")] });
            
            // Re-vérification de sécurité
            if (BOURSE_ITEMS.includes(item.id)) {
                return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Va voir la bourse !")] });
            }

            if (!item.sellPrice || item.sellPrice <= 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `**${item.name}** ne peut pas être vendu.`)] });

            const userQty = userData.inventory.get(item.id) || 0;
            if (userQty < amount) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `Tu n'as pas assez de **${item.name}** (Tu en as : ${userQty}).`)] });

            const gain = item.sellPrice * amount;
            
            await eco.removeItem(user.id, guildId, item.id, amount);
            
            result = { totalGain: gain, count: amount };
            msgStart = `${amount}x ${item.icon} **${item.name}**`;
        }

        if (result.totalGain <= 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Rien à vendre correspondant à ta demande.")] });

        await eco.addCash(user.id, guildId, result.totalGain);
        
        const embed = embeds.success(interactionOrMessage, "Vente effectuée", 
            `💰 **Vendu !**\n${msgStart} pour **${result.totalGain.toLocaleString('fr-FR')} €**.`
        );

        return replyFunc({ embeds: [embed] });
    }
};