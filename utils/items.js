module.exports = [

    // --- OUTILS (Uniques & Vendables en boutique) ---
    {
        id: 'fishing_rod', name: '🎣 Canne à Pêche', price: 500,
        description: 'Indispensable pour pêcher.', 
        sellable: true, sellPrice: 200, 
        inShop: true, unique: true
    },
    {
        id: 'pickaxe', name: '⛏️ Pioche', price: 500,
        description: 'Pour miner dans la grotte.', 
        sellable: true, sellPrice: 200, 
        inShop: true, unique: true
    },
    {
        id: 'lock', name: '🔒 Cadenas', price: 200,
        description: 'Protège (50%) contre un braquage.', 
        sellable: false, 
        inShop: true, unique: false 
    },
    {
        id: 'ring', name: '💍 Bague', price: 1500,
        description: 'Pour faire ta demande en mariage !', 
        sellable: true, sellPrice: 500, 
        inShop: true, unique: false 
    },
        {
        id: 'ferrari', name: '🚗 Ferrari', price: 100000,
        description: 'Pour se la peter !', 
        sellable: true, sellPrice: 50000, 
        inShop: true, unique: false 
    },

    // --- LOOT DE PÊCHE (Mise à jour) ---
    { id: 'trash', name: '👢 Vieille Botte', description: 'Un déchet inutile.', sellable: true, sellPrice: 5, inShop: false },
    { id: 'fish', name: '🐟 Gardon', description: 'Un poisson commun.', sellable: true, sellPrice: 45, inShop: false },
    { id: 'crab', name: '🦀 Crabe', description: 'Attention aux pinces !', sellable: true, sellPrice: 80, inShop: false }, // NOUVEAU
    { id: 'trout', name: '🐠 Truite Saumonée', description: 'Un beau poisson de rivière.', sellable: true, sellPrice: 120, inShop: false },
    { id: 'puffer', name: '🐡 Poisson Globe', description: 'Très toxique mais précieux.', sellable: true, sellPrice: 350, inShop: false }, // NOUVEAU
    { id: 'shark', name: '🦈 REQUIN BLANC', description: 'Le roi des océans !', sellable: true, sellPrice: 1500, inShop: false },
    { id: 'treasure', name: '🏴‍☠️ Coffre au Trésor', description: 'Un vieux coffre rempli d\'or !', sellable: true, sellPrice: 5000, inShop: false }, // NOUVEAU (Jackpot)

    // --- LOOT DE MINE (Mise à jour) ---
    { id: 'stone', name: '🪨 Pierre', sellable: true, sellPrice: 15, inShop: false },
    { id: 'coal', name: '🌑 Charbon', sellable: true, sellPrice: 40, inShop: false },
    { id: 'iron', name: '🔩 Fer', sellable: true, sellPrice: 100, inShop: false }, // NOUVEAU
    { id: 'gold', name: '⚜️ Pépite d\'Or', sellable: true, sellPrice: 350, inShop: false },
    { id: 'ruby', name: '🔴 Rubis', sellable: true, sellPrice: 1200, inShop: false }, // NOUVEAU
    { id: 'diamond', name: '💎 Diamant', sellable: true, sellPrice: 5000, inShop: false },
    { id: 'emerald', name: '🟢 Émeraude', sellable: true, sellPrice: 8000, inShop: false }, // NOUVEAU (Jackpot)

    // --- FLEX ---
    { id: 'watch', name: '⌚ Rolex', price: 25000, sellable: true, sellPrice: 20000, inShop: true, unique: false }
];