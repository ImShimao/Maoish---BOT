const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('shop').setDescription('Affiche la boutique'),
    async execute(interactionOrMessage) {
        const embed = new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle('🛒 Boutique Maoish')
            .setDescription('Utilise `/buy <objet>` pour acheter !')
            .addFields(
                { name: '👑 Rôle VIP (10.000 €)', value: 'Te donne le rôle @VIP sur le serveur.' },
                { name: '🍪 Cookie (100 €)', value: 'Juste un bon cookie virtuel.' }
            );
        
        if (interactionOrMessage.isCommand?.()) interactionOrMessage.reply({ embeds: [embed] });
        else interactionOrMessage.channel.send({ embeds: [embed] });
    }
};