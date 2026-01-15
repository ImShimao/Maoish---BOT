const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Pose une question à la boule magique')
        .addStringOption(option => 
            option.setName('question')
                .setDescription('Ta question (ex: Est-ce que je suis beau ?)')
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let question, user, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            question = interactionOrMessage.options.getString('question');
            user = interactionOrMessage.user;
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            if (!args || args.length === 0) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Il faut poser une question !")] 
                });
            }
            question = args.join(' ');
            user = interactionOrMessage.author;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
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
        let color = 0xF1C40F; // Jaune (Neutre)
        if (randomResponse.includes("🟢")) color = 0x2ECC71; // Vert (Succès)
        if (randomResponse.includes("🔴")) color = 0xE74C3C; // Rouge (Erreur)

        // On utilise embeds.info comme base (pour le footer auto, etc.)
        // Et on change la couleur manuellement selon la réponse
        const embed = embeds.info(interactionOrMessage, '🎱 La Boule Magique', null)
            .setColor(color)
            .addFields(
                { name: '❓ Question', value: question },
                { name: '🔮 Réponse', value: `**${randomResponse}**` }
            );

        return replyFunc({ embeds: [embed] });
    }
};