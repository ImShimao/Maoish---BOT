const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');
const config = require('../../config');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        // Ignorer les messages partiels (trop vieux), les bots, ou les DMs
        if (message.partial || !message.guild || message.author?.bot) return;

        // Récupération Config
        const guildData = await Guild.findOne({ guildId: message.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.messages) return;

        const logChannel = message.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.ERROR)
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setDescription(`🗑️ **Message supprimé** dans ${message.channel}\n\n**Contenu :**\n${message.content || "*Aucun contenu texte (Image/Embed)*"}`)
            .setFooter({ text: `ID: ${message.author.id}` })
            .setTimestamp();

        // Envoi sécurisé
        try { await logChannel.send({ embeds: [embed] }); } catch (err) { console.error("Erreur log delete:", err); }
    },
};