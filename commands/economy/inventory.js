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

        const data = await eco.get(user.id);
        const inventory = data.inventory || new Map();

        // --- CORRECTION MAJEURE ICI ---
        // Pour une Map (MongoDB), on utilise .size et non Object.keys()
        if (!inventory.size || inventory.size === 0) {
            return replyFunc(`🎒 **Inventaire de ${user.username}**\n\n*Vide... Il y a juste un peu de poussière.* 💨`);
        }

        let totalValue = 0;
        
        // On transforme la Map en tableau pour pouvoir faire .map()
        const itemsList = Array.from(inventory.entries()).map(([id, quantity]) => {
            const itemInfo = itemsDb.find(i => i.id === id);
            
            if (itemInfo) {
                totalValue += (itemInfo.sellPrice || 0) * quantity;
                return `**${quantity}x** ${itemInfo.name}`;
            } else {
                return `**${quantity}x** ${id} (Item inconnu)`;
            }
        }).join('\n');

        // Sécurité supplémentaire : si la liste est vide (ce qui ne devrait plus arriver avec le check .size), on met un texte par défaut
        const descriptionFinal = itemsList && itemsList.length > 0 ? itemsList : "Rien d'intéressant.";

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle(`🎒 Inventaire de ${user.username}`)
            .setDescription(descriptionFinal) // Ici ça ne plantera plus
            .setFooter({ text: `Valeur de revente estimée : ${totalValue} €` });

        replyFunc({ embeds: [embed] });
    }
};