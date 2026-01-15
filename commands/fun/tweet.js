const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tweet')
        .setDescription('Génère un faux tweet')
        .addUserOption(option => 
            option.setName('utilisateur')
                .setDescription('Qui tweete ?')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Le contenu du tweet')
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let user, text, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.options.getUser('utilisateur');
            text = interactionOrMessage.options.getString('message');
            // Pour les erreurs, on répond en ephemeral
            replyFunc = (p) => interactionOrMessage.reply({ ...p, ephemeral: true });
        } else {
            const mention = interactionOrMessage.mentions.users.first();
            if (!mention) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Mentionne quelqu'un ! Ex: `+tweet @Shimao J'adore les pâtes`")] 
                });
            }
            user = mention;
            // On enlève la mention du texte
            text = args.slice(1).join(' ');
            if (!text) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Il manque le contenu du tweet !")] 
                });
            }
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // Construction de l'URL API
        const avatar = user.displayAvatarURL({ extension: 'png', size: 512 });
        const username = user.username;
        const displayname = user.globalName || user.username;
        
        const apiUrl = `https://some-random-api.com/canvas/tweet?avatar=${encodeURIComponent(avatar)}&displayname=${encodeURIComponent(displayname)}&username=${encodeURIComponent(username)}&comment=${encodeURIComponent(text)}`;

        // Création de l'embed via l'usine
        // On met un titre vide ou générique, et on force la couleur Twitter
        const embed = embeds.info(interactionOrMessage, '🐦 Nouveau Tweet', null)
            .setColor(0x1DA1F2) // Bleu Twitter
            .setImage(apiUrl)
            .setFooter({ text: 'Maoish • FakeTweet' });

        // --- ENVOI DISCRET ---
        if (interactionOrMessage.isCommand?.()) {
            // 1. On envoie l'image dans le salon (Public)
            await interactionOrMessage.channel.send({ embeds: [embed] });
            
            // 2. On valide la commande en "secret" (Ephemeral) pour ne pas bloquer l'interaction
            await interactionOrMessage.reply({ 
                embeds: [embeds.success(interactionOrMessage, "Tweet envoyé !", "Le tweet a été posté dans le salon.")], 
                ephemeral: true 
            });
        } else {
            // Version préfixe (+tweet)
            await interactionOrMessage.channel.send({ embeds: [embed] });
            
            // Supprime le message de la commande pour faire plus propre
            try { await interactionOrMessage.delete(); } catch(e) {}
        }
    }
};