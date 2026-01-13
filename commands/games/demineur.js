const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('demineur')
        .setDescription('Jeu des Mines (Style Casino)')
        .addIntegerOption(o => o.setName('mise').setDescription('Combien parier ?').setRequired(true))
        .addIntegerOption(o => 
            o.setName('bombes')
             .setDescription('Nombre de bombes (1-15). Plus il y en a, plus tu gagnes gros !')
             .setMinValue(1)
             .setMaxValue(15)
             .setRequired(false)
        ),

    async execute(interactionOrMessage) {
        let user, bet, bombCount, replyFunc, getMessage;

        // --- GESTION SLASH / PREFIX ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            bet = interactionOrMessage.options.getInteger('mise');
            bombCount = interactionOrMessage.options.getInteger('bombes') || 3; // Par défaut 3 bombes
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.withResponse();
        } else {
            user = interactionOrMessage.author;
            const args = interactionOrMessage.content.split(' ');
            bet = parseInt(args[1]);
            bombCount = parseInt(args[2]) || 3;
            if (bombCount < 1) bombCount = 1;
            if (bombCount > 15) bombCount = 15;
            
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
            getMessage = async (msg) => msg;
        }

        // Vérifications
        if (!bet || isNaN(bet)) return replyFunc("❌ Indique une mise valide ! (ex: `/demineur 100 5` pour 100€ et 5 bombes)");
        
        const userData = await eco.get(user.id);
        if (userData.cash < bet) return replyFunc({ content: "❌ Tu n'as pas assez d'argent !", flags: true });
        if (bet < 10) return replyFunc({ content: "❌ Mise minimum : 10 €", flags: true });

        // Prélèvement
        await eco.addCash(user.id, -bet);

        // --- CONFIGURATION DU JEU (20 Cases) ---
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

        // Fonction de calcul du prochain multiplicateur (Maths pures)
        // Formule : Multiplicateur * (Cases Restantes / Cases Sûres Restantes)
        const calculateNextMultiplier = (currentMult, currentRevealed) => {
            const remainingCells = gridSize - currentRevealed;
            const remainingSafe = gridSize - bombCount - currentRevealed;
            if (remainingSafe <= 0) return 0; // Impossible normalement
            
            // On applique une petite marge maison (House Edge) de 1% pour le réalisme, sinon 1.0
            const houseEdge = 0.99; 
            const rawMulti = currentMult * (remainingCells / remainingSafe);
            return rawMulti * houseEdge;
        };

        const renderComponents = (gameOver = false, win = false) => {
            const rows = [];
            for (let i = 0; i < rowsCount; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < columns; j++) {
                    const index = i * columns + j;
                    const btn = new ButtonBuilder().setCustomId(`mine_${index}`);

                    if (clickedIndices.has(index) || gameOver) {
                        if (bombIndices.has(index)) {
                            btn.setEmoji('💣').setStyle(ButtonStyle.Danger).setDisabled(true);
                        } else {
                            // Diamant
                            if (gameOver && !clickedIndices.has(index)) {
                                btn.setEmoji('💎').setStyle(ButtonStyle.Secondary).setDisabled(true);
                            } else {
                                btn.setEmoji('💎').setStyle(ButtonStyle.Success).setDisabled(true);
                            }
                        }
                    } else {
                        btn.setEmoji('❓').setStyle(ButtonStyle.Secondary).setDisabled(gameOver);
                    }
                    row.addComponents(btn);
                }
                rows.push(row);
            }

            // Calcul du gain actuel pour le bouton
            const currentWin = Math.floor(bet * multiplier);

            // Bouton de contrôle
            const controlRow = new ActionRowBuilder();
            
            if (!gameOver) {
                // On calcule prédictivement le prochain multiplicateur pour l'info
                // (Optionnel, ici on affiche juste le gain actuel possible)
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

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle(`💣 Démineur (${bombCount} Bombes)`)
            .setDescription(`Mise : **${bet} €**\nMultiplicateur actuel : **x${multiplier.toFixed(2)}**\nProchain clic : **x${calculateNextMultiplier(multiplier, revealedCount).toFixed(2)}**`)
            .setFooter({ text: 'Choisis une case...' });

        // Envoi
        let response;
        try {
             response = await replyFunc({ embeds: [embed], components: renderComponents() });
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
                
                embed.setColor(config.COLORS.SUCCESS)
                     .setTitle('🤑 Cashout !')
                     .setDescription(`Tu as encaissé tes gains !\n\n💰 Gain : **+${winAmount} €**\nMultiplicateur : **x${multiplier.toFixed(2)}**`);
                
                await i.update({ embeds: [embed], components: renderComponents(true, true) });
                return collector.stop();
            }

            // --- CLIC SUR UNE CASE ---
            const index = parseInt(id.split('_')[1]);

            if (bombIndices.has(index)) {
                // PERDU
                embed.setColor(config.COLORS.ERROR)
                     .setTitle('💥 BOOM !')
                     .setDescription(`Tu as sauté sur une mine...\nTu perds ta mise de **${bet} €**.`);
                
                await i.update({ embeds: [embed], components: renderComponents(true, false) });
                return collector.stop();
            } else {
                // GAGNÉ (Diamant)
                clickedIndices.add(index);
                
                // Mise à jour du multiplicateur AVANT d'incrémenter revealedCount pour le calcul correct
                multiplier = calculateNextMultiplier(multiplier, revealedCount);
                revealedCount++;
                
                const currentWin = Math.floor(bet * multiplier);
                const nextMulti = calculateNextMultiplier(multiplier, revealedCount);

                embed.setDescription(`Mise : **${bet} €**\nMultiplicateur : **x${multiplier.toFixed(2)}**\nGain actuel : **${currentWin} €**\n\n*Prochain diamant : x${nextMulti.toFixed(2)}*`);
                
                // Si on a tout trouvé (Victoire totale)
                if (revealedCount === (gridSize - bombCount)) {
                     await eco.addCash(user.id, currentWin);
                     embed.setColor(config.COLORS.SUCCESS).setTitle('👑 GRILLE VIDÉE ! JACKPOT !');
                     await i.update({ embeds: [embed], components: renderComponents(true, true) });
                     return collector.stop();
                }

                await i.update({ embeds: [embed], components: renderComponents(false) });
            }
        });
    }
};