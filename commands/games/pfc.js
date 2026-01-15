const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import de l'usine

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pfc')
        .setDescription('Joue à Pierre-Feuille-Ciseaux')
        .addUserOption(option => 
            option.setName('adversaire')
                .setDescription('Contre qui veux-tu jouer ? (Laisse vide pour jouer contre le bot)')
                .setRequired(false)),

    async execute(interactionOrMessage) {
        let p1, p2, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            p1 = interactionOrMessage.user;
            p2 = interactionOrMessage.options.getUser('adversaire');
            replyFunc = async (payload) => await interactionOrMessage.reply({ ...payload, fetchReply: true });
        } else {
            p1 = interactionOrMessage.author;
            p2 = interactionOrMessage.mentions.users.first(); 
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
        }

        // --- 1. SÉCURITÉ PRISON ---
        const userData = await eco.get(p1.id);
        if (userData.jailEnd > Date.now()) {
            const timeLeft = Math.ceil((userData.jailEnd - Date.now()) / 60000);
            return replyFunc({ 
                embeds: [embeds.error(interactionOrMessage, `🔒 **Tu es en PRISON !** Pas de jeux pour toi.\nLibération dans : **${timeLeft} minutes**.`)],
                ephemeral: true 
            });
        }

        // Si pas d'adversaire ou si l'adversaire est le bot ou soi-même -> Mode Bot
        if (!p2 || p2.id === interactionOrMessage.client.user.id || p2.id === p1.id) {
            return await playPvB(interactionOrMessage, p1, replyFunc);
        } else {
            return await playPvP(interactionOrMessage, p1, p2, replyFunc);
        }
    }
};

// ==========================================
// MODE 1 : JOUEUR CONTRE BOT (PvB)
// ==========================================
async function playPvB(interactionOrMessage, user, replyFunc) {
    let playerScore = 0;
    let botScore = 0;

    const getEmbed = (result = null, choiceP = null, choiceB = null) => {
        // Base embed
        let embed;
        const scoreText = `**Score :** ${user.username} ${playerScore} - ${botScore} Maoish`;

        if (!result) {
            // État initial
            embed = embeds.info(interactionOrMessage, '🤖 PFC vs Maoish', scoreText)
                .setFooter({ text: 'Choisis ton arme !' });
        } else {
            // Résultat
            const map = { 'pierre': '✊', 'feuille': '✋', 'ciseaux': '✌️' };
            
            if (result === 'win') {
                embed = embeds.success(interactionOrMessage, '🏆 Gagné !', scoreText);
            } else if (result === 'lose') {
                embed = embeds.error(interactionOrMessage, '💀 Perdu...', scoreText);
            } else {
                embed = embeds.warning(interactionOrMessage, '🤝 Égalité', scoreText);
            }

            embed.addFields(
                { name: 'Toi', value: map[choiceP], inline: true },
                { name: 'Résultat', value: result === 'win' ? 'Victoire' : result === 'lose' ? 'Défaite' : 'Nul', inline: true },
                { name: 'Maoish', value: map[choiceB], inline: true }
            );
        }
        return embed;
    };

    const getRows = (disable = false, revanche = false) => {
        const gameRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pierre').setLabel('✊ Pierre').setStyle(ButtonStyle.Primary).setDisabled(disable),
            new ButtonBuilder().setCustomId('feuille').setLabel('✋ Feuille').setStyle(ButtonStyle.Primary).setDisabled(disable),
            new ButtonBuilder().setCustomId('ciseaux').setLabel('✌️ Ciseaux').setStyle(ButtonStyle.Primary).setDisabled(disable)
        );
        const controlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('revanche').setLabel('🔄 Rejouer').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('stop').setLabel('Arrêter').setStyle(ButtonStyle.Danger)
        );
        return revanche ? [gameRow, controlRow] : [gameRow];
    };

    const msg = await replyFunc({ embeds: [getEmbed()], components: getRows() });
    if (!msg) return;

    const collector = msg.createMessageComponentCollector({ 
        componentType: ComponentType.Button, 
        filter: i => i.user.id === user.id, 
        time: 60000 
    });

    collector.on('collect', async i => {
        collector.resetTimer();

        if (i.customId === 'stop') {
            await i.update({ content: '🛑 Partie terminée.', components: [] });
            return collector.stop();
        }
        if (i.customId === 'revanche') {
            await i.update({ embeds: [getEmbed()], components: getRows() });
            return;
        }

        // Logique Jeu
        const choices = ['pierre', 'feuille', 'ciseaux'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        const userChoice = i.customId;
        let res = 'draw';

        if (userChoice !== botChoice) {
            if (
                (userChoice === 'pierre' && botChoice === 'ciseaux') ||
                (userChoice === 'feuille' && botChoice === 'pierre') ||
                (userChoice === 'ciseaux' && botChoice === 'feuille')
            ) {
                res = 'win';
                playerScore++;
            } else {
                res = 'lose';
                botScore++;
            }
        }

        await i.update({ 
            embeds: [getEmbed(res, userChoice, botChoice)], 
            components: getRows(true, true)
        });
    });
}

// ==========================================
// MODE 2 : JOUEUR CONTRE JOUEUR (PvP)
// ==========================================
async function playPvP(interactionOrMessage, p1, p2, replyFunc) {
    if (p2.bot) return replyFunc({ embeds: [embeds.error(interactionOrMessage, "Tu ne peux pas défier un autre bot !")] });

    let scoreP1 = 0;
    let scoreP2 = 0;
    let choices = { [p1.id]: null, [p2.id]: null };

    const getEmbed = (showResult = false) => {
        let status = "En attente des choix...";
        
        // Par défaut (En attente) : Violet
        let baseEmbed = embeds.info(interactionOrMessage, `⚔️ Duel PFC : ${p1.username} 🆚 ${p2.username}`, `**Scores :** ${scoreP1} - ${scoreP2}`)
            .setColor(0x9B59B6) 
            .setFooter({ text: "Les choix sont cachés jusqu'à ce que les deux aient joué !" });

        if (showResult) {
            const c1 = choices[p1.id];
            const c2 = choices[p2.id];
            const map = { 'pierre': '✊', 'feuille': '✋', 'ciseaux': '✌️' };
            
            let winnerText = "🤝 Égalité !";
            let color = 0xF39C12; // Orange (Nul)

            if (c1 === c2) {
                // Egalité
            } else if (
                (c1 === 'pierre' && c2 === 'ciseaux') ||
                (c1 === 'feuille' && c2 === 'pierre') ||
                (c1 === 'ciseaux' && c2 === 'feuille')
            ) {
                winnerText = `🏆 **${p1.username}** gagne !`;
                scoreP1++;
                color = 0x2ECC71; // Vert (P1 win)
            } else {
                winnerText = `🏆 **${p2.username}** gagne !`;
                scoreP2++;
                color = 0xE74C3C; // Rouge (P2 win)
            }

            status = `
            ${p1.username} : ${map[c1]}
            ${p2.username} : ${map[c2]}
            
            ${winnerText}`;
            
            baseEmbed.setDescription(`**Scores :** ${scoreP1} - ${scoreP2}\n\n${status}`).setColor(color);

        } else {
            const p1Status = choices[p1.id] ? "✅ Prêt" : "⏳ Réfléchit...";
            const p2Status = choices[p2.id] ? "✅ Prêt" : "⏳ Réfléchit...";
            status = `**${p1.username}** : ${p1Status}\n**${p2.username}** : ${p2Status}`;
            
            baseEmbed.setDescription(`**Scores :** ${scoreP1} - ${scoreP2}\n\n${status}`);
        }

        return baseEmbed;
    };

    const getRows = (disableGame = false, showControls = false) => {
        const rows = [];
        
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pierre').setLabel('✊ Pierre').setStyle(ButtonStyle.Secondary).setDisabled(disableGame),
            new ButtonBuilder().setCustomId('feuille').setLabel('✋ Feuille').setStyle(ButtonStyle.Secondary).setDisabled(disableGame),
            new ButtonBuilder().setCustomId('ciseaux').setLabel('✌️ Ciseaux').setStyle(ButtonStyle.Secondary).setDisabled(disableGame)
        ));

        if (showControls) {
            rows.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('revanche').setLabel('🔄 Manche Suivante').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('stop').setLabel('Arrêter le duel').setStyle(ButtonStyle.Danger)
            ));
        }
        
        return rows;
    };

    const msg = await replyFunc({ 
        content: `🔔 <@${p2.id}>, **${p1.username}** te défie au Pierre-Feuille-Ciseaux !`,
        embeds: [getEmbed()], 
        components: getRows() 
    });
    if (!msg) return;

    const collector = msg.createMessageComponentCollector({ 
        componentType: ComponentType.Button, 
        filter: i => i.user.id === p1.id || i.user.id === p2.id,
        time: 120000 
    });

    collector.on('collect', async i => {
        collector.resetTimer();

        if (i.customId === 'stop') {
            await i.update({ content: '🛑 Duel terminé !', components: [] });
            return collector.stop();
        }

        if (i.customId === 'revanche') {
            choices[p1.id] = null;
            choices[p2.id] = null;
            await i.update({ embeds: [getEmbed(false)], components: getRows(false, false) });
            return;
        }
        
        if (choices[i.user.id]) {
            return i.reply({ content: "🤫 Tu as déjà choisi ! Attends l'autre joueur.", ephemeral: true });
        }

        choices[i.user.id] = i.customId;

        if (choices[p1.id] && choices[p2.id]) {
            await i.update({ 
                embeds: [getEmbed(true)], 
                components: getRows(true, true)
            });
        } else {
            await i.update({ embeds: [getEmbed(false)], components: getRows() });
        }
    });
}