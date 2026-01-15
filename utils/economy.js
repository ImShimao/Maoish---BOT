const { getUser } = require('./db');
const User = require('../models/User');
const itemsDb = require('./items.js'); // Assure-toi que le chemin est bon

module.exports = {
    get: async (userId) => {
        return await getUser(userId);
    },

    addCash: async (userId, amount) => {
        const user = await User.findOneAndUpdate(
            { userId: userId },
            { $inc: { cash: parseInt(amount) } },
            { new: true, upsert: true }
        );
        return user.cash;
    },

    addBank: async (userId, amount) => {
        // --- LIMITE POLICE ---
        if (userId === 'police_treasury') {
            const user = await getUser(userId);
            const limit = 1000000000;
            let newBalance = user.bank + parseInt(amount);
            
            user.bank = (newBalance > limit) ? limit : newBalance;
            await user.save();
            return user.bank;
        }

        const user = await User.findOneAndUpdate(
            { userId: userId },
            { $inc: { bank: parseInt(amount) } },
            { new: true, upsert: true }
        );
        return user.bank;
    },

    deposit: async (userId, amount) => {
        const user = await getUser(userId);
        if (user.cash < amount) return false;
        
        user.cash -= amount;
        user.bank += amount;
        await user.save();
        return true;
    },

    withdraw: async (userId, amount) => {
        const user = await getUser(userId);
        if (user.bank < amount) return false;

        user.bank -= amount;
        user.cash += amount;
        await user.save();
        return true;
    },

    batchAdd: async (userIds, amount, account = 'cash') => {
        const update = { $inc: { [account]: parseInt(amount) } };
        await User.updateMany({ userId: { $in: userIds } }, update);
    },

    batchSet: async (userIds, value, account = 'cash') => {
        const update = { $set: { [account]: parseInt(value) } };
        await User.updateMany({ userId: { $in: userIds } }, update);
    },

    getLeaderboard: async (limit = 10) => {
        const users = await User.find();
        const richList = users.map(u => {
            let invValue = 0;
            if (u.inventory) {
                for (const [id, qty] of u.inventory) {
                    const it = itemsDb.find(i => i.id === id);
                    if (it && it.sellPrice) invValue += (it.sellPrice * qty);
                }
            }
            return {
                id: u.userId,
                cash: u.cash,
                bank: u.bank,
                level: u.level || 1,
                xp: u.xp || 0,
                networth: u.cash + u.bank + invValue
            };
        });
        return richList.sort((a, b) => b.networth - a.networth).slice(0, limit);
    }
};