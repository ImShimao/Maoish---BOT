const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Joue au Blackjack (Si tu as 21 direct, tu gagnes x1.5 !)')
        .addStringOption(opt => opt.setName('mise').setDescription('Combien veux-tu parier ? (ou "all")').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let user, betInput, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            betInput = args[0] || "0";
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
        }

        // --- 1. Vérif Prison ---
        if (await eco.isJailed(user.id)) {
            return replyFunc(`🔒 **Tu es en PRISON !** Réfléchis à tes actes au lieu de jouer aux cartes.`);
        }

        // --- 2. GESTION MISE ---
        const userData = await eco.get(user.id);
        let bet = 0;

        // Gestion du "all-in"
        if (['all', 'tout', 'tapis', 'max'].includes(betInput.toLowerCase())) {
            bet = userData.cash;
        } else {
            bet = parseInt(betInput);
        }

        if (isNaN(bet) || bet <= 0) return replyFunc("❌ Mise invalide.");
        if (userData.cash < bet) return replyFunc(`❌ Tu es fauché ! Tu as seulement **${userData.cash}€** en cash.`);

        // On retire l'argent tout de suite
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
            // Gestion de l'As (1 ou 11)
            while (score > 21 && aces > 0) { 
                score -= 10; 
                aces--; 
            }
            return score;
        };

        let playerHand = [drawCard(), drawCard()];
        let dealerHand = [drawCard(), drawCard()];

        // --- 4. WIN INSTANTANÉ (BLACKJACK NATUREL) ---
        // Règle demandée : Victoire immédiate et gain x1.5 (Total x2.5)
        if (calculateScore(playerHand) === 21) {
            
            // Cas rare : Le dealer a aussi Blackjack
            if (calculateScore(dealerHand) === 21) {
                await eco.addCash(user.id, bet); // Remboursement simple
                
                const embed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle(`🃏 Blackjack - Mise: ${bet}€`)
                    .setDescription(`**DOUBLE BLACKJACK !** 😐\n\n👤 Toi: ${playerHand[0].display} ${playerHand[1].display} (21)\n🤖 Maoish: ${dealerHand[0].display} ${dealerHand[1].display} (21)\n\n🤝 **Égalité !** Mise remboursée.`);
                
                return replyFunc({ embeds: [embed] });
            } 
            else {
                // VICTOIRE x1.5
                const gain = Math.floor(bet * 2.5); // Mise (1) + Profit (1.5) = 2.5
                await eco.addCash(user.id, gain);
                
                const embed = new EmbedBuilder()
                    .setColor(0xFFD700) // Or
                    .setTitle(`🃏 Blackjack - Mise: ${bet}€`)
                    .setDescription(`**🔥 BLACKJACK !**\n\n👤 Toi: ${playerHand[0].display} ${playerHand[1].display} (**21**)\n🤖 Maoish: ${dealerHand[0].display} 🎴\n\n🏆 **TU GAGNES !** (+${gain - bet}€ de profit)`);
                
                return replyFunc({ embeds: [embed] });
            }
        }

        // --- 5. DÉROULEMENT NORMAL ---
        let gameOver = false;

        const updateBoard = (reveal = false, result = null, color = 0x2ECC71) => {
            const pScore = calculateScore(playerHand);
            const dScore = calculateScore(dealerHand);
            
            // Si on révèle, on montre tout le jeu du dealer, sinon juste la 1ère carte
            const dDisplay = reveal 
                ? dealerHand.map(c => c.display).join(' ') + ` (**${dScore}**)` 
                : `${dealerHand[0].display} 🎴 (**?**)`;

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

        const msg = await replyFunc({ embeds: [updateBoard().setColor(0x3498DB)], components: [buttons], fetchReply: true });

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
                gain = bet * 2; // Victoire normale (x1 profit)
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
                // Si le joueur dépasse 21, il perd direct
                if (calculateScore(playerHand) > 21) return endGame(i, 'bust');
                
                await i.update({ embeds: [updateBoard().setColor(0x3498DB)] });
            } 
            else if (i.customId === 'stand') {
                // Tour du Dealer (il tire tant qu'il a moins de 17)
                let dScore = calculateScore(dealerHand);
                while (dScore < 17) { 
                    dealerHand.push(drawCard()); 
                    dScore = calculateScore(dealerHand); 
                }
                
                const pScore = calculateScore(playerHand);
                
                // Conditions de victoire
                if (dScore > 21) return endGame(i, 'win'); // Dealer saute
                if (pScore > dScore) return endGame(i, 'win'); // Joueur a mieux
                if (dScore > pScore) return endGame(i, 'lose'); // Dealer a mieux
                return endGame(i, 'push'); // Egalité
            }
        });
    }
};