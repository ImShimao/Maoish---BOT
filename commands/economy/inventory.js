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
        const inventoryArr = Array.from(data.inventory.entries());
        const itemsPerPage = 5;
        let page = 0;

        // Cas Inventaire Vide
        if (inventoryArr.length === 0) {
            const emptyMsg = `🎒 **Inventaire de ${user.username}**\n\n*Vide...*`;
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.reply(emptyMsg);
            return interactionOrMessage.channel.send(emptyMsg);
        }

        // --- 3. FONCTIONS D'AFFICHAGE ---
        const generateEmbed = (p) => {
            const start = p * itemsPerPage;
            const currentItems = inventoryArr.slice(start, start + itemsPerPage);
            let totalValue = 0;
            
            inventoryArr.forEach(([id, qty]) => {
                const item = itemsDb.find(i => i.id === id);
                if (item) totalValue += (item.sellPrice || 0) * qty;
            });

            const desc = currentItems.map(([id, qty]) => {
                const item = itemsDb.find(i => i.id === id);
                return `**${qty}x** ${item ? item.name : id}\n*Valeur: ${item ? item.sellPrice * qty : 0} €*`;
            }).join('\n\n');

            return new EmbedBuilder()
                .setColor(config.COLORS.MAIN)
                .setTitle(`🎒 Inventaire de ${user.username}`)
                .setDescription(desc)
                .setFooter({ text: `Page ${p + 1}/${Math.ceil(inventoryArr.length / itemsPerPage)} • Valeur totale: ${totalValue} €` });
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
            // Slash Command : On répond, PUIS on récupère l'objet Message proprement
            await interactionOrMessage.reply(payload);
            msg = await interactionOrMessage.fetchReply();
        } else {
            // Prefix Command : channel.send renvoie direct l'objet Message
            msg = await interactionOrMessage.channel.send(payload);
        }

        // --- 5. COLLECTOR ---
        // msg est maintenant garanti d'être un Message valide
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