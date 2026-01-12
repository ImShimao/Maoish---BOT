const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Affiche le Top 10 des membres les plus riches'),

    async execute(interactionOrMessage) {
        const replyFunc = interactionOrMessage.isCommand?.() ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);
        const client = interactionOrMessage.client;

        // 1. Récupérer tous les comptes
        const allData = eco.getAll();
        const leaderboard = [];

        for (const [userId, data] of Object.entries(allData)) {
            // On gère les anciens formats au cas où
            const cash = typeof data === 'number' ? data : (data.cash || 0);
            const bank = typeof data === 'number' ? 0 : (data.bank || 0);
            
            // On n'ajoute que ceux qui ont de l'argent (> 0)
            if (cash + bank > 0) {
                leaderboard.push({ userId, total: cash + bank });
            }
        }

        // 2. Trier du plus riche au moins riche
        leaderboard.sort((a, b) => b.total - a.total);

        // 3. Prendre le Top 10
        const top10 = leaderboard.slice(0, 10);

        // 4. Construire l'affichage
        let desc = "";
        
        if (leaderboard.length === 0) {
            desc = "Personne n'a d'argent... C'est la crise !";
        } else {
            // On récupère les pseudos (c'est plus joli que les ID)
            for (let i = 0; i < top10.length; i++) {
                const entry = top10[i];
                let userTag = `<@${entry.userId}>`; // Mention par défaut

                // Médailles pour le podium
                let medal = '🔹';
                if (i === 0) medal = '🥇';
                if (i === 1) medal = '🥈';
                if (i === 2) medal = '🥉';

                desc += `${medal} **${i + 1}.** ${userTag} : \`${entry.total} €\`\n`;
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFD700) // Or
            .setTitle('🏆 Classement Mondial (Forbes)')
            .setDescription(desc)
            .setFooter({ text: 'Maoish • Economy' });

        await replyFunc({ embeds: [embed] });
    }
};