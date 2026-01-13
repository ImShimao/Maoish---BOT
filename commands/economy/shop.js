const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Ouvre la boutique')
        .addStringOption(o => o.setName('item').setDescription('Achat rapide (ID)')),

    async execute(interactionOrMessage, args) {
        let user, itemToBuy;

        // --- GESTION HYBRIDE (Récupération des infos) ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
            itemToBuy = interactionOrMessage.options.getString('item');
        } else {
            user = interactionOrMessage.author;
            itemToBuy = args[0];
        }

        const shopItems = itemsDb.filter(i => i.inShop);

        // --- FONCTION D'ACHAT ---
        const buyItem = async (itemId) => {
            const item = shopItems.find(i => i.id === itemId || i.name.toLowerCase().includes(itemId.toLowerCase()));
            if (!item) return { success: false, msg: "❌ Cet objet n'est pas en vente." };

            const data = await eco.get(user.id);
            
            if (data.cash < item.price) return { success: false, msg: `❌ Pas assez de cash ! Prix: **${item.price} €**.` };

            if (item.unique && await eco.hasItem(user.id, item.id)) {
                return { success: false, msg: `❌ Tu possèdes déjà **${item.name}**. C'est un objet unique !` };
            }

            await eco.addCash(user.id, -item.price);
            await eco.addItem(user.id, item.id);
            return { success: true, msg: `✅ Tu as acheté **${item.name}** pour **${item.price} €** !` };
        };

        // --- CAS 1 : ACHAT RAPIDE (/shop item:sword) ---
        if (itemToBuy) {
            const result = await buyItem(itemToBuy);
            // Réponse simple sans menu
            if (interactionOrMessage.isCommand?.()) return interactionOrMessage.reply(result.msg);
            return interactionOrMessage.channel.send(result.msg);
        }

        // --- CAS 2 : AFFICHAGE DU SHOP ---
        const userBalance = await eco.get(user.id);

        const embed = new EmbedBuilder()
            .setColor(0xE67E22) // Orange
            .setTitle('🏪 La Boutique')
            .setDescription('Sélectionne un objet dans le menu ci-dessous pour l\'acheter.\n\n' + 
                shopItems.map(i => `**${i.name}** — ${i.price} €\n*${i.description || "Aucune description"}*`).join('\n\n')
            )
            .setFooter({ text: `Ton solde : ${userBalance.cash} €` });

        const select = new StringSelectMenuBuilder()
            .setCustomId('shop_buy')
            .setPlaceholder('Choisir un article...')
            .addOptions(shopItems.map(item => ({
                label: `${item.name} (${item.price} €)`,
                description: (item.description || "Aucune description").substring(0, 50), 
                value: item.id
            })));

        const row = new ActionRowBuilder().addComponents(select);

        // --- CORRECTION CRITIQUE (Récupération du Message) ---
        let msg;
        const payload = { embeds: [embed], components: [row] };

        if (interactionOrMessage.isCommand?.()) {
            // Slash : On répond puis on withResponse pour avoir l'objet Message
            await interactionOrMessage.reply(payload);
            msg = await interactionOrMessage.withResponse();
        } else {
            // Prefix : channel.send renvoie direct le Message
            msg = await interactionOrMessage.channel.send(payload);
        }

        // --- COLLECTOR ---
        // msg est maintenant un objet Message valide, donc createMessageComponentCollector existe.
        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === user.id, 
            time: 60000 
        });

        collector.on('collect', async i => {
            // Important : on deferUpdate ou reply pour éviter "L'interaction a échoué"
            const result = await buyItem(i.values[0]);
            
            // On envoie le résultat en message éphémère (visible seulement par l'utilisateur)
            await i.reply({ content: result.msg, flags: true });
        });
    }
};