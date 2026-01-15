const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const embeds = require('../../utils/embeds.js'); // ✅ Import

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Affiche ton inventaire paginé')
        .addUserOption(o => o.setName('user').setDescription('Voir l\'inventaire d\'un autre')),

    async execute(interactionOrMessage, args) {
        let user, replyFunc;
        
        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.options.getUser('user') || interactionOrMessage.user;
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.mentions.users.first() || interactionOrMessage.author;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        const data = await eco.get(user.id);
        const inventoryArr = Array.from(data.inventory.entries()).filter(([id, qty]) => qty > 0);
        
        const itemsPerPage = 10;
        let page = 0;

        // --- CAS : SAC VIDE ---
        if (inventoryArr.length === 0) {
            return replyFunc({ 
                embeds: [embeds.info(interactionOrMessage, `🎒 Inventaire de ${user.username}`, "*Ton sac est vide... Va pêcher ou miner pour le remplir !*")] 
            });
        }

        // --- GÉNÉRATION DE L'EMBED ---
        const generateEmbed = (p) => {
            const start = p * itemsPerPage;
            const currentItems = inventoryArr.slice(start, start + itemsPerPage);
            let totalValue = 0;
            
            // Calcul de la valeur totale du sac
            inventoryArr.forEach(([id, qty]) => {
                const item = itemsDb.find(i => i.id === id);
                if (item && item.sellPrice) totalValue += item.sellPrice * qty;
            });

            // Construction de la liste
            const desc = currentItems.map(([id, qty]) => {
                const item = itemsDb.find(i => i.id === id);
                const name = item ? item.name : id;
                const icon = item ? item.icon : '📦';
                const val = item ? item.sellPrice * qty : 0;
                
                return `**${icon} ${name}** : x${qty} \`(Val: ${val.toLocaleString('fr-FR')}€)\``;
            }).join('\n');

            const totalFmt = totalValue.toLocaleString('fr-FR');
            const cashFmt = data.cash.toLocaleString('fr-FR');

            // Utilisation de l'usine (embeds.info met la couleur MAIN par défaut)
            // On écrase le footer par défaut pour mettre les stats de pages/valeur
            return embeds.info(interactionOrMessage, `🎒 Inventaire de ${user.username}`, desc)
                .setFooter({ text: `Page ${p + 1}/${Math.ceil(inventoryArr.length / itemsPerPage)} • Valeur sac : ${totalFmt} € • Cash : ${cashFmt} €` });
        };

        const generateRows = (currentPage) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
                new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled((currentPage + 1) * itemsPerPage >= inventoryArr.length)
            );
        };

        // --- ENVOI ---
        let msg;
        const payload = { embeds: [generateEmbed(0)], components: [generateRows(0)] };

        if (interactionOrMessage.isCommand?.()) {
            await interactionOrMessage.reply(payload);
            msg = await interactionOrMessage.fetchReply();
        } else {
            msg = await interactionOrMessage.channel.send(payload);
        }

        // --- COLLECTOR ---
        const collector = msg.createMessageComponentCollector({ 
            filter: i => i.user.id === (interactionOrMessage.user?.id || interactionOrMessage.author.id), 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'prev') page--;
            if (i.customId === 'next') page++;

            await i.update({ 
                embeds: [generateEmbed(page)], 
                components: [generateRows(page)] 
            });
        });
    }
};