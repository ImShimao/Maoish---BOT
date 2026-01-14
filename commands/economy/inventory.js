const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Affiche ton inventaire paginé')
        .addUserOption(o => o.setName('user').setDescription('Voir l\'inventaire d\'un autre')),

    async execute(interactionOrMessage, args) {
        let user;
        
        // --- 1. RÉCUPÉRATION DE L'UTILISATEUR CIBLE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.options.getUser('user') || interactionOrMessage.user;
        } else {
            user = interactionOrMessage.mentions.users.first() || interactionOrMessage.author;
        }

        // --- 2. RÉCUPÉRATION DES DONNÉES ---
        const data = await eco.get(user.id);
        
        // On filtre pour ne garder que ce qui a une quantité > 0
        const inventoryArr = Array.from(data.inventory.entries()).filter(([id, qty]) => qty > 0);
        
        const itemsPerPage = 10; // J'ai augmenté un peu à 10 pour voir plus d'items
        let page = 0;

        // Cas Inventaire Vide
        if (inventoryArr.length === 0) {
            const emptyMsg = `🎒 **Inventaire de ${user.username}**\n\n*Ton sac est vide... Va pêcher ou miner !*`;
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.reply(emptyMsg);
            return interactionOrMessage.channel.send(emptyMsg);
        }

        // --- 3. FONCTIONS D'AFFICHAGE ---
        const generateEmbed = (p) => {
            const start = p * itemsPerPage;
            const currentItems = inventoryArr.slice(start, start + itemsPerPage);
            let totalValue = 0;
            
            // Calcul de la valeur totale de l'inventaire
            inventoryArr.forEach(([id, qty]) => {
                const item = itemsDb.find(i => i.id === id);
                if (item && item.sellPrice) totalValue += item.sellPrice * qty;
            });

            const desc = currentItems.map(([id, qty]) => {
                const item = itemsDb.find(i => i.id === id);
                const name = item ? item.name : id; // Fallback sur l'ID si nom introuvable
                const icon = item ? item.icon : '📦'; // Fallback icône
                const val = item ? item.sellPrice * qty : 0;
                
                return `**${icon} ${name}** : x${qty} \`(Val: ${val}€)\``;
            }).join('\n');

            return new EmbedBuilder()
                .setColor(config.COLORS?.MAIN || 0x3498DB)
                .setTitle(`🎒 Inventaire de ${user.username}`)
                .setDescription(desc)
                .setFooter({ text: `Page ${p + 1}/${Math.ceil(inventoryArr.length / itemsPerPage)} • Valeur sac : ${totalValue} € • Cash : ${data.cash} €` });
        };

        const generateRows = (currentPage) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('⬅️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('➡️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled((currentPage + 1) * itemsPerPage >= inventoryArr.length)
            );
        };

        // --- 4. ENVOI SÉCURISÉ DU MESSAGE ---
        let msg;
        const payload = { embeds: [generateEmbed(0)], components: [generateRows(0)] };

        if (interactionOrMessage.isCommand?.()) {
            await interactionOrMessage.reply(payload);
            msg = await interactionOrMessage.fetchReply();
        } else {
            msg = await interactionOrMessage.channel.send(payload);
        }

        // --- 5. COLLECTOR ---
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