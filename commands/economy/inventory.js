const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Affiche ton inventaire (sac à dos)')
        .addUserOption(o => o.setName('user').setDescription('Voir l\'inventaire de quelqu\'un d\'autre')),

    async execute(interactionOrMessage, args) {
        let user, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.options.getUser('user') || interactionOrMessage.user;
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.mentions.users.first() || interactionOrMessage.author;
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        const data = eco.get(user.id);
        const inventory = data.inventory || {};

        if (Object.keys(inventory).length === 0) {
            return replyFunc(`🎒 **Inventaire de ${user.username}**\n\n*Vide... Il y a juste un peu de poussière.* 💨`);
        }

        let totalValue = 0;
        const itemsList = Object.entries(inventory).map(([id, quantity]) => {
            const itemInfo = itemsDb.find(i => i.id === id);
            
            // Sécurité si l'item a été supprimé de la DB entre temps
            if (itemInfo) {
                totalValue += (itemInfo.sellPrice || 0) * quantity;
                return `**${quantity}x** ${itemInfo.name}`;
            } else {
                return `**${quantity}x** ${id} (Item inconnu)`;
            }
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle(`🎒 Inventaire de ${user.username}`)
            .setDescription(itemsList)
            .setFooter({ text: `Valeur de revente estimée : ${totalValue} €` });

        replyFunc({ embeds: [embed] });
    }
};