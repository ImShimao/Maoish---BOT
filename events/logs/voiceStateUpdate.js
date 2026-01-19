const { Events, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: Events.VoiceStateUpdate, // ✅ C'est le bon event
    async execute(oldState, newState) {
        // 1. Récupération du membre et de la guilde
        const member = newState.member;
        const guild = newState.guild;

        if (member.user.bot) return; // On ignore les bots

        // 2. DB Check
        const guildData = await Guild.findOne({ guildId: guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.voice) return;

        const logChannel = guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        // 3. Détermination de l'action
        // JOIN : Pas de salon avant, mais un salon maintenant
        if (!oldState.channelId && newState.channelId) {
            const embed = new EmbedBuilder()
                .setTitle('🔊 Connexion Vocale')
                .setColor(0x2ECC71) // Vert
                .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
                .setDescription(`**${member}** a rejoint le salon **<#${newState.channelId}>**`)
                .setTimestamp();
            return logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        // LEAVE : Salon avant, plus de salon maintenant
        if (oldState.channelId && !newState.channelId) {
            const embed = new EmbedBuilder()
                .setTitle('🔇 Déconnexion Vocale')
                .setColor(0xE74C3C) // Rouge
                .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
                .setDescription(`**${member}** a quitté le salon **<#${oldState.channelId}>**`)
                .setTimestamp();
            return logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        // MOVE : Salon avant différent du salon maintenant
        if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            const embed = new EmbedBuilder()
                .setTitle('🔄 Changement de Salon')
                .setColor(0xF1C40F) // Jaune/Orange
                .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
                .addFields(
                    { name: '📍 Avant', value: `<#${oldState.channelId}>`, inline: true },
                    { name: '👉 Après', value: `<#${newState.channelId}>`, inline: true }
                )
                .setTimestamp();
            return logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
};