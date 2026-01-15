const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xp')
        .setDescription('Affiche ton niveau et ta progression')
        .addUserOption(o => o.setName('user').setDescription('Voir l\'XP d\'un membre')),

    async execute(interactionOrMessage, args) {
        let target, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            target = interactionOrMessage.options.getUser('user') || interactionOrMessage.user;
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            const mention = interactionOrMessage.mentions.users.first();
            target = mention || interactionOrMessage.author;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // Récupération des données
        const userData = await eco.get(target.id);

        // --- CALCULS ---
        const level = userData.level || 1;
        const currentXP = userData.xp || 0;
        
        // Formule d'XP (Doit être la même que dans ton event messageCreate)
        const nextLevelXP = level * 500; 
        
        // Pourcentage
        let percentage = Math.floor((currentXP / nextLevelXP) * 100);
        if (percentage > 100) percentage = 100; // Cap à 100% visuellement

        // Barre de progression (10 segments)
        const progress = Math.round(percentage / 10);
        const empty = 10 - progress;
        const bar = "🟩".repeat(progress) + "⬛".repeat(empty);

        // --- EMBED VIA USINE ---
        // On force le fetch user pour essayer d'avoir la couleur du profil (accentColor)
        try { await target.fetch(); } catch (e) {}

        const embed = embeds.info(interactionOrMessage, `Niveau de ${target.username}`, null)
            .setColor(target.accentColor || 0x5865F2) // Couleur du profil ou Blurple Discord
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '📊 Progression', value: `${bar} **${percentage}%**`, inline: false },
                { name: '✨ Expérience', value: `\`${currentXP.toLocaleString()} / ${nextLevelXP.toLocaleString()} XP\``, inline: true },
                { name: '🎖️ Niveau', value: `**${level}**`, inline: true }
            )
            .setFooter({ text: "Continue de parler pour monter en niveau !" });

        return replyFunc({ embeds: [embed] });
    }
};