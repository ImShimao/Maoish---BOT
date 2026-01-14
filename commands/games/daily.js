const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Récupère ta récompense quotidienne'),

    async execute(interactionOrMessage) {
        let user, replyFunc;

        // --- GESTION HYBRIDE (SLASH / PREFIX) ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            // On nettoie les options spécifiques aux Slash Commands pour éviter les erreurs
            replyFunc = async (p) => { 
                const { ephemeral, ...o } = p; 
                return await interactionOrMessage.channel.send(o); 
            };
        }

        // --- 1. SÉCURITÉ PRISON ---
        const userData = await eco.get(user.id);
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc({ content: `🔒 **Tu es en PRISON !** Pas de daily pour les détenus.\nLibération dans : **${timeLeft} minutes**.`, ephemeral: true });
        }

        // --- 2. GESTION DU COOLDOWN ---
        // On s'assure que l'objet cooldowns existe (sécurité pour les vieux comptes)
        if (!userData.cooldowns) userData.cooldowns = {};

        // Récupération de la durée depuis la config (Défaut : 24h)
        const dailyCd = config.COOLDOWNS.DAILY || 86400000; 
        const lastDaily = userData.cooldowns.daily || 0;
        const now = Date.now();

        // Si le temps n'est pas écoulé
        if (lastDaily > now) {
            const timeLeft = lastDaily - now;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            return replyFunc({ content: `⏳ **Déjà récupéré !** Reviens dans **${hours}h ${minutes}m ${seconds}s**.`, ephemeral: true });
        }

        // --- 3. RÉCOMPENSE ---
        const reward = 500; // Tu peux changer le montant ici si tu veux
        
        // Mise à jour du solde et du cooldown
        userData.cash += reward;
        userData.cooldowns.daily = now + dailyCd;
        
        await userData.save();

        // --- 4. MESSAGES FUNS ---
        const messages = [
            "Voici ton argent de poche :",
            "C'est jour de paie ! Tu reçois",
            "La banque s'est trompée en ta faveur de",
            "Tu as trouvé un sac d'argent contenant",
            "Un héritage d'un oncle lointain t'apporte",
            "Tu as gagné au loto (enfin presque) :",
            "Une pluie de billets ! Tu ramasses",
            "Le gouvernement t'offre une prime de",
            "Tu as braqué ta propre tirelire :",
            "Cadeau de la maison :",
            "L'argent ne fait pas le bonheur, mais voici quand même",
            "Tiens, achète-toi un truc sympa avec",
            "Rémunération pour avoir survécu 24h de plus :"
        ];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.ECONOMY || 0xF1C40F)
            .setTitle('☀️ Récompense Quotidienne')
            .setDescription(`${randomMsg} **${reward} €** !`)
            .setFooter({ text: `Nouveau solde : ${userData.cash} €` });

        return replyFunc({ embeds: [embed] });
    }
};