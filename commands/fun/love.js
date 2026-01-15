const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('love')
        .setDescription('Calcule la compatibilité amoureuse (Aléatoire)')
        .addUserOption(option => 
            option.setName('membre1')
                .setDescription('Le premier amoureux')
                .setRequired(true))
        .addUserOption(option => 
            option.setName('membre2')
                .setDescription('Le deuxième amoureux')
                .setRequired(false)),

    async execute(interactionOrMessage, args) {
        let user1, user2, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user1 = interactionOrMessage.options.getUser('membre1');
            user2 = interactionOrMessage.options.getUser('membre2') || interactionOrMessage.user;
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            const mentions = interactionOrMessage.mentions.users;
            if (mentions.size < 1) {
                // Erreur avec l'usine
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Il faut mentionner au moins une personne !")] 
                });
            }
            user1 = mentions.first();
            user2 = mentions.size > 1 ? mentions.at(1) : interactionOrMessage.author;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // --- CALCUL ALÉATOIRE (0 à 100%) ---
        const percentage = Math.floor(Math.random() * 101); 

        // Barre de progression (Cœurs)
        const filled = Math.round(percentage / 10);
        const bar = '❤️'.repeat(filled) + '🤍'.repeat(10 - filled);

        // Commentaires et Couleurs
        let comment;
        let color;

        if (percentage <= 10) {
            comment = "💀 C'est la guerre froide. Fuyez !";
            color = 0x000000; // Noir
        } else if (percentage < 30) {
            comment = "❄️ Ça jette un froid...";
            color = 0x3498DB; // Bleu
        } else if (percentage < 50) {
            comment = "🤝 Juste amis (Friendzone).";
            color = 0xF1C40F; // Jaune
        } else if (percentage < 70) {
            comment = "😏 Y'a moyen de moyenner.";
            color = 0xE67E22; // Orange
        } else if (percentage < 90) {
            comment = "🔥 C'est chaud bouillant !";
            color = 0xE91E63; // Rose foncé
        } else {
            comment = "💍 Préparez la robe et le traiteur !";
            color = 0xFF0000; // Rouge
        }

        // Utilisation de l'usine avec surcharge de couleur et de footer
        const embed = embeds.info(interactionOrMessage, '💘 Machine à Love', `**${user1.username}** \`+\` **${user2.username}**`)
            .setColor(color) // On applique la couleur dynamique
            .addFields(
                { name: 'Résultat', value: `**${percentage}%**`, inline: true },
                { name: 'Jauge', value: bar, inline: true },
                { name: 'Verdict de Maoish', value: comment, inline: false }
            )
            .setFooter({ text: 'Maoish • Dr. Love', iconURL: 'https://cdn-icons-png.flaticon.com/512/210/210545.png' });

        return replyFunc({ embeds: [embed] });
    }
};