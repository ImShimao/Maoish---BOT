const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    // 1. La configuration pour la Slash Command
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Répond Pong!'),

    // 2. Ce qui se passe quand on lance la commande (Logique commune)
    async execute(interactionOrMessage) {
        // On définit la réponse épurée
        const reponse = 'Pong! 🏓';

        // Si c'est une Slash Command (Interaction)
        if (interactionOrMessage.isCommand?.()) {
            await interactionOrMessage.reply(reponse);
        } 
        // Si c'est une commande préfixe (Message)
        else {
            interactionOrMessage.reply(reponse);
        }
    }
};