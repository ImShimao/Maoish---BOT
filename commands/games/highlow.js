const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('highlow')
        .setDescription('Casino : Enchaîne 5 manches avec des règles aléatoires (High-Low / Couleur / Signe) !')
        .addStringOption(option => 
            option.setName('mise')
                .setDescription('Ta mise (ex: 100, 500 ou "all")')
                .setRequired(true)
        ),

    async execute(interactionOrMessage, args) {
        let user, inputBet, replyFunc, getMessage;
        // ✅ 1. DÉFINITION DE GUILDID
        const guildId = interactionOrMessage.guild.id;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            inputBet = interactionOrMessage.options.getString('mise');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            inputBet = args && args.length > 0 ? args[0] : null;
            replyFunc = async (p) => { 
                const { ephemeral, ...o } = p; 
                return await interactionOrMessage.channel.send(o); 
            };
            getMessage = async (msg) => msg;
        }

        // ✅ Ajout de guildId
        const userData = await eco.get(user.id, guildId);
        if (!userData) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Erreur lors du chargement du profil.")], ephemeral: true });

        // --- GESTION MISE ---
        let bet = 0;
        let isAllIn = false;

        if (!inputBet) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu dois préciser une mise (ex: `100` ou `all`).")] });

        const cleanInput = inputBet.toLowerCase().trim();
        const allInKeywords = ['all', 'tout', 'max', 'all-in', 'allin'];

        if (allInKeywords.includes(cleanInput)) {
            bet = Math.floor(userData.cash); 
            isAllIn = true;
        } else {
            bet = parseInt(cleanInput);
        }

        if (isNaN(bet)) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "La mise doit être un nombre valide.")] });
        
        if (bet < 10) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, `Mise minimum : **10 €**\n(Tu as essayé de miser ${bet} €)`)] });
        }

        if (userData.cash < bet) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `Tu n'as pas assez d'argent !\n💳 Ton solde : **${userData.cash} €**`)] });
        
        // --- SÉCURITÉ PRISON ---
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas de casino pour les détenus.\nLibération dans : **${timeLeft} minutes**.`)],
                ephemeral: true 
            });
        }

        // --- DÉBUT DU JEU ---
        // ✅ Ajout de guildId
        await eco.addCash(user.id, guildId, -bet);

        // Données Cartes
        const suits = [
            { icon: '♠️', name: 'Pique', id: 'spades', color: 'black' },
            { icon: '♥️', name: 'Cœur', id: 'hearts', color: 'red' },
            { icon: '♦️', name: 'Carreau', id: 'diamonds', color: 'red' },
            { icon: '♣️', name: 'Trèfle', id: 'clubs', color: 'black' }
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

        const getRandomMode = (currentRound) => {
            const rand = Math.random();
            // Round 1 : Facile (HighLow ou Couleur)
            if (currentRound === 1) {
                if (rand < 0.50) return 'highlow';
                return 'color';
            }
            // Rounds suivants
            if (rand < 0.40) return 'highlow';
            if (rand < 0.80) return 'color';
            return 'suit'; // 20% Difficile
        };

        let currentCard = getRandomCard();
        let multiplier = 1; 
        let round = 1;
        const maxRounds = 5;
        let currentMode = getRandomMode(round); 

        // Fonction pour générer l'Embed via l'usine
        const generateEmbed = () => {
            let color = 0x3498DB;
            let title = isAllIn ? `🎰 Casino : ALL-IN (${bet} €)` : `🎰 Casino : Manche ${round} / ${maxRounds}`;
            let instructions = "";
            let modeTitle = "";

            switch(currentMode) {
                case 'highlow':
                    modeTitle = "🎲 MODE : PLUS HAUT / PLUS BAS";
                    instructions = "La prochaine carte sera-t-elle plus **Haute** ou plus **Basse** ?";
                    color = 0x3498DB; // Bleu
                    break;
                case 'color':
                    modeTitle = "🎨 MODE : ROUGE OU NOIR";
                    instructions = "La prochaine carte sera-t-elle **🔴 Rouge** ou **⚫ Noire** ?";
                    color = 0xE67E22; // Orange
                    break;
                case 'suit':
                    modeTitle = "🔮 MODE : DEVINE LE SIGNE (Difficile !)";
                    instructions = "Devine le signe exact de la prochaine carte !\n⚠️ **Gain doublé si tu réussis !**";
                    color = 0x9B59B6; // Violet
                    break;
            }

            const description = 
                `Carte Actuelle : **${currentCard.display}**\n` +
                `----------------------------\n` +
                `**${modeTitle}**\n` +
                `*${instructions}*\n\n` +
                `💰 Gain actuel : **${bet * multiplier} €** (x${multiplier})`;

            // Utilisation de embeds.info avec override
            const embed = embeds.info(interactionOrMessage, title, description)
                .setColor(color)
                .setFooter({ text: "Tu peux t'arrêter à tout moment pour sécuriser tes gains." });

            return embed;
        };

        const getRow = (canStop) => {
            const row = new ActionRowBuilder();

            if (currentMode === 'highlow') {
                row.addComponents(
                    new ButtonBuilder().setCustomId('lower').setLabel('Plus Bas').setStyle(ButtonStyle.Primary).setEmoji('⬇️'),
                    new ButtonBuilder().setCustomId('higher').setLabel('Plus Haut').setStyle(ButtonStyle.Primary).setEmoji('⬆️')
                );
            } else if (currentMode === 'color') {
                row.addComponents(
                    new ButtonBuilder().setCustomId('red').setLabel('Rouge').setStyle(ButtonStyle.Danger).setEmoji('🔴'),
                    new ButtonBuilder().setCustomId('black').setLabel('Noir').setStyle(ButtonStyle.Secondary).setEmoji('⚫')
                );
            } else if (currentMode === 'suit') {
                row.addComponents(
                    new ButtonBuilder().setCustomId('spades').setStyle(ButtonStyle.Secondary).setEmoji('♠️'),
                    new ButtonBuilder().setCustomId('hearts').setStyle(ButtonStyle.Danger).setEmoji('♥️'),
                    new ButtonBuilder().setCustomId('diamonds').setStyle(ButtonStyle.Danger).setEmoji('♦️'),
                    new ButtonBuilder().setCustomId('clubs').setStyle(ButtonStyle.Secondary).setEmoji('♣️')
                );
            }

            if (canStop) {
                const stopBtn = new ButtonBuilder().setCustomId('stop').setLabel('Stop & Cashout').setStyle(ButtonStyle.Success).setEmoji('💰');
                
                if (row.components.length >= 4) {
                    return [row, new ActionRowBuilder().addComponents(stopBtn)];
                } else {
                    row.addComponents(stopBtn);
                }
            }
            return [row];
        };

        // Envoi Initial
        let response;
        try {
            response = await replyFunc({ embeds: [generateEmbed()], components: getRow(false), fetchReply: true });
        } catch (e) {
            // ✅ Ajout de guildId pour remboursement
            await eco.addCash(user.id, guildId, bet);
            return console.error("Erreur highlow:", e);
        }

        const msg = await getMessage(response);
        if (!msg) return;

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id, 
            time: 60000 
        });

        collector.on('collect', async i => {
            // --- STOP (Cashout) ---
            if (i.customId === 'stop') {
                const finalGain = bet * multiplier;
                // ✅ Ajout de guildId
                await eco.addCash(user.id, guildId, finalGain);
                await eco.addXP(user.id, guildId, 10 * multiplier);

                const stopEmbed = embeds.success(interactionOrMessage, '🤝 Partie terminée', 
                    `Tu as décidé de t'arrêter.\n\n💰 Tu repars avec : **${finalGain} €**\nMultiplicateur final : **x${multiplier}**`
                );

                await i.update({ embeds: [stopEmbed], components: [] });
                collector.stop();
                return;
            }

            // --- JEU ---
            let nextCard = getRandomCard();

            // Éviter l'égalité pour High/Low
            if (currentMode === 'highlow') {
                while (nextCard.value === currentCard.value) nextCard = getRandomCard();
            }

            const choice = i.customId;
            let hasWon = false;

            if (currentMode === 'highlow') {
                hasWon = (choice === 'higher' && nextCard.value > currentCard.value) || 
                         (choice === 'lower' && nextCard.value < currentCard.value);
            } 
            else if (currentMode === 'color') {
                const isRed = (nextCard.id === 'hearts' || nextCard.id === 'diamonds');
                if (choice === 'red' && isRed) hasWon = true;
                if (choice === 'black' && !isRed) hasWon = true;
            } 
            else if (currentMode === 'suit') {
                hasWon = (choice === nextCard.id);
            }

            if (hasWon) {
                // VICTOIRE
                const bonus = (currentMode === 'suit') ? 2 : 1;
                multiplier += bonus;

                if (round >= maxRounds) {
                    // FIN DE PARTIE (Gagné)
                    const jackpot = bet * multiplier; 
                    // ✅ Ajout de guildId
                    await eco.addCash(user.id, guildId, jackpot);
                    await eco.addXP(user.id, guildId, 500); 

                    const winEmbed = embeds.success(interactionOrMessage, '🏆 VICTOIRE TOTALE !!!', 
                        `Tu as battu les 5 manches !\n\nCarte finale : **${nextCard.display}**\n\n💰 **GAIN : ${jackpot} €** (x${multiplier})`
                    ).setColor(0xF1C40F); // Or
                    
                    await i.update({ embeds: [winEmbed], components: [] });
                    collector.stop();
                } else {
                    // MANCHE SUIVANTE
                    round++;
                    currentCard = nextCard;
                    currentMode = getRandomMode(round);
                    
                    await i.update({ embeds: [generateEmbed()], components: getRow(true) });
                    collector.resetTimer();
                }

            } else {
                // DÉFAITE
                // ✅ Ajout de guildId pour la banque de la police
                await eco.addBank('police_treasury', guildId, bet);

                const loseEmbed = embeds.error(interactionOrMessage, 
                    `Le mode était : **${currentMode.toUpperCase()}**\n` +
                    `La carte était : **${nextCard.display}**\n\n` +
                    `Tu as tout perdu (Mise de ${bet} €).` +
                    (isAllIn ? `\n📉 **C'était un ALL-IN... Aïe.**` : "")
                ).setTitle(`💀 PERDU à la Manche ${round}`);
                
                await i.update({ embeds: [loseEmbed], components: [] });
                collector.stop();
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                // ✅ Ajout de guildId
                await eco.addBank('police_treasury', guildId, bet);
                try { 
                    const timeoutEmbed = embeds.error(interactionOrMessage, "⏱️ Trop lent ! Mise perdue.");
                    await msg.edit({ embeds: [timeoutEmbed], components: [] });
                } catch (e) {}
            }
        });
    }
};