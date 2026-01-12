const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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
        let user, text;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.options.getUser('utilisateur');
            text = interactionOrMessage.options.getString('message');
        } else {
            const mention = interactionOrMessage.mentions.users.first();
            if (!mention) return interactionOrMessage.reply("❌ Mentionne quelqu'un ! Ex: `+tweet @Shimao J'adore les pâtes`");
            user = mention;
            // On enlève la mention du texte
            text = args.slice(1).join(' ');
            if (!text) return interactionOrMessage.reply("❌ Il manque le message !");
        }

        // API gratuite pour générer l'image
        const avatar = user.displayAvatarURL({ extension: 'png', size: 512 });
        const username = user.username;
        const displayname = user.globalName || user.username;
        
        // Construction de l'URL
        const apiUrl = `https://some-random-api.com/canvas/tweet?avatar=${encodeURIComponent(avatar)}&displayname=${encodeURIComponent(displayname)}&username=${encodeURIComponent(username)}&comment=${encodeURIComponent(text)}`;

        const embed = new EmbedBuilder()
            .setColor(0x1DA1F2) // Bleu Twitter
            .setImage(apiUrl)
            .setFooter({ text: 'Maoish • FakeTweet' });

        // --- ENVOI DISCRET (Sans "répondre") ---
        if (interactionOrMessage.isCommand?.()) {
            // 1. On envoie l'image dans le salon comme un nouveau message
            await interactionOrMessage.channel.send({ embeds: [embed] });
            
            // 2. On valide la commande en "secret" pour ne pas bloquer le bot
            await interactionOrMessage.reply({ content: '✅ Tweet envoyé !', ephemeral: true });
        } else {
            // Version préfixe (+tweet)
            await interactionOrMessage.channel.send({ embeds: [embed] });
            
            // (Optionnel) Supprime le message de la commande pour faire plus propre
            try { await interactionOrMessage.delete(); } catch(e) {}
        }
    }
};