const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Travaille pour gagner un salaire (Recharge: 10 min)'),

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

        // --- 1. SÉCURITÉ PRISON ---
        const userData = await eco.get(user.id); 
        
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc({ content: `🔒 **Hep là !** Tu es en prison, tu ne peux pas aller travailler.\nReviens dans **${timeLeft} minutes**.`, ephemeral: true });
        }

        // --- 2. COOLDOWN (Anti-Spam) ---
        const workCooldown = 10 * 60 * 1000; // 10 minutes
        const now = Date.now();

        if (userData.cooldowns && userData.cooldowns.work > now) {
            const timeLeft = userData.cooldowns.work - now;
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            return replyFunc({ content: `⏳ **Repos !** Tu as déjà travaillé.\nReviens dans **${minutes}m ${seconds}s**.`, ephemeral: true });
        }

        // --- 3. SALAIRE & SCÉNARIOS ---
        
        // Mise à jour du cooldown
        if (!userData.cooldowns) userData.cooldowns = {};
        userData.cooldowns.work = now + workCooldown;
        
        // Calcul du gain (entre 50 et 200)
        const gain = Math.floor(Math.random() * 150) + 50;
        userData.cash += gain; 
        
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
            .setColor(0x2ECC71) // Vert
            .setTitle('💼 Travail terminé')
            .setDescription(`Tu as travaillé comme **${job}** et tu as gagné **${gain} €** !`)
            .setFooter({ text: `Nouveau solde : ${userData.cash} €` });

        return replyFunc({ embeds: [embed] });
    }
};