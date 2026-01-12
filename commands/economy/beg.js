const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('beg')
        .setDescription('Mendier un peu d\'argent'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.isCommand?.() ? interactionOrMessage.user : interactionOrMessage.author;
        const replyFunc = interactionOrMessage.isCommand?.() ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        // --- COOLDOWN (5 minutes) ---
        // Note: Beg utilise un Map temporaire (reset au redémarrage), contrairement à Work/Daily.
        const cooldownTime = 5 * 60 * 1000;
        const lastBeg = cooldowns.get(user.id);
        const now = Date.now();

        if (lastBeg && (now - lastBeg) < cooldownTime) {
            const minutes = Math.floor((cooldownTime - (now - lastBeg)) / 60000);
            return replyFunc(`⏱️ **Patience !** Reviens mendier dans ${minutes} minutes.`);
        }

        cooldowns.set(user.id, now);

        // --- ACTION ---
        const success = Math.random() < 0.3; // 30% de chance

        if (success) {
            const amount = Math.floor(Math.random() * 40) + 10;
            
            // C'est ici qu'il y avait la faute (awaiteco -> await eco)
            await eco.addCash(user.id, amount); 
            
            const goodReplies = ["Un passant généreux t'a donné", "Tu as trouvé par terre", "Grand-mère t'a glissé"];
            const randomText = goodReplies[Math.floor(Math.random() * goodReplies.length)];

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setDescription(`💰 **${randomText} ${amount} €** !`);
                
            replyFunc({ embeds: [embed] });
        } else {
            const badReplies = ["Va travailler !", "Je n'ai pas de monnaie.", "Laisse-moi tranquille."];
            const randomText = badReplies[Math.floor(Math.random() * badReplies.length)];
            replyFunc(`❌ **${randomText}** (Rien gagné)`);
        }
    }
};