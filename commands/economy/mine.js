const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');

const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Miner des ressources (1m de recharge)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const replyFunc = interactionOrMessage.reply ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        // --- 1. Vérif Prison (CORRIGÉ) ---
        if (await eco.isJailed(user.id)) {
            const userData = await eco.get(user.id);
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 1000 / 60);
            return replyFunc(`🔒 **Tu es en PRISON !** Réfléchis à tes actes encore **${timeLeft} minutes**.`);
        }

        // --- 2. COOLDOWN ---
        if (cooldowns.has(user.id)) {
            const expirationTime = cooldowns.get(user.id) + 60000;
            if (Date.now() < expirationTime) {
                const timeLeft = ((expirationTime - Date.now()) / 1000).toFixed(0);
                return replyFunc(`⏳ **Repos !** Tes bras sont fatigués. Reviens dans **${timeLeft} secondes**.`);
            }
        }

        // --- 3. VÉRIFICATION DE L'OUTIL (CORRIGÉ) ---
        if (!await eco.hasItem(user.id, 'pickaxe')) {
            return replyFunc("❌ **Impossible de creuser avec tes ongles !**\nAchète une `⛏️ Pioche` au `/shop`.");
        }

        cooldowns.set(user.id, Date.now());

        // --- 4. LOOT ---
        const rand = Math.random();
        let itemId = '';
        let message = '';

        if (rand < 0.30) { itemId = 'stone'; message = "🪨 Tu as trouvé une simple **Pierre**."; }
        else if (rand < 0.70) { itemId = 'coal'; message = "🌑 Tu as trouvé un filon de **Charbon**."; }
        else if (rand < 0.90) { itemId = 'gold'; message = "⚜️ **Brillant !** Tu as trouvé une **Pépite d'Or** !"; }
        else if (rand < 0.99) { itemId = 'diamond'; message = "💎 **JACKPOT !** Tu as déterré un **DIAMANT** brut !!"; }
        else { return replyFunc("💥 **Aïe !** La mine s'est effondrée. Tu n'as rien trouvé."); }

        if (!itemsDb.find(i => i.id === itemId)) itemId = 'stone';

        // Ajout item (CORRIGÉ)
        await eco.addItem(user.id, itemId);

        const itemInfo = itemsDb.find(i => i.id === itemId);
        const valueText = itemInfo ? `${itemInfo.sellPrice} €` : "??? €";

        replyFunc(`${message}\n*(Valeur estimée : ${valueText})*`);
    }
};