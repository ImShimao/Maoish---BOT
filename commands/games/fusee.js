const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fusee')
        .setDescription('Arrête la fusée avant qu\'elle n\'explose ! 🚀')
        .addStringOption(o => o.setName('mise').setDescription('Combien parier ? (ou "all")').setRequired(true)),

    async execute(interactionOrMessage) {
        let user, betInput, replyFunc, getMessage;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            const args = interactionOrMessage.content.split(' ');
            betInput = args[1] || "0";
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
            getMessage = async (msg) => msg;
        }

        const userData = await eco.get(user.id);

        // --- 1. SÉCURITÉ PRISON ---
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas de fusée pour les détenus.\nLibération dans : **${timeLeft} minutes**.`)],
                ephemeral: true 
            });
        }

        // --- 2. VÉRIFICATIONS MISE ---
        let bet = 0;
        if (['all', 'tout', 'tapis', 'max'].includes(betInput.toLowerCase())) {
            bet = userData.cash;
        } else {
            bet = parseInt(betInput);
        }

        if (isNaN(bet) || bet <= 0) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Indique une mise valide (ex: 100 ou 'all').")] });
        }

        if (userData.cash < bet) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, `Tu n'as pas assez d'argent ! (Tu as **${userData.cash} €**)`)] });
        }
        
        if (bet < 10) {
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Mise minimum : 10 €")] });
        }

        // Paiement initial
        await eco.addCash(user.id, -bet);

        // --- 3. ALGORITHME DU CRASH ---
        let crashPoint = (Math.random() < 0.03) ? 1.00 : (0.99 / (1 - Math.random()));
        if (crashPoint > 50) crashPoint = 50; 
        crashPoint = parseFloat(crashPoint.toFixed(2));

        let currentMultiplier = 1.0;
        let gameActive = true;
        let history = []; 

        // Fonction d'affichage avec l'USINE
        const generateEmbed = (exploded = false, win = false) => {
            const currentWin = Math.floor(bet * (exploded ? crashPoint : currentMultiplier));
            const graph = history.slice(-10).join(' '); 

            if (exploded) {
                // ÉTAT : CRASH (Perdu)
                return embeds.error(interactionOrMessage, 
                    `💥 **CRASH à ${crashPoint}x** !\nTu as perdu ta mise de **${bet} €**.\n\n\`${graph} 💥\``
                ).setTitle('🚀 Fusée - Échec');
            } 
            else if (win) {
                // ÉTAT : GAGNÉ (Cashout)
                return embeds.success(interactionOrMessage, '✅ SUCCÈS !', 
                    `Tu as sauté à **${currentMultiplier.toFixed(2)}x**\n💰 Gain : **+${currentWin} €**\n\n\`${graph} 🪂\``
                ).setColor(0x2ECC71);
            } 
            else {
                // ÉTAT : EN VOL
                // On utilise embeds.info pour le vol
                return embeds.info(interactionOrMessage, '🚀 La fusée décolle...', 
                    `📈 Multiplicateur : **${currentMultiplier.toFixed(2)}x**\n💰 Gain potentiel : **${currentWin} €**\n\n\`${graph} 🚀\``
                )
                .setColor(0x3498DB)
                .setFooter({ text: `Mise: ${bet}€` }); // On override le footer pour afficher la mise
            }
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('stop_crash')
                .setLabel('S\'arrêter (Cashout)')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🪂')
        );

        // Envoi du message initial
        const response = await replyFunc({ embeds: [generateEmbed()], components: [row], fetchReply: true });
        const message = await getMessage(response);
        if (!message) return;

        // --- 4. COLLECTOR ---
        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id,
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'stop_crash') {
                gameActive = false;
                const winAmount = Math.floor(bet * currentMultiplier);
                
                // Remboursement + Gain
                await eco.addCash(user.id, winAmount);
                
                collector.stop();
                try {
                    await i.update({ embeds: [generateEmbed(false, true)], components: [] });
                } catch(e) {} 
            }
        });

        // --- 5. BOUCLE DE JEU ---
        const interval = setInterval(async () => {
            if (!gameActive) {
                clearInterval(interval);
                return;
            }

            // CRASH
            if (currentMultiplier >= crashPoint) {
                gameActive = false;
                clearInterval(interval);
                if (!collector.ended) collector.stop(); 

                // L'argent est perdu (parti dans le néant ou on peut l'envoyer à la treasury si tu veux)
                // await eco.addBank('police_treasury', bet); // Optionnel

                const embed = generateEmbed(true, false);
                try {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('stop_crash').setLabel('💥 CRASHED').setStyle(ButtonStyle.Danger).setDisabled(true)
                    );
                    await message.edit({ embeds: [embed], components: [disabledRow] });
                } catch (e) { }
                return;
            }

            // UPDATE MONTE
            let speed = 0.1 + (currentMultiplier * 0.08); 
            currentMultiplier += speed;
            history.push('-'); 

            try {
                await message.edit({ embeds: [generateEmbed()] });
            } catch (e) {
                clearInterval(interval);
                collector.stop();
            }

        }, 2000); // 2 secondes pour respecter les rate-limits Discord
    }
};