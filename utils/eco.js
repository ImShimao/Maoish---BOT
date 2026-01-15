// utils/eco.js - Le fichier centralisateur
const db = require('./db');
const economy = require('./economy');
const inventory = require('./inventory');
const leveling = require('./leveling');

module.exports = {
    ...db,        // Exporte getUser
    ...economy,   // Exporte addCash, getLeaderboard...
    ...inventory, // Exporte addItem, hasItem...
    ...leveling   // Exporte addXP, setJail...
};