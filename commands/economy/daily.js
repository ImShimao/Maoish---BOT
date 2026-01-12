const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

// Stockage des temps en mémoire (User ID -> Timestamp)
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Récupère ton salaire quotidien (24h)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.isCommand?.() ? interactionOrMessage.user : interactionOrMessage.author;
        const replyFunc = interactionOrMessage.isCommand?.() ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        // --- GESTION COOLDOWN ---
        const cooldownTime = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
        const lastDaily = cooldowns.get(user.id);
        const now = Date.now();

        if (lastDaily && (now - lastDaily) < cooldownTime) {
            const timeLeft = cooldownTime - (now - lastDaily);
            
            // Conversion propre
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            return replyFunc(`⏱️ **Doucement !** Reviens dans **${hours}h et ${minutes}m** pour ton daily.`);
        }

        // --- ACTION ---
        const amount = 500; // Montant fixe
        eco.addCash(user.id, amount);
        
        // On enregistre l'heure actuelle
        cooldowns.set(user.id, now);

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('📆 Salaire Quotidien')
            .setDescription(`Tu as reçu **${amount} €** en cash ! 💸\nReviens demain.`)
            .setFooter({ text: 'Streak: 1 jour' });

        await replyFunc({ embeds: [embed] });
    }
};