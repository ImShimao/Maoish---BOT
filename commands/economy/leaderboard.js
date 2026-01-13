const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Affiche le classement du serveur'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        // On garde cette fonction pour les réponses simples (erreurs)
        const replyFunc = interactionOrMessage.reply ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);
        
        // --- 1. CHARGEMENT ASYNCHRONE DES DONNÉES ---
        const sortedList = await eco.getLeaderboard(); 

        if (!sortedList || sortedList.length === 0) {
            return replyFunc("❌ Personne n'est classé pour le moment.");
        }

        // Fonction de tri dynamique
        const sortPlayers = (list, type) => {
            return [...list].sort((a, b) => {
                if (type === 'bank') return b.bank - a.bank;
                if (type === 'cash') return b.cash - a.cash;
                return b.networth - a.networth; // Default: Total
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
                if (position === 1) medal = '🥇';
                else if (position === 2) medal = '🥈';
                else if (position === 3) medal = '🥉';
                else medal = `**#${position}**`;

                let valueDisplay = '';
                if (type === 'bank') valueDisplay = `${p.bank} € (Banque)`;
                else if (type === 'cash') valueDisplay = `${p.cash} € (Cash)`;
                else valueDisplay = `💎 ${p.networth} € (Total)`;

                return `${medal} <@${p.id}> — ${valueDisplay}`;
            }).join('\n');

            return new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle(`🏆 Classement : ${type.toUpperCase()}`)
                .setDescription(desc || "Aucune donnée.")
                .setFooter({ text: `Page ${page + 1}/${Math.ceil(currentSortedList.length / itemsPerPage)}` });
        };

        // --- 3. COMPOSANTS ---
        const getRows = () => {
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('lb_filter')
                    .setPlaceholder('Filtrer le classement...')
                    .addOptions([
                        { label: '💎 Fortune Totale', value: 'total', emoji: '💎' },
                        { label: '🏦 Compte en Banque', value: 'bank', emoji: '🏦' },
                        { label: '💵 Cash Disponible', value: 'cash', emoji: '💵' }
                    ])
            );

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
                new ButtonBuilder().setCustomId('me').setLabel('📍 Me Trouver').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled((currentPage + 1) * itemsPerPage >= currentSortedList.length)
            );

            return [menu, buttons];
        };

        // --- CORRECTION MAJEURE ICI ---
        let msg;
        const payload = { embeds: [generateEmbed(0, 'total')], components: getRows() };

        if (interactionOrMessage.isCommand?.()) {
            // Pour les Slash Commands : on répond, PUIS on fetch le message proprement.
            // Cela évite l'option 'withResponse' dépréciée et garantit d'avoir l'objet Message.
            await interactionOrMessage.reply(payload);
            msg = await interactionOrMessage.fetchReply();
        } else {
            // Pour les Préfixes : channel.send renvoie directement le message.
            msg = await interactionOrMessage.channel.send(payload);
        }

        // --- 4. COLLECTOR ---
        // 'msg' est maintenant garanti d'être un objet Message valide
        const collector = msg.createMessageComponentCollector({ 
            filter: i => i.user.id === user.id, 
            time: 120000 
        });

        collector.on('collect', async i => {
            if (i.componentType === ComponentType.StringSelect) {
                currentType = i.values[0];
                currentSortedList = sortPlayers(sortedList, currentType);
                currentPage = 0;
            }
            else {
                if (i.customId === 'prev') currentPage--;
                if (i.customId === 'next') currentPage++;
                if (i.customId === 'me') {
                    const myIndex = currentSortedList.findIndex(p => p.id === user.id);
                    if (myIndex !== -1) currentPage = Math.floor(myIndex / itemsPerPage);
                    else return i.reply({ content: "Tu n'es pas classé !", ephemeral: true });
                }
            }
            await i.update({ embeds: [generateEmbed(currentPage, currentType)], components: getRows() });
        });
    }
};