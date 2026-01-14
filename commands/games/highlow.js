const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('highlow')
        .setDescription('Casino : 4 manches High/Low + 1 Finale "Signe" (x10) !')
        .addStringOption(option => 
            option.setName('mise')
                .setDescription('Ta mise (ex: 100, 500 ou "all")')
                .setRequired(true)
        ),

    async execute(interactionOrMessage, args) {
        let user, inputBet, replyFunc, getMessage;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            inputBet = interactionOrMessage.options.getString('mise');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            inputBet = args[0];
            replyFunc = async (p) => { 
                const { ephemeral, ...o } = p; 
                return await interactionOrMessage.channel.send(o); 
            };
            getMessage = async (msg) => msg;
        }

        const userData = await eco.get(user.id);
        if (!userData) return replyFunc({ content: "❌ Erreur profil.", ephemeral: true });

        // --- GESTION MISE (ALL-IN) ---
        let bet = 0;
        let isAllIn = false;

        if (!inputBet) return replyFunc({ content: "❌ Précise une mise.", ephemeral: true });

        if (['all', 'tout', 'max', 'all-in'].includes(inputBet.toLowerCase())) {
            bet = userData.cash;
            isAllIn = true;
        } else {
            bet = parseInt(inputBet);
        }

        if (isNaN(bet) || bet < 10) return replyFunc({ content: "❌ Mise invalide (Min 10€).", ephemeral: true });
        if (userData.cash < bet) return replyFunc({ content: `❌ Pas assez d'argent (${userData.cash}€).`, ephemeral: true });
        if (userData.jailEnd > Date.now()) return replyFunc({ content: "🔒 Pas de casino en prison.", ephemeral: true });

        // --- DÉBUT ---
        await eco.addCash(user.id, -bet);

        // Données Cartes
        const suits = [
            { icon: '♠️', name: 'Pique', id: 'spades' },
            { icon: '♥️', name: 'Cœur', id: 'hearts' },
            { icon: '♦️', name: 'Carreau', id: 'diamonds' },
            { icon: '♣️', name: 'Trèfle', id: 'clubs' }
        ];
        const ranks = [
            { name: '2', value: 2 }, { name: '3', value: 3 }, { name: '4', value: 4 },
            { name: '5', value: 5 }, { name: '6', value: 6 }, { name: '7', value: 7 },
            { name: '8', value: 8 }, { name: '9', value: 9 }, { name: '10', value: 10 },
            { name: 'V', value: 11 }, { name: 'D', value: 12 }, { name: 'R', value: 13 }, { name: 'A', value: 14 }
        ];

        const getRandomCard = () => {
            const suit = suits[Math.floor(Math.random() * suits.length)];
            const rank = ranks[Math.floor(Math.random() * ranks.length)];
            return { ...suit, ...rank, display: `[ ${rank.name} ${suit.icon} ]` };
        };

        let currentCard = getRandomCard();
        let multiplier = 1; 
        let round = 1;
        const maxRounds = 5;

        // Fonction pour générer l'Embed
        const generateEmbed = (status) => {
            let color = 0x3498DB;
            let description = "";
            let title = isAllIn ? `🎰 High/Low : ALL-IN (${bet} €)` : `🎰 High/Low : Manche ${round} / ${maxRounds}`;

            if (round === maxRounds) {
                // UI SPÉCIALE FINALE
                title = "🚨 MANCHE FINALE : LE SIGNE 🚨";
                color = 0x9B59B6; // Violet
                description = 
                    `Carte Actuelle : **${currentCard.display}**\n` +
                    `----------------------------\n` +
                    `⚠️ **DERNIER DÉFI** : Devine le SIGNE de la prochaine carte !\n\n` +
                    `💰 Gain actuel : **${bet * multiplier} €**\n` +
                    `🚀 **GAIN FINAL (x10) : ${bet * 10} €**\n\n` +
                    `*(Choisis le signe ci-dessous ou arrête-toi)*`;
            } else {
                // UI CLASSIQUE HIGH/LOW
                description = 
                    `Carte Actuelle : **${currentCard.display}**\n` +
                    `----------------------------\n` +
                    `💰 Gain sécurisé : **${bet * multiplier} €** (x${multiplier})\n` +
                    `🚀 Gain prochain tour : **${bet * (multiplier + 1)} €** (x${multiplier + 1})\n\n` +
                    `*(La prochaine sera Plus Haute ou Plus Basse ?)*`;
            }

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description)
                .setFooter({ text: "Manche 5 = x10 si tu trouves le signe !" });

            return embed;
        };

        // Fonction pour générer les Boutons
        const getRow = (canStop) => {
            const row = new ActionRowBuilder();

            if (round === maxRounds) {
                // --- BOUTONS MANCHE 5 (Signes) ---
                row.addComponents(
                    new ButtonBuilder().setCustomId('spades').setStyle(ButtonStyle.Secondary).setEmoji('♠️'),
                    new ButtonBuilder().setCustomId('hearts').setStyle(ButtonStyle.Secondary).setEmoji('♥️'),
                    new ButtonBuilder().setCustomId('diamonds').setStyle(ButtonStyle.Secondary).setEmoji('♦️'),
                    new ButtonBuilder().setCustomId('clubs').setStyle(ButtonStyle.Secondary).setEmoji('♣️')
                );
            } else {
                // --- BOUTONS CLASSIQUES (High/Low) ---
                row.addComponents(
                    new ButtonBuilder().setCustomId('lower').setLabel('Plus Basse').setStyle(ButtonStyle.Primary).setEmoji('⬇️'),
                    new ButtonBuilder().setCustomId('higher').setLabel('Plus Haute').setStyle(ButtonStyle.Primary).setEmoji('⬆️')
                );
            }

            // Bouton STOP (sauf au tout début)
            if (canStop) {
                const stopBtn = new ButtonBuilder().setCustomId('stop').setLabel('S\'arrêter').setStyle(ButtonStyle.Success).setEmoji('💰');
                
                // Si on est à la manche 5, on met le bouton Stop dans une 2ème ligne car max 5 boutons par ligne
                if (round === maxRounds) {
                    return [row, new ActionRowBuilder().addComponents(stopBtn)];
                } else {
                    row.addComponents(stopBtn);
                }
            }
            return [row];
        };

        // Envoi Initial
        const response = await replyFunc({ embeds: [generateEmbed()], components: getRow(false), fetchReply: true });
        const msg = await getMessage(response);
        if (!msg) return;

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id, 
            time: 60000 
        });

        collector.on('collect', async i => {
            // --- STOP ---
            if (i.customId === 'stop') {
                const finalGain = bet * multiplier;
                await eco.addCash(user.id, finalGain);
                await eco.addXP(user.id, 10 * multiplier);

                const stopEmbed = new EmbedBuilder()
                    .setColor(config.COLORS.SUCCESS || 0x2ECC71)
                    .setTitle('🤝 Partie terminée')
                    .setDescription(`Tu as décidé de t'arrêter.\n💰 Tu repars avec : **${finalGain} €**\nMultiplicateur : **x${multiplier}**`);

                await i.update({ embeds: [stopEmbed], components: [] });
                collector.stop();
                return;
            }

            // --- JEU ---
            let nextCard = getRandomCard();
            // Pour High/Low, on évite l'égalité de valeur. Pour les signes, on s'en fiche.
            if (round < maxRounds) {
                while (nextCard.value === currentCard.value) nextCard = getRandomCard();
            }

            const choice = i.customId;
            let hasWon = false;

            // LOGIQUE MANCHES 1-4 (High/Low)
            if (round < maxRounds) {
                hasWon = (choice === 'higher' && nextCard.value > currentCard.value) || 
                         (choice === 'lower' && nextCard.value < currentCard.value);
            } 
            // LOGIQUE MANCHE 5 (Signes)
            else {
                hasWon = (choice === nextCard.id); // ex: 'hearts' === 'hearts'
            }

            if (hasWon) {
                // --- VICTOIRE ---
                if (round === maxRounds) {
                    // VICTOIRE FINALE (JACKPOT x10)
                    const jackpot = bet * 10; 
                    await eco.addCash(user.id, jackpot);
                    await eco.addXP(user.id, 500); // Max XP

                    const winEmbed = new EmbedBuilder()
                        .setColor(0xF1C40F) // Or
                        .setTitle('🏆 JACKPOT FINAL !!!')
                        .setDescription(`**TU AS DEVINÉ LE SIGNE !**\n\nCarte finale : **${nextCard.display}**\n\n💰 **GAIN TITANESQUE : ${jackpot} €** (x10)`);
                    
                    await i.update({ embeds: [winEmbed], components: [] });
                    collector.stop();
                } else {
                    // MANCHE SUIVANTE
                    multiplier++; // +1 au multiplicateur
                    round++;      // Manche suivante
                    currentCard = nextCard;
                    
                    await i.update({ embeds: [generateEmbed()], components: getRow(true) });
                    collector.resetTimer();
                }

            } else {
                // --- DÉFAITE ---
                await eco.addBank('police_treasury', bet); // Argent perdu -> Police

                const loseEmbed = new EmbedBuilder()
                    .setColor(config.COLORS.ERROR || 0xE74C3C)
                    .setTitle(`💀 PERDU à la Manche ${round}`)
                    .setDescription(
                        `C'était du **${nextCard.display}**...\n` +
                        `Tu as tout perdu (Mise de ${bet} €).` +
                        (isAllIn ? `\n📉 **C'était un ALL-IN... Aïe.**` : "")
                    );
                
                await i.update({ embeds: [loseEmbed], components: [] });
                collector.stop();
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await eco.addBank('police_treasury', bet);
                try { await interactionOrMessage.channel.send(`⏱️ **Trop lent !** <@${user.id}>, mise perdue.`); } catch (e) {}
            }
        });
    }
};