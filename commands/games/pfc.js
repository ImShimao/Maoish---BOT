const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pfc')
        .setDescription('Joue à Pierre-Feuille-Ciseaux contre Maoish'),

    async execute(interactionOrMessage) {
        let user, replyFunc;

        // Gestion Hybride (Slash / Prefix)
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (payload) => await interactionOrMessage.reply(payload);
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
        }

        // --- SCORES (Session actuelle) ---
        let playerScore = 0;
        let botScore = 0;

        // --- FONCTIONS UTILITAIRES ---
        const getStartEmbed = () => new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('✊✋✌️ Pierre - Feuille - Ciseaux')
            .setDescription(`**Score :** ${user.username} ${playerScore} - ${botScore} Maoish\n\nFais ton choix !`)
            .setFooter({ text: 'Maoish • Gaming' });

        const getGameRow = (disabled = false) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pierre').setLabel('✊ Pierre').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
            new ButtonBuilder().setCustomId('feuille').setLabel('✋ Feuille').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
            new ButtonBuilder().setCustomId('ciseaux').setLabel('✌️ Ciseaux').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
        );

        const getRevancheRow = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('revanche').setLabel('🔄 Revanche').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('stop').setLabel('Arrêter').setStyle(ButtonStyle.Danger)
        );

        // Envoi du message initial
        const message = await replyFunc({ 
            embeds: [getStartEmbed()], 
            components: [getGameRow()], 
            withResponse: true 
        });

        // --- COLLECTOR (Gère le jeu en boucle) ---
        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id, // Seul le joueur peut cliquer
            time: 60000 // 1 minute d'inactivité max avant fermeture
        });

        collector.on('collect', async i => {
            // REINITIALISATION DU TIMER (Pour ne pas que le jeu coupe si on joue longtemps)
            collector.resetTimer();

            // CAS 1 : ARRÊT
            if (i.customId === 'stop') {
                await i.update({ content: '🛑 Jeu terminé !', components: [] });
                return collector.stop();
            }

            // CAS 2 : REVANCHE
            if (i.customId === 'revanche') {
                // On remet l'embed de départ et les boutons actifs
                await i.update({ 
                    embeds: [getStartEmbed()], 
                    components: [getGameRow(false)] // false = boutons actifs
                });
                return;
            }

            // CAS 3 : JEU (Pierre/Feuille/Ciseaux)
            const choices = ['pierre', 'feuille', 'ciseaux'];
            const botChoice = choices[Math.floor(Math.random() * choices.length)];
            const userChoice = i.customId;

            let resultTitle;
            let resultColor;

            // Logique du jeu
            if (userChoice === botChoice) {
                resultTitle = "🤝 Égalité !";
                resultColor = 0xFFA500; // Orange
            } else if (
                (userChoice === 'pierre' && botChoice === 'ciseaux') ||
                (userChoice === 'feuille' && botChoice === 'pierre') ||
                (userChoice === 'ciseaux' && botChoice === 'feuille')
            ) {
                resultTitle = "🏆 Tu as gagné !";
                resultColor = 0x00FF00; // Vert
                playerScore++;
            } else {
                resultTitle = "💀 J'ai gagné !";
                resultColor = 0xFF0000; // Rouge
                botScore++;
            }

            const map = { 'pierre': '✊ Pierre', 'feuille': '✋ Feuille', 'ciseaux': '✌️ Ciseaux' };

            const resultEmbed = new EmbedBuilder()
                .setColor(resultColor)
                .setTitle(resultTitle)
                .setDescription(`**Score :** ${user.username} ${playerScore} - ${botScore} Maoish`)
                .addFields(
                    { name: 'Ton choix', value: map[userChoice], inline: true },
                    { name: 'VS', value: '⚡', inline: true },
                    { name: 'Mon choix', value: map[botChoice], inline: true }
                );

            // On met à jour le message :
            // 1. Embed de résultat
            // 2. Boutons de jeu GRISÉS (disabled = true)
            // 3. Bouton REVANCHE en dessous
            await i.update({ 
                embeds: [resultEmbed], 
                components: [getGameRow(true), getRevancheRow()] 
            });
        });

        // Quand le temps est écoulé (inactivité)
        collector.on('end', async (collected, reason) => {
            if (reason !== 'user') { // Si ce n'est pas l'user qui a cliqué sur Stop
                try {
                    // On désactive tout proprement
                    const disabledGame = getGameRow(true);
                    await message.edit({ components: [disabledGame] });
                } catch (e) {}
            }
        });
    }
};