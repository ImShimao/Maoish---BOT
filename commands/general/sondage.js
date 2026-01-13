const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sondage')
        .setDescription('Lance un sondage avec boutons personnalisés')
        .addStringOption(option => 
            option.setName('question')
                .setDescription('La question à poser')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('options')
                .setDescription('Les choix séparés par des virgules (Max 5)')
                .setRequired(true)), // Ex: "Rouge, Bleu, Vert"

    async execute(interactionOrMessage, args) {
        let question, rawOptions;
        let author;
        let replyFunc;

        // --- 1. GESTION INPUT (Slash / Prefix) ---
        if (interactionOrMessage.isCommand?.()) {
            question = interactionOrMessage.options.getString('question');
            rawOptions = interactionOrMessage.options.getString('options');
            author = interactionOrMessage.user;
            replyFunc = async (payload) => await interactionOrMessage.reply(payload);
        } else {
            // Pour le format : +sondage Question | Choix1, Choix2, Choix3
            if (!args || args.length === 0) return interactionOrMessage.reply("❌ Usage : `+sondage Question | Choix1, Choix2`");
            
            const fullContent = args.join(' ');
            const parts = fullContent.split('|'); // On sépare la question des choix par "|"
            
            if (parts.length < 2) return interactionOrMessage.reply("❌ Il faut séparer la question et les choix avec `|`. Ex: `+sondage Ça va ? | Oui, Non`");
            
            question = parts[0].trim();
            rawOptions = parts[1].trim();
            author = interactionOrMessage.author;
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
            try { await interactionOrMessage.delete(); } catch (e) {}
        }

        // --- 2. PRÉPARATION DES CHOIX ---
        // On découpe les choix par la virgule
        const optionsList = rawOptions.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);

        if (optionsList.length < 2) return replyFunc({ content: "❌ Il faut au moins 2 choix !", ephemeral: true });
        if (optionsList.length > 5) return replyFunc({ content: "❌ Maximum 5 choix pour l'instant (limite Discord par ligne).", ephemeral: true });

        // Stockage des votes : Map<UserId, IndexDuChoix>
        const votes = new Map();

        // Fonction pour générer le graphique (Barre de progression)
        const generateDescription = () => {
            const totalVotes = votes.size;
            let desc = "";

            optionsList.forEach((opt, index) => {
                // Compter les votes pour cet index
                const count = Array.from(votes.values()).filter(v => v === index).length;
                const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
                
                // Barre de progression visuelle
                const barLength = 10;
                const filled = Math.round((percentage / 100) * barLength);
                const bar = '🟦'.repeat(filled) + '⬜'.repeat(barLength - filled);

                desc += `**${opt}**\n${bar} ${percentage}% (${count} voix)\n\n`;
            });
            
            desc += `\n*Total des votants : ${totalVotes}*`;
            return desc;
        };

        // --- 3. CRÉATION DE L'INTERFACE ---
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setAuthor({ name: '📊 Sondage', iconURL: author.displayAvatarURL() })
            .setTitle(question)
            .setDescription(generateDescription())
            .setFooter({ text: 'Cliquez sur les boutons pour voter !' })
            .setTimestamp();

        // Création des boutons (1 bouton par choix)
        const buttons = optionsList.map((opt, index) => 
            new ButtonBuilder()
                .setCustomId(`vote_${index}`)
                .setLabel(opt.substring(0, 80)) // Discord limite la longueur du label
                .setStyle(ButtonStyle.Primary)
        );

        // Bouton pour fermer le sondage (seul l'auteur pourra l'utiliser)
        const closeBtn = new ButtonBuilder()
            .setCustomId('close_poll')
            .setLabel('Arrêter le sondage')
            .setStyle(ButtonStyle.Danger);

        // On organise les boutons en lignes (ActionRow)
        const row1 = new ActionRowBuilder().addComponents(buttons);
        const row2 = new ActionRowBuilder().addComponents(closeBtn);

        // Envoi du message initial
        const message = await replyFunc({ embeds: [embed], components: [row1, row2], fetchReply: true });

        // --- 4. GESTION DES CLICS (Collector) ---
        // On écoute pendant 24 heures (ou jusqu'au redémarrage du bot)
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 24 * 60 * 60 * 1000 });

        collector.on('collect', async i => {
            // CAS 1 : Fermeture du sondage
            if (i.customId === 'close_poll') {
                if (i.user.id !== author.id) {
                    return i.reply({ content: "❌ Seul l'auteur du sondage peut l'arrêter.", ephemeral: true });
                }
                
                embed.setColor(0xFF0000)
                     .setFooter({ text: `Sondage terminé | Résultat final` });
                
                // On désactive tous les boutons
                const disabledRow = new ActionRowBuilder().addComponents(
                    buttons.map(b => ButtonBuilder.from(b).setDisabled(true))
                );

                await i.update({ embeds: [embed], components: [disabledRow] });
                return collector.stop();
            }

            // CAS 2 : Vote
            // On récupère l'index du vote (ex: "vote_0" -> 0)
            const choiceIndex = parseInt(i.customId.split('_')[1]);
            const userId = i.user.id;

            // Logique de vote
            if (votes.get(userId) === choiceIndex) {
                // Si l'utilisateur clique sur le choix qu'il a DÉJÀ fait -> On retire son vote (toggle)
                votes.delete(userId);
                await i.reply({ content: "Votre vote a été retiré.", ephemeral: true });
            } else {
                // Sinon on enregistre/écrase son vote
                votes.set(userId, choiceIndex);
                await i.reply({ content: `A voté pour : **${optionsList[choiceIndex]}**`, ephemeral: true });
            }

            // Mise à jour de l'embed
            embed.setDescription(generateDescription());
            
            // On modifie le message original avec les nouvelles stats
            // Note: i.reply est déjà fait (flags), donc on doit edit le message indépendamment
            await message.edit({ embeds: [embed] });
        });

        collector.on('end', () => {
            // Si le temps est écoulé (24h), on peut désactiver les boutons si ce n'est pas déjà fait
            if (message.editable && message.components.length > 0) {
                // Code optionnel pour nettoyer à la fin
            }
        });
    }
};