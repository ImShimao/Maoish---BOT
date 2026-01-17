const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Récupère ta récompense quotidienne avec bonus de série'),

    async execute(interactionOrMessage) {
        let user, replyFunc;
        // ✅ 1. DÉFINITION GUILDID
        const guildId = interactionOrMessage.guild.id;

        // --- GESTION HYBRIDE ---
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

        // ✅ Ajout de guildId
        const userData = await eco.get(user.id, guildId);
        const now = Date.now();

        // 1. SÉCURITÉ PRISON
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas de daily pour les détenus.\nLibération dans : **${timeLeft} minutes**.`)],
                ephemeral: true 
            });
        }

        // 2. GESTION DU COOLDOWN
        const dailyCd = config.COOLDOWNS.DAILY || 86400000; 
        const lastDailyCd = userData.cooldowns.daily || 0;

        if (lastDailyCd > now) {
            const timeLeft = lastDailyCd - now;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            return replyFunc({ 
                embeds: [embeds.warning(interactionOrMessage, "Déjà récupéré !", `⏳ Reviens dans **${hours}h ${minutes}m** pour ta prochaine paye.`)],
                ephemeral: true 
            });
        }

        // 3. LOGIQUE DE SÉRIE (STREAK)
        const twoDays = 48 * 60 * 60 * 1000;
        // On recule pour trouver le moment exact du dernier claim
        const timeSinceLastClaim = now - (lastDailyCd - dailyCd);

        if (timeSinceLastClaim < twoDays) {
            userData.streak = (userData.streak || 0) + 1;
        } else {
            userData.streak = 1;
        }

        // 4. RÉCOMPENSE ET XP
        const baseReward = 1000;
        const bonus = (userData.streak - 1) * 300; // +300€ par jour de série
        const totalReward = baseReward + bonus;

        userData.cash += totalReward;
        userData.cooldowns.daily = now + dailyCd;
        await userData.save();

        // Ajout d'XP (ex: 50 XP)
        // ✅ Ajout de guildId
        const xpResult = await eco.addXP(user.id, guildId, 50);

        // 5. AFFICHAGE
        const embed = embeds.success(interactionOrMessage, '☀️ Récompense Quotidienne',
            `Tu as reçu ta paye de **${totalReward.toLocaleString('fr-FR')} €** !\n\n` +
            `🔥 Série : **${userData.streak} jours**\n` +
            `✨ Bonus de série : +${bonus} €\n` +
            `⭐ XP gagné : **+50**`
        )
        .setColor(config.COLORS.ECONOMY || 0xF1C40F) // Or
        .setFooter({ text: `Solde : ${userData.cash.toLocaleString('fr-FR')} €` });

        // Petit message en plus si level up
        let content = "";
        if (xpResult.leveledUp) {
            content = `🎉 **FÉLICITATIONS ${user.username} !** Tu passes au **Niveau ${xpResult.newLevel}** !`;
        }

        return replyFunc({ content: content, embeds: [embed] });
    }
};