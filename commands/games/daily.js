const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Récupère ta récompense quotidienne (+ Revenus Passifs)'),

    async execute(interactionOrMessage) {
        let user, replyFunc;
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

        const userData = await eco.get(user.id, guildId);
        const now = Date.now();

        // 1. SÉCURITÉ PRISON
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !**\nPas de revenus pour les détenus.\nLibération dans : **${timeLeft} minutes**.`)], ephemeral: true });
        }

        // 2. GESTION DU COOLDOWN (24h)
        const dailyCd = config.COOLDOWNS.DAILY || 86400000; 
        const lastDailyCd = userData.cooldowns.daily || 0;

        if (lastDailyCd > now) {
            const timeLeft = lastDailyCd - now;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            return replyFunc({ embeds: [embeds.warning(interactionOrMessage, "Déjà récupéré !", `⏳ Tes locataires dorment encore...\nReviens dans **${hours}h ${minutes}m**.`)] });
        }

        // 3. LOGIQUE DE SÉRIE (STREAK)
        const twoDays = 48 * 60 * 60 * 1000;
        const timeSinceLastClaim = now - (lastDailyCd - dailyCd);

        if (timeSinceLastClaim < twoDays) userData.streak = (userData.streak || 0) + 1;
        else userData.streak = 1;

        // 4. CALCUL DES GAINS
        const baseReward = 500;
        const streakBonus = (userData.streak - 1) * 200; // +200 par jour

        // --- 🏠 REVENUS PASSIFS (IMMOBILIER & LUXE) ---
        let passiveIncome = 0;
        let incomeSources = [];

        // Liste des objets qui rapportent de l'argent
        const incomeItems = [
            { id: 'tent', gain: 50, name: 'Tente' },
            { id: 'studio', gain: 200, name: 'Studio' },
            { id: 'apartment', gain: 500, name: 'Appartement' },
            { id: 'house', gain: 1500, name: 'Manoir' },
            { id: 'villa', gain: 3000, name: 'Villa' },
            { id: 'island', gain: 10000, name: 'Île Privée' },
            { id: 'space_station', gain: 25000, name: 'Station Spatiale' },
            { id: 'crown', gain: 5000, name: '👑 Couronne' } // Bonus Roi
        ];

        // On vérifie chaque item
        for (const item of incomeItems) {
            if (await eco.hasItem(user.id, guildId, item.id)) {
                passiveIncome += item.gain;
                incomeSources.push(item.name);
            }
        }

        const totalReward = baseReward + streakBonus + passiveIncome;

        // 5. SAUVEGARDE
        userData.cash += totalReward;
        userData.cooldowns.daily = now + dailyCd;
        await userData.save();

        const xpResult = await eco.addXP(user.id, guildId, 50);

        // 6. AFFICHAGE
        let desc = `💰 Base : **${baseReward} €**\n🔥 Série (${userData.streak}j) : **+${streakBonus} €**`;
        
        if (passiveIncome > 0) {
            // On affiche juste les 3 premières sources pour pas spammer l'embed si le mec a tout
            const sourcesDisplay = incomeSources.length > 3 ? `${incomeSources.slice(0, 3).join(', ')}...` : incomeSources.join(', ');
            desc += `\n\n🏘️ **Revenus Passifs :** +${passiveIncome} €\n*Grâce à : ${sourcesDisplay}*`;
        }

        desc += `\n\n💸 **TOTAL REÇU : +${totalReward.toLocaleString('fr-FR')} €**`;

        const embed = embeds.success(interactionOrMessage, '☀️ Revenus Quotidien', desc)
            .setColor(0xF1C40F)
            .setFooter({ text: `Solde : ${userData.cash.toLocaleString('fr-FR')} €` });

        let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : null;

        return replyFunc({ content: content, embeds: [embed] });
    }
};