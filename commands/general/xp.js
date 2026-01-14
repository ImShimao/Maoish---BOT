const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xp')
        .setDescription('Affiche ton niveau et ta progression')
        .addUserOption(o => o.setName('user').setDescription('Voir l\'XP d\'un membre')),

    async execute(interactionOrMessage) {
        const target = interactionOrMessage.options?.getUser('user') || interactionOrMessage.user || interactionOrMessage.author;
        const userData = await eco.get(target.id);
        const replyFunc = (p) => interactionOrMessage.reply ? interactionOrMessage.reply(p) : interactionOrMessage.channel.send(p);

        // --- CALCULS ---
        const level = userData.level || 1;
        const currentXP = userData.xp || 0;
        const nextLevelXP = level * 500;
        const percentage = Math.floor((currentXP / nextLevelXP) * 100);

        // Création d'une barre de progression (10 segments)
        const progress = Math.floor(percentage / 10);
        const bar = "🟩".repeat(progress) + "⬜".repeat(10 - progress);

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.MAIN || 0x5865F2)
            .setAuthor({ name: `Niveau de ${target.username}`, iconURL: target.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '📊 Progression', value: `${bar} **${percentage}%**`, inline: false },
                { name: '✨ Expérience', value: `**${currentXP.toLocaleString()}** / ${nextLevelXP.toLocaleString()} XP`, inline: true },
                { name: '🎖️ Niveau', value: `**${level}**`, inline: true }
            )
            .setFooter({ text: `Continue de parler pour monter en niveau !` })
            .setTimestamp();

        return replyFunc({ embeds: [embed] });
    }
};