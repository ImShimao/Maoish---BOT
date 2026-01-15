const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('demineur')
        .setDescription('Jeu des Mines (Style Casino)')
        .addStringOption(o => o.setName('mise').setDescription('Combien parier ? (ou "all")').setRequired(true))
        .addIntegerOption(o => 
            o.setName('bombes')
             .setDescription('Nombre de bombes (1-15). Plus il y en a, plus tu gagnes gros !')
             .setMinValue(1)
             .setMaxValue(15)
             .setRequired(false)
        ),

    async execute(interactionOrMessage) {
        let user, betInput, bombCount, replyFunc, getMessage;

        // --- GESTION SLASH / PREFIX ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            bombCount = interactionOrMessage.options.getInteger('bombes') || 3; 
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            const args = interactionOrMessage.content.split(' ');
            betInput = args[1] || "0";
            bombCount = parseInt(args[2]) || 3;
            if (bombCount < 1) bombCount = 1;
            if (bombCount > 15) bombCount = 15;
            
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
            getMessage = async (msg) => msg;
        }

        const userData = await eco.get(user.id);
        
        // --- 1. SÉCURITÉ PRISON ---
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas de déminage ici.\nLibération dans : **${timeLeft} minutes**.`)],
                ephemeral: true 
            });
        }

        // --- 2. LOGIQUE MISE ---
        let bet = 0;
        if (['all', 'tout', 'tapis', 'max'].includes(betInput.toLowerCase())) {
            bet = userData.cash;
        } else {
            bet = parseInt(betInput);
        }

        if (isNaN(bet) || bet <= 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Indique une mise valide (nombre ou 'all').")] });
        if (userData.cash < bet) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `Tu n'as pas assez d'argent ! (Tu as ${userData.cash}€)`)] });
        if (bet < 10) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Mise minimum : 10 €")] });

        // Prélèvement
        await eco.addCash(user.id, -bet);

        // --- 3. CONFIGURATION DU JEU ---
        const columns = 5;
        const rowsCount = 4; 
        const gridSize = columns * rowsCount; // 20 cases
        const bombIndices = new Set();
        
        while(bombIndices.size < bombCount) {
            bombIndices.add(Math.floor(Math.random() * gridSize));
        }

        let multiplier = 1.0;
        let revealedCount = 0;
        let gameActive = true;
        let clickedIndices = new Set();

        // Calcul du multiplicateur (Algo standard casino)
        const calculateNextMultiplier = (currentMult, currentRevealed) => {
            const remainingCells = gridSize - currentRevealed;
            const remainingSafe = gridSize - bombCount - currentRevealed;
            if (remainingSafe <= 0) return 0; 
            
            const houseEdge = 0.99; 
            const rawMulti = currentMult * (remainingCells / remainingSafe);
            return rawMulti * houseEdge;
        };

        // Rendu des boutons
        const renderComponents = (gameOver = false, win = false) => {
            const rows = [];
            for (let i = 0; i < rowsCount; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < columns; j++) {
                    const index = i * columns + j;
                    const btn = new ButtonBuilder().setCustomId(`mine_${index}`);

                    if (clickedIndices.has(index) || gameOver) {
                        if (bombIndices.has(index)) {
                            // C'est une bombe
                            btn.setEmoji('💣').setStyle(ButtonStyle.Danger).setDisabled(true);
                        } else {
                            // C'est un diamant
                            if (gameOver && !clickedIndices.has(index)) {
                                // Révélé à la fin (non cliqué) -> Gris
                                btn.setEmoji('💎').setStyle(ButtonStyle.Secondary).setDisabled(true);
                            } else {
                                // Gagné (cliqué) -> Vert
                                btn.setEmoji('💎').setStyle(ButtonStyle.Success).setDisabled(true);
                            }
                        }
                    } else {
                        // Case cachée
                        btn.setEmoji('❓').setStyle(ButtonStyle.Secondary).setDisabled(gameOver);
                    }
                    row.addComponents(btn);
                }
                rows.push(row);
            }

            const currentWin = Math.floor(bet * multiplier);
            const controlRow = new ActionRowBuilder();
            
            if (!gameOver) {
                controlRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId('cashout')
                        .setLabel(`💰 S'arrêter (Gain: ${currentWin} €)`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(revealedCount === 0) 
                );
            } else {
                controlRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId('ended')
                        .setLabel(win ? `GAGNÉ : ${currentWin} €` : 'PERDU')
                        .setStyle(win ? ButtonStyle.Success : ButtonStyle.Danger)
                        .setDisabled(true)
                );
            }
            rows.push(controlRow);
            return rows;
        };

        const nextMulti = calculateNextMultiplier(multiplier, revealedCount);

        // Utilisation de embeds.info pour l'état du jeu
        // On garde le footer personnalisé pour le gameplay
        const embed = embeds.info(interactionOrMessage, `💣 Démineur (${bombCount} Bombes)`,
            `Mise : **${bet} €**\nMultiplicateur : **x${multiplier.toFixed(2)}**\nProchain clic : **x${nextMulti.toFixed(2)}**`
        )
        .setColor(0x3498DB)
        .setFooter({ text: 'Choisis une case...' });

        // Envoi Initial
        let response;
        try {
             response = await replyFunc({ embeds: [embed], components: renderComponents(), fetchReply: true });
        } catch (e) {
            console.error(e);
            await eco.addCash(user.id, bet); // Remboursement si erreur
            return; 
        }

        const message = await getMessage(response);
        if (!message) return;

        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id,
            time: 60000 
        });

        collector.on('collect', async i => {
            const id = i.customId;

            // --- CASHOUT (STOP) ---
            if (id === 'cashout') {
                const winAmount = Math.floor(bet * multiplier);
                await eco.addCash(user.id, winAmount);
                
                // Embed Succès
                const successEmbed = embeds.success(interactionOrMessage, '🤑 Cashout !', 
                    `Tu as encaissé tes gains !\n\n💰 Gain : **+${winAmount} €**\nMultiplicateur : **x${multiplier.toFixed(2)}**`
                );
                
                await i.update({ embeds: [successEmbed], components: renderComponents(true, true) });
                return collector.stop();
            }

            // --- CLIC SUR UNE CASE ---
            const index = parseInt(id.split('_')[1]);

            if (bombIndices.has(index)) {
                // PERDU (BOOM)
                // L'argent est déjà perdu (retiré au début)
                // On peut l'envoyer à la police si tu veux, sinon il est juste brûlé.
                await eco.addBank('police_treasury', bet); // Optionnel

                const failEmbed = embeds.error(interactionOrMessage, 
                    `💥 **BOOM !** Tu as sauté sur une mine...\nTu perds ta mise de **${bet} €**.`
                ).setTitle('💣 Démineur - Perdu');
                
                await i.update({ embeds: [failEmbed], components: renderComponents(true, false) });
                return collector.stop();
            } else {
                // GAGNÉ (Diamant)
                clickedIndices.add(index);
                
                multiplier = calculateNextMultiplier(multiplier, revealedCount);
                revealedCount++;
                
                const currentWin = Math.floor(bet * multiplier);
                const nextMulti = calculateNextMultiplier(multiplier, revealedCount);

                // Mise à jour de l'embed Info
                embed.setDescription(`Mise : **${bet} €**\nMultiplicateur : **x${multiplier.toFixed(2)}**\nGain actuel : **${currentWin} €**\n\n*Prochain diamant : x${nextMulti.toFixed(2)}*`);
                embed.setColor(0x2ECC71); // Passe au vert quand on commence à gagner
                
                // Si on a tout trouvé (Jackpot)
                if (revealedCount === (gridSize - bombCount)) {
                      await eco.addCash(user.id, currentWin);
                      
                      const jackpotEmbed = embeds.success(interactionOrMessage, '👑 GRILLE VIDÉE ! JACKPOT !',
                        `Incroyable ! Tu as trouvé tous les diamants !\n\n💰 Gain Total : **+${currentWin} €**`
                      ).setColor(0xF1C40F); // Or

                      await i.update({ embeds: [jackpotEmbed], components: renderComponents(true, true) });
                      return collector.stop();
                }

                await i.update({ embeds: [embed], components: renderComponents(false) });
            }
        });
    }
};