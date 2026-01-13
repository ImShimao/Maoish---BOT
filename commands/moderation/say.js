// AJOUT de PermissionFlagsBits ici
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Fait parler le bot')
        // Correction de l'import ici
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Ce que le bot doit dire')
                .setRequired(true)),
            
    async execute(interactionOrMessage, args) {
        let text;

        if (interactionOrMessage.isCommand?.()) {
            text = interactionOrMessage.options.getString('message');
            // Confirmation discrète à l'admin
            await interactionOrMessage.reply({ content: '✅ Message envoyé !', flags: true });
            // Envoi du message dans le salon
            await interactionOrMessage.channel.send(text);
        } else {
            // Pour le préfixe "+"
            if (!args || args.length === 0) return;
            text = args.join(' ');

            // Suppression du message de commande (+say ...)
            try { 
                if (interactionOrMessage.deletable) await interactionOrMessage.delete(); 
            } catch (e) { console.error("Impossible de supprimer le message :", e); }

            await interactionOrMessage.channel.send(text);
        }
    }
};