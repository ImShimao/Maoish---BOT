const { Events, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const config = require('../../config');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        // Ignorer les bots, les messages identiques (embed update) et les DMs
        if (oldMessage.partial || newMessage.partial) return; // On ignore si on n'a pas l'ancien contenu
        if (!oldMessage.guild || oldMessage.author.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const guildData = await Guild.findOne({ guildId: oldMessage.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.messages) return;

        const logChannel = oldMessage.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.WARNING || 0xF1C40F)
            .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL() })
            .setDescription(`✏️ **Message modifié** dans ${oldMessage.channel} [Aller au message](${newMessage.url})`)
            .addFields(
                { name: 'Avant', value: oldMessage.content.substring(0, 1024) || '*Vide*' },
                { name: 'Après', value: newMessage.content.substring(0, 1024) || '*Vide*' }
            )
            .setFooter({ text: `ID: ${oldMessage.author.id}` })
            .setTimestamp();

        try { await logChannel.send({ embeds: [embed] }); } catch (err) { console.error("Erreur log update:", err); }
    },
};