const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('animal')
        .setDescription('Affiche une photo d\'animal (Liste immense : Blobfish, Capybara, Loutre...)')
        .addStringOption(option => 
            option.setName('nom')
                .setDescription('Quel animal ? (Chat, Blobfish, Capybara, Axolotl...)')
                .setRequired(false)
                .setAutocomplete(true)), // Autocomplétion activée pour aider à choisir

    // Ajout de l'autocomplétion pour donner des idées
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const choices = [
            'Chat', 'Chien', 'Renard', 'Capybara', 'Blobfish', 
            'Axolotl', 'Loutre', 'Panda', 'Koala', 'Panda Roux', 
            'Raton Laveur', 'Ours', 'Requin', 'Baleine', 'Dauphin',
            'Hamster', 'Lapin', 'Lézard', 'Serpent', 'Araignée',
            'Canard', 'Oie', 'Poule', 'Chèvre', 'Lama', 'Alpaga',
            'Singe', 'Gorille', 'Paresseux', 'Ornithorynque'
        ];
        
        const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue)).slice(0, 25);
        await interaction.respond(filtered.map(choice => ({ name: choice, value: choice.toLowerCase() })));
    },

    async execute(interactionOrMessage, args) {
        let query = null;

        // Gestion Input (Slash ou Préfixe)
        if (interactionOrMessage.isCommand?.()) {
            query = interactionOrMessage.options.getString('nom');
            await interactionOrMessage.deferReply();
        } else {
            if (args && args.length > 0) query = args.join(' ');
        }

        const replyFunc = interactionOrMessage.isCommand?.() 
            ? (p) => interactionOrMessage.editReply(p) 
            : (p) => interactionOrMessage.channel.send(p);

        // --- 1. DICTIONNAIRE DES API SPÉCIALISÉES (Le Top Qualité) ---
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
            
            'capybara': { url: 'https://api.capy.lol/v1/capybara?json=true', path: (d) => d.data.url, color: 0x8D6E63, emoji: '🥔' },
            
            'panda': { url: 'https://some-random-api.com/animal/panda', path: (d) => d.image, color: 0xFFFFFF, emoji: '🐼' },
            'koala': { url: 'https://some-random-api.com/animal/koala', path: (d) => d.image, color: 0x95A5A6, emoji: '🐨' },
            'red_panda': { url: 'https://some-random-api.com/animal/red_panda', path: (d) => d.image, color: 0xD35400, emoji: '🦊' },
            'panda roux': { url: 'https://some-random-api.com/animal/red_panda', path: (d) => d.image, color: 0xD35400, emoji: '🦊' },
            
            'oiseau': { url: 'https://some-random-api.com/animal/bird', path: (d) => d.image, color: 0x3498DB, emoji: '🐦' },
            'bird': { url: 'https://some-random-api.com/animal/bird', path: (d) => d.image, color: 0x3498DB, emoji: '🐦' },
            'raton': { url: 'https://some-random-api.com/animal/raccoon', path: (d) => d.image, color: 0x7F8C8D, emoji: '🦝' },
            'kangourou': { url: 'https://some-random-api.com/animal/kangaroo', path: (d) => d.image, color: 0xD35400, emoji: '🦘' },
            'baleine': { url: 'https://some-random-api.com/animal/whale', path: (d) => d.image, color: 0x2980B9, emoji: '🐋' }
        };

        // --- 2. TRADUCTION & SÉLECTION ---
        let targetAnimal = query ? query.toLowerCase() : null;

        // Liste immense pour la traduction FR -> EN (pour LoremFlickr)
        const translationMap = {
            'blobfish': 'blobfish', // Le roi du moche
            'axolotl': 'axolotl',
            'loutre': 'otter',
            'paresseux': 'sloth',
            'singe': 'monkey',
            'gorille': 'gorilla',
            'chimpanzé': 'chimpanzee',
            'cheval': 'horse',
            'licorne': 'unicorn', // Oui, ça marche parfois !
            'requin': 'shark',
            'dauphin': 'dolphin',
            'pieuvre': 'octopus',
            'méduse': 'jellyfish',
            'serpent': 'snake',
            'cobra': 'cobra',
            'lézard': 'lizard',
            'caméléon': 'chameleon',
            'tortue': 'turtle',
            'grenouille': 'frog',
            'crapaud': 'toad',
            'aigle': 'eagle',
            'faucon': 'falcon',
            'hibou': 'owl',
            'perroquet': 'parrot',
            'flamant': 'flamingo',
            'pingouin': 'penguin',
            'lion': 'lion',
            'tigre': 'tiger',
            'guépard': 'cheetah',
            'léopard': 'leopard',
            'panthère': 'panther',
            'loup': 'wolf',
            'ours': 'bear',
            'polaire': 'polar bear',
            'grizzly': 'grizzly bear',
            'hérisson': 'hedgehog',
            'écureuil': 'squirrel',
            'castor': 'beaver',
            'lapin': 'rabbit',
            'lièvre': 'hare',
            'hamster': 'hamster',
            'cochon d\'inde': 'guinea pig',
            'souris': 'mouse',
            'rat': 'rat',
            'cerf': 'deer',
            'élan': 'moose',
            'chameau': 'camel',
            'dromadaire': 'dromedary',
            'lama': 'llama',
            'alpaga': 'alpaca',
            'girafe': 'giraffe',
            'zèbre': 'zebra',
            'rhinocéros': 'rhinoceros',
            'hippo': 'hippopotamus',
            'éléphant': 'elephant',
            'vache': 'cow',
            'taureau': 'bull',
            'mouton': 'sheep',
            'chèvre': 'goat',
            'cochon': 'pig',
            'poule': 'chicken',
            'coq': 'rooster',
            'poussin': 'chick',
            'dindon': 'turkey',
            'oie': 'goose',
            'abeille': 'bee',
            'papillon': 'butterfly',
            'araignée': 'spider',
            'scorpion': 'scorpion',
            'ornithorynque': 'platypus',
            'tatou': 'armadillo',
            'tapir': 'tapir',
            'suricate': 'meerkat',
            'lémurien': 'lemur'
        };

        // Si aucun animal n'est demandé, on prend au hasard
        if (!targetAnimal) {
            const allKeys = [...Object.keys(SPECIAL_APIS), ...Object.keys(translationMap)];
            targetAnimal = allKeys[Math.floor(Math.random() * allKeys.length)];
        }

        // Nettoyage de l'entrée
        if (targetAnimal.includes('raton')) targetAnimal = 'raton';
        if (targetAnimal.includes('panda roux')) targetAnimal = 'red_panda';

        let imageUrl = null;
        let finalEmoji = '🐾';
        let finalColor = 0x2ECC71; 

        try {
            // CAS A : API SPÉCIALISÉE
            if (SPECIAL_APIS[targetAnimal]) {
                const apiConfig = SPECIAL_APIS[targetAnimal];
                const response = await axios.get(apiConfig.url);
                imageUrl = apiConfig.path(response.data);
                finalEmoji = apiConfig.emoji;
                finalColor = apiConfig.color;
            } 
            
            // CAS B : GÉNÉRATEUR UNIVERSEL (LoremFlickr)
            else {
                const searchTerm = translationMap[targetAnimal] || targetAnimal;
                
                let searchModifiers = '';
                if (targetAnimal === 'blobfish') searchModifiers = ',ugly,fish'; 
                
                const lock = Math.floor(Math.random() * 50000);
                
                // ✅ CORRECTION : on utilise encodeURIComponent pour gérer les espaces
                imageUrl = `https://loremflickr.com/800/600/${encodeURIComponent(searchTerm)}${searchModifiers}?lock=${lock}`;
                finalEmoji = '🔎';
            }

            // --- ENVOI DE L'EMBED ---
            const embed = new EmbedBuilder()
                .setColor(finalColor)
                .setTitle(`${finalEmoji} Voici un(e) ${targetAnimal.charAt(0).toUpperCase() + targetAnimal.slice(1)} !`)
                .setImage(imageUrl)
                .setFooter({ text: `Maoish • ${targetAnimal}` });

            await replyFunc({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await replyFunc(`❌ Oups ! Impossible de trouver un **${targetAnimal}**. (Erreur API)`);
        }
    }
};