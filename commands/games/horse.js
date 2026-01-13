const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('horse')
        .setDescription('Parie sur une course de chevaux ! (Gain x4)')
        .addIntegerOption(o => o.setName('mise').setDescription('Combien parier ?').setRequired(true))
        .addIntegerOption(o => 
            o.setName('cheval')
             .setDescription('Choisis ton numéro (1-5)')
             .setRequired(true)
             .setMinValue(1)
             .setMaxValue(5)
        ),

    async execute(interactionOrMessage) {
        let user, bet, horseChoice, replyFunc, getMessage;

        // --- GESTION SLASH / PREFIX ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            bet = interactionOrMessage.options.getInteger('mise');
            horseChoice = interactionOrMessage.options.getInteger('cheval');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.withResponse();
        } else {
            user = interactionOrMessage.author;
            const args = interactionOrMessage.content.split(' ');
            bet = parseInt(args[1]);
            horseChoice = parseInt(args[2]);
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
            getMessage = async (msg) => msg;
        }

        if (!bet || isNaN(bet)) return replyFunc("❌ Mise invalide ! Usage: `/horse [mise] [1-5]`");
        if (!horseChoice || horseChoice < 1 || horseChoice > 5) return replyFunc("❌ Choisis un cheval entre 1 et 5 !");

        const userData = await eco.get(user.id);
        if (userData.cash < bet) return replyFunc({ content: "❌ Pas assez d'argent !", flags: true });

        // Paiement
        await eco.addCash(user.id, -bet);

        // --- CONFIGURATION DE LA COURSE ---
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

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`🏇 Course en cours...`)
            .setDescription(generateTrack())
            .setFooter({ text: `Tu as parié ${bet}€ sur le cheval n°${horseChoice}` });

        const response = await replyFunc({ embeds: [embed] });
        const message = await getMessage(response);
        if (!message) return;

        // --- BOUCLE D'ANIMATION ---
        const raceInterval = setInterval(async () => {
            let winner = -1;

            for (let i = 0; i < 5; i++) {
                positions[i] += Math.floor(Math.random() * 3) + 1;
                
                if (positions[i] >= trackLength) {
                    positions[i] = trackLength; 
                    if (winner === -1) winner = i; 
                }
            }

            embed.setDescription(generateTrack());
            
            if (winner !== -1) {
                clearInterval(raceInterval);
                const winnerHorse = winner + 1;
                const hasWon = (winnerHorse === horseChoice);

                if (hasWon) {
                    const winAmount = bet * 4;
                    await eco.addCash(user.id, winAmount);
                    embed.setColor(config.COLORS.SUCCESS)
                         .setTitle(`🏆 Le cheval n°${winnerHorse} a gagné !`)
                         .setDescription(`${generateTrack()}\n\n🎉 **FÉLICITATIONS !** Tu remportes **${winAmount} €** !`);
                } else {
                    embed.setColor(config.COLORS.ERROR)
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