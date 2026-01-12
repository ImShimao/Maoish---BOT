const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Affiche les infos d\'un utilisateur')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre à analyser')
                .setRequired(false)), // Pas obligatoire, si vide = soi-même

    async execute(interaction, args) {
        // Gestion hybride (Slash / Prefix)
        let targetUser;
        let member;

        if (interaction.isCommand?.()) {
            targetUser = interaction.options.getUser('membre') || interaction.user;
            member = interaction.guild.members.cache.get(targetUser.id);
        } else {
            // Pour le préfixe, on essaie de choper le premier ping, sinon l'auteur
            const mention = interaction.mentions.users.first();
            targetUser = mention || interaction.author;
            member = interaction.guild.members.cache.get(targetUser.id);
        }

        // On formate les dates pour que ce soit joli
        const joinedAt = member.joinedAt.toLocaleDateString('fr-FR');
        const createdAt = targetUser.createdAt.toLocaleDateString('fr-FR');
        
        // Liste des rôles (sauf @everyone)
        const roles = member.roles.cache
            .filter(r => r.name !== '@everyone')
            .map(r => r)
            .join(' ') || "Aucun rôle";

        const embed = new EmbedBuilder()
            .setColor(member.displayHexColor)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setTitle(`👤 Info : ${targetUser.username}`)
            .addFields(
                { name: '🆔 ID', value: targetUser.id, inline: true },
                { name: '📅 Création', value: createdAt, inline: true },
                { name: '📥 Arrivée', value: joinedAt, inline: true },
                { name: '🤖 Bot ?', value: targetUser.bot ? 'Oui' : 'Non', inline: true },
                { name: '🎭 Rôles', value: roles, inline: false }
            )
            .setFooter({ text: `Maoish • Demandé par ${interaction.user ? interaction.user.username : interaction.author.username}` })
            .setTimestamp();

        // Réponse
        if (interaction.isCommand?.()) await interaction.reply({ embeds: [embed] });
        else await interaction.channel.send({ embeds: [embed] });
    }
};