const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Travaille pour gagner un peu d\'argent (30 min)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const replyFunc = interactionOrMessage.reply ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        // --- 1. Vérif Prison (CORRIGÉ AVEC AWAIT) ---
        // On attend la réponse de la DB
        const isJailed = await eco.isJailed(user.id);
        
        if (isJailed) {
            // On doit aussi attendre pour récupérer les données du user (jailEnd)
            const userData = await eco.get(user.id);
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 1000 / 60);
            return replyFunc(`🔒 **Tu es en PRISON !** Réfléchis à tes actes encore **${timeLeft} minutes**.`);
        }
        
        // --- GESTION COOLDOWN (30 min) ---
        const cooldownTime = 30 * 60 * 1000; 
        const lastWork = cooldowns.get(user.id);
        const now = Date.now();

        if (lastWork && (now - lastWork) < cooldownTime) {
            const timeLeft = cooldownTime - (now - lastWork);
            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            return replyFunc(`😫 **Tu es fatigué !** Repose-toi encore **${minutes}m ${seconds}s**.`);
        }

        // --- SALAIRE ALÉATOIRE ---
        const salary = Math.floor(Math.random() * 150) + 50; // Entre 50 et 200€
        
        const jobs = [
            "Tu as nettoyé les toilettes du casino 🚽",
            "Tu as servi des verres aux VIP 🍸",
            "Tu as réparé la machine à sous 🎰",
            "Tu as fait la sécurité à l'entrée 👮",
            "Tu as compté les jetons toute la nuit 🪙"
        ];
        const job = jobs[Math.floor(Math.random() * jobs.length)];

        // IMPORTANT : Await ici aussi pour ajouter l'argent
        await eco.addCash(user.id, salary);
        
        cooldowns.set(user.id, now);

        const embed = new EmbedBuilder()
            .setColor(0x3498DB) // Bleu
            .setDescription(`**${job}**\n\nSalaire : **+${salary} €** (Cash)`);

        await replyFunc({ embeds: [embed] });
    }
};