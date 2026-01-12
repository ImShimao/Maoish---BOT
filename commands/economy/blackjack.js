const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Joue au Blackjack pour de l\'argent')
        .addStringOption(opt => 
            opt.setName('mise')
                .setDescription('Combien veux-tu parier ? (ou "all")')
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let user, betInput, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            if (!args[0]) return interactionOrMessage.reply("❌ Il faut une mise ! Ex: `+blackjack 100` ou `+blackjack all`");
            betInput = args[0];
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
        }

        // --- GESTION DU "ALL" ---
        const userData = await eco.get(user.id);
        let bet = 0;

        if (['all', 'tout', 'tapis', 'max'].includes(betInput.toLowerCase())) {
            bet = userData.cash;
        } else {
            bet = parseInt(betInput);
        }

        // Vérifications
        if (isNaN(bet) || bet <= 0) return replyFunc("❌ Mise invalide.");
        if (userData.cash < bet) {
            return replyFunc(`❌ Tu es fauché ! Tu as **${userData.cash}€** en poche mais tu veux miser **${bet}€**.`);
        }

        // 2. RETRAIT DE LA MISE
        await eco.addCash(user.id, -bet);

        // --- MOTEUR DU JEU ---
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
            while (score > 21 && aces > 0) { score -= 10; aces--; }
            return score;
        };

        let playerHand = [drawCard(), drawCard()];
        let dealerHand = [drawCard(), drawCard()];
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

        const msg = await replyFunc({ embeds: [updateBoard().setColor(0x3498DB)], components: [buttons], fetchReply: true });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: i => i.user.id === user.id, time: 60000 });

        const endGame = async (i, winType) => {
            gameOver = true;
            let finalMsg = "", color = 0xFF0000, gain = 0;

            if (winType === 'bust') { finalMsg = "💥 Tu as sauté ! **Tu perds tout.**"; }
            else if (winType === 'lose') { finalMsg = "❌ Le dealer gagne. **Mise perdue.**"; }
            else if (winType === 'win') { 
                gain = bet * 2; 
                finalMsg = `🏆 **TU GAGNES !** (+${gain}€)`; 
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
            } else {
                let dScore = calculateScore(dealerHand);
                while (dScore < 17) { dealerHand.push(drawCard()); dScore = calculateScore(dealerHand); }
                const pScore = calculateScore(playerHand);
                
                if (dScore > 21 || pScore > dScore) return endGame(i, 'win');
                if (dScore > pScore) return endGame(i, 'lose');
                return endGame(i, 'push');
            }
        });
    }
};