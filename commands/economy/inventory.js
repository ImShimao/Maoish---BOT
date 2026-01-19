const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Affiche ton inventaire paginé')
        .addUserOption(o => o.setName('user').setDescription('Voir l\'inventaire d\'un autre')),

    async execute(interactionOrMessage, args) {
        let user, replyFunc;
        const guildId = interactionOrMessage.guild.id;
        
        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.options.getUser('user') || interactionOrMessage.user;
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.mentions.users.first() || interactionOrMessage.author;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // --- MOTEUR BOURSIER (Pour afficher la vraie valeur) ---
        // On récupère le prix actuel pour l'afficher correctement dans l'inventaire
        const getMarketPrice = (type) => {
            const marketStep = 20 * 60 * 1000;
            const seed = Math.floor(Date.now() / marketStep);
            const salt = type === 'bitcoin' ? 12345 : 67890;
            const input = seed + salt;
            let x = Math.sin(input) * 10000;
            const random = x - Math.floor(x);

            if (type === 'bitcoin') {
                if (random < 0.05) return Math.floor(1000 + (random * 5000));
                if (random > 0.95) return Math.floor(20000 + (random * 10000));
                return Math.floor(3000 + (random * 15000));
            } else { // Gold
                return Math.floor(40000 + (random * 20000));
            }
        };

        const currentBtcPrice = getMarketPrice('bitcoin');
        const currentGoldPrice = getMarketPrice('gold_bar');

        // --- RÉCUPÉRATION DONNÉES ---
        // ✅ Utilisation de getUser (et pas get)
        const data = await eco.getUser(user.id, guildId);
        
        if (!data.inventory) data.inventory = new Map();
        // Conversion Objet -> Map si nécessaire (sécurité BDD)
        if (!(data.inventory instanceof Map)) {
            data.inventory = new Map(Object.entries(data.inventory));
        }

        const inventoryArr = Array.from(data.inventory.entries()).filter(([id, qty]) => qty > 0);
        
        const itemsPerPage = 10;
        let page = 0;

        // --- CAS : SAC VIDE ---
        if (inventoryArr.length === 0) {
            return replyFunc({ 
                embeds: [embeds.info(interactionOrMessage, `🎒 Inventaire de ${user.username}`, "*Ton sac est vide... Va pêcher, miner ou investir en Bourse !*")] 
            });
        }

        // --- GÉNÉRATION DE L'EMBED ---
        const generateEmbed = (p) => {
            const start = p * itemsPerPage;
            const currentItems = inventoryArr.slice(start, start + itemsPerPage);
            let totalValue = 0;
            
            // Construction de la liste
            const desc = currentItems.map(([id, qty]) => {
                const item = itemsDb.find(i => i.id === id);
                
                // Valeurs par défaut
                let name = item ? item.name : id;
                let icon = item ? item.icon : '📦';
                let unitPrice = item ? item.sellPrice : 0;
                let isCrypto = false;

                // 🌟 DÉTECTION CRYPTO POUR PRIX DYNAMIQUE
                // On remplace le prix fixe (0) par le prix du marché
                if (id === 'bitcoin') {
                    unitPrice = currentBtcPrice;
                    icon = '🟠';
                    name = 'Bitcoin (Bourse)';
                    isCrypto = true;
                } else if (id === 'gold_bar') {
                    unitPrice = currentGoldPrice;
                    icon = '🟡';
                    name = 'Lingot d\'Or (Bourse)';
                    isCrypto = true;
                }

                const val = unitPrice * qty;
                totalValue += val;
                
                // Affichage spécial pour les cryptos (pour montrer que ça bouge)
                if (isCrypto) {
                    return `**${icon} ${name}** : \`x${qty}\` ≈ **${val.toLocaleString('fr-FR')} €** 📈`;
                } else {
                    return `**${icon} ${name}** : x${qty} \`(Val: ${val.toLocaleString('fr-FR')}€)\``;
                }
            }).join('\n');

            const totalFmt = totalValue.toLocaleString('fr-FR');
            const cashFmt = data.cash.toLocaleString('fr-FR');
            const bankFmt = data.bank.toLocaleString('fr-FR');

            return embeds.info(interactionOrMessage, `🎒 Inventaire de ${user.username}`, desc)
                .addFields({ 
                    name: '💳 Patrimoine', 
                    value: `Cash : **${cashFmt} €**\nBanque : **${bankFmt} €**\nValeur Sac : **${totalFmt} €**` 
                })
                .setFooter({ text: `Page ${p + 1}/${Math.ceil(inventoryArr.length / itemsPerPage)}` });
        };

        const generateRows = (currentPage) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
                new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled((currentPage + 1) * itemsPerPage >= inventoryArr.length)
            );
        };

        // --- ENVOI ---
        let msg;
        const payload = { embeds: [generateEmbed(0)], components: [generateRows(0)] };

        if (interactionOrMessage.isCommand?.()) {
            await interactionOrMessage.reply(payload);
            msg = await interactionOrMessage.fetchReply();
        } else {
            msg = await interactionOrMessage.channel.send(payload);
        }

        // --- COLLECTOR ---
        const collector = msg.createMessageComponentCollector({ 
            filter: i => i.user.id === (interactionOrMessage.user?.id || interactionOrMessage.author.id), 
            time: 60000 
        });

        collector.on('collect', async i => {
            try {
                await i.deferUpdate(); // Important pour la fluidité
                if (i.customId === 'prev') page--;
                if (i.customId === 'next') page++;

                await i.editReply({ 
                    embeds: [generateEmbed(page)], 
                    components: [generateRows(page)] 
                });
            } catch (e) { } // Anti-crash si le message est supprimé
        });
    }
};