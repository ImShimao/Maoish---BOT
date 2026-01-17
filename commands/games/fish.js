const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Aller à la pêche (Gagne de l\'XP et des stats)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        // ✅ 1. DÉFINITION DE GUILDID
        const guildId = interactionOrMessage.guild.id;
        
        // Gestionnaire de réponse amélioré
        const replyFunc = interactionOrMessage.isCommand?.() 
            ? (p) => interactionOrMessage.reply(p) 
            : (p) => { 
                const { ephemeral, ...options } = p; 
                return interactionOrMessage.channel.send(options); 
            };

        // ✅ Ajout de guildId
        const userData = await eco.get(user.id, guildId);
        const now = Date.now();

        // --- 1. SÉCURITÉ PRISON ---
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas d'étang dans ta cellule.\nLibération dans : **${timeLeft} minutes**.`)], 
                ephemeral: true 
            });
        }

        // --- 2. SÉCURITÉ COOLDOWN ---
        if (!userData.cooldowns) userData.cooldowns = {}; 
        if (!userData.cooldowns.fish) userData.cooldowns.fish = 0;

        if (userData.cooldowns.fish > now) {
            const timeLeft = Math.ceil((userData.cooldowns.fish - now) / 1000);
            return replyFunc({ 
                embeds: [embeds.warning(interactionOrMessage, "Chut !", `⏳ **Les poissons dorment...** Reviens dans **${timeLeft} secondes**.`)],
                ephemeral: true 
            });
        }

        // --- 3. VÉRIFICATION OUTIL ---
        // ✅ Ajout de guildId
        if (!await eco.hasItem(user.id, guildId, 'fishing_rod')) {
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, "❌ **Tu ne peux pas pêcher à mains nues !**\nAchète une `🎣 Canne à Pêche` au `/shop` !")], 
                ephemeral: true 
            });
        }

        // --- 4. LOGIQUE DE PÊCHE ---
        const roll = Math.floor(Math.random() * 100);
        let itemId;
        let phrase = "";
        let color = 0x3498DB; // Bleu par défaut

        // Table de loot
        if (roll < 25) { 
            itemId = 'trash'; 
            const phrases = ["Beurk, une vieille botte.", "Une boîte de conserve rouillée...", "Des algues gluantes.", "Un préservatif usagé... dégueu."];
            phrase = phrases[Math.floor(Math.random() * phrases.length)];
            color = config.COLORS.Economy || 0x95A5A6; // Gris
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
            color = 0x2ECC71; // Vert
        }
        else if (roll < 95) { 
            itemId = 'puffer'; 
            const phrases = ["Un Fugu ! Attention au poison.", "Il a gonflé comme un ballon !", "Un poisson-globe rare.", "Ne le mange pas cru !"];
            phrase = phrases[Math.floor(Math.random() * phrases.length)];
            color = 0x9B59B6; // Violet
        }
        else if (roll < 99) { 
            itemId = 'shark'; 
            const phrases = ["🦈 **UN REQUIN !**", "Tu as failli te faire mordre !", "Le roi des océans !", "C'est un Grand Blanc !"];
            phrase = phrases[Math.floor(Math.random() * phrases.length)];
            color = 0xE74C3C; // Rouge
        }
        else { 
            itemId = 'treasure'; 
            const phrases = ["👑 **INCROYABLE !** Un coffre au trésor !", "C'est lourd... c'est de l'or !", "Tu es riche !!", "Le trésor de Barbe-Noire !"];
            phrase = phrases[Math.floor(Math.random() * phrases.length)];
            color = 0xF1C40F; // Or
        }

        // Sauvegarde Item
        // ✅ Ajout de guildId
        await eco.addItem(user.id, guildId, itemId);
        const itemInfo = itemsDb.find(i => i.id === itemId);

        // --- 5. XP & STATS & SAVE ---
        // ✅ Ajout de guildId
        await eco.addStat(user.id, guildId, 'fish'); 
        const xpResult = await eco.addXP(user.id, guildId, 20); // +20 XP

        userData.cooldowns.fish = now + (config.COOLDOWNS.FISH || 30000);
        await userData.save();

        // Utilisation de embeds.success mais on override la couleur et le titre
        const embed = embeds.success(interactionOrMessage, `${itemInfo.icon || '🎣'} Partie de Pêche`, 
            `${phrase}\n\nTu as attrapé : **${itemInfo.name}**\n💰 Valeur : **${itemInfo.sellPrice} €**\n✨ XP : **+20**`
        ).setColor(color);

        // Notification Level Up
        let content = xpResult.leveledUp ? `🎉 **LEVEL UP !** Tu es maintenant **Niveau ${xpResult.newLevel}** !` : null;
        
        replyFunc({ content: content, embeds: [embed] });
    }
};