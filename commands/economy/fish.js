const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');

// On stocke les cooldowns en mémoire (Map)
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Aller à la pêche (30s de recharge)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const replyFunc = interactionOrMessage.reply ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        // 1. Vérif Prison
        if (eco.isJailed(user.id)) {
            const timeLeft = Math.ceil((eco.get(user.id).jailEnd - Date.now()) / 1000 / 60);
            return replyFunc(`🔒 **Tu es en PRISON !** Réfléchis à tes actes encore **${timeLeft} minutes**.`);
        }
        // --- 1. GESTION DU COOLDOWN (30 secondes) ---
        if (cooldowns.has(user.id)) {
            const expirationTime = cooldowns.get(user.id) + 30000; // 30s en ms
            if (Date.now() < expirationTime) {
                const timeLeft = ((expirationTime - Date.now()) / 1000).toFixed(1);
                return replyFunc(`⏳ **Doucement !** Les poissons ont peur. Réessaie dans **${timeLeft} secondes**.`);
            }
        }

        // --- 2. VÉRIFICATION DE L'OUTIL ---
        if (!eco.hasItem(user.id, 'fishing_rod')) {
            return replyFunc("❌ Il te faut une **Canne à Pêche** ! Va au `/shop`.");
        }

        // On active le cooldown maintenant
        cooldowns.set(user.id, Date.now());

        // --- 3. PROBABILITÉS ---
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

        // --- 4. RÉCOMPENSE & AFFICHAGE PRIX ---
        eco.addItem(user.id, itemId);

        // On cherche l'item pour afficher son prix, avec une sécurité
        const itemInfo = itemsDb.find(i => i.id === itemId);
        const valueText = itemInfo ? `${itemInfo.sellPrice} €` : "??? €";
        
        replyFunc(`${message}\n*(Valeur estimée : ${valueText})*`);
    }
};