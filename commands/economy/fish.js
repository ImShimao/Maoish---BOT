const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');

const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Aller à la pêche (30s de recharge)'),

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
            const expirationTime = cooldowns.get(user.id) + 30000;
            if (Date.now() < expirationTime) {
                const timeLeft = ((expirationTime - Date.now()) / 1000).toFixed(1);
                return replyFunc(`⏳ **Doucement !** Les poissons ont peur. Réessaie dans **${timeLeft} secondes**.`);
            }
        }

        // --- 3. VÉRIFICATION DE L'OUTIL (CORRIGÉ) ---
        // hasItem est maintenant async !
        const hasRod = await eco.hasItem(user.id, 'fishing_rod');
        if (!hasRod) {
            return replyFunc("❌ Il te faut une **Canne à Pêche** ! Va au `/shop`.");
        }

        cooldowns.set(user.id, Date.now());

        // --- 4. PROBABILITÉS ---
        const roll = Math.floor(Math.random() * 100);
        let itemId = '';
        let message = '';

        if (roll < 20) { 
             return replyFunc("🎣 *Tu attends...* Mais rien ne mord. 🍃");
        } 
        else if (roll < 40) {
            itemId = 'trash';
            message = "👢 Beurk ! Tu as remonté une **Vieille Botte**.";
        } 
        else if (roll < 75) {
            itemId = 'fish';
            message = "🐟 Pas mal ! C'est un petit **Gardon**.";
        } 
        else if (roll < 95) {
            itemId = 'trout';
            message = "✨ **Joli prise !** Une belle **Truite Saumonée** !";
        } 
        else {
            itemId = 'shark';
            message = "🦈 **ATTENTION !** Tu as remonté un **BÉBÉ REQUIN** !";
        }

        // --- 5. RÉCOMPENSE (CORRIGÉ) ---
        await eco.addItem(user.id, itemId);

        const itemInfo = itemsDb.find(i => i.id === itemId);
        const valueText = itemInfo ? `${itemInfo.sellPrice} €` : "??? €";
        
        replyFunc(`${message}\n*(Valeur estimée : ${valueText})*`);
    }
};