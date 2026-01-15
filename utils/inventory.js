const { getUser } = require('./db');

module.exports = {
    hasItem: async (userId, itemId) => {
        const user = await getUser(userId);
        return (user.inventory.get(itemId) > 0);
    },

    addItem: async (userId, itemId, quantity = 1) => {
        const user = await getUser(userId);
        const current = user.inventory.get(itemId) || 0;
        user.inventory.set(itemId, current + quantity);
        await user.save();
    },

    removeItem: async (userId, itemId, quantity = 1) => {
        const user = await getUser(userId);
        const current = user.inventory.get(itemId) || 0;
        if (current < quantity) return false;
        
        const newVal = current - quantity;
        if (newVal <= 0) user.inventory.delete(itemId);
        else user.inventory.set(itemId, newVal);
        
        await user.save();
        return true;
    }
};