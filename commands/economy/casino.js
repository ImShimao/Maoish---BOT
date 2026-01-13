const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('casino')
        .setDescription('Affiche la liste des jeux et les règles du Casino'),

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

        // On récupère l'argent du joueur pour l'afficher dans le footer
        const userData = await eco.get(user.id);

        const embed = new EmbedBuilder()
            .setColor(0xF1C40F) // Couleur Or/Casino
            .setTitle('🎰 Bienvenue au Casino Maoish')
            .setDescription(`Voici la liste des jeux disponibles pour faire fructifier (ou perdre) ton argent !\n\n💰 **Ton Solde :** ${userData.cash} € (Cash) / ${userData.bank} € (Banque)`)
            .addFields(
                { 
                    name: '🚀 Fusée (Crash)', 
                    value: '`/fusee [mise]`\nLe multiplicateur monte... Saute avant que la fusée n\'explose !', 
                    inline: true 
                },
                { 
                    name: '🃏 Blackjack', 
                    value: '`/blackjack [mise]`\nApproche-toi de 21 sans dépasser. Bats le croupier !', 
                    inline: true 
                },
                { 
                    name: '🔴 Roulette', 
                    value: '`/roulette [mise] [couleur]`\nParie sur Rouge, Noir ou Vert (x14).', 
                    inline: true 
                },
                { 
                    name: '🎰 Slots (Machine à sous)', 
                    value: '`/slots [mise]`\nAlignes les symboles pour gagner le jackpot.', 
                    inline: true 
                },
                { 
                    name: '💣 Démineur', 
                    value: '`/mine [mise] [nb_mines]`\nRetourne les cases sans tomber sur une bombe.', 
                    inline: true 
                },
                { 
                    name: '🐎 Courses (Horse)', 
                    value: '`/horse [mise]`\nParie sur le cheval gagnant.', 
                    inline: true 
                },
                { 
                    name: '🪙 Pile ou Face', 
                    value: '`/pileouface [mise] [choix]`\nUn classique. Double ou rien.', 
                    inline: true 
                },
                { 
                    name: '✂️ Pierre Feuille Ciseaux', 
                    value: '`/pfc [adversaire]`\nJoue contre le bot ou défie un ami.', 
                    inline: true 
                },
                { 
                    name: '🎲 Dés (Dice)', 
                    value: '`/dice [mise]`\nLance les dés et tente de faire un gros score.', 
                    inline: true 
                }
            )
            .setFooter({ text: 'Joue de manière responsable... ou fais tapis !' })
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/1067/1067357.png'); // Icone Casino générique

        return replyFunc({ embeds: [embed] });
    }
};