const { Events, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const config = require('../../config');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        // Ignorer les messages partiels, les bots, et les embeds qui s'affichent après coup
        if (oldMessage.partial || newMessage.partial) return; 
        if (!oldMessage.guild || oldMessage.author.bot) return;
        if (oldMessage.content === newMessage.content) return; // Changement d'image/embed seulement

        const guildData = await Guild.findOne({ guildId: oldMessage.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.messages) return;

        const logChannel = oldMessage.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(config.COLORS?.WARNING || 0xF1C40F)
            .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL() })
            .setDescription(`✏️ **Message modifié** dans ${oldMessage.channel} [Aller au message](${newMessage.url})`)
            .addFields(
                // Substring(0, 1024) est vital pour éviter le crash Discord (limite de caractères)
                { name: 'Avant', value: oldMessage.content.substring(0, 1024) || '*Vide*', inline: false },
                { name: 'Après', value: newMessage.content.substring(0, 1024) || '*Vide*', inline: false }
            )
            .setFooter({ text: `ID: ${oldMessage.author.id}` })
            .setTimestamp();

        try { await logChannel.send({ embeds: [embed] }); } catch (err) { }
    },
};