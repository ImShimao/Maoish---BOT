const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Aller à la pêche (Gagne de l\'XP et des stats)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        
        const replyFunc = interactionOrMessage.isCommand?.() 
            ? (p) => interactionOrMessage.reply(p) 
            : (p) => { 
                const { ephemeral, ...options } = p; 
                return interactionOrMessage.channel.send(options); 
            };

        const userData = await eco.get(user.id);
        const now = Date.now();

        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc({ content: `🔒 **Tu es en PRISON !**\nLibération dans : **${timeLeft} minutes**.`, ephemeral: true });
        }

        if (userData.cooldowns.fish > now) {
            const timeLeft = Math.ceil((userData.cooldowns.fish - now) / 1000);
            return replyFunc({ content: `⏳ **Patience...** Reviens dans **${timeLeft} secondes**.`, ephemeral: true });
        }

        if (!await eco.hasItem(user.id, 'fishing_rod')) {
            return replyFunc({ content: "❌ Il te faut une **Canne à Pêche** !", ephemeral: true });
        }

        // --- LOGIQUE DE PÊCHE ---
        const roll = Math.floor(Math.random() * 100);
        let itemId;
        let phrase = "";

        // Table de loot
        if (roll < 25) { 
            itemId = 'trash'; 
            const phrases = ["Beurk, une vieille botte.", "Une boîte de conserve rouillée...", "Des algues gluantes.", "Un préservatif usagé... dégueu."];
            phrase = phrases[Math.floor(Math.random() * phrases.length)];
        }
        else if (roll < 55) { 
            itemId = 'fish'; 
            const phrases = ["Un petit poisson rouge !", "Une sardine frétillante.", "Un gardon tout frais.", "Ça fera un bon dîner."];
            phrase = phrases[Math.floor(Math.random() * phrases.length)];
        }
        else if (roll < 75) { 
            itemId = 'crab'; 
            const phrases = ["Un crabe qui pince !", "Attention aux doigts !", "Miam, du crabe !", "Il marche de travers celui-là."];
            phrase = phrases[Math.floor(Math.random() * phrases.length)];
        }
        else if (roll < 88) { 
            itemId = 'trout'; 
            const phrases = ["Une belle truite saumonée !", "Wouah, quelle prise !", "Ça c'est du poisson noble.", "Elle brille au soleil."];
            phrase = phrases[Math.floor(Math.random() * phrases.length)];
        }
        else if (roll < 95) { 
            itemId = 'puffer'; 
            const phrases = ["Un Fugu ! Attention au poison.", "Il a gonflé comme un ballon !", "Un poisson-globe rare.", "Ne le mange pas cru !"];
            phrase = phrases[Math.floor(Math.random() * phrases.length)];
        }
        else if (roll < 99) { 
            itemId = 'shark'; 
            const phrases = ["🦈 **UN REQUIN !**", "Tu as failli te faire mordre !", "Le roi des océans !", "C'est un Grand Blanc !"];
            phrase = phrases[Math.floor(Math.random() * phrases.length)];
        }
        else { 
            itemId = 'treasure'; 
            const phrases = ["👑 **INCROYABLE !** Un coffre au trésor !", "C'est lourd... c'est de l'or !", "Tu es riche !!", "Le trésor de Barbe-Noire !"];
            phrase = phrases[Math.floor(Math.random() * phrases.length)];

        }
        await eco.addItem(user.id, itemId);
        const itemInfo = itemsDb.find(i => i.id === itemId);

        // --- NOUVEAU : XP ET STATS ---
        await eco.addStat(user.id, 'fish'); // Incrémente les stats
        const xpResult = await eco.addXP(user.id, 20); // Donne 20 XP

        userData.cooldowns.fish = now + (config.COOLDOWNS.FISH || 30000);
        await userData.save();

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle(itemInfo.icon + " Partie de Pêche")
            .setDescription(`${phrase}\n\nTu as attrapé : **${itemInfo.name}**\n💰 Valeur : **${itemInfo.sellPrice} €**\n✨ XP : **+20**`)
            .setFooter({ text: config.FOOTER_TEXT || 'Maoish Fishing' });

        let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : "";
        
        replyFunc({ content: content, embeds: [embed] });
    }
};