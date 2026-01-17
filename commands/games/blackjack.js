const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Joue au Blackjack (Si tu as 21 direct, tu gagnes x1.5 !)')
        .addStringOption(opt => opt.setName('mise').setDescription('Combien veux-tu parier ? (ou "all")').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let user, betInput, replyFunc, getMessage;
        // ✅ 1. RÉCUPÉRATION DU GUILDID
        const guildId = interactionOrMessage.guild.id;

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

        // --- 1. SÉCURITÉ ---
        // ✅ Ajout de guildId
        const userData = await eco.get(user.id, guildId);
        
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc({ embeds: [embeds.error(interactionOrMessage, `🔒 **Prison !** Reviens dans ${timeLeft} min.`)], ephemeral: true });
        }

        // --- 2. GESTION MISE ---
        let bet = 0;
        if (['all', 'tout', 'tapis'].includes(betInput.toLowerCase())) bet = userData.cash;
        else bet = parseInt(betInput);

        if (isNaN(bet) || bet <= 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Mise invalide.")] });
        if (userData.cash < bet) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `Pas assez d'argent (Cash: ${userData.cash}€).`)] });

        // ✅ Ajout de guildId
        await eco.addCash(user.id, guildId, -bet);

        // --- 3. MOTEUR DU JEU (LOGIQUE RENFORCÉE) ---
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        const drawCard = () => {
            const v = values[Math.floor(Math.random() * values.length)];
            const s = suits[Math.floor(Math.random() * suits.length)];
            
            // Calcul strict de la valeur
            let points = 0;
            if (['J', 'Q', 'K'].includes(v)) points = 10;
            else if (v === 'A') points = 11;
            else points = parseInt(v);

            return { display: `${v}${s}`, points: points, raw: v };
        };

        const calculateScore = (hand) => {
            let score = 0;
            let aces = 0;

            // 1. Somme brute
            for (const card of hand) {
                score += card.points;
                if (card.raw === 'A') aces++;
            }

            // 2. Gestion des As (Si on dépasse 21, un As devient 1 au lieu de 11)
            while (score > 21 && aces > 0) {
                score -= 10;
                aces--;
            }
            return score;
        };

        let playerHand = [drawCard(), drawCard()];
        let dealerHand = [drawCard(), drawCard()];

        // --- 4. WIN INSTANTANÉ ---
        if (calculateScore(playerHand) === 21) {
            if (calculateScore(dealerHand) === 21) {
                // ✅ Ajout de guildId
                await eco.addCash(user.id, guildId, bet); 
                return replyFunc({ embeds: [embeds.warning(interactionOrMessage, "Blackjack", "**DOUBLE BLACKJACK !** 😐 Égalité.")] });
            } else {
                const gain = Math.floor(bet * 2.5);
                // ✅ Ajout de guildId
                await eco.addCash(user.id, guildId, gain);
                return replyFunc({ embeds: [embeds.success(interactionOrMessage, "BLACKJACK !", `**🔥 BLACKJACK ROYAL !** (+${gain - bet}€)`).setColor(0xFFD700)] });
            }
        }

        // --- 5. DÉROULEMENT ---
        let gameOver = false;

        const updateBoard = (reveal = false, result = null, color = 0x3498DB) => {
            const pScore = calculateScore(playerHand);
            const dScore = calculateScore(dealerHand);
            // Si on révèle tout, on affiche le score du dealer, sinon "??"
            const dDisplay = reveal ? `${dealerHand.map(c => c.display).join(' ')} (**${dScore}**)` : `${dealerHand[0].display} 🎴 (**?**)`;

            return embeds.info(interactionOrMessage, `🃏 Blackjack - Mise: ${bet}€`, result ? `### ${result}` : null)
                .setColor(color)
                .addFields(
                    { name: `👤 ${user.username}`, value: `${playerHand.map(c => c.display).join(' ')} (**${pScore}**)` },
                    { name: `🤖 Maoish`, value: dDisplay }
                );
        };

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('hit').setLabel('Carte !').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('stand').setLabel('Je reste').setStyle(ButtonStyle.Secondary)
        );

        const response = await replyFunc({ embeds: [updateBoard()], components: [buttons], fetchReply: true });
        const msg = await getMessage(response);
        if (!msg) return;

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id, 
            time: 60000 
        });

        const endGame = async (i, winType) => {
            gameOver = true;
            let finalMsg = "", color = 0xE74C3C, gain = 0;

            if (winType === 'bust') { 
                finalMsg = "💥 Tu as sauté ! (Plus de 21)"; 
                // ✅ Ajout de guildId pour la banque de la police
                await eco.addBank('police_treasury', guildId, bet); 
            }
            else if (winType === 'lose') { 
                finalMsg = "❌ Le dealer gagne."; 
                await eco.addBank('police_treasury', guildId, bet);
            }
            else if (winType === 'win') { 
                gain = bet * 2; 
                finalMsg = `🏆 **TU GAGNES !** (+${gain - bet}€)`; 
                color = 0xF1C40F; 
            }
            else if (winType === 'push') { 
                gain = bet; 
                finalMsg = "🤝 Égalité."; 
                color = 0xFFA500; 
            }

            if (gain > 0) await eco.addCash(user.id, guildId, gain);
            
            await i.update({ embeds: [updateBoard(true, finalMsg, color)], components: [] });
            collector.stop();
        };

        collector.on('collect', async i => {
            if (gameOver) return;

            if (i.customId === 'hit') {
                playerHand.push(drawCard());
                const score = calculateScore(playerHand);
                
                if (score > 21) return endGame(i, 'bust');
                
                if (score === 21) {
                    // Auto-Stand si 21
                    let dScore = calculateScore(dealerHand);
                    while (dScore < 17) { dealerHand.push(drawCard()); dScore = calculateScore(dealerHand); }
                    if (dScore === 21) return endGame(i, 'push');
                    return endGame(i, 'win');
                }
                
                await i.update({ embeds: [updateBoard()] });
            } 
            else if (i.customId === 'stand') {
                let dScore = calculateScore(dealerHand);
                while (dScore < 17) { dealerHand.push(drawCard()); dScore = calculateScore(dealerHand); }
                const pScore = calculateScore(playerHand);
                
                if (dScore > 21) return endGame(i, 'win');
                if (pScore > dScore) return endGame(i, 'win');
                if (dScore > pScore) return endGame(i, 'lose');
                return endGame(i, 'push');
            }
        });

        collector.on('end', async (c, r) => {
            if (r === 'time' && !gameOver) {
                // ✅ Ajout de guildId
                await eco.addBank('police_treasury', guildId, bet);
                try { await msg.edit({ embeds: [updateBoard(true, "⏱️ Trop lent !", 0xE74C3C)], components: [] }); } catch (e) {}
            }
        });
    }
};