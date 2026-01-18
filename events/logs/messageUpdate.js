const { Events, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        // 1. Sécurités
        if (!oldMessage.guild || oldMessage.author?.bot) return;
        
        // Anti-spam : Si le contenu est identique (ex: Discord ajoute un embed de lien), on ignore
        if (oldMessage.content === newMessage.content) return;

        // 2. DB
        const guildData = await Guild.findOne({ guildId: newMessage.guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.messages) return;

        const logChannel = newMessage.guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        // 3. Embed
        const embed = new EmbedBuilder()
            .setTitle('✏️ Message Modifié')
            .setColor(0x3498DB) // Bleu
            .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
            .setDescription(`**Message dans ${newMessage.channel}** [Aller au message](${newMessage.url})`)
            .addFields(
                { name: '📜 Avant', value: oldMessage.content ? (oldMessage.content.length > 1000 ? oldMessage.content.substring(0, 1000) + '...' : oldMessage.content) : '*(Vide)*' },
                { name: '📝 Après', value: newMessage.content ? (newMessage.content.length > 1000 ? newMessage.content.substring(0, 1000) + '...' : newMessage.content) : '*(Vide)*' }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};