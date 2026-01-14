const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Récupère ta récompense quotidienne'),

    async execute(interactionOrMessage) {
        let user, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (p) => { const { ephemeral, ...o } = p; return await interactionOrMessage.channel.send(o); };
        }

        // --- SÉCURITÉ PRISON ---
        const userData = await eco.get(user.id);
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc({ content: `🔒 **Tu es en PRISON !** Pas de daily pour les détenus.\nLibération dans : **${timeLeft} minutes**.`, ephemeral: true });
        }

        // --- LOGIQUE DAILY ---
        const dailyCd = 24 * 60 * 60 * 1000; // 24 heures
        const lastDaily = userData.daily || 0;
        const now = Date.now();

        if (now - lastDaily < dailyCd) {
            const timeLeft = dailyCd - (now - lastDaily);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            return replyFunc({ content: `⏳ **Déjà récupéré !** Reviens dans **${hours}h ${minutes}m**.`, ephemeral: true });
        }

        const reward = 500; // Montant du daily
        userData.cash += reward;
        userData.daily = now;
        await userData.save();

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
            .setColor(0xF1C40F)
            .setTitle('☀️ Récompense Quotidienne')
            .setDescription(`${randomMsg} **${reward} €** !`)
            .setFooter({ text: `Solde : ${userData.cash} €` });

        return replyFunc({ embeds: [embed] });
    }
};