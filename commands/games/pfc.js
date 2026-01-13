const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pfc')
        .setDescription('Joue à Pierre-Feuille-Ciseaux')
        .addUserOption(option => 
            option.setName('adversaire')
                .setDescription('Contre qui veux-tu jouer ? (Laisse vide pour jouer contre le bot)')
                .setRequired(false)),

    async execute(interactionOrMessage) {
        let p1, p2, replyFunc, getMessage;

        // --- GESTION HYBRIDE & INITIALISATION ---
        if (interactionOrMessage.isCommand?.()) {
            p1 = interactionOrMessage.user;
            p2 = interactionOrMessage.options.getUser('adversaire');
            
            // Note: fetchReply: true est crucial pour récupérer le message pour le collector
            replyFunc = async (payload) => await interactionOrMessage.reply({ ...payload, fetchReply: true });
        } else {
            p1 = interactionOrMessage.author;
            // Récupère la première mention ou null
            p2 = interactionOrMessage.mentions.users.first(); 
            replyFunc = async (payload) => await interactionOrMessage.channel.send(payload);
        }

        // Si pas d'adversaire ou si l'adversaire est le bot ou soi-même -> Mode Bot
        if (!p2 || p2.id === interactionOrMessage.client.user.id || p2.id === p1.id) {
            return await playPvB(p1, replyFunc);
        } else {
            return await playPvP(p1, p2, replyFunc);
        }
    }
};

// ==========================================
// MODE 1 : JOUEUR CONTRE BOT (PvB)
// ==========================================
async function playPvB(user, replyFunc) {
    let playerScore = 0;
    let botScore = 0;

    const getEmbed = (result = null, choiceP = null, choiceB = null) => {
        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🤖 PFC vs Maoish')
            .setDescription(`**Score :** ${user.username} ${playerScore} - ${botScore} Maoish`)
            .setFooter({ text: 'Choisis ton arme !' });

        if (result) {
            const map = { 'pierre': '✊', 'feuille': '✋', 'ciseaux': '✌️' };
            embed.addFields(
                { name: 'Toi', value: map[choiceP], inline: true },
                { name: 'Résultat', value: result === 'win' ? '🏆 Gagné' : result === 'lose' ? '💀 Perdu' : '🤝 Égalité', inline: true },
                { name: 'Bot', value: map[choiceB], inline: true }
            );
            if(result === 'win') embed.setColor(0x2ECC71);
            if(result === 'lose') embed.setColor(0xE74C3C);
            if(result === 'draw') embed.setColor(0xF39C12);
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
            components: getRows(true, true) // Désactive boutons jeu, active boutons contrôle
        });
    });
}

// ==========================================
// MODE 2 : JOUEUR CONTRE JOUEUR (PvP)
// ==========================================
async function playPvP(p1, p2, replyFunc) {
    // Si p2 est un bot (autre que Maoish), on annule (optionnel)
    if (p2.bot) return replyFunc("❌ Tu ne peux pas défier un autre bot !");

    let scoreP1 = 0;
    let scoreP2 = 0;
    let choices = { [p1.id]: null, [p2.id]: null };

    const getEmbed = (showResult = false) => {
        let status = "En attente des choix...";
        let color = 0x9B59B6; // Violet pour PvP

        // Si on montre le résultat (fin de manche)
        if (showResult) {
            const c1 = choices[p1.id];
            const c2 = choices[p2.id];
            const map = { 'pierre': '✊', 'feuille': '✋', 'ciseaux': '✌️' };
            
            let winnerText = "🤝 Égalité !";
            if (c1 === c2) {
                color = 0xF39C12;
            } else if (
                (c1 === 'pierre' && c2 === 'ciseaux') ||
                (c1 === 'feuille' && c2 === 'pierre') ||
                (c1 === 'ciseaux' && c2 === 'feuille')
            ) {
                winnerText = `🏆 **${p1.username}** gagne !`;
                scoreP1++;
                color = 0x2ECC71;
            } else {
                winnerText = `🏆 **${p2.username}** gagne !`;
                scoreP2++;
                color = 0xE74C3C; // P2 gagne (Rouge ou autre)
            }

            status = `
            ${p1.username} : ${map[c1]}
            ${p2.username} : ${map[c2]}
            
            ${winnerText}`;
        } else {
            // Affichage "Qui a joué ?"
            const p1Status = choices[p1.id] ? "✅ Prêt" : "⏳ Réfléchit...";
            const p2Status = choices[p2.id] ? "✅ Prêt" : "⏳ Réfléchit...";
            status = `**${p1.username}** : ${p1Status}\n**${p2.username}** : ${p2Status}`;
        }

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(`⚔️ Duel PFC : ${p1.username} 🆚 ${p2.username}`)
            .setDescription(`**Scores :** ${scoreP1} - ${scoreP2}\n\n${status}`)
            .setFooter({ text: "Les choix sont cachés jusqu'à ce que les deux aient joué !" });
    };

    const getRows = (disableGame = false, showControls = false) => {
        const rows = [];
        
        // Boutons de jeu
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pierre').setLabel('✊ Pierre').setStyle(ButtonStyle.Secondary).setDisabled(disableGame),
            new ButtonBuilder().setCustomId('feuille').setLabel('✋ Feuille').setStyle(ButtonStyle.Secondary).setDisabled(disableGame),
            new ButtonBuilder().setCustomId('ciseaux').setLabel('✌️ Ciseaux').setStyle(ButtonStyle.Secondary).setDisabled(disableGame)
        ));

        // Boutons de contrôle (après un round)
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
        filter: i => i.user.id === p1.id || i.user.id === p2.id, // Seuls les 2 joueurs peuvent cliquer
        time: 120000 
    });

    collector.on('collect', async i => {
        collector.resetTimer();

        // --- GESTION ARRET ---
        if (i.customId === 'stop') {
            await i.update({ content: '🛑 Duel terminé !', components: [] });
            return collector.stop();
        }

        // --- GESTION REVANCHE (Round suivant) ---
        if (i.customId === 'revanche') {
            // Seul celui qui clique déclenche le reset, mais on vérifie quand même
            choices[p1.id] = null;
            choices[p2.id] = null;
            await i.update({ embeds: [getEmbed(false)], components: getRows(false, false) });
            return;
        }

        // --- GESTION JEU (Pierre/Feuille/Ciseaux) ---
        
        // Empêcher de changer de choix si déjà fait
        if (choices[i.user.id]) {
            return i.reply({ content: "🤫 Tu as déjà choisi ! Attends l'autre joueur.", ephemeral: true });
        }

        // Enregistrer le choix
        choices[i.user.id] = i.customId;

        // Vérifier si les deux ont joué
        if (choices[p1.id] && choices[p2.id]) {
            // Les deux ont joué -> On révèle !
            // On utilise update pour modifier le message principal
            await i.update({ 
                embeds: [getEmbed(true)], 
                components: getRows(true, true) // Désactive le jeu, active la revanche
            });
        } else {
            // Un seul a joué -> On met à jour le statut (Caché)
            // On utilise update pour montrer les ✅ dans l'embed
            await i.update({ embeds: [getEmbed(false)], components: getRows() });
        }
    });
}