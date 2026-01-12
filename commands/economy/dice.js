const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Duel de dés contre un autre joueur')
        .addUserOption(o => o.setName('adversaire').setDescription('Qui défier ?').setRequired(true))
        .addIntegerOption(o => o.setName('mise').setDescription('Somme à parier').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let p1, p2, bet, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            p1 = interactionOrMessage.user;
            p2 = interactionOrMessage.options.getUser('adversaire');
            bet = interactionOrMessage.options.getInteger('mise');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            p1 = interactionOrMessage.author;
            p2 = interactionOrMessage.mentions.users.first();
            bet = parseInt(args[1]);
            replyFunc = (p) => interactionOrMessage.channel.send(p);
            if (!p2 || isNaN(bet)) return replyFunc("❌ Usage: `+dice @Adversaire 100`");
        }

        if (p1.id === p2.id || p2.bot) return replyFunc("❌ Adversaire invalide.");
        if (bet <= 0) return replyFunc("❌ Mise invalide.");

        // Vérif Argent des DEUX joueurs
        const data1 = eco.get(p1.id);
        const data2 = eco.get(p2.id);

        if (data1.cash < bet) return replyFunc(`❌ Tu n'as pas assez de cash (${data1.cash}€).`);
        if (data2.cash < bet) return replyFunc(`❌ ${p2.username} n'a pas assez de cash (${data2.cash}€).`);

        // Message de défi
        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🎲 Duel de Dés')
            .setDescription(`${p1} défie ${p2} pour **${bet} €** !\n\n${p2}, acceptes-tu le défi ?`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('accept').setLabel('Accepter').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('refuse').setLabel('Refuser').setStyle(ButtonStyle.Danger)
        );

        const msg = await replyFunc({ content: `${p2}`, embeds: [embed], components: [row], fetchReply: true });

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === p2.id, // Seul l'adversaire peut répondre
            time: 30000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'refuse') {
                await i.update({ content: '❌ Défi refusé.', embeds: [], components: [] });
                return collector.stop();
            }

            // LE MATCH
            const roll1 = Math.floor(Math.random() * 6) + 1;
            const roll2 = Math.floor(Math.random() * 6) + 1;

            let resultTxt, color;

            if (roll1 > roll2) {
                eco.addCash(p1.id, bet);
                eco.addCash(p2.id, -bet);
                resultTxt = `🏆 **${p1.username} gagne !** (+${bet}€)`;
                color = 0x2ECC71;
            } else if (roll2 > roll1) {
                eco.addCash(p2.id, bet);
                eco.addCash(p1.id, -bet);
                resultTxt = `🏆 **${p2.username} gagne !** (+${bet}€)`;
                color = 0xFF0000;
            } else {
                resultTxt = "🤝 **Égalité !** Personne ne perd rien.";
                color = 0xFFA500;
            }

            const resultEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle('🎲 Résultats')
                .addFields(
                    { name: p1.username, value: `🎲 **${roll1}**`, inline: true },
                    { name: p2.username, value: `🎲 **${roll2}**`, inline: true }
                )
                .setDescription(`\n${resultTxt}`);

            await i.update({ content: null, embeds: [resultEmbed], components: [] });
            collector.stop();
        });
    }
};