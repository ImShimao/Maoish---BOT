const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Récupère ta récompense quotidienne avec bonus de série'),

    async execute(interactionOrMessage) {
        let user, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (p) => { 
                const { ephemeral, ...o } = p; 
                return await interactionOrMessage.channel.send(o); 
            };
        }

        const userData = await eco.get(user.id);
        const now = Date.now();

        // 1. SÉCURITÉ PRISON
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc({ content: `🔒 **Tu es en PRISON !** Pas de daily pour les détenus.\nLibération dans : **${timeLeft} minutes**.`, ephemeral: true });
        }

        // 2. GESTION DU COOLDOWN
        const dailyCd = config.COOLDOWNS.DAILY || 86400000; 
        const lastDailyCd = userData.cooldowns.daily || 0;

        if (lastDailyCd > now) {
            const timeLeft = lastDailyCd - now;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            return replyFunc({ content: `⏳ **Déjà récupéré !** Reviens dans **${hours}h ${minutes}m**.`, ephemeral: true });
        }

        // 3. LOGIQUE DE SÉRIE (STREAK)
        // Si le dernier claim date de moins de 48h, on continue la série, sinon reset à 1.
        const oneDay = 24 * 60 * 60 * 1000;
        const twoDays = 48 * 60 * 60 * 1000;
        const timeSinceLastClaim = now - (lastDailyCd - dailyCd);

        if (timeSinceLastClaim < twoDays) {
            userData.streak = (userData.streak || 0) + 1;
        } else {
            userData.streak = 1;
        }

        // 4. RÉCOMPENSE ET XP
        const baseReward = 500;
        const bonus = (userData.streak - 1) * 100; // +100€ par jour de série
        const totalReward = baseReward + bonus;

        userData.cash += totalReward;
        userData.cooldowns.daily = now + dailyCd;
        await userData.save();

        // Ajout d'XP (ex: 50 XP)
        const xpResult = await eco.addXP(user.id, 50);

        // 5. AFFICHAGE
        const embed = new EmbedBuilder()
            .setColor(config.COLORS.ECONOMY || 0xF1C40F)
            .setTitle('☀️ Récompense Quotidienne')
            .setDescription(
                `Tu as reçu ta paye de **${totalReward.toLocaleString('fr-FR')} €** !\n\n` +
                `🔥 Série : **${userData.streak} jours**\n` +
                `✨ Bonus de série : +${bonus} €\n` +
                `⭐ XP gagné : **+50**`
            )
            .setFooter({ text: `Solde : ${userData.cash.toLocaleString('fr-FR')} €` });

        // Petit message en plus si level up
        let content = "";
        if (xpResult.leveledUp) {
            content = `🎉 **FÉLICITATIONS ${user.username} !** Tu passes au **Niveau ${xpResult.newLevel}** !`;
        }

        return replyFunc({ content: content, embeds: [embed] });
    }
};