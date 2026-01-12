const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// ⚙️ CONFIGURATION DES SITES
const SITES_CONFIG = {
    'amazon': {
        name: 'Amazon',
        color: 0xFF9900,
        searchUrl: (query) => `https://www.amazon.fr/s?k=${encodeURIComponent(query)}`,
        selectors: {
            // Liste de sélecteurs testés un par un
            price: ['.priceToPay .a-offscreen', '.a-price.a-text-price .a-offscreen', '.a-price .a-offscreen', '#corePrice_desktop .a-offscreen'],
            title: ['#productTitle', '#title'],
            image: ['#landingImage', '#imgTagWrapperId img', '.a-dynamic-image'],
            container: 'div[data-component-type="s-search-result"]',
            itemTitle: 'h2 a span',
            itemPrice: '.a-price .a-offscreen',
            itemLink: 'h2 a',
            itemImage: '.s-image'
        }
    },
    'topachat': {
        name: 'TopAchat',
        color: 0xFF4400,
        searchUrl: (query) => `https://www.topachat.com/pages/recherche.php?cat=micro&mot_cle=${encodeURIComponent(query)}`,
        selectors: {
            price: ['.offer-price__price', '.priceFinal', '.titre-produit + div .price'],
            title: ['h1.pName', '.product-title'],
            image: ['.MainImage', '.img-fluid'],
            container: 'article.gr-product-card',
            itemTitle: 'h3',
            itemPrice: '.prod_price, .price',
            itemLink: 'a.libelle',
            itemImage: 'img.img-fluid'
        }
    },
    'fnac': {
        name: 'Fnac',
        color: 0xE1A926,
        searchUrl: (query) => `https://www.fnac.com/SearchResult/ResultList.aspx?SCat=0&sft=1&Search=${encodeURIComponent(query)}`,
        selectors: {
            price: ['.f-price', '.userPrice', '.price', 'span[itemprop="price"]'],
            title: ['h1.f-productHeader-Title', '.f-productHeader-Title'],
            image: ['.js-ProductVisuals-imagePreview', '.f-productVisuals-mainImage'],
            container: 'article.Article-item',
            itemTitle: '.Article-title',
            itemPrice: '.userPrice',
            itemLink: 'a.Article-title',
            itemImage: 'img.Article-itemVisualImg'
        }
    },
    'rakuten': {
        name: 'Rakuten',
        color: 0xBF0000,
        searchUrl: (query) => `https://fr.shopping.rakuten.com/search/${encodeURIComponent(query)}`,
        selectors: {
            price: ['.item_price', 'span.new-price', '.price', '.b-product_price'],
            title: ['.detail_title', 'h1', '.b-product_title'],
            image: ['.image_gallery_active img', '.b-product_img'],
            container: 'li[class*="grid_item"], div[class*="b-product"]',
            itemTitle: 'span[class*="title"], div[class*="title"]',
            itemPrice: 'span[class*="price"], div[class*="price"], .b-product_price',
            itemLink: 'a[href*="/offer/"], a[class*="product_link"]',
            itemImage: 'img[class*="image"]'
        }
    }
};

// --- NETTOYAGE ---
function cleanPrice(price) {
    if (!price || price === 'null') return 'Non trouvé';
    // On nettoie tout sauf chiffres, points, virgules
    let cleaned = price.replace(/[^0-9.,]/g, '').trim();
    // Correction 50.99 -> 50,99
    if (cleaned.includes('.') && !cleaned.includes(',')) {
        cleaned = cleaned.replace('.', ',');
    }
    // Si vide ou juste une ponctuation, c'est mort
    if (!cleaned || cleaned === ',' || cleaned === '.') return 'Non trouvé';
    return cleaned + " €";
}

function formatSearchTitle(title) {
    if (!title) return "";
    let short = title.split(' ').slice(0, 4).join(' ');
    return short.replace(/[,.;:]$/, '');
}

// --- MOTEUR DE SCRAPING ---
async function scrapeWithBrowser(url, siteKey, config) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled', 
            '--window-size=1920,1080',
            '--lang=fr-FR'
        ]
    });
    
    const page = await browser.newPage();
    // Headers pour passer pour un vrai français
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7' });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    let data = { price: null, title: null, image: null, link: url };

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // --- 🍪 TENTATIVE D'ACCEPTER LES COOKIES (Générique) ---
        try {
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                const acceptBtn = buttons.find(b => 
                    b.innerText.toLowerCase().includes('accepter') || 
                    b.innerText.toLowerCase().includes('accept') ||
                    b.innerText.toLowerCase().includes('autoriser')
                );
                if (acceptBtn) acceptBtn.click();
            });
            // Petite pause après clic
            await new Promise(r => setTimeout(r, 1000)); 
        } catch(e) {}

        // --- SCRAPING INTERNE (Le plus fiable) ---
        const isProductPage = !url.includes('/s?') && !url.includes('recherche') && !url.includes('ResultList') && !url.includes('/search/');

        data = await page.evaluate((isProductPage, config, siteKey) => {
            // Fonction interne pour chercher dans une liste de sélecteurs
            const getTxt = (selectors, root = document) => {
                const list = Array.isArray(selectors) ? selectors : [selectors];
                for (const sel of list) {
                    const el = root.querySelector(sel);
                    // textContent est CRUCIAL pour Amazon (.a-offscreen est hidden)
                    if (el && el.textContent.trim()) return el.textContent.trim();
                }
                return null;
            };

            const getSrc = (selectors, root = document) => {
                const list = Array.isArray(selectors) ? selectors : [selectors];
                for (const sel of list) {
                    const el = root.querySelector(sel);
                    if (el && (el.src || el.dataset.src)) return el.src || el.dataset.src;
                }
                return null;
            };

            // A. PAGE PRODUIT
            if (isProductPage) {
                return {
                    title: getTxt(config.selectors.title),
                    price: getTxt(config.selectors.price),
                    image: getSrc(config.selectors.image),
                    link: document.location.href // On renvoie l'URL courante au cas où
                };
            } 
            // B. PAGE RECHERCHE
            else {
                // On attend l'élément conteneur
                const item = document.querySelector(config.selectors.container);
                if (!item) return { error: "No item found" };

                // Extraction
                const title = getTxt([config.selectors.itemTitle], item);
                const price = getTxt([config.selectors.itemPrice], item);
                const img = getSrc([config.selectors.itemImage], item);
                let link = item.querySelector(config.selectors.itemLink)?.getAttribute('href');

                // Correction liens relatifs
                if (link && !link.startsWith('http')) {
                    if (siteKey === 'amazon') link = 'https://www.amazon.fr' + link;
                    if (siteKey === 'topachat') link = 'https://www.topachat.com' + link;
                    if (siteKey === 'rakuten') link = 'https://fr.shopping.rakuten.com' + link;
                }
                
                return { title, price, link, image: img };
            }
        }, isProductPage, config, siteKey);

        // Si link n'était pas rempli par le evaluate (cas page produit), on remet l'original
        if (!data.link) data.link = url;

    } catch (error) { 
        // En cas d'erreur fatale, on renvoie null
    } finally { 
        await browser.close(); 
    }
    return data;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('comparer')
        .setDescription('Compare le prix avec interface avancée')
        .addStringOption(option =>
            option.setName('produit')
                .setDescription('Lien ou Nom (ex: Iphone 17 Pro Max)')
                .setRequired(true)),

    async execute(interactionOrMessage, args) {
        let input = '';
        let authorMention;
        let sentMessage = null; 

        if (interactionOrMessage.isCommand?.()) {
            input = interactionOrMessage.options.getString('produit');
            authorMention = interactionOrMessage.user;
            await interactionOrMessage.deferReply();
            sentMessage = interactionOrMessage;
        } else {
            if (!args || args.length === 0) return interactionOrMessage.reply("❌ Lien ou nom requis !");
            input = args.join(' ');
            authorMention = interactionOrMessage.author;
            try { await interactionOrMessage.delete(); } catch (e) {}
            sentMessage = await interactionOrMessage.channel.send(`🕵️ ${authorMention} **Maoish enquête incognito sur le web...**`);
        }

        const sendResult = async (payload) => {
            const finalPayload = { 
                content: `${authorMention}`, 
                embeds: payload.embeds, 
                components: payload.components 
            };
            if (interactionOrMessage.isCommand?.()) return await interactionOrMessage.editReply(finalPayload);
            else return await sentMessage.edit(finalPayload);
        };

        const results = [];
        let searchName = input;
        let finalImage = null;

        // 1. LIEN DIRECT
        if (input.startsWith('http')) {
            const siteKey = Object.keys(SITES_CONFIG).find(key => input.includes(key));
            if (siteKey) {
                const scrapedData = await scrapeWithBrowser(input, siteKey, SITES_CONFIG[siteKey]);
                
                // On s'assure qu'on a un résultat valide
                if (scrapedData && (scrapedData.title || scrapedData.price)) {
                    scrapedData.price = cleanPrice(scrapedData.price);
                    scrapedData.site = SITES_CONFIG[siteKey].name;
                    scrapedData.siteKey = siteKey;
                    finalImage = scrapedData.image;
                    results.push(scrapedData);
                    // Mise à jour du nom pour la recherche globale
                    if (scrapedData.title) searchName = formatSearchTitle(scrapedData.title);
                }
            }
        }

        // 2. RECHERCHE GLOBALE
        const sitesToScan = Object.keys(SITES_CONFIG).filter(k => !input.includes(k));
        const scanResults = await Promise.all(sitesToScan.map(async (key) => {
            const config = SITES_CONFIG[key];
            const url = config.searchUrl(searchName);
            const data = await scrapeWithBrowser(url, key, config);
            
            if (data && data.price) {
                return {
                    site: config.name,
                    siteKey: key,
                    price: cleanPrice(data.price),
                    link: data.link,
                    title: data.title,
                    image: data.image
                };
            }
            return { site: config.name, siteKey: key, price: 'Non trouvé', link: null };
        }));

        results.push(...scanResults);
        
        // Tri
        results.sort((a, b) => {
            // On met les "Non trouvé" à la fin
            if (a.price === 'Non trouvé') return 1;
            if (b.price === 'Non trouvé') return -1;
            
            const pA = parseFloat(a.price.replace(/[^0-9,.]/g, '').replace(',', '.') || 99999);
            const pB = parseFloat(b.price.replace(/[^0-9,.]/g, '').replace(',', '.') || 99999);
            return pA - pB;
        });

        if (!finalImage) {
            const r = results.find(res => res.image);
            if (r) finalImage = r.image;
        }

        // --- CONSTRUCTION DE L'EMBED ---
        const summaryEmbed = new EmbedBuilder()
            .setTitle(`📊 Comparatif : ${searchName}`)
            .setColor(0x0099FF)
            .setThumbnail(finalImage || 'https://cdn-icons-png.flaticon.com/512/2331/2331970.png')
            .setFooter({ text: 'Maoish • Page 1/2 (Résumé)' })
            .setTimestamp();

        let foundOne = false;
        results.forEach(res => {
            const isFound = res.price !== 'Non trouvé';
            if (isFound) foundOne = true;
            
            const emoji = isFound ? '✅' : '❌';
            const siteLabel = res.link ? `[**${res.site}**](${res.link})` : `**${res.site}**`;
            
            // Affichage propre sans "null"
            const displayPrice = isFound ? `💰 ${res.price}` : '💨 Non trouvé';
            
            summaryEmbed.addFields({ name: `${emoji} ${res.site}`, value: `${siteLabel}\n${displayPrice}`, inline: true });
        });

        if (!foundOne) summaryEmbed.setDescription("⚠️ Aucun prix trouvé sur les sites configurés.");

        const detailsEmbed = new EmbedBuilder()
            .setTitle(`🔗 Liens directs : ${searchName}`)
            .setColor(0x00FF00)
            .setFooter({ text: 'Maoish • Page 2/2 (Liens)' });

        let detailDesc = "";
        results.forEach(res => {
            if (res.link) detailDesc += `🔹 **${res.site}** : [Voir l'offre à ${res.price}](${res.link})\n\n`;
        });
        detailsEmbed.setDescription(detailDesc || "Aucun lien disponible.");

        const pages = [summaryEmbed, detailsEmbed];

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Résumé').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('next').setLabel('Liens ➡️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setLabel('🗑️ Fermer').setCustomId('close').setStyle(ButtonStyle.Danger)
            );

        const message = await sendResult({ embeds: [pages[0]], components: [buttons] });

        // --- LOGIQUE BOUTONS ---
        const filter = i => i.user.id === authorMention.id;
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, filter, time: 60000 });
        let currentPage = 0;

        collector.on('collect', async i => {
            if (i.customId === 'close') {
                await i.message.delete(); 
                return collector.stop();
            }
            if (i.customId === 'next') currentPage = 1;
            if (i.customId === 'prev') currentPage = 0;

            buttons.components[0].setDisabled(currentPage === 0);
            buttons.components[1].setDisabled(currentPage === 1);
            await i.update({ embeds: [pages[currentPage]], components: [buttons] });
        });

        collector.on('end', async (collected, reason) => {
            if (reason !== 'user') { 
                try {
                    const disabledRow = new ActionRowBuilder().addComponents(buttons.components.map(btn => ButtonBuilder.from(btn).setDisabled(true)));
                    if (message.editable) await message.edit({ components: [disabledRow] });
                } catch (e) {}
            }
        });
    }
};