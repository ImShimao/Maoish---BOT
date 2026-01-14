const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fusee')
        .setDescription('Arrête la fusée avant qu\'elle n\'explose ! 🚀')
        .addStringOption(o => o.setName('mise').setDescription('Combien parier ? (ou "all")').setRequired(true)),

    async execute(interactionOrMessage) {
        let user, betInput, replyFunc;

        // --- GESTION HYBRIDE SÉCURISÉE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            
            replyFunc = async (payload) => {
                const data = typeof payload === 'string' ? { content: payload } : payload;
                await interactionOrMessage.reply(data);
                return await interactionOrMessage.fetchReply();
            };
        } else {
            user = interactionOrMessage.author;
            const args = interactionOrMessage.content.split(' ');
            betInput = args[1] || "0";
            
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
        }

        // --- 1. DONNÉES & PRISON ---
        const userData = await eco.get(user.id);
        
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            const msg = `🔒 **Tu es en PRISON !** Pas de fusée pour toi.\nLibération dans : **${timeLeft} minutes**.`;
            
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.reply({ content: msg, ephemeral: true });
            else return interactionOrMessage.channel.send(msg);
        }

        let bet = 0;
        if (['all', 'tout', 'tapis', 'max'].includes(betInput.toLowerCase())) {
            bet = userData.cash;
        } else {
            bet = parseInt(betInput);
        }

        // --- 2. VÉRIFICATIONS ---
        if (isNaN(bet) || bet <= 0) {
            return replyFunc("❌ Indique une mise valide (ex: 100 ou 'all').");
        }

        if (userData.cash < bet) {
            const errPayload = { content: `❌ Tu n'as pas assez d'argent ! Tu as **${userData.cash} €**.`, ephemeral: true };
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.reply(errPayload);
            return interactionOrMessage.channel.send(errPayload.content);
        }
        
        if (bet < 10) {
            const errPayload = { content: "❌ Mise minimum : 10 €", ephemeral: true };
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.reply(errPayload);
            return interactionOrMessage.channel.send(errPayload.content);
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

        // Fonction d'affichage de l'Embed
        const generateEmbed = (exploded = false, win = false) => {
            let color = 0x3498DB; 
            let status = '🚀 La fusée décolle...';
            const currentWin = Math.floor(bet * (exploded ? crashPoint : currentMultiplier));

            if (exploded) {
                color = config.COLORS?.ERROR || 0xE74C3C;
                status = `💥 **CRASH à ${crashPoint}x** !\nTu as perdu ta mise.`;
            } else if (win) {
                color = config.COLORS?.SUCCESS || 0x2ECC71;
                status = `✅ **SUCCÈS !**\nTu as sauté à **${currentMultiplier.toFixed(2)}x**\n💰 Gain : **+${currentWin} €**`;
            }

            const graph = history.slice(-10).join(' '); 

            return new EmbedBuilder()
                .setColor(color)
                .setTitle('🚀 Fusée (Crash)')
                .setDescription(`
                ${status}
                
                📈 Multiplicateur : **${exploded ? crashPoint.toFixed(2) : currentMultiplier.toFixed(2)}x**
                ${!win && !exploded ? `💰 Gain potentiel : **${currentWin} €**` : ''}
                
                \`${graph} 🚀\`
                `)
                .setFooter({ text: `Mise: ${bet}€ | Balance: ${userData.cash - bet}€` });
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('stop_crash')
                .setLabel('S\'arrêter (Cashout)')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🪂')
        );

        // Envoi du message
        const message = await replyFunc({ embeds: [generateEmbed()], components: [row] });
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

        }, 2000); 
    }
};