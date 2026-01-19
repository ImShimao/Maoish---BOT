module.exports = [
    // --- OUTILS & TECH (Job & Crime) ---
    { id: 'fishing_rod', name: 'Canne à Pêche', icon: '🎣', price: 500, sellPrice: 200, description: 'Pour pêcher (/fish).', max: 1},
    { id: 'pickaxe', name: 'Pioche', icon: '⛏️', price: 500, sellPrice: 200, description: 'Pour miner (/mine).', max: 1},
    { id: 'shovel', name: 'Pelle', icon: '💩', price: 750, sellPrice: 200, description: 'Pour creuser (/dig).', max: 1},
    { id: 'rifle', name: 'Fusil de Chasse', icon: '🔫', price: 3000, sellPrice: 800, description: 'Pour chasser (/hunt).', max: 1},
    { id: 'laptop', name: 'PC Portable', icon: '💻', price: 15000, sellPrice: 5000, description: 'Outil de Hack & Travail (+Bonus).', max: 1},
    { id: 'c4', name: 'Explosif C4', icon: '🧨', price: 3000, sellPrice: 1500, description: 'Pour les braquages de banque.', max: 1},
    { id: 'smartphone', name: 'Smartphone', icon: '📱', price: 1000, sellPrice: 300, description: 'Indispensable pour la vie moderne.', max: 1},
    { id: 'server', name: 'Serveur Rack', icon: '🗄️', price: 25000, sellPrice: 8000, description: 'Pour héberger des données sensibles.', max: 1},

    // --- VÉHICULES (Bonus Travail) ---
    { id: 'bike', name: 'Vélo', icon: '🚲', price: 300, sellPrice: 50, description: 'Mieux que la marche.', max: 1},
    { id: 'scooter', name: 'Scooter', icon: '🛵', price: 1500, sellPrice: 500, description: 'Rapide en ville.', max: 1},
    { id: 'motorcycle', name: 'Moto Sportive', icon: '🏍️', price: 15000, sellPrice: 5000, description: 'Pour les fans de vitesse.', max: 1},
    { id: 'car', name: 'Ferrari', icon: '🏎️', price: 150000, sellPrice: 80000, description: 'Le luxe rouge (+Bonus Work).', max: 1},
    { id: 'helicopter', name: 'Hélicoptère', icon: '🚁', price: 800000, sellPrice: 300000, description: 'Évite les bouchons.', max: 1},
    { id: 'yacht', name: 'Yacht', icon: '🛥️', price: 2000000, sellPrice: 800000, description: 'Pour les soirées en mer.', max: 1},
    { id: 'plane', name: 'Jet Privé', icon: '✈️', price: 5000000, sellPrice: 2000000, description: 'Voyage en première classe (+Bonus Daily).', max: 1},

    // --- IMMOBILIER (Revenus Passifs / Daily) ---
    { id: 'tent', name: 'Tente Quechua', icon: '⛺', price: 150, sellPrice: 10, description: 'C\'est un début.', max: 1},
    { id: 'studio', name: 'Studio', icon: '🏢', price: 50000, sellPrice: 20000, description: 'Petit mais confortable.', max: 1},
    { id: 'apartment', name: 'Appartement', icon: '🏙️', price: 150000, sellPrice: 60000, description: 'Vue sur la ville.', max: 1},
    { id: 'house', name: 'Manoir', icon: '🏰', price: 500000, sellPrice: 250000, description: 'La vie de château (+Bonus Daily).', max: 1},
    { id: 'villa', name: 'Villa de Luxe', icon: '🏡', price: 1500000, sellPrice: 700000, description: 'Avec piscine.', max: 1},
    { id: 'island', name: 'Île Privée', icon: '🏝️', price: 15000000, sellPrice: 5000000, description: 'Ton propre pays.', max: 1},
    { id: 'space_station', name: 'Station Spatiale', icon: '🛰️', price: 50000000, sellPrice: 10000000, description: 'Regarde le monde d\'en haut.', max: 1},

    // --- SÉCURITÉ (Rob & Hack) ---
    { id: 'lock', name: 'Cadenas (2FA)', icon: '🔒', price: 1000, sellPrice: 0, description: 'Protège 1x contre Rob ou Hack.', max: 1},
    { id: 'dog', name: 'Chien de Garde', icon: '🐕', price: 5000, sellPrice: 1000, description: '35% chance de mordre un braqueur.', max: 1},
    { id: 'antivirus', name: 'Antivirus', icon: '🦠', price: 2500, sellPrice: 500, description: '35% chance de détecter un hacker.', max: 1},
    { id: 'shield', name: 'Bouclier SWAT', icon: '🛡️', price: 10000, sellPrice: 2000, description: '75% protection braquage.', max: 1},
    { id: 'firewall', name: 'Pare-feu', icon: '🔥', price: 8000, sellPrice: 2000, description: '75% protection hack.', max: 1},

    // --- LUXE & BOURSE ---
    { id: 'rolex', name: 'Montre de Luxe', icon: '⌚', price: 20000, sellPrice: 10000, description: 'Pour flexer (+Bonus Work).', max: 1},
    { id: 'ring', name: 'Bague en Diamant', icon: '💍', price: 15000, sellPrice: 7500, description: 'Mariage ?', max: 1},
    { id: 'painting', name: 'La Joconde (Fausse)', icon: '🖼️', price: 100000, sellPrice: 10000, description: 'De l\'art pur.', max: 1},
    { id: 'crown', name: 'Couronne Royale', icon: '👑', price: 5000000, sellPrice: 2000000, description: 'Le Roi du serveur (+Bonus Daily).', max: 1},
    
    // ⚠️ ITEMS BOURSE (Prix 0 ici car gérés dynamiquement par /bourse)
    { id: 'gold_bar', name: 'Lingot d\'Or', icon: '🟡', price: 0, sellPrice: 0, description: 'S\'échange en Bourse (/bourse).', max: 100},
    { id: 'bitcoin', name: 'Bitcoin', icon: '🟠', price: 0, sellPrice: 0, description: 'Crypto-monnaie (Voir /bourse).' },

    // --- NOURRITURE & DIVERS ---
    { id: 'cookie', name: 'Cookie', icon: '🍪', price: 50, sellPrice: 10, description: 'Miam !' },
    { id: 'coffee', name: 'Café', icon: '☕', price: 80, sellPrice: 10, description: 'Pour se réveiller.' },
    { id: 'beer', name: 'Bière', icon: '🍺', price: 100, sellPrice: 20, description: 'À la vôtre !' },
    { id: 'burger', name: 'Burger', icon: '🍔', price: 150, sellPrice: 30, description: 'Double cheese.' },
    { id: 'pizza', name: 'Pizza', icon: '🍕', price: 250, sellPrice: 50, description: 'Pepperoni ou 4 fromages ?' },

    // --- RESSOURCES (Mine & Pêche & Dig & Hunt) ---
    { id: 'trash', name: 'Déchets', icon: '🥾', price: 0, sellPrice: 5, description: 'Ça pue...' },
    { id: 'fish', name: 'Poisson', icon: '🐟', price: 0, sellPrice: 30, description: 'Un poisson commun.' },
    { id: 'crab', name: 'Crabe', icon: '🦀', price: 0, sellPrice: 80, description: 'Ça pince !' },
    { id: 'trout', name: 'Truite', icon: '🐡', price: 0, sellPrice: 150, description: 'Un poisson de rivière.' },
    { id: 'puffer', name: 'Poisson-Globe', icon: '🐡', price: 0, sellPrice: 350, description: 'Attention, ça pique.' },
    { id: 'shark', name: 'Requin', icon: '🦈', price: 0, sellPrice: 1000, description: 'Le roi des océans.' },
    { id: 'treasure', name: 'Coffre au Trésor', icon: '👑', price: 0, sellPrice: 5000, description: 'Rempli d\'or !' },
    
    // MINER
    { id: 'stone', name: 'Pierre', icon: '🪨', price: 0, sellPrice: 10, description: 'Un caillou.' },
    { id: 'coal', name: 'Charbon', icon: '🌑', price: 0, sellPrice: 40, description: 'Utile pour le feu.' },
    { id: 'iron', name: 'Fer', icon: '🔩', price: 0, sellPrice: 100, description: 'Métal solide.' },
    { id: 'gold', name: 'Or (Minerai)', icon: '⚜️', price: 0, sellPrice: 500, description: 'Brillant et cher.' },
    { id: 'ruby', name: 'Rubis', icon: '🔴', price: 0, sellPrice: 1200, description: 'Une pierre précieuse rouge.' },
    { id: 'diamond', name: 'Diamant', icon: '💎', price: 0, sellPrice: 3000, description: 'Incassable et très cher.' },
    { id: 'emerald', name: 'Émeraude', icon: '🟢', price: 0, sellPrice: 5000, description: 'La plus rare des gemmes.' },
    
    // DIG (Ajout des manquants)
    { id: 'worm', name: 'Ver de terre', icon: '🪱', price: 0, sellPrice: 2, description: 'Appât.' },
    { id: 'potato', name: 'Patate', icon: '🥔', price: 0, sellPrice: 15, description: 'Une patate de terre.' },
    { id: 'bone', name: 'Ossement', icon: '🦴', price: 0, sellPrice: 50, description: 'Reste antique.' },
    { id: 'old_coin', name: 'Pièce Antique', icon: '🪙', price: 0, sellPrice: 150, description: 'Romaine.' },
    { id: 'capsule', name: 'Capsule Temporelle', icon: '⏳', price: 0, sellPrice: 500, description: 'Des souvenirs du passé.' },
    { id: 'skull', name: 'Crâne', icon: '💀', price: 0, sellPrice: 1000, description: 'Un peu glauque...' },
    { id: 'fossil', name: 'Fossile', icon: '🦖', price: 0, sellPrice: 2500, description: 'Un vieux dino.' },
    { id: 'sarcophagus', name: 'Sarcophage', icon: '⚰️', price: 0, sellPrice: 10000, description: 'Une momie dort dedans.' },

    // HUNT (Ajout des manquants)
    { id: 'meat', name: 'Viande', icon: '🥩', price: 0, sellPrice: 50, description: 'Fraîche.' },
    { id: 'rabbit', name: 'Lapin', icon: '🐇', price: 0, sellPrice: 150, description: 'Petit gibier.' },
    { id: 'duck', name: 'Canard', icon: '🦆', price: 0, sellPrice: 200, description: 'Coin coin.' },
    { id: 'boar', name: 'Sanglier', icon: '🐗', price: 0, sellPrice: 600, description: 'Gros gibier.' },
    { id: 'deer_antlers', name: 'Bois de Cerf', icon: '🦌', price: 0, sellPrice: 1000, description: 'Magnifique trophée.' },
    { id: 'bear', name: 'Ours', icon: '🐻', price: 0, sellPrice: 3500, description: 'Trophée ultime.' },
];