const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Fait parler le bot')
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Ce que le bot doit dire')
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let text;

        if (interactionOrMessage.isCommand?.()) {
            text = interactionOrMessage.options.getString('message');
            // On confirme à l'admin que c'est fait (message caché)
            await interactionOrMessage.reply({ content: '✅ Message envoyé !', ephemeral: true });
            // Le bot envoie le vrai message dans le canal
            await interactionOrMessage.channel.send(text);
        } else {
            if (!args || args.length === 0) return;
            text = args.join(' ');
            // On supprime ta commande pour que personne ne voie que c'est toi
            try { await interactionOrMessage.delete(); } catch (e) {}
            await interactionOrMessage.channel.send(text);
        }
    }
};