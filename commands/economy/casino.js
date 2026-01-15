const { SlashCommandBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import

module.exports = {
    data: new SlashCommandBuilder()
        .setName('casino')
        .setDescription('Le guide complet pour débuter et jouer au Casino'),

    async execute(interactionOrMessage) {
        let user, replyFunc;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        const userData = await eco.get(user.id);
        const fmt = (n) => n.toLocaleString('fr-FR');

        // Utilisation de l'usine d'embeds
        const embed = embeds.info(interactionOrMessage, '🎰 Bienvenue au Maoish Palace', 
            `Bienvenue **${user.username}** ! Ici, la fortune sourit aux audacieux.\n\n` +
            `💰 **Tes jetons :** \`${fmt(userData.cash)} €\` (Poche)\n` +
            `🏦 **À l'abri :** \`${fmt(userData.bank)} €\` (Banque)`
        )
        .setColor(0xF1C40F) // Or (Spécifique Casino)
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/1067/1067357.png')
        .addFields(
            { 
                name: '🔰 Comment débuter ?', 
                value: '1️⃣ Utilise `/daily` pour ton cadeau de 24h.\n' +
                       '2️⃣ Fais `/job` pour travailler et gagner un salaire.\n' +
                       '3️⃣ Si tu es fauché, tente un `/beg` (mendiant) !',
                inline: false 
            },
            { 
                name: '🎮 Les Jeux de Table', 
                value: '🃏 **/blackjack** `[mise]` : Le 21 classique.\n' +
                       '🔴 **/roulette** `[mise] [couleur]` : Rouge, Noir ou Vert.\n' +
                       '🪙 **/pileouface** `[mise] [choix]` : 50/50 pur.',
                inline: true 
            },
            { 
                name: '🕹️ Machines & Fun', 
                value: '🎰 **/slots** `[mise]` : Tente le jackpot !\n' +
                       '🚀 **/fusee** `[mise]` : Éjecte-toi avant le crash.\n' +
                       '🎲 **/dice** `[mise]` : Lance les dés.',
                inline: true 
            },
            { 
                name: '🧨 Risques & Périls', 
                value: '💣 **/demineur** `[mise]` : Ne marche pas sur une mine.\n' +
                       '🐎 **/horse** `[mise]` : Parie sur le bon canasson.',
                inline: true 
            },
            { 
                name: '💡 Astuces', 
                value: '• Dépose ton argent en banque (`/bank déposer`) pour éviter les vols !\n' +
                       '• Surveille le classement avec `/leaderboard` pour voir qui est le roi du serveur.',
                inline: false 
            }
        )
        .setFooter({ text: 'Rappel : La maison gagne (presque) toujours ! Joue avec modération.' });

        return replyFunc({ embeds: [embed] });
    }
};