const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('horse')
        .setDescription('Parie sur une course de chevaux ! (Gain x4)')
        .addStringOption(o => o.setName('mise').setDescription('Combien parier ? (ou "all")').setRequired(true))
        .addIntegerOption(o => 
            o.setName('cheval')
             .setDescription('Choisis ton numéro (1-5)')
             .setRequired(true)
             .setMinValue(1)
             .setMaxValue(5)
        ),

    async execute(interactionOrMessage, args) {
        let user, betInput, bet, horseChoice, replyFunc, getMessage;

        // --- GESTION SLASH / PREFIX ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            horseChoice = interactionOrMessage.options.getInteger('cheval');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            const argsList = interactionOrMessage.content.split(' ');
            betInput = argsList[1] || "0";
            horseChoice = parseInt(argsList[2]);
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
            getMessage = async (msg) => msg;
        }

        if (!betInput) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Mise invalide ! Usage: `/horse [mise] [1-5]`")] });
        if (!horseChoice || horseChoice < 1 || horseChoice > 5) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Choisis un cheval entre 1 et 5 !")] });

        const userData = await eco.get(user.id);
        
        // --- SÉCURITÉ PRISON ---
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas de paris hippiques ici.\nLibération dans : **${timeLeft} minutes**.`)], 
                ephemeral: true 
            });
        }

        // --- LOGIQUE "ALL" ---
        if (['all', 'tout', 'tapis', 'max'].includes(betInput.toLowerCase())) {
            bet = userData.cash;
        } else {
            bet = parseInt(betInput);
        }

        if (isNaN(bet) || bet <= 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Mise invalide.")] });
        if (userData.cash < bet) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `Pas assez d'argent ! Tu as **${userData.cash} €**.`)], ephemeral: true });

        // Paiement
        await eco.addCash(user.id, -bet);

        // --- COURSE ---
        const horses = ['🦄', '🐎', '🦓', '🦌', '🐗']; 
        const positions = [0, 0, 0, 0, 0]; 
        const trackLength = 15; 

        const generateTrack = () => {
            let content = "";
            for (let i = 0; i < 5; i++) {
                const isMyHorse = (i + 1) === horseChoice;
                const horseIcon = horses[i];
                const spaceBefore = ".".repeat(positions[i]);
                const spaceAfter = ".".repeat(trackLength - positions[i]);
                
                content += `**${i + 1}** | ${spaceBefore}${horseIcon}${spaceAfter} 🏁 ${isMyHorse ? '⬅️ Toi' : ''}\n`;
            }
            return content;
        };

        // Utilisation de embeds.info pour l'état de la course
        const embed = embeds.info(interactionOrMessage, '🏇 Course en cours...', generateTrack())
            .setColor(0x3498DB)
            .setFooter({ text: `Tu as parié ${bet}€ sur le cheval n°${horseChoice}` });

        const response = await replyFunc({ embeds: [embed] });
        const message = await getMessage(response);
        if (!message) return;

        const raceInterval = setInterval(async () => {
            let winner = -1;

            for (let i = 0; i < 5; i++) {
                positions[i] += Math.floor(Math.random() * 3) + 1;
                if (positions[i] >= trackLength) {
                    positions[i] = trackLength; 
                    if (winner === -1) winner = i; 
                }
            }

            // On met à jour l'embed avec la nouvelle piste
            embed.setDescription(generateTrack());
            
            if (winner !== -1) {
                clearInterval(raceInterval);
                const winnerHorse = winner + 1;
                const hasWon = (winnerHorse === horseChoice);

                if (hasWon) {
                    const winAmount = bet * 4;
                    await eco.addCash(user.id, winAmount);
                    
                    // Succès (Vert)
                    embed.setColor(config.COLORS.SUCCESS || 0x2ECC71)
                         .setTitle(`🏆 Le cheval n°${winnerHorse} a gagné !`)
                         .setDescription(`${generateTrack()}\n\n🎉 **FÉLICITATIONS !** Tu remportes **${winAmount} €** !`);
                } else {
                    // Echec (Rouge)
                    // L'argent est envoyé à la police si tu veux, sinon perdu
                    await eco.addBank('police_treasury', bet);

                    embed.setColor(config.COLORS.ERROR || 0xE74C3C)
                         .setTitle(`🏆 Le cheval n°${winnerHorse} a gagné...`)
                         .setDescription(`${generateTrack()}\n\n❌ Tu avais misé sur le n°${horseChoice}. Perdu !`);
                }
                
                try { await message.edit({ embeds: [embed] }); } catch (e) {}
            } else {
                try { await message.edit({ embeds: [embed] }); } catch (e) { clearInterval(raceInterval); }
            }
        }, 2000);
    }
};