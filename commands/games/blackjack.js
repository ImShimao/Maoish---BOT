const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Joue au Blackjack (Si tu as 21 direct, tu gagnes x1.5 !)')
        .addStringOption(opt => opt.setName('mise').setDescription('Combien veux-tu parier ? (ou "all")').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let user, betInput, replyFunc, getMessage;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            betInput = args[0] || "0";
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
            getMessage = async (msg) => msg;
        }

        // --- 1. SÉCURITÉ PRISON ---
        const userData = await eco.get(user.id);
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc({ content: `🔒 **Tu es en PRISON !** Pas de cartes pour les détenus.\nLibération dans : **${timeLeft} minutes**.`, ephemeral: true });
        }

        // --- 2. GESTION MISE ---
        let bet = 0;

        if (['all', 'tout', 'tapis', 'max'].includes(betInput.toLowerCase())) {
            bet = userData.cash;
        } else {
            bet = parseInt(betInput);
        }

        if (isNaN(bet) || bet <= 0) return replyFunc("❌ Mise invalide.");
        if (userData.cash < bet) return replyFunc(`❌ Tu es fauché ! Tu as seulement **${userData.cash}€** en cash.`);

        // On retire l'argent
        await eco.addCash(user.id, -bet);

        // --- 3. MOTEUR DU JEU ---
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        const drawCard = () => {
            const v = values[Math.floor(Math.random() * values.length)];
            const s = suits[Math.floor(Math.random() * suits.length)];
            let p = parseInt(v);
            if (['J', 'Q', 'K'].includes(v)) p = 10;
            if (v === 'A') p = 11;
            return { display: `${v}${s}`, points: p, raw: v };
        };

        const calculateScore = (hand) => {
            let score = hand.reduce((acc, c) => acc + c.points, 0);
            let aces = hand.filter(c => c.raw === 'A').length;
            while (score > 21 && aces > 0) { 
                score -= 10; 
                aces--; 
            }
            return score;
        };

        let playerHand = [drawCard(), drawCard()];
        let dealerHand = [drawCard(), drawCard()];

        // --- 4. WIN INSTANTANÉ (BLACKJACK NATUREL) ---
        if (calculateScore(playerHand) === 21) {
            if (calculateScore(dealerHand) === 21) {
                await eco.addCash(user.id, bet); 
                const embed = new EmbedBuilder().setColor(0xFFA500).setTitle(`🃏 Blackjack`).setDescription(`**DOUBLE BLACKJACK !** 😐\n🤝 **Égalité !** Mise remboursée.`);
                return replyFunc({ embeds: [embed] });
            } 
            else {
                const gain = Math.floor(bet * 2.5);
                await eco.addCash(user.id, gain);
                const embed = new EmbedBuilder().setColor(0xFFD700).setTitle(`🃏 Blackjack`).setDescription(`**🔥 BLACKJACK !** 🏆 **TU GAGNES !** (+${gain - bet}€)`);
                return replyFunc({ embeds: [embed] });
            }
        }

        // --- 5. DÉROULEMENT NORMAL ---
        let gameOver = false;

        const updateBoard = (reveal = false, result = null, color = 0x2ECC71) => {
            const pScore = calculateScore(playerHand);
            const dScore = calculateScore(dealerHand);
            const dDisplay = reveal ? dealerHand.map(c => c.display).join(' ') + ` (**${dScore}**)` : `${dealerHand[0].display} 🎴 (**?**)`;

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`🃏 Blackjack - Mise: ${bet}€`)
                .addFields(
                    { name: `👤 ${user.username}`, value: `${playerHand.map(c => c.display).join(' ')} (**${pScore}**)` },
                    { name: `🤖 Maoish`, value: dDisplay }
                );
            if (result) embed.setDescription(`### ${result}`);
            return embed;
        };

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('hit').setLabel('Carte !').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('stand').setLabel('Je reste').setStyle(ButtonStyle.Secondary)
        );

        // --- ENVOI SÉCURISÉ ---
        const response = await replyFunc({ embeds: [updateBoard().setColor(0x3498DB)], components: [buttons], fetchReply: true });
        const msg = await getMessage(response);
        if (!msg) return;

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id, 
            time: 60000 
        });

        // Fonction de fin de partie
        const endGame = async (i, winType) => {
            gameOver = true;
            let finalMsg = "", color = 0xFF0000, gain = 0;

            if (winType === 'bust') { 
                finalMsg = "💥 Tu as sauté ! (Plus de 21) **Tu perds tout.**"; 
            }
            else if (winType === 'lose') { 
                finalMsg = "❌ Le dealer est plus proche de 21. **Mise perdue.**"; 
            }
            else if (winType === 'win') { 
                gain = bet * 2; 
                finalMsg = `🏆 **TU GAGNES !** (+${gain - bet}€)`; 
                color = 0xF1C40F;
            }
            else if (winType === 'push') { 
                gain = bet; 
                finalMsg = "🤝 Égalité. **Mise remboursée.**"; 
                color = 0xFFA500;
            }

            if (gain > 0) await eco.addCash(user.id, gain);
            await i.update({ embeds: [updateBoard(true, finalMsg, color)], components: [] });
            collector.stop();
        };

        collector.on('collect', async i => {
            if (gameOver) return;

            if (i.customId === 'hit') {
                playerHand.push(drawCard());
                if (calculateScore(playerHand) > 21) return endGame(i, 'bust');
                await i.update({ embeds: [updateBoard().setColor(0x3498DB)] });
            } 
            else if (i.customId === 'stand') {
                let dScore = calculateScore(dealerHand);
                while (dScore < 17) { 
                    dealerHand.push(drawCard()); 
                    dScore = calculateScore(dealerHand); 
                }
                const pScore = calculateScore(playerHand);
                
                if (dScore > 21) return endGame(i, 'win');
                if (pScore > dScore) return endGame(i, 'win');
                if (dScore > pScore) return endGame(i, 'lose');
                return endGame(i, 'push');
            }
        });
    }
};