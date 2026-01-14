const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Travaille pour gagner un salaire (Recharge: 30 min)'),

    async execute(interactionOrMessage) {
        let user, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (p) => {
                const { ephemeral, ...options } = p; 
                return await interactionOrMessage.channel.send(options);
            };
        }

        const userData = await eco.get(user.id); 
        const now = Date.now();
        
        // --- 1. SÉCURITÉ PRISON ---
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc({ content: `🔒 **Hep là !** Tu es en prison, tu ne peux pas aller travailler.\nReviens dans **${timeLeft} minutes**.`, ephemeral: true });
        }

        // --- 2. COOLDOWN (Sécurisé) ---
        if (!userData.cooldowns) userData.cooldowns = {}; // Initialisation vitale

        const workCooldown = config.COOLDOWNS.WORK || 1800000; // 30 min par défaut

        if (userData.cooldowns.work > now) {
            const timeLeft = userData.cooldowns.work - now;
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            return replyFunc({ content: `⏳ **Repos !** Tu as déjà travaillé.\nReviens dans **${minutes}m ${seconds}s**.`, ephemeral: true });
        }

        // --- 3. SALAIRE & LOGIQUE ---
        userData.cooldowns.work = now + workCooldown;
        
        const gain = Math.floor(Math.random() * 150) + 50;
        userData.cash += gain; 
        
        // --- AJOUT XP & STATS ---
        await eco.addStat(user.id, 'works'); // Statistique 'works'
        const xpGain = Math.floor(Math.random() * 11) + 10; // 10 à 20 XP
        const xpResult = await eco.addXP(user.id, xpGain);
        
        await userData.save();

        const jobs = [
            "Livreur de pizzas (sans manger la commande)",
            "Éboueur de l'espace",
            "Développeur Discord (payé en nitro)",
            "Serveur au McDonald's",
            "Jardinier de l'Élysée",
            "Testeur de canapés professionnels",
            "Doubleur de voix pour chats",
            "Nettoyeur d'historique Internet",
            "Chauffeur de bus scolaire",
            "Maçon (tu as construit un mur de travers)",
            "Vendeur de tapis volants",
            "Goûteur de nourriture pour chien",
            "Professeur de sieste",
            "Dresseur de Pokémon",
            "Influenceur Instagram (tu as fait un placement de produit)",
            "Pêcheur de canards en plastique",
            "Réparateur d'ascenseurs (c'est un métier qui a des hauts et des bas)",
            "Coiffeur pour chauves",
            "Clown d'anniversaire (les enfants ont pleuré)",
            "Vendeur de glaces en Alaska"
        ];
        const job = jobs[Math.floor(Math.random() * jobs.length)];

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.SUCCESS || 0x2ECC71) 
            .setTitle('💼 Travail terminé')
            .setDescription(`Tu as travaillé comme **${job}**.\n\n💰 Salaire : **${gain} €**\n✨ XP : **+${xpGain}**`)
            .setFooter({ text: `Solde : ${userData.cash} €` });

        // Notification Level Up
        let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : "";
        
        return replyFunc({ content: content, embeds: [embed] });
    }
};