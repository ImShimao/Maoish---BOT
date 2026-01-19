const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const eco = require('../../utils/eco.js');
const itemsDb = require('../../utils/items.js');
const embeds = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Ouvre la boutique organisée (Véhicules, Immo, Tech...)'),

    async execute(interactionOrMessage, args) {
        let user;
        const guildId = interactionOrMessage.guild.id;

        // --- GESTION HYBRIDE ---
        if (interactionOrMessage.isCommand?.()) {
            user = interactionOrMessage.user;
        } else {
            user = interactionOrMessage.author;
        }

        // --- 1. SÉCURITÉ ---
        // On ne garde que les items achetables (price > 0)
        const validShopItems = itemsDb.filter(i => i.price > 0 && i.price > i.sellPrice);

        // --- 2. CATÉGORIES (Mise à jour avec les nouveaux items) ---
        const categories = {
            tools: {
                label: 'Outils & Tech',
                emoji: '🛠️',
                style: ButtonStyle.Primary,
                ids: ['fishing_rod', 'pickaxe', 'shovel', 'rifle', 'laptop', 'c4', 'smartphone', 'server']
            },
            security: {
                label: 'Sécurité',
                emoji: '🛡️',
                style: ButtonStyle.Danger,
                ids: ['lock', 'dog', 'antivirus', 'shield', 'firewall']
            },
            vehicles: {
                label: 'Véhicules',
                emoji: '🚗',
                style: ButtonStyle.Success,
                ids: ['bike', 'scooter', 'motorcycle', 'car', 'helicopter', 'yacht', 'plane']
            },
            property: {
                label: 'Immobilier',
                emoji: '🏠',
                style: ButtonStyle.Success,
                ids: ['tent', 'studio', 'apartment', 'house', 'villa', 'island', 'space_station']
            },
            luxe: {
                label: 'Luxe & Flex',
                emoji: '💍',
                style: ButtonStyle.Secondary,
                ids: ['rolex', 'ring', 'gold_bar', 'painting', 'crown']
            },
            food: {
                label: 'Nourriture',
                emoji: '🍕',
                style: ButtonStyle.Secondary,
                ids: ['cookie', 'coffee', 'beer', 'burger', 'pizza']
            }
        };

        const getItemsInCat = (catKey) => {
            const cat = categories[catKey];
            if (!cat) return [];
            return validShopItems.filter(i => cat.ids.includes(i.id));
        };

        // --- 3. LOGIQUE D'ACHAT ---
        const buyItem = async (itemId) => {
            const item = validShopItems.find(i => i.id === itemId);
            if (!item) return { success: false, embed: embeds.error(interactionOrMessage, "Cet objet n'est pas disponible à l'achat.") };

            const data = await eco.get(user.id, guildId);
            
            // A. Vérification Argent
            if (data.cash < item.price) {
                return { success: false, embed: embeds.error(interactionOrMessage, `Fonds insuffisants ! Il te faut **${item.price.toLocaleString('fr-FR')} €**.\n(Tu as ${data.cash.toLocaleString('fr-FR')} €)`) };
            }

            // B. Vérification Limite
            if (item.max) {
                const inventory = data.inventory instanceof Map ? data.inventory : new Map(Object.entries(data.inventory || {}));
                const currentQty = inventory.get(item.id) || 0;
                
                if (currentQty >= item.max) {
                    return { success: false, embed: embeds.error(interactionOrMessage, `Limite atteinte ! Tu ne peux posséder que **${item.max}x ${item.name}** maximum.`) };
                }
            }

            // C. Transaction
            await eco.addCash(user.id, guildId, -item.price);
            await eco.addItem(user.id, guildId, item.id);
            
            return { 
                success: true, 
                embed: embeds.success(interactionOrMessage, "Achat effectué", `✅ Tu as acheté **${item.name}** pour **${item.price.toLocaleString('fr-FR')} €** !`) 
            };
        };

        // --- 4. AFFICHAGE ---

        // VUE ACCUEIL
        const getHomePayload = async () => {
            const userData = await eco.get(user.id, guildId);
            
            const embed = embeds.info(interactionOrMessage, '🏪 Maoish Mall - Accueil', 
                `Bienvenue **${user.username}** !\nTon solde : **${userData.cash.toLocaleString('fr-FR')} €**\n\nChoisis un rayon ci-dessous :`
            )
            .setColor(0x2B2D31)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3081/3081559.png');

            const row1 = new ActionRowBuilder();
            const row2 = new ActionRowBuilder();

            let i = 0;
            for (const [key, data] of Object.entries(categories)) {
                if (getItemsInCat(key).length === 0) continue;

                const btn = new ButtonBuilder()
                    .setCustomId(`shop_cat_${key}`)
                    .setLabel(data.label)
                    .setEmoji(data.emoji)
                    .setStyle(data.style);
                
                // On met 3 boutons par ligne pour faire joli
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
            const userData = await eco.get(user.id, guildId);

            const embed = embeds.info(interactionOrMessage, `${catData.emoji} Boutique : ${catData.label}`,
                `Ton solde : **${userData.cash.toLocaleString('fr-FR')} €**\n\n` + 
                items.map(i => `**${i.icon} ${i.name}** — \`${i.price.toLocaleString('fr-FR')} €\`\n*${i.description}*`).join('\n\n')
            )
            .setColor(0xE67E22);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_buy')
                .setPlaceholder('🛒 Choisir un objet à acheter...')
                .addOptions(items.map(i => ({
                    label: i.name,
                    description: `${i.price.toLocaleString('fr-FR')} €`, // Prix formaté
                    value: i.id,
                    emoji: i.icon
                })));

            const rowSelect = new ActionRowBuilder().addComponents(selectMenu);
            
            const rowBack = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_home').setLabel('Retour à l\'accueil').setStyle(ButtonStyle.Secondary).setEmoji('🏠')
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
            if (i.customId === 'shop_home') {
                await i.update(await getHomePayload());
            } 
            else if (i.customId.startsWith('shop_cat_')) {
                const catKey = i.customId.replace('shop_cat_', '');
                await i.update(await getCategoryPayload(catKey));
            }
            else if (i.customId === 'shop_buy') {
                const itemId = i.values[0];
                const result = await buyItem(itemId);
                
                await i.reply({ embeds: [result.embed], ephemeral: true });
                
                if (result.success) {
                    // On reste sur la catégorie actuelle
                    let catFound = 'tools';
                    for (const [key, cat] of Object.entries(categories)) {
                        if (cat.ids.includes(itemId)) catFound = key;
                    }
                    await msg.edit(await getCategoryPayload(catFound));
                }
            }
        });
    }
};