module.exports = [
    // --- OUTILS (Indispensables) ---
    { id: 'fishing_rod', name: 'Canne à Pêche', icon: '🎣', price: 500, sellPrice: 200, description: 'Permet de pêcher des poissons avec (/fish).', max: 1},
    { id: 'pickaxe', name: 'Pioche', icon: '⛏️', price: 500, sellPrice: 200, description: 'Permet de miner des ressources avec (/mine)', max: 1},
    { id: 'shovel', name: 'Pelle', icon: '💩', price: 750, sellPrice: 200, description: 'Permet de déterrer des objets enfouis avec (/dig).', max: 1},
    { id: 'rifle', name: 'Fusil de Chasse', icon: '🔫', price: 3000, sellPrice: 800, description: 'Pour chasser le gibier (/hunt).', max: 1},
    { id: 'laptop', name: 'PC Portable', icon: '💻', price: 15000, sellPrice: 5000, description: 'Pour pirater des comptes bancaires (/hack).', max: 1},
    { id: 'c4', name: 'Explosif C4', icon: '🧨', price: 3000, sellPrice: 1500, description: 'Permet de braquer la Réserve Fédérale (/braquage).', max: 1},

    // --- SÉCURITÉ ---
    { id: 'lock', name: 'Cadenas', icon: '🔒', price: 1000, sellPrice: 0, description: 'Protège (1 fois) contre un braquage (50% chance).', max: 1},
    { id: 'dog', name: 'Chien de Garde', icon: '🐕', price: 5000, sellPrice: 1000, description: 'Un bon toutou qui protège ta maison.', max: 1},
    { id: 'shield', name: 'Bouclier SWAT', icon: '🛡️', price: 10000, sellPrice: 2000, description: 'Protection avancée.', max: 1},

    // --- RESSOURCES (Pêche) ---
    { id: 'trash', name: 'Déchets', icon: '🥾', price: 0, sellPrice: 5, description: 'Ça pue...' },
    { id: 'fish', name: 'Poisson', icon: '🐟', price: 0, sellPrice: 30, description: 'Un poisson commun.' },
    { id: 'crab', name: 'Crabe', icon: '🦀', price: 0, sellPrice: 80, description: 'Ça pince !' },
    { id: 'trout', name: 'Truite', icon: '🐡', price: 0, sellPrice: 150, description: 'Un poisson de rivière.' },
    { id: 'puffer', name: 'Poisson-Globe', icon: '🐡', price: 0, sellPrice: 350, description: 'Attention, ça pique.' },
    { id: 'shark', name: 'Requin', icon: '🦈', price: 0, sellPrice: 1000, description: 'Le roi des océans.' },
    { id: 'treasure', name: 'Coffre au Trésor', icon: '👑', price: 0, sellPrice: 5000, description: 'Rempli d\'or !' },

    // --- RESSOURCES (Mine) ---
    { id: 'stone', name: 'Pierre', icon: '🪨', price: 0, sellPrice: 10, description: 'Un caillou.' },
    { id: 'coal', name: 'Charbon', icon: '🌑', price: 0, sellPrice: 40, description: 'Utile pour le feu.' },
    { id: 'iron', name: 'Fer', icon: '🔩', price: 0, sellPrice: 100, description: 'Métal solide.' },
    { id: 'gold', name: 'Or', icon: '⚜️', price: 0, sellPrice: 500, description: 'Brillant et cher.' },
    { id: 'ruby', name: 'Rubis', icon: '🔴', price: 0, sellPrice: 1200, description: 'Une pierre précieuse rouge.' },
    { id: 'diamond', name: 'Diamant', icon: '💎', price: 0, sellPrice: 3000, description: 'Incassable et très cher.' },
    { id: 'emerald', name: 'Émeraude', icon: '🟢', price: 0, sellPrice: 5000, description: 'La plus rare des gemmes.' },

    // --- LUXE & FLEX (Pour montrer qu'on est riche) ---
    { id: 'rolex', name: 'Montre de Luxe', icon: '⌚', price: 20000, sellPrice: 10000, description: 'Pour flexer en société.' },
    { id: 'ring', name: 'Bague en Diamant', icon: '💍', price: 15000, sellPrice: 7500, description: 'Pour une demande en mariage ?' },
    { id: 'car', name: 'Ferrari', icon: '🏎️', price: 150000, sellPrice: 80000, description: 'Vroum vroum !' },
    { id: 'house', name: 'Manoir', icon: '🏰', price: 500000, sellPrice: 250000, description: 'La vie de château.' },
    { id: 'plane', name: 'Jet Privé', icon: '✈️', price: 1000000, sellPrice: 500000, description: 'Le summum de la richesse.' },
    { id: 'crown', name: 'Couronne Royale', icon: '👑', price: 5000000, sellPrice: 2000000, description: 'Tu es le roi du serveur.' },
    
    // --- NOURRITURE & DIVERS ---
    { id: 'cookie', name: 'Cookie', icon: '🍪', price: 50, sellPrice: 10, description: 'Miam !' },
    { id: 'beer', name: 'Bière', icon: '🍺', price: 100, sellPrice: 20, description: 'À la vôtre !' },
    { id: 'pizza', name: 'Pizza', icon: '🍕', price: 250, sellPrice: 50, description: 'Pepperoni ou 4 fromages ?' },

    // --- TRÉSORS DE LA PELLE (Dig) ---
    { id: 'worm', name: 'Ver de terre', icon: '🪱', price: 0, sellPrice: 2, description: 'Ça gigote... Idéal pour la pêche ?' },
    { id: 'bone', name: 'Ossement', icon: '🦴', price: 0, sellPrice: 50, description: 'Un reste de poulet... ou d\'humain ?' },
    { id: 'potato', name: 'Patate', icon: '🥔', price: 0, sellPrice: 15, description: 'Une pomme de terre oubliée dans le sol.' },
    { id: 'old_coin', name: 'Pièce Antique', icon: '🪙', price: 0, sellPrice: 150, description: 'Une pièce romaine toute rouillée.' },
    { id: 'capsule', name: 'Capsule Temporelle', icon: '⏳', price: 0, sellPrice: 700, description: 'Enterrée par des enfants il y a 50 ans.' },
    { id: 'skull', name: 'Crâne', icon: '💀', price: 0, sellPrice: 666, description: 'Hélas, pauvre Yorick !' },
    { id: 'fossil', name: 'Fossile', icon: '🦕', price: 0, sellPrice: 2500, description: 'Une griffe de Vélociraptor !' },
    { id: 'sarcophagus', name: 'Sarcophage', icon: '⚰️', price: 0, sellPrice: 10000, description: 'LA DÉCOUVERTE DU SIÈCLE !' },

    // --- GIBIER (Hunt) ---
    { id: 'meat', name: 'Viande', icon: '🥩', price: 0, sellPrice: 50, description: 'De la viande fraîche.' },
    { id: 'rabbit', name: 'Lapin', icon: '🐇', price: 0, sellPrice: 150, description: 'Un petit lapin de garenne.' },
    { id: 'duck', name: 'Canard', icon: '🦆', price: 0, sellPrice: 200, description: 'Coin coin !' },
    { id: 'boar', name: 'Sanglier', icon: '🐗', price: 0, sellPrice: 600, description: 'Attention, ça charge !' },
    { id: 'deer_antlers', name: 'Bois de Cerf', icon: '🦌', price: 0, sellPrice: 1200, description: 'Un trophée majestueux.' },
    { id: 'bear', name: 'Ours', icon: '🐻', price: 0, sellPrice: 3500, description: 'Tu as survécu à un ours !?' },
    // --- CRYPTO & HACK ---
    { id: 'bitcoin', name: 'Bitcoin', icon: '🪙', price: 0, sellPrice: 5000, description: 'Une monnaie virtuelle très volatile.' },
];