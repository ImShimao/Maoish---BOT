const { Events, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const config = require('../../config');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const guild = newState.guild;
        
        // Optimisation : On check la DB uniquement si le statut change vraiment
        if (oldState.channelId === newState.channelId) return; // Mute/Deafen, on s'en fiche pour l'instant

        const guildData = await Guild.findOne({ guildId: guild.id });
        if (!guildData || !guildData.logs.active || !guildData.logs.channelId || !guildData.logs.voice) return;

        const logChannel = guild.channels.cache.get(guildData.logs.channelId);
        if (!logChannel) return;

        const member = newState.member;
        let description = null;
        let color = config.COLORS?.DEFAULT || 0x5865F2;

        // Connexion
        if (!oldState.channelId && newState.channelId) {
            description = `🎙️ **${member.user.tag}** a rejoint le salon vocal **${newState.channel.name}**`;
            color = config.COLORS?.SUCCESS || 0x2ECC71;
        }
        // Déconnexion
        else if (oldState.channelId && !newState.channelId) {
            description = `🔇 **${member.user.tag}** a quitté le salon vocal **${oldState.channel.name}**`;
            color = config.COLORS?.ERROR || 0xE74C3C;
        }
        // Changement de salon
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            description = `➡️ **${member.user.tag}** a changé de salon : **${oldState.channel.name}** ➜ **${newState.channel.name}**`;
            color = config.COLORS?.WARNING || 0xF1C40F;
        }

        if (description) {
            const embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(description)
                .setTimestamp();
            
            try { await logChannel.send({ embeds: [embed] }); } catch (e) {}
        }
    },
};