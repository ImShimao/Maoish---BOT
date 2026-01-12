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

        // 1. Vérif Prison
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc(`🔒 **Tu es en PRISON !** Réfléchis à tes actes encore **${timeLeft} minutes**.`);
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

        // 4. Nouvelle Logique de Loot
        const rand = Math.random();
        let itemId = '';
        let message = '';

        if (rand < 0.25) { itemId = 'stone'; message = "🪨 Tu as trouvé une simple **Pierre**."; }
        else if (rand < 0.50) { itemId = 'coal'; message = "🌑 Tu as trouvé un filon de **Charbon**."; }
        else if (rand < 0.70) { itemId = 'iron'; message = "🔩 Pas mal ! Du **Fer** !"; } // NOUVEAU
        else if (rand < 0.85) { itemId = 'gold'; message = "⚜️ **Brillant !** Tu as trouvé une **Pépite d'Or** !"; }
        else if (rand < 0.93) { itemId = 'ruby'; message = "🔴 **Incroyable !** Un magnifique **Rubis** !"; } // NOUVEAU
        else if (rand < 0.98) { itemId = 'diamond'; message = "💎 **JACKPOT !** Tu as déterré un **DIAMANT** brut !!"; }
        else if (rand < 0.995) { itemId = 'emerald'; message = "🟢 **LÉGENDAIRE !** Une **ÉMERAUDE** pure !!!"; } // NOUVEAU
        else { return replyFunc("💥 **Aïe !** La mine s'est effondrée. Tu n'as rien trouvé."); }

        await eco.addItem(user.id, itemId);
        const itemInfo = itemsDb.find(i => i.id === itemId);

        // 5. Sauvegarde
        userData.cooldowns.mine = now + (config.COOLDOWNS.MINE || 60000);
        await userData.save();

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.ECONOMY)
            .setDescription(`${message}\n*(Valeur estimée : ${itemInfo ? itemInfo.sellPrice : 0} €)*`)
            .setFooter({ text: config.FOOTER_TEXT || 'Maoish Economy' });

        replyFunc({ embeds: [embed] });
    }
};