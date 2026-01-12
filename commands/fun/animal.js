const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('animal')
        .setDescription('Affiche une photo d\'animal (Liste immense)')
        .addStringOption(option => 
            option.setName('nom')
                .setDescription('Quel animal ? (Chat, Panda, Lion, Loutre...)')
                .setRequired(false)),

    async execute(interactionOrMessage, args) {
        let query = null;

        // Gestion Input
        if (interactionOrMessage.isCommand?.()) {
            query = interactionOrMessage.options.getString('nom');
            await interactionOrMessage.deferReply();
        } else {
            if (args && args.length > 0) query = args.join(' ');
        }

        const replyFunc = interactionOrMessage.isCommand?.() 
            ? (p) => interactionOrMessage.editReply(p) 
            : (p) => interactionOrMessage.channel.send(p);

        // --- 1. DICTIONNAIRE DES API SPÉCIALISÉES (Haute Qualité) ---
        // Ces APIs renvoient du JSON, il faut aller chercher le lien dedans.
        const SPECIAL_APIS = {
            'chat': { url: 'https://api.thecatapi.com/v1/images/search', path: (d) => d[0].url, color: 0xFF69B4, emoji: '🐱' },
            'cat': { url: 'https://api.thecatapi.com/v1/images/search', path: (d) => d[0].url, color: 0xFF69B4, emoji: '🐱' },
            
            'chien': { url: 'https://api.thedogapi.com/v1/images/search', path: (d) => d[0].url, color: 0x0099FF, emoji: '🐶' },
            'dog': { url: 'https://api.thedogapi.com/v1/images/search', path: (d) => d[0].url, color: 0x0099FF, emoji: '🐶' },
            
            'renard': { url: 'https://randomfox.ca/floof/', path: (d) => d.image, color: 0xE67E22, emoji: '🦊' },
            'fox': { url: 'https://randomfox.ca/floof/', path: (d) => d.image, color: 0xE67E22, emoji: '🦊' },
            
            'canard': { url: 'https://random-d.uk/api/v2/random', path: (d) => d.url, color: 0xFFFF00, emoji: '🦆' },
            'duck': { url: 'https://random-d.uk/api/v2/random', path: (d) => d.url, color: 0xFFFF00, emoji: '🦆' },
            
            'shiba': { url: 'https://shibe.online/api/shibes?count=1', path: (d) => d[0], color: 0xF1C40F, emoji: '🐕' },
            
            'panda': { url: 'https://some-random-api.com/animal/panda', path: (d) => d.image, color: 0xFFFFFF, emoji: '🐼' },
            'koala': { url: 'https://some-random-api.com/animal/koala', path: (d) => d.image, color: 0x95A5A6, emoji: '🐨' },
            'oiseau': { url: 'https://some-random-api.com/animal/bird', path: (d) => d.image, color: 0x3498DB, emoji: '🐦' },
            'bird': { url: 'https://some-random-api.com/animal/bird', path: (d) => d.image, color: 0x3498DB, emoji: '🐦' },
            'raton': { url: 'https://some-random-api.com/animal/raccoon', path: (d) => d.image, color: 0x7F8C8D, emoji: '🦝' },
            'kangourou': { url: 'https://some-random-api.com/animal/kangaroo', path: (d) => d.image, color: 0xD35400, emoji: '🦘' },
            'baleine': { url: 'https://some-random-api.com/animal/whale', path: (d) => d.image, color: 0x2980B9, emoji: '🐋' }
        };

        // --- 2. SÉLECTION DE L'ANIMAL ---
        let targetAnimal = query ? query.toLowerCase() : null;
        
        // Si aucun animal n'est demandé, on en choisit un au hasard dans notre liste "Premium"
        if (!targetAnimal) {
            const keys = Object.keys(SPECIAL_APIS);
            targetAnimal = keys[Math.floor(Math.random() * keys.length)];
        }

        // Normalisation (ex: "raton laveur" -> "raton")
        if (targetAnimal.includes('raton')) targetAnimal = 'raton';
        if (targetAnimal.includes('panda roux')) targetAnimal = 'red_panda'; // API spécifique possible mais on gère en simple

        let imageUrl = null;
        let finalEmoji = '🐾';
        let finalColor = 0x2ECC71; // Vert par défaut

        try {
            // CAS A : API SPÉCIALISÉE (La meilleure qualité)
            if (SPECIAL_APIS[targetAnimal]) {
                const apiConfig = SPECIAL_APIS[targetAnimal];
                const response = await axios.get(apiConfig.url);
                
                // On utilise la fonction "path" pour trouver l'url dans le JSON
                imageUrl = apiConfig.path(response.data);
                finalEmoji = apiConfig.emoji;
                finalColor = apiConfig.color;
            } 
            
            // CAS B : SYSTÈME UNIVERSEL (LoremFlickr)
            // Si l'animal n'est pas dans notre liste, on utilise ce générateur magique
            // Il cherche une image correspondant au mot clé.
            else {
                // On ajoute un nombre aléatoire (?lock=...) pour ne pas avoir toujours la même image
                const lock = Math.floor(Math.random() * 10000);
                
                // On traduit quelques mots courants FR -> EN pour avoir plus de résultats (Optionnel mais mieux)
                const translationMap = {
                    'lion': 'lion', 'tigre': 'tiger', 'ours': 'bear', 'loup': 'wolf', 
                    'singe': 'monkey', 'cheval': 'horse', 'requin': 'shark', 
                    'serpent': 'snake', 'aigle': 'eagle', 'loutre': 'otter', 
                    'lapin': 'rabbit', 'hamster': 'hamster', 'capybara': 'capybara'
                };
                
                // Si on connait la trad, on l'utilise, sinon on tente le mot français direct
                const searchTerm = translationMap[targetAnimal] || targetAnimal;
                
                imageUrl = `https://loremflickr.com/800/600/${searchTerm}?lock=${lock}`;
                finalEmoji = '🔎';
            }

            // --- ENVOI DE L'EMBED ---
            const embed = new EmbedBuilder()
                .setColor(finalColor)
                .setTitle(`${finalEmoji} Voici un(e) ${targetAnimal} !`)
                .setImage(imageUrl)
                .setFooter({ text: `Maoish • ${targetAnimal.charAt(0).toUpperCase() + targetAnimal.slice(1)}` });

            await replyFunc({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await replyFunc("❌ Désolé, cet animal est trop timide (Erreur API). Essaie un autre !");
        }
    }
};