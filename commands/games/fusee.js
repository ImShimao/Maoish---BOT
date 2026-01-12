const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fusee')
        .setDescription('Arrête la fusée avant qu\'elle n\'explose ! 🚀')
        .addIntegerOption(o => o.setName('mise').setDescription('Combien parier ?').setRequired(true)),

    async execute(interactionOrMessage) {
        let user, bet, replyFunc, getMessage;

        // --- GESTION SLASH / PREFIX ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            bet = interactionOrMessage.options.getInteger('mise');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
            getMessage = async () => await interactionOrMessage.fetchReply();
        } else {
            user = interactionOrMessage.author;
            const args = interactionOrMessage.content.split(' ');
            bet = parseInt(args[1]);
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
            getMessage = async (msg) => msg;
        }

        if (!bet || isNaN(bet)) return replyFunc("❌ Indique une mise valide !");
        
        const userData = await eco.get(user.id);
        if (userData.cash < bet) return replyFunc({ content: "❌ Tu n'as pas assez d'argent !", ephemeral: true });
        if (bet < 10) return replyFunc({ content: "❌ Mise minimum : 10 €", ephemeral: true });

        // Paiement
        await eco.addCash(user.id, -bet);

        // --- ALGORITHME DU CRASH ---
        let crashPoint = (Math.random() < 0.03) ? 1.00 : (0.99 / (1 - Math.random()));
        if (crashPoint > 50) crashPoint = 50; 
        crashPoint = parseFloat(crashPoint.toFixed(2));

        let currentMultiplier = 1.0;
        let gameActive = true;
        let history = []; 

        // Fonction d'affichage
        const generateEmbed = (exploded = false, win = false) => {
            let color = 0x3498DB;
            let status = '🚀 La fusée décolle...';
            const currentWin = Math.floor(bet * (exploded ? crashPoint : currentMultiplier));

            if (exploded) {
                color = config.COLORS.ERROR;
                status = `💥 **CRASH à ${crashPoint}x** !\nTu as perdu ta mise.`;
            } else if (win) {
                color = config.COLORS.SUCCESS;
                // --- MODIFICATION ICI : AFFICHER LE GAIN ---
                status = `✅ **SUCCÈS !**\nTu as sauté à **${currentMultiplier.toFixed(2)}x**\n💰 Gain : **+${currentWin} €**`;
            }

            const graph = history.slice(-10).join(' '); 

            return new EmbedBuilder()
                .setColor(color)
                .setTitle('🚀 Fusée')
                .setDescription(`
                ${status}
                
                📈 Multiplicateur : **${exploded ? crashPoint.toFixed(2) : currentMultiplier.toFixed(2)}x**
                ${!win && !exploded ? `💰 Gain potentiel : **${currentWin} €**` : ''}
                
                \`${graph} 🚀\`
                `)
                .setFooter({ text: `Mise: ${bet}€` });
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('stop_crash').setLabel('S\'arrêter (Cashout)').setStyle(ButtonStyle.Success).setEmoji('🪂')
        );

        const response = await replyFunc({ embeds: [generateEmbed()], components: [row] });
        const message = await getMessage(response);
        if (!message) return;

        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id,
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'stop_crash') {
                gameActive = false;
                const winAmount = Math.floor(bet * currentMultiplier);
                await eco.addCash(user.id, winAmount);
                
                collector.stop();
                await i.update({ embeds: [generateEmbed(false, true)], components: [] });
            }
        });

        const interval = setInterval(async () => {
            if (!gameActive) return clearInterval(interval);

            if (currentMultiplier >= crashPoint) {
                gameActive = false;
                clearInterval(interval);
                collector.stop(); 

                const embed = generateEmbed(true, false);
                try {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('stop_crash').setLabel('💥 CRASHED').setStyle(ButtonStyle.Danger).setDisabled(true)
                    );
                    await message.edit({ embeds: [embed], components: [disabledRow] });
                } catch (e) { }
                return;
            }

            let speed = 0.1 + (currentMultiplier * 0.1); 
            currentMultiplier += speed;
            history.push('-'); 

            try {
                await message.edit({ embeds: [generateEmbed()] });
            } catch (e) {
                clearInterval(interval);
            }

        }, 2000); 
    }
};