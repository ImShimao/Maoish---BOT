module.exports = [
    // --- OUTILS (Uniques & Vendables en boutique) ---
    {
        id: 'fishing_rod', name: '🎣 Canne à Pêche', price: 500,
        description: 'Indispensable pour pêcher.', 
        sellable: true, sellPrice: 200, 
        inShop: true, unique: true
    },
    {
        id: 'pickaxe', name: '⛏️ Pioche', price: 1000,
        description: 'Pour miner dans la grotte.', 
        sellable: true, sellPrice: 400, 
        inShop: true, unique: true
    },
    {
        id: 'lock', name: '🔒 Cadenas', price: 200,
        description: 'Protège (50%) contre un braquage.', 
        sellable: false, 
        inShop: true, unique: false // On peut en acheter plusieurs car ils cassent
    },

    // --- LOOT DE PÊCHE (Pas dans le shop) ---
    { 
        id: 'trash', name: '👢 Vieille Botte', price: 0, 
        description: 'Un déchet inutile.', 
        sellable: true, sellPrice: 5, inShop: false 
    },
    { 
        id: 'fish', name: '🐟 Gardon', price: 0, 
        description: 'Un poisson commun.', 
        sellable: true, sellPrice: 45, inShop: false 
    },
    { 
        id: 'trout', name: '🦈 Truite Saumonée', price: 0, 
        description: 'Un beau poisson de rivière.', 
        sellable: true, sellPrice: 120, inShop: false 
    },
    { 
        id: 'shark', name: '🦈 REQUIN BLANC', price: 0, 
        description: 'Le roi des océans !', 
        sellable: true, sellPrice: 1500, inShop: false 
    },

    // --- LOOT DE MINE (Pas dans le shop) ---
    { id: 'stone', name: '🪨 Pierre', sellable: true, sellPrice: 15, inShop: false },
    { id: 'coal', name: '🌑 Charbon', sellable: true, sellPrice: 40, inShop: false },
    { id: 'gold', name: '⚜️ Pépite d\'Or', sellable: true, sellPrice: 350, inShop: false },
    { id: 'diamond', name: '💎 Diamant', sellable: true, sellPrice: 5000, inShop: false },

    // --- FLEX ---
    { id: 'watch', name: '⌚ Rolex', price: 25000, sellable: true, sellPrice: 20000, inShop: true, unique: false }
];