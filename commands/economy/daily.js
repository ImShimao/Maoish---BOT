const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Récupère ton salaire quotidien (24h)'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.isCommand?.() ? interactionOrMessage.user : interactionOrMessage.author;
        const replyFunc = interactionOrMessage.isCommand?.() ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        const userData = await eco.get(user.id);
        const cooldownTime = 24 * 60 * 60 * 1000; // 24 heures
        const now = Date.now();

        // Vérification DB
        if (userData.cooldowns.daily > now) {
            const timeLeft = userData.cooldowns.daily - now;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            return replyFunc(`⏱️ **Doucement !** Reviens dans **${hours}h et ${minutes}m**.`);
        }

        const amount = 500;

        // Mise à jour et sauvegarde
        userData.cash += amount;
        userData.cooldowns.daily = now + cooldownTime;
        await userData.save();

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('📆 Salaire Quotidien')
            .setDescription(`Tu as reçu **${amount} €** en cash ! 💸\nReviens demain.`);

        await replyFunc({ embeds: [embed] });
    }
};