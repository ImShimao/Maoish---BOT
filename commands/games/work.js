const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Travaille pour gagner un salaire (Bonus si tu es équipé !)'),

    async execute(interactionOrMessage) {
        let user, replyFunc;
        const guildId = interactionOrMessage.guild.id;

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

        const userData = await eco.get(user.id, guildId); 
        const now = Date.now();
        
        // 1. SÉCURITÉ PRISON
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en prison !** Impossible de travailler.`)] });
        }

        // 2. COOLDOWN (30 min)
        if (!userData.cooldowns) userData.cooldowns = {}; 
        const workCooldown = config.COOLDOWNS.WORK || 1800000; 

        if (userData.cooldowns.work > now) {
            const timeLeft = userData.cooldowns.work - now;
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            return replyFunc({ embeds: [embeds.warning(interactionOrMessage, "Repos !", `⏳ Tu as déjà travaillé.\nReviens dans **${minutes}m ${seconds}s**.`)], ephemeral: true });
        }

        // 3. CALCUL SALAIRE & BONUS
        let baseGain = Math.floor(Math.random() * 400) + 200; // Base plus faible pour valoriser les items
        let bonusGain = 0;
        let bonusDesc = [];

        // --- 🚗 BONUS TRANSPORT (Cumulables) ---
        // Liste des véhicules et leur bonus
        const vehicles = [
            { id: 'bike', bonus: 20, name: 'Vélo' },
            { id: 'scooter', bonus: 50, name: 'Scooter' },
            { id: 'motorcycle', bonus: 100, name: 'Moto' },
            { id: 'car', bonus: 200, name: 'Ferrari' },
            { id: 'helicopter', bonus: 500, name: 'Hélico' },
            { id: 'plane', bonus: 1000, name: 'Jet' }
        ];

        for (const v of vehicles) {
            if (await eco.hasItem(user.id, guildId, v.id)) {
                bonusGain += v.bonus;
                bonusDesc.push(v.name);
            }
        }

        // --- 💻 BONUS TECH & STYLE ---
        if (await eco.hasItem(user.id, guildId, 'smartphone')) { bonusGain += 50; bonusDesc.push("Smartphone"); }
        if (await eco.hasItem(user.id, guildId, 'laptop')) { bonusGain += 150; bonusDesc.push("Laptop"); }
        if (await eco.hasItem(user.id, guildId, 'server')) { bonusGain += 300; bonusDesc.push("Serveur"); }
        if (await eco.hasItem(user.id, guildId, 'rolex')) { bonusGain += 100; bonusDesc.push("Rolex"); }

        const totalGain = baseGain + bonusGain;

        // 4. UPDATE DB
        userData.cooldowns.work = now + workCooldown;
        await eco.addCash(user.id, guildId, totalGain);
        await eco.addStat(user.id, guildId, 'works'); 
        
        const xpGain = Math.floor(Math.random() * 16) + 15;
        const xpResult = await eco.addXP(user.id, guildId, xpGain);
        
        // 5. MESSAGES DRÔLES
        const jobs = [
            "Livreur Uber Eats", "Éboueur de l'espace", "Développeur Discord",
            "Serveur au McDo", "Jardinier", "Testeur de canapés",
            "Youtuber (flop)", "Nettoyeur d'historique", "Chauffeur de bus",
            "Maçon", "Vendeur de tapis", "Influenceur TikTok",
            "Pêcheur de canards", "Réparateur d'ascenseurs", "Coiffeur"
        ];
        const job = jobs[Math.floor(Math.random() * jobs.length)];

        // Construction Description
        let desc = `Tu as travaillé comme **${job}**.\n\n💰 Salaire de base : **${baseGain} €**`;
        
        if (bonusGain > 0) {
            // Affichage propre des bonus
            const bonusText = bonusDesc.length > 4 ? `${bonusDesc.slice(0, 4).join(', ')}...` : bonusDesc.join(', ');
            desc += `\n✨ **Bonus Équipement (+${bonusGain}€) :**\n*${bonusText}*`;
        }
        
        desc += `\n\n💸 **TOTAL : +${totalGain.toLocaleString('fr-FR')} €**\n⭐ XP : **+${xpGain}**`;

        const embed = embeds.success(interactionOrMessage, '💼 Travail terminé', desc)
            .setFooter({ text: `Solde : ${(userData.cash + totalGain).toLocaleString('fr-FR')} €` });

        let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : null;
        
        return replyFunc({ content: content, embeds: [embed] });
    }
};