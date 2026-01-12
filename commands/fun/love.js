const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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
        let user1, user2;

        if (interactionOrMessage.isCommand?.()) {
            user1 = interactionOrMessage.options.getUser('membre1');
            user2 = interactionOrMessage.options.getUser('membre2') || interactionOrMessage.user;
        } else {
            const mentions = interactionOrMessage.mentions.users;
            if (mentions.size < 1) return interactionOrMessage.reply("❌ Mentionne au moins une personne !");
            user1 = mentions.first();
            user2 = mentions.size > 1 ? mentions.at(1) : interactionOrMessage.author;
        }

        // --- CALCUL ALÉATOIRE (0 à 100%) ---
        // Math.random() génère un chiffre différent à chaque exécution
        const percentage = Math.floor(Math.random() * 101); 

        // Barre de progression
        const filled = Math.round(percentage / 10);
        // On utilise des cœurs rouges pour la partie remplie, noirs/blancs pour le vide
        const bar = '❤️'.repeat(filled) + '🤍'.repeat(10 - filled);

        // Commentaires funs selon le score
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

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`💘 Machine à Love`)
            .setDescription(`**${user1.username}** \`+\` **${user2.username}**`)
            .addFields(
                { name: 'Résultat', value: `**${percentage}%**`, inline: true },
                { name: 'Jauge', value: bar, inline: true },
                { name: 'Verdict de Maoish', value: comment, inline: false }
            )
            .setFooter({ text: 'Maoish • Dr. Love', iconURL: 'https://cdn-icons-png.flaticon.com/512/210/210545.png' })
            .setTimestamp();

        if (interactionOrMessage.isCommand?.()) await interactionOrMessage.reply({ embeds: [embed] });
        else await interactionOrMessage.channel.send({ embeds: [embed] });
    }
};