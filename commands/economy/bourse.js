const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bourse')
        .setDescription('Investis dans le Bitcoin et l\'Or (Les prix changent toutes les 20 min)')
        .addSubcommand(sub => 
            sub.setName('voir')
               .setDescription('Affiche les cours actuels avec statistiques'))
        .addSubcommand(sub => 
            sub.setName('acheter')
               .setDescription('Acheter des actifs')
               .addStringOption(o => o.setName('actif').setDescription('Quoi acheter ?').setRequired(true)
                   .addChoices({ name: 'Bitcoin (BTC)', value: 'bitcoin' }, { name: 'Lingot d\'Or (GOLD)', value: 'gold_bar' }))
               .addIntegerOption(o => o.setName('quantité').setDescription('Combien ?').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => 
            sub.setName('vendre')
               .setDescription('Vendre tes actifs')
               .addStringOption(o => o.setName('actif').setDescription('Quoi vendre ?').setRequired(true)
                   .addChoices({ name: 'Bitcoin (BTC)', value: 'bitcoin' }, { name: 'Lingot d\'Or (GOLD)', value: 'gold_bar' }))
               .addIntegerOption(o => o.setName('quantité').setDescription('Combien ?').setRequired(true).setMinValue(1))),

    async execute(interactionOrMessage, args) {
        let user, subcommand, asset, qty, replyFunc;
        // ✅ 1. RÉCUPÉRATION DU GUILDID
        const guildId = interactionOrMessage.guild.id;

        // --- GESTION HYBRIDE (Slash / Message) ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            subcommand = interactionOrMessage.options.getSubcommand();
            asset = interactionOrMessage.options.getString('actif');
            qty = interactionOrMessage.options.getInteger('quantité');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            subcommand = args[0] || 'voir';
            asset = args[1]?.toLowerCase();
            qty = parseInt(args[2]) || 1;
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);

            if (['buy', 'ach'].includes(subcommand)) subcommand = 'acheter';
            if (['sell', 'vente'].includes(subcommand)) subcommand = 'vendre';
            if (['view', 'info'].includes(subcommand)) subcommand = 'voir';
            
            if (asset === 'btc') asset = 'bitcoin';
            if (asset === 'or' || asset === 'gold') asset = 'gold_bar';
        }

        // --- MOTEUR BOURSIER ---
        const marketStep = 20 * 60 * 1000; // 20 minutes
        const currentTime = Date.now();
        const currentSeed = Math.floor(currentTime / marketStep);

        const getPrice = (seed, type) => {
            const salt = type === 'bitcoin' ? 12345 : 67890;
            const input = seed + salt;
            let x = Math.sin(input) * 10000;
            const random = x - Math.floor(x);

            if (type === 'bitcoin') {
                if (random < 0.05) return Math.floor(1000 + (random * 5000)); // Krach
                if (random > 0.95) return Math.floor(20000 + (random * 10000)); // Moon
                return Math.floor(3000 + (random * 15000));
            } else {
                return Math.floor(40000 + (random * 20000));
            }
        };

        // --- GRAPHIQUE ---
        const getGraph = (seed, type) => {
            const history = [];
            for (let i = 5; i >= 0; i--) {
                history.push(getPrice(seed - i, type));
            }
            
            const min = Math.min(...history);
            const max = Math.max(...history);
            const range = max - min || 1;

            const chars = ['_', ' ', '▂', '▃', '▅', '▆', '▇', '█'];
            
            return history.map(p => {
                const normalized = (p - min) / range;
                const charIndex = Math.floor(normalized * (chars.length - 1));
                return chars[charIndex];
            }).join('');
        };

        // --- BARRE DE PROGRESSION (CORRIGÉE) ---
        const getProgressBar = (current, min, max) => {
            const total = 10;
            
            // Calcul de la position
            let progress = Math.floor(((current - min) / (max - min)) * total);

            // SÉCURITÉ : On bloque le point aux extrémités si le prix explose
            if (progress < 0) progress = 0;
            if (progress >= total) progress = total - 1;

            let bar = '';
            for (let i = 0; i < total; i++) {
                if (i === progress) bar += '🔵'; // Curseur
                else bar += '▬';
            }
            return `\`${min/1000}k ${bar} ${max/1000}k\``;
        };

        // Calculs des prix
        const btcPrice = getPrice(currentSeed, 'bitcoin');
        const prevBtcPrice = getPrice(currentSeed - 1, 'bitcoin');
        const goldPrice = getPrice(currentSeed, 'gold_bar');
        const prevGoldPrice = getPrice(currentSeed - 1, 'gold_bar');

        const getVariation = (current, prev) => {
            const diff = current - prev;
            const percent = ((diff / prev) * 100).toFixed(2);
            const symbol = diff >= 0 ? '+' : '';
            const emoji = diff >= 0 ? '🟢' : '🔻';
            return { diff, percent, symbol, emoji };
        };

        const btcVar = getVariation(btcPrice, prevBtcPrice);
        const goldVar = getVariation(goldPrice, prevGoldPrice);

        const nextUpdate = (currentSeed + 1) * marketStep;
        const timeLeftMin = Math.ceil((nextUpdate - currentTime) / 60000);

        // --- LOGIQUE DES COMMANDES ---

        // === VOIR ===
        if (subcommand === 'voir') {
            const userData = await eco.getUser(user.id, guildId);
            const inventory = userData.inventory || {};
            
            const userBtc = (inventory instanceof Map ? inventory.get('bitcoin') : inventory.bitcoin) || 0;
            const userGold = (inventory instanceof Map ? inventory.get('gold_bar') : inventory.gold_bar) || 0;
            const totalValue = (userBtc * btcPrice) + (userGold * goldPrice);

            // Design Sexy
            const btcGraphStr = getGraph(currentSeed, 'bitcoin');
            const goldGraphStr = getGraph(currentSeed, 'gold_bar');

            // Formatage des nombres
            const f = (n) => n.toLocaleString('fr-FR');

            const embed = embeds.info(interactionOrMessage, '📊 Maoish Exchange', 
                `⏱️ Actualisation dans **${timeLeftMin} min**\n`
            )
            .addFields(
                { 
                    name: `🟠 Bitcoin (BTC) ${btcGraphStr}`,
                    value: `> Prix : **${f(btcPrice)} €** \`${btcVar.symbol}${btcVar.percent}%\` ${btcVar.emoji}\n` +
                           `> Tendance : ${getProgressBar(btcPrice, 2000, 20000)}\n` +
                           `> *Portefeuille :* \`${userBtc} BTC\` *(${f(userBtc * btcPrice)} €)*`,
                    inline: false 
                },
                { 
                    name: `🟡 Lingot d'Or (GOLD) ${goldGraphStr}`,
                    value: `> Prix : **${f(goldPrice)} €** \`${goldVar.symbol}${goldVar.percent}%\` ${goldVar.emoji}\n` +
                           `> Tendance : ${getProgressBar(goldPrice, 40000, 60000)}\n` +
                           `> *Portefeuille :* \`${userGold} GOLD\` *(${f(userGold * goldPrice)} €)*`,
                    inline: false 
                },
                {
                    name: '💼 Valeur Totale Portefeuille',
                    value: `\`\`\`fix\n${f(totalValue)} €\`\`\``,
                    inline: true
                }
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3314/3314389.png')
            .setColor(0x2B2D31);

            return replyFunc({ embeds: [embed] });
        }

        // === ACHETER ===
        if (subcommand === 'acheter') {
            if (!['bitcoin', 'gold_bar'].includes(asset)) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Actif inconnu", "Dispo : `bitcoin`, `gold_bar`")] });

            const priceUnit = asset === 'bitcoin' ? btcPrice : goldPrice;
            const totalPrice = priceUnit * qty;
            const itemName = asset === 'bitcoin' ? 'Bitcoin' : "Lingot d'Or";

            const userData = await eco.getUser(user.id, guildId);

            if (userData.cash < totalPrice) {
                return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Fonds insuffisants", `Requis : **${totalPrice.toLocaleString()} €**\nActuel : ${userData.cash.toLocaleString()} €`)] });
            }

            await eco.addCash(user.id, guildId, -totalPrice);
            await eco.addItem(user.id, guildId, asset, qty);

            return replyFunc({ 
                embeds: [embeds.success(interactionOrMessage, "✅ Achat Effectué", 
                    `Tu as acheté **${qty}x ${itemName}**\n` +
                    `💸 Montant débité : **${totalPrice.toLocaleString()} €**\n` +
                    `📉 Prix unitaire : \`${priceUnit.toLocaleString()} €\``)] 
            });
        }

        // === VENDRE ===
        if (subcommand === 'vendre') {
            if (!['bitcoin', 'gold_bar'].includes(asset)) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Actif inconnu", "Dispo : `bitcoin`, `gold_bar`")] });

            const priceUnit = asset === 'bitcoin' ? btcPrice : goldPrice;
            const totalPrice = priceUnit * qty;
            const itemName = asset === 'bitcoin' ? 'Bitcoin' : "Lingot d'Or";

            if (!await eco.hasItem(user.id, guildId, asset, qty)) {
                return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Stock insuffisant", `Tu n'as pas assez de **${itemName}**.`)] });
            }

            await eco.removeItem(user.id, guildId, asset, qty);
            await eco.addCash(user.id, guildId, totalPrice);

            return replyFunc({ 
                embeds: [embeds.success(interactionOrMessage, "✅ Vente Effectuée", 
                    `Tu as vendu **${qty}x ${itemName}**\n` +
                    `💰 Gain crédité : **+${totalPrice.toLocaleString()} €**\n` +
                    `📈 Prix unitaire : \`${priceUnit.toLocaleString()} €\``)] 
            });
        }
    }
};