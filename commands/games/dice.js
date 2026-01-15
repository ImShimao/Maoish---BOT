const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Duel de dés contre un autre joueur')
        .addUserOption(o => o.setName('adversaire').setDescription('Qui défier ?').setRequired(true))
        .addStringOption(o => o.setName('mise').setDescription('Somme à parier (ou "all")').setRequired(true)),

    async execute(interactionOrMessage, args) {
        let p1, p2, betInput, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            p1 = interactionOrMessage.user;
            p2 = interactionOrMessage.options.getUser('adversaire');
            betInput = interactionOrMessage.options.getString('mise');
            replyFunc = async (p) => await interactionOrMessage.reply(p);
        } else {
            p1 = interactionOrMessage.author;
            p2 = interactionOrMessage.mentions.users.first();
            betInput = args[1];
            replyFunc = async (p) => await interactionOrMessage.channel.send(p);
            
            if (!p2 || !betInput) {
                return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Usage correct : `+dice @Adversaire 100`")] });
            }
        }

        if (p1.id === p2.id) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu ne peux pas te défier toi-même.")] });
        if (p2.bot) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu ne peux pas défier un robot.")] });

        // --- DONNÉES ÉCO ---
        const data1 = await eco.get(p1.id);
        const data2 = await eco.get(p2.id);
        
        // --- SÉCURITÉ PRISON (P1) ---
        if (data1.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((data1.jailEnd - Date.now()) / 60000);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas de duels pour toi.\nLibération dans : **${timeLeft} minutes**.`)],
                ephemeral: true 
            });
        }

        // --- GESTION DU "ALL" ---
        let bet = 0;
        if (['all', 'tout', 'max', 'tapis'].includes(betInput.toLowerCase())) {
            bet = data1.cash; // Ton tapis
        } else {
            bet = parseInt(betInput);
        }

        if (isNaN(bet) || bet <= 0) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Mise invalide.")] });

        // Vérif Argent
        if (data1.cash < bet) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `Tu n'as pas assez de cash (${data1.cash}€).`)] });
        if (data2.cash < bet) return replyFunc({ embeds: [embeds.error(interactionOrMessage, `**${p2.username}** n'a pas assez de cash pour suivre ton pari (${data2.cash}€).`)] });

        // --- MESSAGE DE DÉFI ---
        // On utilise embeds.warning (Orange) pour le défi en attente
        const challengeEmbed = embeds.warning(interactionOrMessage, '🎲 Duel de Dés', `${p1} défie ${p2} pour **${bet} €** !\n\n${p2}, acceptes-tu le défi ?`)
            .setFooter({ text: 'Réponds en cliquant ci-dessous' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('accept').setLabel('Accepter').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('refuse').setLabel('Refuser').setStyle(ButtonStyle.Danger)
        );

        const msg = await replyFunc({ content: `${p2}`, embeds: [challengeEmbed], components: [row], fetchReply: true });

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            filter: i => i.user.id === p2.id, // Seul l'adversaire peut répondre
            time: 30000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'refuse') {
                await i.update({ 
                    content: null, 
                    embeds: [embeds.error(interactionOrMessage, "Défi refusé.", `**${p2.username}** a refusé le duel.`)], 
                    components: [] 
                });
                return collector.stop();
            }

            // --- LE MATCH ---
            // Re-vérification de l'argent au dernier moment (anti-glitch)
            const verify1 = await eco.get(p1.id);
            const verify2 = await eco.get(p2.id);
            if (verify1.cash < bet || verify2.cash < bet) {
                await i.update({ content: "❌ L'un des joueurs n'a plus assez d'argent !", embeds: [], components: [] });
                return collector.stop();
            }

            const roll1 = Math.floor(Math.random() * 6) + 1;
            const roll2 = Math.floor(Math.random() * 6) + 1;

            let resultTxt, color;

            if (roll1 > roll2) {
                await eco.addCash(p1.id, bet);
                await eco.addCash(p2.id, -bet);
                resultTxt = `🏆 **${p1.username} gagne !** (+${bet}€)`;
                color = 0x2ECC71; // Vert
            } else if (roll2 > roll1) {
                await eco.addCash(p2.id, bet);
                await eco.addCash(p1.id, -bet);
                resultTxt = `🏆 **${p2.username} gagne !** (+${bet}€)`;
                color = 0xE74C3C; // Rouge (du point de vue de P1, ou neutre)
            } else {
                resultTxt = "🤝 **Égalité !** Personne ne perd rien.";
                color = 0xFFA500; // Orange
            }

            // Résultat avec embeds.info + couleur custom
            const resultEmbed = embeds.info(interactionOrMessage, '🎲 Résultats du Duel', `\n${resultTxt}`)
                .setColor(color)
                .addFields(
                    { name: p1.username, value: `🎲 **${roll1}**`, inline: true },
                    { name: p2.username, value: `🎲 **${roll2}**`, inline: true }
                );

            await i.update({ content: null, embeds: [resultEmbed], components: [] });
            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                try {
                    await msg.edit({ 
                        content: null, 
                        embeds: [embeds.error(interactionOrMessage, "Temps écoulé.", "Le défi a expiré.")], 
                        components: [] 
                    });
                } catch (e) {}
            }
        });
    }
};