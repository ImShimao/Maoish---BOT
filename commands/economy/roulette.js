const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Joue à la Roulette (Rouge/Noir/Vert)'),

    async execute(interactionOrMessage) {
        let user, replyFunc;
        // Gestion Hybride
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
        }

        // --- FONCTIONS D'AFFICHAGE ---
        const getBetEmbed = () => new EmbedBuilder()
            .setColor(0x2F3136)
            .setTitle('🎡 Faites vos jeux !')
            .setDescription('Sur quelle couleur la boule va-t-elle tomber ?\n\n🔴 **Rouge** (x2)\n⚫ **Noir** (x2)\n🟢 **Vert** (x14 - Jackpot)')
            .setFooter({ text: 'Maoish Casino • Bonne chance' });

        const getResultEmbed = (choice, roll, win) => {
            let colorHex, resultEmoji;
            
            if (roll === 0) { colorHex = 0x00FF00; resultEmoji = '🟢 Vert (0)'; }
            else if (roll % 2 !== 0) { colorHex = 0xFF0000; resultEmoji = '🔴 Rouge'; }
            else { colorHex = 0x000000; resultEmoji = '⚫ Noir'; }

            const status = win ? "🎉 **GAGNÉ !**" : "❌ **PERDU...**";
            
            return new EmbedBuilder()
                .setColor(colorHex)
                .setTitle(`Résultat : ${resultEmoji}`)
                .setDescription(`La boule est tombée sur le **${roll}**.\n\n${status}`)
                .setFooter({ text: `Tu avais misé sur ${choice === 'red' ? 'Rouge' : choice === 'black' ? 'Noir' : 'Vert'}` });
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
        const message = await replyFunc({ embeds: [getBetEmbed()], components: [getBetButtons()], fetchReply: true });

        // --- COLLECTOR (Boucle de jeu) ---
        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === user.id,
            time: 60000 
        });

        collector.on('collect', async i => {
            collector.resetTimer(); // On reset le timer à chaque action

            if (i.customId === 'stop') {
                await i.update({ content: '👋 Merci d\'avoir joué !', components: [], embeds: [] });
                return collector.stop();
            }

            if (i.customId === 'replay') {
                // On remet l'écran de mise
                await i.update({ embeds: [getBetEmbed()], components: [getBetButtons()] });
                return;
            }

            // Si c'est un pari (red/black/green)
            const choice = i.customId;
            const roll = Math.floor(Math.random() * 37); // 0 à 36
            
            // Logique de victoire
            let win = false;
            if (choice === 'green' && roll === 0) win = true;
            else if (choice === 'red' && roll !== 0 && roll % 2 !== 0) win = true;
            else if (choice === 'black' && roll !== 0 && roll % 2 === 0) win = true;

            // Affichage résultat + Bouton Rejouer
            await i.update({ 
                embeds: [getResultEmbed(choice, roll, win)], 
                components: [getReplayButtons()] 
            });
        });

        collector.on('end', async (c, r) => {
            if (r !== 'user') try { await message.edit({ components: [] }); } catch(e){}
        });
    }
};