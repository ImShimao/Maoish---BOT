const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Miner des ressources (1m de recharge)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const replyFunc = (p) => interactionOrMessage.reply ? interactionOrMessage.reply(p) : interactionOrMessage.channel.send(p);

        const userData = await eco.get(user.id);
        const now = Date.now();

        // --- 1. SÉCURITÉ PRISON ---
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc(`🔒 **Tu es en PRISON !** Pas de pioche en cellule.\nLibération dans : **${timeLeft} minutes**.`);
        }

        // 2. Cooldown persistant
        if (userData.cooldowns.mine > now) {
            const timeLeft = Math.ceil((userData.cooldowns.mine - now) / 1000);
            return replyFunc(`⏳ **Repos !** Tes bras sont fatigués. Reviens dans **${timeLeft} secondes**.`);
        }

        // 3. Vérification de l'outil
        if (!await eco.hasItem(user.id, 'pickaxe')) {
            return replyFunc("❌ **Impossible de creuser avec tes ongles !**\nAchète une `⛏️ Pioche` au `/shop`.");
        }

        // 4. Logique de Loot
        const rand = Math.random();
        let itemId = '';
        let message = '';
        let color = config.COLORS.ECONOMY;

        if (rand < 0.25) { 
            itemId = 'stone'; 
            const texts = ["Juste un caillou.", "De la roche grise.", "Une pierre banale.", "C'est lourd et ça vaut rien."];
            message = `🪨 ${texts[Math.floor(Math.random() * texts.length)]}`;
        }
        else if (rand < 0.50) { 
            itemId = 'coal'; 
            const texts = ["Un filon de charbon !", "De quoi faire un barbecue.", "C'est salissant mais utile.", "Du combustible fossile."];
            message = `🌑 ${texts[Math.floor(Math.random() * texts.length)]}`;
        }
        else if (rand < 0.70) { 
            itemId = 'iron'; 
            const texts = ["Du minerai de Fer !", "Un métal solide.", "On va pouvoir forger des trucs.", "Du fer brut."];
            message = `🔩 ${texts[Math.floor(Math.random() * texts.length)]}`;
        }
        else if (rand < 0.85) { 
            itemId = 'gold'; 
            const texts = ["**Une pépite d'OR !**", "Ça brille !", "On est riche !", "C'est précieux ça."];
            message = `⚜️ ${texts[Math.floor(Math.random() * texts.length)]}`;
            color = 0xF1C40F; // Jaune
        }
        else if (rand < 0.93) { 
            itemId = 'ruby'; 
            const texts = ["**UN RUBIS !**", "Une pierre rouge sang.", "Magnifique gemme.", "Ça vaut une fortune."];
            message = `🔴 ${texts[Math.floor(Math.random() * texts.length)]}`;
            color = 0xE74C3C; // Rouge
        }
        else if (rand < 0.98) { 
            itemId = 'diamond'; 
            const texts = ["💎 **UN DIAMANT !!**", "💎 **JACKPOT !**", "💎 **La plus belle des pierres !**"];
            message = texts[Math.floor(Math.random() * texts.length)];
            color = 0x3498DB; // Bleu cyan
        }
        else if (rand < 0.995) { 
            itemId = 'emerald'; 
            const texts = ["🟢 **LÉGENDAIRE ! UNE ÉMERAUDE !**", "🟢 **C'est vert, c'est rare, c'est cher !**"];
            message = texts[Math.floor(Math.random() * texts.length)];
            color = 0x2ECC71; // Vert
        }
        else { 
            // Échec critique (très rare)
            const fails = ["La galerie s'est effondrée !", "Tu as cassé le manche de ta pioche.", "Tu as eu peur d'une chauve-souris.", "Rien... le vide absolu."];
            userData.cooldowns.mine = now + (config.COOLDOWNS.MINE || 60000);
            await userData.save();
            return replyFunc(`💥 **Aïe !** ${fails[Math.floor(Math.random() * fails.length)]}`);
        }

        await eco.addItem(user.id, itemId);
        const itemInfo = itemsDb.find(i => i.id === itemId);

        // 5. Sauvegarde
        userData.cooldowns.mine = now + (config.COOLDOWNS.MINE || 60000);
        await userData.save();

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('⛏️ Expédition Minière')
            .setDescription(`${message}\n\nTu as récupéré : **${itemInfo.name}**\n💰 Valeur : **${itemInfo.sellPrice} €**`)
            .setFooter({ text: config.FOOTER_TEXT || 'Maoish Economy' });

        replyFunc({ embeds: [embed] });
    }
};