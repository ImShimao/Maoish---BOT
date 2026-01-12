const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Mise sur une couleur (Rouge/Noir/Vert)')
        .addIntegerOption(opt => 
            opt.setName('mise')
                .setDescription('Combien tu paries ?')
                .setRequired(true)
                .setMinValue(10)),

    async execute(interactionOrMessage, args) {
        let user, bet, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            bet = interactionOrMessage.options.getInteger('mise');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            // +roulette 100
            if (!args[0] || isNaN(args[0])) return interactionOrMessage.reply("❌ Usage: `+roulette 100`");
            bet = parseInt(args[0]);
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
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

        // --- DÉMARRAGE ---
        // On vérifie une première fois si le joueur a l'argent avant même d'afficher
        if (eco.get(user.id).cash < bet) {
            return replyFunc(`❌ Tu n'as pas assez de cash (${eco.get(user.id).cash} €) pour miser **${bet} €**.`);
        }

        const message = await replyFunc({ embeds: [getBetEmbed()], components: [getBetButtons()], fetchReply: true });

        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id,
            time: 60000 
        });

        collector.on('collect', async i => {
            collector.resetTimer();

            // 1. ARRÊTER
            if (i.customId === 'stop') {
                await i.update({ content: '👋 Merci d\'avoir joué !', components: [], embeds: [] });
                return collector.stop();
            }

            // 2. REJOUER (Retour au choix des couleurs)
            if (i.customId === 'replay') {
                // Vérif argent avant de rejouer
                if (eco.get(user.id).cash < bet) {
                    await i.update({ content: `❌ Tu es à sec ! Il te faut **${bet} €**.`, components: [], embeds: [] });
                    return collector.stop();
                }
                await i.update({ embeds: [getBetEmbed()], components: [getBetButtons()] });
                return;
            }

            // 3. JEU (PARI SUR UNE COULEUR)
            // On revérifie l'argent au moment du clic (sécurité)
            if (eco.get(user.id).cash < bet) {
                return i.reply({ content: "❌ Tu n'as plus assez d'argent !", ephemeral: true });
            }

            // DÉBITER LA MISE
            eco.addCash(user.id, -bet);

            const choice = i.customId;
            const roll = Math.floor(Math.random() * 37); // Chiffres de 0 à 36
            
            let win = false;
            let multiplier = 0;

            // Logique de victoire
            // 0 = Vert
            // Impair = Rouge (simplification classique)
            // Pair (non 0) = Noir
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