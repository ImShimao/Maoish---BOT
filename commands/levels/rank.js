const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const xp = require('../../utils/xp.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Affiche ton niveau et ton XP'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.isCommand?.() ? interactionOrMessage.user : interactionOrMessage.author;
        const replyFunc = interactionOrMessage.isCommand?.() ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        const data = xp.get(user.id);
        const nextLevelXp = data.level * 200;
        
        // Barre de progression
        const percent = Math.round((data.xp / nextLevelXp) * 100);
        const filled = Math.round(percent / 10);
        const bar = '🟩'.repeat(filled) + '⬛'.repeat(10 - filled);

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6) // Violet
            .setTitle(`⭐ Niveau de ${user.username}`)
            .addFields(
                { name: 'Niveau', value: `**${data.level}**`, inline: true },
                { name: 'XP', value: `${data.xp} / ${nextLevelXp}`, inline: true },
                { name: 'Progression', value: `${bar} **${percent}%**`, inline: false }
            );

        await replyFunc({ embeds: [embed] });
    }
};