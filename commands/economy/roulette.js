const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Mise sur une couleur (Rouge/Noir/Vert)')
        .addStringOption(opt => 
            opt.setName('mise')
                .setDescription('Combien tu paries ? (ou "all")')
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let user, betInput, replyFunc;

        // 1. Vérif Prison
        if (eco.isJailed(user.id)) {
            const timeLeft = Math.ceil((eco.get(user.id).jailEnd - Date.now()) / 1000 / 60);
            return replyFunc(`🔒 **Tu es en PRISON !** Réfléchis à tes actes encore **${timeLeft} minutes**.`);
        }
        
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            betInput = interactionOrMessage.options.getString('mise');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            if (!args[0]) return interactionOrMessage.reply("❌ Usage: `+roulette 100` ou `+roulette all`");
            betInput = args[0];
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
        }

        // --- GESTION DU ALL-IN ---
        const userMoney = eco.get(user.id).cash;
        let bet = 0;

        if (['all', 'tout', 'max'].includes(betInput.toLowerCase())) {
            bet = userMoney;
        } else {
            bet = parseInt(betInput);
        }

        if (isNaN(bet) || bet <= 0) return replyFunc("❌ Mise invalide.");
        if (userMoney < bet) {
            return replyFunc(`❌ Tu n'as pas assez de cash (${userMoney} €) pour miser **${bet} €**.`);
        }

        // --- FONCTIONS D'AFFICHAGE ---
        const getBetEmbed = () => new EmbedBuilder()
            .setColor(0x2F3136)
            .setTitle(`🎡 Roulette - Mise : ${bet} €`)
            .setDescription('Choisis ta couleur pour lancer la bille !\n\n🔴 **Rouge** (x2)\n⚫ **Noir** (x2)\n🟢 **Vert** (x15 - Jackpot)')
            .setFooter({ text: `Solde actuel : ${eco.get(user.id).cash} €` });

        const getResultEmbed = (choice, roll, win, gain) => {
            let colorHex, resultEmoji;
            
            if (roll === 0) { colorHex = 0x00FF00; resultEmoji = '🟢 Vert (0)'; }
            else if (roll % 2 !== 0) { colorHex = 0xFF0000; resultEmoji = '🔴 Rouge'; }
            else { colorHex = 0x000000; resultEmoji = '⚫ Noir'; }

            const status = win ? `🎉 **GAGNÉ !** (+${gain} €)` : `❌ **PERDU...** (-${bet} €)`;
            
            return new EmbedBuilder()
                .setColor(colorHex)
                .setTitle(`Résultat : ${resultEmoji}`)
                .setDescription(`La boule est tombée sur le **${roll}**.\n\n${status}`)
                .setFooter({ text: `Nouveau solde : ${eco.get(user.id).cash} €` });
        };

        const getBetButtons = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('red').setLabel('Rouge 🔴').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('black').setLabel('Noir ⚫').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('green').setLabel('Vert 🟢').setStyle(ButtonStyle.Success)
        );

        const getReplayButtons = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('replay').setLabel('🔄 Rejouer').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('stop').setLabel('Partir').setStyle(ButtonStyle.Danger)
        );

        const message = await replyFunc({ embeds: [getBetEmbed()], components: [getBetButtons()], fetchReply: true });

        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id,
            time: 60000 
        });

        collector.on('collect', async i => {
            collector.resetTimer();

            if (i.customId === 'stop') {
                await i.update({ content: '👋 Merci d\'avoir joué !', components: [], embeds: [] });
                return collector.stop();
            }

            if (i.customId === 'replay') {
                if (eco.get(user.id).cash < bet) {
                    await i.update({ content: `❌ Tu es à sec ! Il te faut **${bet} €**.`, components: [], embeds: [] });
                    return collector.stop();
                }
                await i.update({ embeds: [getBetEmbed()], components: [getBetButtons()] });
                return;
            }

            // JEU
            if (eco.get(user.id).cash < bet) {
                return i.reply({ content: "❌ Tu n'as plus assez d'argent !", ephemeral: true });
            }

            eco.addCash(user.id, -bet);

            const choice = i.customId;
            const roll = Math.floor(Math.random() * 37);
            
            let win = false;
            let multiplier = 0;

            if (choice === 'green' && roll === 0) { win = true; multiplier = 15; }
            else if (choice === 'red' && roll !== 0 && roll % 2 !== 0) { win = true; multiplier = 2; }
            else if (choice === 'black' && roll !== 0 && roll % 2 === 0) { win = true; multiplier = 2; }

            const gain = win ? bet * multiplier : 0;
            if (win) eco.addCash(user.id, gain);

            await i.update({ 
                embeds: [getResultEmbed(choice, roll, win, gain)], 
                components: [getReplayButtons()] 
            });
        });

        collector.on('end', async (c, r) => {
            if (r !== 'user') try { await message.edit({ components: [] }); } catch(e){}
        });
    }
};