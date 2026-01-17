const { Events, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const config = require('../../config');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        // Ignorer les messages partiels (trop vieux/avant reboot), les bots, ou les DMs
        if (message.partial || !message.guild || message.author?.bot) return;

        // Récupération Config DB
        const guildData = await Guild.findOne({ guildId: message.guild.id });
        // On vérifie : Est-ce actif ? Est-ce que le module "messages" est activé ?
        if (!guildData || !guildData.logs.active || !guildData.logs.messages) return;

        const logChannel = message.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(config.COLORS?.ERROR || 0xE74C3C) // Fallback couleur si config bug
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setDescription(`🗑️ **Message supprimé** dans ${message.channel}\n\n**Contenu :**\n${message.content || "*Aucun contenu texte (Image/Embed)*"}`)
            .setFooter({ text: `ID: ${message.author.id}` })
            .setTimestamp();

        try { await logChannel.send({ embeds: [embed] }); } catch (err) { }
    },
};