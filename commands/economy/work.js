const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Travaille pour gagner un peu d\'argent (30 min)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const replyFunc = interactionOrMessage.reply ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        // Récupération des données utilisateur
        const userData = await eco.get(user.id);

        // --- 1. VÉRIF PRISON ---
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 1000 / 60);
            return replyFunc(`🔒 **Tu es en PRISON !** Réfléchis à tes actes encore **${timeLeft} minutes**.`);
        }
        
        // --- 2. GESTION COOLDOWN (Via MongoDB) ---
        const cooldownTime = 30 * 60 * 1000; // 30 minutes
        const now = Date.now();

        // On vérifie si le délai est dépassé dans la base de données
        if (userData.cooldowns.work > now) {
            const timeLeft = userData.cooldowns.work - now;
            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            return replyFunc(`😫 **Tu es fatigué !** Repose-toi encore **${minutes}m ${seconds}s**.`);
        }

        // --- 3. LE TRAVAIL ---
        const salary = Math.floor(Math.random() * 150) + 50; // Entre 50 et 200€
        
        const jobs = [
            "Tu as nettoyé les toilettes du casino 🚽",
            "Tu as servi des verres aux VIP 🍸",
            "Tu as réparé la machine à sous 🎰",
            "Tu as fait la sécurité à l'entrée 👮",
            "Tu as compté les jetons toute la nuit 🪙"
        ];
        const job = jobs[Math.floor(Math.random() * jobs.length)];

        // --- 4. SAUVEGARDE ---
        // On met à jour le délai ET l'argent
        userData.cash += salary;
        userData.cooldowns.work = now + cooldownTime;
        
        // On sauvegarde tout d'un coup
        await userData.save();

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setDescription(`**${job}**\n\nSalaire : **+${salary} €** (Cash)`);

        await replyFunc({ embeds: [embed] });
    }
};