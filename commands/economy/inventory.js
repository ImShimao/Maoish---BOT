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
        let user, replyFunc;
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.options.getUser('user') || interactionOrMessage.user;
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.mentions.users.first() || interactionOrMessage.author;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        const data = await eco.get(user.id);
        const inventoryArr = Array.from(data.inventory.entries());
        const itemsPerPage = 5;
        let page = 0;

        if (inventoryArr.length === 0) {
            return replyFunc(`🎒 **Inventaire de ${user.username}**\n\n*Vide...*`);
        }

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

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(inventoryArr.length <= itemsPerPage)
        );

        const msg = await replyFunc({ embeds: [generateEmbed(0)], components: [row], fetchReply: true });

        const collector = msg.createMessageComponentCollector({ 
            filter: i => i.user.id === (interactionOrMessage.user?.id || interactionOrMessage.author.id), 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.customId === 'prev') page--;
            if (i.customId === 'next') page++;

            const newRow = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(row.components[0]).setDisabled(page === 0),
                ButtonBuilder.from(row.components[1]).setDisabled((page + 1) * itemsPerPage >= inventoryArr.length)
            );

            await i.update({ embeds: [generateEmbed(page)], components: [newRow] });
        });
    }
};