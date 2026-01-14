const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Affiche le classement du serveur'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        
        // Fonction pour répondre (supporte Slash command et Prefix)
        const replyFunc = async (payload) => {
            if (interactionOrMessage.isCommand?.()) return await interactionOrMessage.reply(payload);
            return await interactionOrMessage.channel.send(payload);
        };
        
        // --- 1. CHARGEMENT DES DONNÉES ---
        // Ton eco.js renvoie maintenant tout le monde avec .level et .xp
        const sortedList = await eco.getLeaderboard(); 

        if (!sortedList || sortedList.length === 0) {
            return replyFunc("❌ Personne n'est classé pour le moment.");
        }

        // Fonction de tri dynamique
        const sortPlayers = (list, type) => {
            return [...list].sort((a, b) => {
                if (type === 'bank') return b.bank - a.bank;
                if (type === 'cash') return b.cash - a.cash;
                
                // --- TRI PAR XP ---
                if (type === 'xp') {
                    // D'abord on compare les niveaux
                    if (b.level !== a.level) return b.level - a.level;
                    // Si même niveau, celui qui a le plus d'XP gagne
                    return b.xp - a.xp;
                }
                
                return b.networth - a.networth; // Par défaut : Fortune Totale
            });
        };

        // --- 2. GESTION DE L'AFFICHAGE ---
        let currentType = 'total'; 
        let currentPage = 0;
        const itemsPerPage = 10;
        
        let currentSortedList = sortPlayers(sortedList, currentType);

        const generateEmbed = (page, type) => {
            const start = page * itemsPerPage;
            const currentList = currentSortedList.slice(start, start + itemsPerPage);
            
            const desc = currentList.map((p, index) => {
                const position = start + index + 1;
                let medal = '';
                
                // Médailles
                if (position === 1) medal = '🥇';
                else if (position === 2) medal = '🥈';
                else if (position === 3) medal = '🥉';
                else medal = `**#${position}**`;

                // Affichage dynamique selon le type (Argent ou XP)
                let valueDisplay = '';
                if (type === 'bank') valueDisplay = `${p.bank.toLocaleString('fr-FR')} € (Banque)`;
                else if (type === 'cash') valueDisplay = `${p.cash.toLocaleString('fr-FR')} € (Cash)`;
                else if (type === 'xp') valueDisplay = `⭐ Niveau **${p.level}** | ${p.xp} XP`;
                else valueDisplay = `💎 ${p.networth.toLocaleString('fr-FR')} € (Total)`;

                return `${medal} <@${p.id}> — ${valueDisplay}`;
            }).join('\n');

            // Titre dynamique
            let title = "💎 Classement : Fortune Totale";
            if (type === 'bank') title = "🏦 Classement : Banque";
            if (type === 'cash') title = "💵 Classement : Cash";
            if (type === 'xp') title = "🏆 Classement : Expérience (XP)";

            return new EmbedBuilder()
                .setColor(0xF1C40F) // Couleur Or
                .setTitle(title)
                .setDescription(desc || "Aucune donnée.")
                .setFooter({ text: `Page ${page + 1}/${Math.ceil(currentSortedList.length / itemsPerPage)}` });
        };

        // --- 3. COMPOSANTS (Boutons + Menu) ---
        const getRows = () => {
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('lb_filter')
                    .setPlaceholder('Filtrer le classement...')
                    .addOptions([
                        { label: '💎 Fortune Totale', value: 'total', emoji: '💎' },
                        { label: '🏦 Compte en Banque', value: 'bank', emoji: '🏦' },
                        { label: '💵 Cash Disponible', value: 'cash', emoji: '💵' },
                        { label: '⭐ Expérience / Niveau', value: 'xp', emoji: '⭐' } // Nouvelle option
                    ])
            );

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
                new ButtonBuilder().setCustomId('me').setLabel('📍 Me Trouver').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled((currentPage + 1) * itemsPerPage >= currentSortedList.length)
            );

            return [menu, buttons];
        };

        let msg;
        const payload = { embeds: [generateEmbed(0, 'total')], components: getRows() };

        // Envoi initial
        await replyFunc(payload);
        
        // Récupération du message pour le collector
        if (interactionOrMessage.isCommand?.()) msg = await interactionOrMessage.fetchReply();
        else msg = interactionOrMessage.channel.lastMessage; 

        // --- 4. COLLECTOR (Interactions) ---
        const collector = msg.createMessageComponentCollector({ 
            filter: i => i.user.id === user.id, 
            time: 120000 
        });

        collector.on('collect', async i => {
            // Changement de filtre (Menu déroulant)
            if (i.componentType === ComponentType.StringSelect) {
                currentType = i.values[0];
                currentSortedList = sortPlayers(sortedList, currentType);
                currentPage = 0; // Retour page 1
            }
            // Boutons de navigation
            else {
                if (i.customId === 'prev') currentPage--;
                if (i.customId === 'next') currentPage++;
                if (i.customId === 'me') {
                    // Trouver la position du joueur dans la liste actuelle
                    const myIndex = currentSortedList.findIndex(p => p.id === user.id);
                    if (myIndex !== -1) currentPage = Math.floor(myIndex / itemsPerPage);
                    else return i.reply({ content: "Tu n'es pas classé dans cette catégorie !", ephemeral: true });
                }
            }
            await i.update({ embeds: [generateEmbed(currentPage, currentType)], components: getRows() });
        });
    }
};