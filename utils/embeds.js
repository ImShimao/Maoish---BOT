const { EmbedBuilder } = require('discord.js');
const config = require('../config');

// Fonction interne pour la base
function createBaseEmbed(interactionOrUser) {
    // Gestion de l'utilisateur qu'il vienne d'une interaction ou d'un message
    const user = interactionOrUser.user || interactionOrUser.author || interactionOrUser;
    
    return new EmbedBuilder()
        .setTimestamp()
        .setFooter({ 
            text: config.FOOTER_TEXT || 'Maoish System', 
            iconURL: user.displayAvatarURL ? user.displayAvatarURL() : null 
        });
}

module.exports = {
    // ✅ SUCCÈS
    success: (interaction, title, description) => {
        const embed = createBaseEmbed(interaction)
            .setColor(config.COLORS.SUCCESS)
            .setTitle(title ? `✅ ${title}` : 'Succès');
        
        if (description) embed.setDescription(description);
        return embed;
    },

    // ❌ ERREUR (CORRIGÉ)
    error: (interaction, title, description) => {
        const embed = createBaseEmbed(interaction).setColor(config.COLORS.ERROR);

        // Cas 1 : On a un Titre ET une Description
        if (title && description) {
            embed.setTitle(`❌ ${title}`);
            embed.setDescription(description);
        } 
        // Cas 2 : On a juste un message (le premier argument)
        // On le met en DESCRIPTION pour que ce soit plus lisible, et on met juste une croix en titre.
        else if (title) {
            embed.setTitle('❌'); 
            embed.setDescription(title);
        }
        // Cas 3 : Rien n'est fourni (Fallback)
        else {
            embed.setTitle('❌ Erreur');
            embed.setDescription("Une erreur inconnue est survenue.");
        }
        
        return embed;
    },

    // ℹ️ INFO
    info: (interaction, title, description) => {
        const embed = createBaseEmbed(interaction)
            .setColor(config.COLORS.MAIN)
            .setTitle(title);
            
        // PROTECTION ANTI-CRASH
        if (description && description.length > 0) embed.setDescription(description);
        return embed;
    },

    // ⚠️ ATTENTION
    warning: (interaction, title, description) => {
        const embed = createBaseEmbed(interaction)
            .setColor(config.COLORS.WARNING)
            .setTitle(`⚠️ ${title}`);
            
        if (description) embed.setDescription(description);
        return embed;
    },

    // 👷 JOB
    job: (interaction, title, description) => {
        const embed = createBaseEmbed(interaction)
            .setColor(config.COLORS.JOB)
            .setTitle(`👷 ${title}`);
            
        if (description) embed.setDescription(description);
        return embed;
    }
};