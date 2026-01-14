const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('braquage')
        .setDescription('Tente de braquer la Réserve Fédérale (Requis: 🧨 C4)'),

    async execute(interactionOrMessage) {
        // --- GESTION HYBRIDE ---
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const replyFunc = interactionOrMessage.isCommand?.() 
            ? (p) => interactionOrMessage.reply(p) 
            : (p) => { const { ephemeral, ...o } = p; return interactionOrMessage.channel.send(o); };

        const userData = await eco.get(user.id);
        
        // On récupère les infos de la réserve
        const policeData = await eco.get('police_treasury');
        const cagnotte = policeData.bank;

        const now = Date.now();

        // 1. VÉRIF PRISON
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc({ content: `🔒 **Tu es en prison !** Reviens dans ${timeLeft} min.`, ephemeral: true });
        }

        // 2. VÉRIF COOLDOWN
        if (!userData.cooldowns) userData.cooldowns = {};
        
        // On récupère le temps dans la config OU on met 12h par défaut
        const heistCooldown = config.COOLDOWNS.HEIST || 12 * 60 * 60 * 1000; 
        
        // ⚠️ CORRECTION IMPORTANTE : On utilise la clé 'braquage' pour être cohérent avec le schéma
        if (userData.cooldowns.braquage && userData.cooldowns.braquage > now) {
            const timeLeft = Math.ceil((userData.cooldowns.braquage - now) / (1000 * 60 * 60)); // En heures
            return replyFunc({ content: `⏳ **Le FBI est sur les dents !** Fais-toi oublier pendant encore **${timeLeft} heures**.`, ephemeral: true });
        }

        // 3. VÉRIF ITEM (C4)
        if (!await eco.hasItem(user.id, 'c4')) {
             return replyFunc({ content: "❌ **Mur blindé !** Il te faut du `🧨 C4` (dispo au shop) pour faire sauter le coffre !", ephemeral: true });
        }

        // 4. VÉRIF CAGNOTTE
        if (cagnotte < 10000) {
            return replyFunc({ content: `📉 **Coffre vide...** La réserve ne contient que **${cagnotte.toLocaleString('fr-FR')} €**. Ça ne vaut pas le risque (Min: 10 000 €).`, ephemeral: true });
        }

        // --- DÉBUT DU BRAQUAGE ---
        // ✅ ON APPLIQUE LE COOLDOWN MAINTENANT (Avant le résultat)
        // Comme ça, réussite ou échec, le joueur doit attendre.
        userData.cooldowns.braquage = now + heistCooldown;
        await userData.save();
        
        // On consomme le C4
        await eco.removeItem(user.id, 'c4');

        // Chance de réussite : 25%
        const success = Math.random() < 0.25;

        if (success) {
            // --- RÉUSSITE ---
            const gain = Math.floor(cagnotte * 0.30);
            
            await eco.addBank('police_treasury', -gain);
            await eco.addCash(user.id, gain);
            
            await eco.addStat(user.id, 'crimes');
            const xpRes = await eco.addXP(user.id, 200);

            const embed = new EmbedBuilder()
                .setColor(0xF1C40F) // Or
                .setTitle('🏦 BRAQUAGE RÉUSSI !')
                .setDescription(`💥 **BOOM !** Le coffre s'est ouvert !\n\n💰 Tu t'enfuis avec **${gain.toLocaleString('fr-FR')} €** !\n(Il restait ${cagnotte.toLocaleString('fr-FR')} € dans le coffre)\n✨ XP : **+200**`)
                .setImage('https://media.giphy.com/media/l0Ex6kAKAoFRsFh6M/giphy.gif');

            let content = xpRes.leveledUp ? `🎉 **LEVEL UP !** Niveau ${xpRes.newLevel} !` : "";
            return replyFunc({ content: content, embeds: [embed] });

        } else {
            // --- ÉCHEC ---
            // ⚠️ Correction : On met 12 heures de prison pour correspondre à ton texte
            const prisonTime = 12 * 60 * 60 * 1000; 
            
            await eco.setJail(user.id, prisonTime);

            let amende = 0;
            let sourceMsg = "";

            // Calcul de l'amende (20%)
            if (userData.cash > 0) {
                amende = Math.floor(userData.cash * 0.20);
                await eco.addCash(user.id, -amende);
                sourceMsg = "Liquide";
            } else {
                amende = Math.floor(userData.bank * 0.20);
                await eco.addBank(user.id, -amende);
                sourceMsg = "Compte Bancaire";
            }
            
            if (amende > 0) {
                await eco.addBank('police_treasury', amende);
            }

            const embed = new EmbedBuilder()
                .setColor(0xE74C3C) // Rouge
                .setTitle('🚨 ÉCHEC DU BRAQUAGE')
                .setDescription(`👮 **Le SWAT est intervenu !**\n\n💥 Ton C4 a foiré.\n⚖️ **Prison :** 12 heures\n💸 **Saisie (${sourceMsg}) :** ${amende.toLocaleString('fr-FR')} € (20% saisis).`);

            return replyFunc({ embeds: [embed] });
        }
    }
};