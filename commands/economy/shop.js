const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Ouvre la boutique')
        .addStringOption(o => o.setName('item').setDescription('Achat rapide (ID)')),

    async execute(interactionOrMessage, args) {
        let user, itemToBuy, replyFunc;

        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            itemToBuy = interactionOrMessage.options.getString('item');
            replyFunc = (p) => interactionOrMessage.reply(p);
        } else {
            user = interactionOrMessage.author;
            itemToBuy = args[0];
            replyFunc = (p) => interactionOrMessage.channel.send(p);
        }

        // On ne montre que ce qui est "inShop"
        const shopItems = itemsDb.filter(i => i.inShop);

        // --- FONCTION D'ACHAT ---
        const buyItem = (itemId) => {
            const item = shopItems.find(i => i.id === itemId || i.name.toLowerCase().includes(itemId.toLowerCase()));
            if (!item) return { success: false, msg: "❌ Cet objet n'est pas en vente." };

            const data = eco.get(user.id);
            
            if (data.cash < item.price) return { success: false, msg: `❌ Pas assez de cash ! Prix: **${item.price} €**.` };

            if (item.unique && eco.hasItem(user.id, item.id)) {
                return { success: false, msg: `❌ Tu possèdes déjà **${item.name}**. C'est un objet unique !` };
            }

            eco.addCash(user.id, -item.price);
            eco.addItem(user.id, item.id);
            return { success: true, msg: `✅ Tu as acheté **${item.name}** pour **${item.price} €** !` };
        };

        if (itemToBuy) {
            const result = buyItem(itemToBuy);
            return replyFunc(result.msg);
        }

        // --- AFFICHAGE MENU ---
        const embed = new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle('🏪 La Boutique')
            .setDescription('Voici les objets disponibles :\n\n' + 
                shopItems.map(i => `**${i.name}** — ${i.price} €\n*${i.description || "Aucune description"}*`).join('\n\n')
            )
            .setFooter({ text: `Solde : ${eco.get(user.id).cash} €` });

        // --- CORRECTION DU BUG SUBSTRING ICI ---
        const select = new StringSelectMenuBuilder()
            .setCustomId('shop_buy')
            .setPlaceholder('Choisir un article...')
            .addOptions(shopItems.map(item => ({
                label: `${item.name} (${item.price} €)`,
                description: (item.description || "Aucune description").substring(0, 50), 
                value: item.id
            })));

        const row = new ActionRowBuilder().addComponents(select);
        const msg = await replyFunc({ embeds: [embed], components: [row], fetchReply: true });

        const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === user.id, time: 60000 });

        collector.on('collect', async i => {
            const result = buyItem(i.values[0]);
            await i.reply({ content: result.msg, ephemeral: true });
        });
    }
};