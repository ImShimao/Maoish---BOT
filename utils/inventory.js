const { getUser } = require('./db');

module.exports = {
    // Vérifie si l'utilisateur a un item
    hasItem: async (userId, guildId, itemId, quantity = 1) => {
        const user = await getUser(userId, guildId);
        if (!user) return false;
        
        // On récupère la quantité (0 si n'existe pas)
        const current = user.inventory.get(itemId) || 0;
        return current >= quantity;
    },

    // Ajoute un item
    addItem: async (userId, guildId, itemId, quantity = 1) => {
        const user = await getUser(userId, guildId);
        if (!user) return;

        const current = user.inventory.get(itemId) || 0;
        user.inventory.set(itemId, current + quantity);
        
        await user.save();
    },

    // Retire un item
    removeItem: async (userId, guildId, itemId, quantity = 1) => {
        const user = await getUser(userId, guildId);
        if (!user) return false;

        const current = user.inventory.get(itemId) || 0;
        if (current < quantity) return false; // Pas assez d'items
        
        const newVal = current - quantity;
        if (newVal <= 0) {
            user.inventory.delete(itemId); // On supprime si 0
        } else {
            user.inventory.set(itemId, newVal);
        }
        
        await user.save();
        return true;
    }
};