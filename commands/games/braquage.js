const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('braquage')
        .setDescription('Tente de braquer la Réserve Fédérale (Requis: 🧨 C4)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        // ✅ 1. DÉFINITION DE GUILDID
        const guildId = interactionOrMessage.guild.id;

        const replyFunc = interactionOrMessage.isCommand?.() 
            ? (p) => interactionOrMessage.reply(p) 
            : (p) => { const { ephemeral, ...o } = p; return interactionOrMessage.channel.send(o); };

        // ✅ Ajout de guildId
        const userData = await eco.get(user.id, guildId);
        // ✅ Ajout de guildId pour la réserve du serveur
        const policeData = await eco.get('police_treasury', guildId);
        
        // Sécurité si la banque n'existe pas encore
        const cagnotte = policeData ? policeData.bank : 0;
        const now = Date.now();

        // 1. VÉRIF PRISON
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en prison !** Reviens dans ${timeLeft} min.`)],
                ephemeral: true 
            });
        }

        // 2. VÉRIF COOLDOWN
        if (!userData.cooldowns) userData.cooldowns = {};
        const heistCooldown = config.COOLDOWNS.HEIST || 12 * 60 * 60 * 1000; 

        if (userData.cooldowns.braquage && userData.cooldowns.braquage > now) {
            const timeLeft = Math.ceil((userData.cooldowns.braquage - now) / (1000 * 60 * 60)); // Heures
            return replyFunc({ 
                embeds: [embeds.warning(interactionOrMessage, "FBI Alert", `⏳ **Le FBI est sur les dents !** Fais-toi oublier pendant encore **${timeLeft} heures**.`)],
                ephemeral: true 
            });
        }

        // 3. VÉRIF ITEM (C4)
        // ✅ Ajout de guildId
        if (!await eco.hasItem(user.id, guildId, 'c4')) {
             return replyFunc({ 
                 embeds: [embeds.error(interactionOrMessage, "❌ **Mur blindé !** Il te faut du `🧨 C4` (dispo au shop) pour faire sauter le coffre !")],
                 ephemeral: true 
             });
        }

        // 4. VÉRIF CAGNOTTE
        if (cagnotte < 10000) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `📉 **Coffre vide...** La réserve ne contient que **${cagnotte.toLocaleString('fr-FR')} €**. Ça ne vaut pas le risque (Min: 10 000 €).`)],
                ephemeral: true 
            });
        }

        // --- DÉBUT DU BRAQUAGE ---
        userData.cooldowns.braquage = now + heistCooldown;
        await userData.save();
        // ✅ Ajout de guildId
        await eco.removeItem(user.id, guildId, 'c4');

        // Chance de réussite : 25%
        const success = Math.random() < 0.25;

        if (success) {
            // --- RÉUSSITE ---
            const gain = Math.floor(cagnotte * 0.30);
            
            // ✅ Ajout de guildId partout
            await eco.addBank('police_treasury', guildId, -gain);
            await eco.addCash(user.id, guildId, gain);
            
            await eco.addStat(user.id, guildId, 'crimes');
            const xpRes = await eco.addXP(user.id, guildId, 200);

            // On utilise embeds.success mais on override la couleur pour "Or" et on ajoute une image
            const embed = embeds.success(interactionOrMessage, '🏦 BRAQUAGE RÉUSSI !', 
                `💥 **BOOM !** Le coffre s'est ouvert !\n\n💰 Tu t'enfuis avec **${gain.toLocaleString('fr-FR')} €** !\n(Il restait ${cagnotte.toLocaleString('fr-FR')} € dans le coffre)\n✨ XP : **+200**`
            )
            .setColor(0xF1C40F) // Or
            .setImage('https://media.giphy.com/media/l0Ex6kAKAoFRsFh6M/giphy.gif');

            let content = xpRes.leveledUp ? `🎉 **LEVEL UP !** Niveau ${xpRes.newLevel} !` : null;
            return replyFunc({ content: content, embeds: [embed] });

        } else {
            // --- ÉCHEC ---
            const prisonTime = 12 * 60 * 60 * 1000; 
            // ✅ Ajout de guildId
            await eco.setJail(user.id, guildId, prisonTime);

            let amende = 0;
            let sourceMsg = "";

            if (userData.cash > 0) {
                amende = Math.floor(userData.cash * 0.20);
                await eco.addCash(user.id, guildId, -amende);
                sourceMsg = "Liquide";
            } else {
                amende = Math.floor(userData.bank * 0.20);
                await eco.addBank(user.id, guildId, -amende); // ✅ Attention ici c'est addBank pour le user (retrait)
                sourceMsg = "Compte Bancaire";
            }
            
            // L'amende va à la police du serveur
            if (amende > 0) await eco.addBank('police_treasury', guildId, amende);

            // Embed rouge d'échec
            const embed = embeds.error(interactionOrMessage, 
                `👮 **Le SWAT est intervenu !**\n\n💥 Ton C4 a foiré.\n⚖️ **Prison :** 12 heures\n💸 **Saisie (${sourceMsg}) :** ${amende.toLocaleString('fr-FR')} € (20% saisis).`
            )
            .setTitle('🚨 ÉCHEC DU BRAQUAGE');

            return replyFunc({ embeds: [embed] });
        }
    }
};