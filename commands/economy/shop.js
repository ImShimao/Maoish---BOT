const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Ouvre la boutique organisée'),

    async execute(interactionOrMessage, args) {
        let user;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
        } else {
            user = interactionOrMessage.author;
        }

        // --- 1. SÉCURITÉ ÉCONOMIQUE (ANTI-GLITCH) ---
        // On ne garde que les objets valides pour la boutique :
        // 1. Prix > 0 (pas d'objet gratuit)
        // 2. Prix Achat > Prix Vente (Sinon argent infini en achetant/revendant)
        const validShopItems = itemsDb.filter(i => i.price > 0 && i.price > i.sellPrice);

        // --- 2. DÉFINITION DES CATÉGORIES ---
        const categories = {
            tools: {
                label: 'Outils & Tech',
                emoji: '🛠️',
                style: ButtonStyle.Primary,
                ids: ['fishing_rod', 'pickaxe', 'shovel', 'rifle', 'laptop']
            },
            security: {
                label: 'Sécurité',
                emoji: '🛡️',
                style: ButtonStyle.Danger,
                ids: ['lock', 'dog', 'shield']
            },
            luxe: {
                label: 'Luxe & Flex',
                emoji: '💍',
                style: ButtonStyle.Success,
                ids: ['rolex', 'ring', 'car', 'house', 'plane', 'crown']
            },
            food: {
                label: 'Nourriture',
                emoji: '🍕',
                style: ButtonStyle.Secondary,
                ids: ['cookie', 'beer', 'pizza']
            }
            // J'ai supprimé la catégorie "Ressources" car ce n'est pas logique d'acheter 
            // des poissons ou des pierres au shop, et ça évite les erreurs.
        };

        // Fonction pour récupérer les objets d'une catégorie (en vérifiant qu'ils sont valides)
        const getItemsInCat = (catKey) => {
            const cat = categories[catKey];
            if (!cat) return [];
            // On croise les IDs de la catégorie avec la liste sécurisée validShopItems
            return validShopItems.filter(i => cat.ids.includes(i.id));
        };

        // --- 3. LOGIQUE D'ACHAT ---
        const buyItem = async (itemId) => {
            // On cherche dans la liste SÉCURISÉE uniquement
            const item = validShopItems.find(i => i.id === itemId);
            
            if (!item) return { success: false, msg: "❌ Cet objet n'est pas disponible à l'achat." };

            const data = await eco.get(user.id);
            
            if (data.cash < item.price) {
                return { success: false, msg: `❌ **Fonds insuffisants !** Il te faut ${item.price} € (Tu as ${data.cash} €).` };
            }

            // (Optionnel) Bloquer l'achat si l'objet est unique et déjà possédé (ex: Rolex)
            // if (['rolex', 'car', 'house'].includes(item.id) && await eco.hasItem(user.id, item.id)) {
            //     return { success: false, msg: `❌ Tu possèdes déjà cet objet unique !` };
            // }

            await eco.addCash(user.id, -item.price);
            await eco.addItem(user.id, item.id);
            return { success: true, msg: `✅ Tu as acheté **${item.name}** pour **${item.price} €** !` };
        };


        // --- 4. FONCTIONS D'AFFICHAGE ---

        // VUE ACCUEIL
        const getHomePayload = async () => {
            const userData = await eco.get(user.id);
            
            const embed = new EmbedBuilder()
                .setColor(0x2B2D31)
                .setTitle('🏪 Maoish Shop - Accueil')
                .setDescription(`Bienvenue **${user.username}** !\nTon solde : **${userData.cash} €**\n\nSélectionne une catégorie ci-dessous pour voir les articles.`)
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/3081/3081559.png');

            const row1 = new ActionRowBuilder();
            const row2 = new ActionRowBuilder();

            let i = 0;
            for (const [key, data] of Object.entries(categories)) {
                // On vérifie qu'il y a bien des objets à vendre dans cette catégorie avant d'afficher le bouton
                if (getItemsInCat(key).length === 0) continue;

                const btn = new ButtonBuilder()
                    .setCustomId(`shop_cat_${key}`)
                    .setLabel(data.label)
                    .setEmoji(data.emoji)
                    .setStyle(data.style);
                
                if (i < 3) row1.addComponents(btn);
                else row2.addComponents(btn);
                i++;
            }

            const components = [row1];
            if (row2.components.length > 0) components.push(row2);

            return { embeds: [embed], components: components };
        };

        // VUE CATÉGORIE
        const getCategoryPayload = async (catKey) => {
            const catData = categories[catKey];
            const items = getItemsInCat(catKey);
            const userData = await eco.get(user.id);

            const embed = new EmbedBuilder()
                .setColor(0xE67E22)
                .setTitle(`${catData.emoji} Boutique : ${catData.label}`)
                .setDescription(`Ton solde : **${userData.cash} €**\n\n` + 
                    items.map(i => `**${i.icon} ${i.name}** — \`${i.price} €\`\n*${i.description}*`).join('\n\n')
                );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_buy')
                .setPlaceholder('🛒 Choisir un objet à acheter...')
                .addOptions(items.map(i => ({
                    label: i.name,
                    description: `Prix : ${i.price} €`,
                    value: i.id,
                    emoji: i.icon
                })));

            const rowSelect = new ActionRowBuilder().addComponents(selectMenu);
            
            const rowBack = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_home').setLabel('Retour aux catégories').setStyle(ButtonStyle.Secondary).setEmoji('⬅️')
            );

            return { embeds: [embed], components: [rowSelect, rowBack] };
        };

        // --- 5. ENVOI INITIAL ---
        const initialPayload = await getHomePayload();
        let msg;

        if (interactionOrMessage.isCommand?.()) {
            await interactionOrMessage.reply(initialPayload);
            msg = await interactionOrMessage.fetchReply();
        } else {
            msg = await interactionOrMessage.channel.send(initialPayload);
        }

        // --- 6. COLLECTOR ---
        const collector = msg.createMessageComponentCollector({ 
            filter: i => i.user.id === user.id, 
            time: 120000 
        });

        collector.on('collect', async i => {
            // NAVIGATION : RETOUR
            if (i.customId === 'shop_home') {
                await i.update(await getHomePayload());
            } 
            // NAVIGATION : CATÉGORIE
            else if (i.customId.startsWith('shop_cat_')) {
                const catKey = i.customId.replace('shop_cat_', '');
                await i.update(await getCategoryPayload(catKey));
            }
            // ACTION : ACHAT
            else if (i.customId === 'shop_buy') {
                const itemId = i.values[0];
                const result = await buyItem(itemId);
                
                // Message privé (éphémère) de confirmation
                await i.reply({ content: result.msg, ephemeral: true });
                
                // Mise à jour du solde sur l'affichage principal
                if (result.success) {
                    let catFound = 'tools';
                    for (const [key, cat] of Object.entries(categories)) {
                        // On regarde dans itemsDb car validShopItems est filtré mais les IDs sont les mêmes
                        if (cat.ids.includes(itemId)) catFound = key;
                    }
                    // On recharge la page pour voir le nouveau solde
                    await msg.edit(await getCategoryPayload(catFound));
                }
            }
        });
    }
};