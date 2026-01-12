const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Pose une question à la boule magique')
        .addStringOption(option => 
            option.setName('question')
                .setDescription('Ta question (ex: Est-ce que je suis beau ?)')
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let question, user;

        if (interactionOrMessage.isCommand?.()) {
            question = interactionOrMessage.options.getString('question');
            user = interactionOrMessage.user;
        } else {
            if (!args || args.length === 0) return interactionOrMessage.reply("❌ Il faut poser une question !");
            question = args.join(' ');
            user = interactionOrMessage.author;
        }

        // Liste des réponses possibles
        const responses = [
            "🟢 C'est certain.",
            "🟢 Sans aucun doute.",
            "🟢 Oui, absolument.",
            "🟡 C'est flou, réessaie.",
            "🟡 Je ne peux pas répondre maintenant.",
            "🟡 Mieux vaut ne pas te le dire...",
            "🔴 N'y compte pas.",
            "🔴 Ma réponse est non.",
            "🔴 Mes sources disent non."
        ];

        // Choix aléatoire
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];

        // Couleur en fonction de la réponse
        let color = 0xFFA500; // Orange (Neutre)
        if (randomResponse.includes("🟢")) color = 0x00FF00; // Vert
        if (randomResponse.includes("🔴")) color = 0xFF0000; // Rouge

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🎱 La Boule Magique')
            .addFields(
                { name: '❓ Question', value: question },
                { name: '🔮 Réponse', value: `**${randomResponse}**` }
            )
            .setFooter({ text: `Demandé par ${user.username}` });

        if (interactionOrMessage.isCommand?.()) await interactionOrMessage.reply({ embeds: [embed] });
        else await interactionOrMessage.channel.send({ embeds: [embed] });
    }
};