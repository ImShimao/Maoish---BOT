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
        
        // On récupère les infos du compte "police_treasury"
        const policeData = await eco.get('police_treasury');
        const cagnotte = policeData.bank;

        const now = Date.now();

        // 1. VÉRIF PRISON
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc({ content: `🔒 **Tu es en prison !** Reviens dans ${timeLeft} min.`, ephemeral: true });
        }

        // 2. VÉRIF COOLDOWN (Très long, ex: 12h ou 24h)
        if (!userData.cooldowns) userData.cooldowns = {};
        const heistCooldown = 43200000; // 12 heures en ms
        
        if (userData.cooldowns.heist && userData.cooldowns.heist > now) {
            const timeLeft = Math.ceil((userData.cooldowns.heist - now) / (1000 * 60 * 60)); // En heures
            return replyFunc({ content: `⏳ **Le FBI est sur les dents !** Fais-toi oublier pendant encore **${timeLeft} heures**.`, ephemeral: true });
        }

        // 3. VÉRIF ITEM (C4)
        // Assure-toi d'avoir ajouté l'item 'c4' dans utils/items.js !
        if (!await eco.hasItem(user.id, 'c4')) {
             return replyFunc({ content: "❌ **Mur blindé !** Il te faut du `🧨 C4` (dispo au shop) pour faire sauter le coffre !", ephemeral: true });
        }

        // 4. VÉRIF CAGNOTTE
        if (cagnotte < 10000) {
            return replyFunc({ content: `📉 **Coffre vide...** La réserve ne contient que **${cagnotte} €**. Ça ne vaut pas le risque (Min: 10 000 €).`, ephemeral: true });
        }

        // --- DÉBUT DU BRAQUAGE ---
        userData.cooldowns.heist = now + heistCooldown;
        await userData.save();
        
        // On consomme le C4 (1 par tentative)
        await eco.removeItem(user.id, 'c4');

        // Chance de réussite : 25% (C'est dur !)
        const success = Math.random() < 0.25;

        if (success) {
            // Gain : 30% du contenu du coffre
            const gain = Math.floor(cagnotte * 0.30);
            
            // On retire l'argent à la police et on le donne au joueur
            await eco.addBank('police_treasury', -gain);
            await eco.addCash(user.id, gain);
            
            // Stats & XP
            await eco.addStat(user.id, 'crimes');
            const xpRes = await eco.addXP(user.id, 200); // XP Massive

            const embed = new EmbedBuilder()
                .setColor(0xF1C40F) // Or
                .setTitle('🏦 BRAQUAGE RÉUSSI !')
                .setDescription(`💥 **BOOM !** Le coffre s'est ouvert !\n\n💰 Tu t'enfuis avec **${gain.toLocaleString()} €** !\n(Il restait ${cagnotte.toLocaleString()} € dans le coffre)\n✨ XP : **+200**`)
                .setImage('https://media.giphy.com/media/l0Ex6kAKAoFRsFh6M/giphy.gif'); // Gif optionnel

            let content = xpRes.leveledUp ? `🎉 **LEVEL UP !** Niveau ${xpRes.newLevel} !` : "";
            return replyFunc({ content: content, embeds: [embed] });

        } else {
            // Echec : Prison ferme + Amende salée
            const prisonTime = 60 * 60 * 1000; // 1 heure de prison
            const amende = 10000; // Amende fixe ou pourcentage

            await eco.setJail(user.id, prisonTime);
            // Si le joueur a l'argent, on le prend et on le met dans le coffre (cercle vicieux !)
            if (userData.cash >= amende) {
                await eco.addCash(user.id, -amende);
                await eco.addBank('police_treasury', amende);
            } else {
                // S'il n'a pas assez, on vide son cash
                await eco.addBank('police_treasury', userData.cash);
                await eco.addCash(user.id, -userData.cash);
            }

            const embed = new EmbedBuilder()
                .setColor(0xE74C3C) // Rouge
                .setTitle('🚨 ÉCHEC DU BRAQUAGE')
                .setDescription(`👮 **Le SWAT est intervenu !**\n\n💥 Ton C4 a foiré.\n⚖️ **Prison :** 1 heure\n💸 **Amende saisie :** Jusqu'à ${amende} € (ajoutés au coffre).`);

            return replyFunc({ embeds: [embed] });
        }
    }
};