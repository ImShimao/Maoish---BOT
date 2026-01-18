const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        // 1. Sécurités de base
        if (!message.guild || message.author?.bot) return; // On ignore les MPs et les bots
        
        // 2. Récupération Config DB
        const guildData = await Guild.findOne({ guildId: message.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.messages) return;

        const logChannel = message.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        // 3. Construction de l'Embed
        const embed = new EmbedBuilder()
            .setTitle('🗑️ Message Supprimé')
            .setColor(0xE74C3C) // Rouge
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .addFields(
                { name: '📍 Salon', value: `${message.channel}`, inline: true },
                { name: '👤 Auteur', value: `${message.author} (\`${message.author.id}\`)`, inline: true }
            )
            .setTimestamp();

        // Gestion du contenu (Texte ou Image)
        if (message.content) {
            // On coupe si le message est trop long (+1024 char) pour éviter une erreur
            embed.addFields({ name: '📄 Contenu', value: message.content.length > 1000 ? message.content.substring(0, 1000) + '...' : message.content });
        } else if (message.attachments.size > 0) {
            embed.addFields({ name: '📄 Contenu', value: '*(Image/Fichier uniquement)*' });
            embed.setImage(message.attachments.first().proxyURL);
        } else {
            embed.addFields({ name: '📄 Contenu', value: '*(Inconnu ou Embed)*' });
        }

        // 4. Envoi
        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};