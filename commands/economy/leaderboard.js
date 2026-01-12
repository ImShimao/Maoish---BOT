const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Affiche le classement du serveur'),

    async execute(interactionOrMessage) {
        const user = interactionOrMessage.user || interactionOrMessage.author;
        const replyFunc = interactionOrMessage.reply ? (p) => interactionOrMessage.reply(p) : (p) => interactionOrMessage.channel.send(p);

        // --- 1. PRÉPARATION DES DONNÉES ---
        const allData = eco.getAll();
        const players = [];

        // On transforme l'objet {ID: Data} en tableau propre
        for (const [id, data] of Object.entries(allData)) {
            if (id === 'shop') continue; // Protection si le shop a des fonds
            
            // Calcul de la "Richesse Totale" via la nouvelle fonction eco.getNetWorth
            // Mais comme getAll retourne les données brutes, on doit recalculer ici ou appeler getNetWorth pour chaque ID.
            // Pour optimiser, on appelle eco.getNetWorth(id) qui est safe.
            const netWorth = eco.getNetWorth(id);
            
            players.push({
                id: id,
                cash: data.cash || 0,
                bank: data.bank || 0,
                networth: netWorth
            });
        }

        // Fonction de tri
        const sortPlayers = (type) => {
            return [...players].sort((a, b) => {
                if (type === 'bank') return b.bank - a.bank;
                if (type === 'cash') return b.cash - a.cash;
                return b.networth - a.networth; // Default: Total
            });
        };

        // --- 2. GESTION DE L'AFFICHAGE (Pagination) ---
        let currentType = 'total'; // total, bank, cash
        let currentPage = 0;
        const itemsPerPage = 10;
        
        let sortedList = sortPlayers(currentType);

        const generateEmbed = async (page, type) => {
            const start = page * itemsPerPage;
            const currentList = sortedList.slice(start, start + itemsPerPage);
            
            // On fetch les pseudos si possible, sinon ID
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
                .setDescription(desc || "Personne dans le classement...")
                .setFooter({ text: `Page ${page + 1}/${Math.ceil(sortedList.length / itemsPerPage)} • Tu es rang #${sortedList.findIndex(x => x.id === user.id) + 1}` });
        };

        // --- 3. COMPOSANTS (Menu + Boutons) ---
        const getRows = () => {
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('lb_filter')
                    .setPlaceholder('Filtrer le classement...')
                    .addOptions([
                        { label: '💎 Fortune Totale (Tout inclus)', value: 'total', emoji: '💎' },
                        { label: '🏦 Compte en Banque', value: 'bank', emoji: '🏦' },
                        { label: '💵 Cash Disponible', value: 'cash', emoji: '💵' }
                    ])
            );

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
                new ButtonBuilder().setCustomId('me').setLabel('📍 Me Trouver').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled((currentPage + 1) * itemsPerPage >= sortedList.length)
            );

            return [menu, buttons];
        };

        // Envoi initial
        const msg = await replyFunc({ embeds: [await generateEmbed(0, 'total')], components: getRows(), fetchReply: true });

        // --- 4. COLLECTOR ---
        const collector = msg.createMessageComponentCollector({ 
            filter: i => i.user.id === user.id, // Seul l'auteur peut contrôler
            time: 120000 
        });

        collector.on('collect', async i => {
            // Changement de Filtre
            if (i.componentType === ComponentType.StringSelect) {
                currentType = i.values[0];
                sortedList = sortPlayers(currentType);
                currentPage = 0; // Retour page 1
            }
            // Boutons
            else {
                if (i.customId === 'prev') currentPage--;
                if (i.customId === 'next') currentPage++;
                if (i.customId === 'me') {
                    // Trouver le rang du joueur
                    const myIndex = sortedList.findIndex(p => p.id === user.id);
                    if (myIndex !== -1) {
                        // Calculer la page : Si rang 15 (index 14) et 10 par page -> Page 1 (14/10 = 1.4 -> floor 1)
                        currentPage = Math.floor(myIndex / itemsPerPage);
                    } else {
                        return i.reply({ content: "❌ Tu n'es pas dans le classement !", ephemeral: true });
                    }
                }
            }

            await i.update({ embeds: [await generateEmbed(currentPage, currentType)], components: getRows() });
        });
    }
};