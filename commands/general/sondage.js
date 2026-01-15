const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

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
        let question, rawOptions, author, replyFunc;

        // --- 1. GESTION INPUT (Slash / Prefix) ---
        if (interactionOrMessage.isCommand?.()) {
            question = interactionOrMessage.options.getString('question');
            rawOptions = interactionOrMessage.options.getString('options');
            author = interactionOrMessage.user;
            replyFunc = async (payload) => await interactionOrMessage.reply(payload);
        } else {
            // Pour le format : +sondage Question | Choix1, Choix2, Choix3
            if (!args || args.length === 0) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Usage incorrect", "Exemple : `+sondage Ça va ? | Oui, Non`")]
                });
            }
            
            const fullContent = args.join(' ');
            const parts = fullContent.split('|'); // On sépare la question des choix par "|"
            
            if (parts.length < 2) {
                return interactionOrMessage.channel.send({ 
                    embeds: [embeds.error(interactionOrMessage, "Format invalide", "Il faut séparer la question et les choix avec `|`.\nEx: `+sondage Ça va ? | Oui, Non`")]
                });
            }
            
            question = parts[0].trim();
            rawOptions = parts[1].trim();
            author = interactionOrMessage.author;
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
            try { await interactionOrMessage.delete(); } catch (e) {}
        }

        // --- 2. PRÉPARATION DES CHOIX ---
        const optionsList = rawOptions.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);

        if (optionsList.length < 2) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Il faut au moins 2 choix !")], ephemeral: true });
        if (optionsList.length > 5) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Maximum 5 choix (limite Discord par ligne).")], ephemeral: true });

        // Stockage des votes : Map<UserId, IndexDuChoix>
        const votes = new Map();

        // Fonction pour générer le graphique
        const generateDescription = () => {
            const totalVotes = votes.size;
            let desc = "";

            optionsList.forEach((opt, index) => {
                const count = Array.from(votes.values()).filter(v => v === index).length;
                const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
                
                const barLength = 10;
                const filled = Math.round((percentage / 100) * barLength);
                const bar = '🟦'.repeat(filled) + '⬜'.repeat(barLength - filled);

                desc += `**${opt}**\n${bar} ${percentage}% (${count} voix)\n\n`;
            });
            
            desc += `\n*Total des votants : ${totalVotes}*`;
            return desc;
        };

        // --- 3. CRÉATION DE L'INTERFACE ---
        // On utilise embeds.info pour le sondage actif (Jaune/Or)
        const embed = embeds.info(interactionOrMessage, question, generateDescription())
            .setColor(0xFFD700)
            .setAuthor({ name: '📊 Sondage', iconURL: author.displayAvatarURL() })
            .setFooter({ text: 'Cliquez sur les boutons pour voter !' });

        // Création des boutons
        const buttons = optionsList.map((opt, index) => 
            new ButtonBuilder()
                .setCustomId(`vote_${index}`)
                .setLabel(opt.substring(0, 80)) 
                .setStyle(ButtonStyle.Primary)
        );

        const closeBtn = new ButtonBuilder()
            .setCustomId('close_poll')
            .setLabel('Arrêter le sondage')
            .setStyle(ButtonStyle.Danger);

        const row1 = new ActionRowBuilder().addComponents(buttons);
        const row2 = new ActionRowBuilder().addComponents(closeBtn);

        // Envoi
        const message = await replyFunc({ embeds: [embed], components: [row1, row2], fetchReply: true });

        // --- 4. GESTION DES CLICS ---
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 24 * 60 * 60 * 1000 });

        collector.on('collect', async i => {
            // CAS 1 : Fermeture
            if (i.customId === 'close_poll') {
                if (i.user.id !== author.id) {
                    return i.reply({ content: "❌ Seul l'auteur du sondage peut l'arrêter.", ephemeral: true });
                }
                
                embed.setColor(0xFF0000) // Rouge pour "Terminé"
                      .setFooter({ text: `Sondage terminé | Résultat final` });
                
                const disabledRow = new ActionRowBuilder().addComponents(
                    buttons.map(b => ButtonBuilder.from(b).setDisabled(true))
                );

                await i.update({ embeds: [embed], components: [disabledRow] });
                return collector.stop();
            }

            // CAS 2 : Vote
            const choiceIndex = parseInt(i.customId.split('_')[1]);
            const userId = i.user.id;

            if (votes.get(userId) === choiceIndex) {
                votes.delete(userId);
                await i.reply({ content: "Votre vote a été retiré.", ephemeral: true });
            } else {
                votes.set(userId, choiceIndex);
                await i.reply({ content: `A voté pour : **${optionsList[choiceIndex]}**`, ephemeral: true });
            }

            // Mise à jour de l'embed
            embed.setDescription(generateDescription());
            await message.edit({ embeds: [embed] });
        });
    }
};