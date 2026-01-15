const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');
const config = require('../../config');

module.exports = {
    name: 'loggerSystem', // Nom interne (pas utilisé par Discord.js mais utile pour toi)
    // On n'utilise pas "execute" unique ici, on va ruser pour écouter plusieurs events
    // Mais pour faire simple avec ton handler actuel, on va créer un fichier par event ou un fichier global.
    // OPTION SIMPLE : On met tout ici et on exporte une fonction "init" qu'on appelle dans ready.js ? 
    // NON, restons sur le standard Discord.js : 1 fichier = 1 event.
    // Je vais te donner 3 petits fichiers pour les events principaux pour ne pas casser ton handler.
};