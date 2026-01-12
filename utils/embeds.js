// utils/embeds.js
const { EmbedBuilder } = require('discord.js');
const config = require('../config.js');

module.exports = {
    template: (title, description, colorType = 'MAIN') => {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(config.COLORS[colorType] || config.COLORS.MAIN)
            .setFooter({ text: config.FOOTER_TEXT })
            .setTimestamp();
    },
    error: (msg) => {
        return new EmbedBuilder()
            .setColor(config.COLORS.ERROR)
            .setDescription(`❌ ${msg}`);
    }
};