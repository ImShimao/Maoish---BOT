const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Aller à la pêche (Cooldown persistant)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const replyFunc = interactionOrMessage.reply ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        const userData = await eco.get(user.id);
        const now = Date.now();

        // Gestion des erreurs en texte simple (ou embed rouge si tu préfères, mais texte ça va pour les erreurs)
        if (userData.jailEnd > now) {
            const timeLeft = Math.ceil((userData.jailEnd - now) / 60000);
            return replyFunc(`🔒 Prisonnier ! Encore **${timeLeft} min**.`);
        }

        if (userData.cooldowns.fish > now) {
            const timeLeft = Math.ceil((userData.cooldowns.fish - now) / 1000);
            return replyFunc(`⏳ Patience... Encore **${timeLeft} secondes**.`);
        }

        if (!await eco.hasItem(user.id, 'fishing_rod')) return replyFunc("❌ Achète une **Canne à Pêche** !");

        // --- LOGIQUE DE DROP (Celle qu'on a définie avant) ---
        const roll = Math.floor(Math.random() * 100);
        let itemId;

        if (roll < 25) itemId = 'trash';
        else if (roll < 55) itemId = 'fish';
        else if (roll < 75) itemId = 'crab';
        else if (roll < 88) itemId = 'trout';
        else if (roll < 95) itemId = 'puffer';
        else if (roll < 99) itemId = 'shark';
        else itemId = 'treasure';

        await eco.addItem(user.id, itemId);
        const itemInfo = itemsDb.find(i => i.id === itemId);

        userData.cooldowns.fish = now + config.COOLDOWNS.FISH;
        await userData.save();

        // --- C'EST ICI QUE ÇA CHANGE ---
        const embed = new EmbedBuilder()
            .setColor(0x3498DB) // Bleu Océan
            .setDescription(`🎣 Tu as attrapé **${itemInfo.name}** !\n*(Valeur : ${itemInfo.sellPrice} €)*`)
            .setFooter({ text: config.FOOTER_TEXT || 'Maoish Fishing' });

        replyFunc({ embeds: [embed] });
    }
};