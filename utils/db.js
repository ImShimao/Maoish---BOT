const User = require('../models/User');

// ⚠️ REMPLACE CECI PAR L'ID DE TON SERVEUR DISCORD PRINCIPAL
const ORIGINAL_GUILD_ID = "819306515877724226"; 

async function getUser(userId, guildId) {
    // --- 🛡️ SÉCURITÉ ANTI-CRASH (La correction est ici) ---
    // Si une commande appelle cette fonction sans donner l'ID du serveur, on arrête tout avant le crash.
    if (!guildId) {
        console.error(`❌ [ERREUR CRITIQUE DATABASE] Impossible de récupérer le profil de ${userId}.`);
        console.error(`👉 CAUSE : Le paramètre 'guildId' est manquant dans l'appel eco.get().`);
        console.error(`👉 SOLUTION : Vérifie la commande que tu viens de lancer et assure-toi d'avoir mis : eco.get(user.id, interaction.guild.id)`);
        return null; // On retourne 'null' pour que le bot ne plante pas.
    }

    // 1. On cherche le profil spécifique au serveur (Version V2)
    let user = await User.findOne({ userId: userId, guildId: guildId });

    // 2. Si on ne trouve pas, on regarde s'il existe un "Vieux Profil" (sans guildId)
    if (!user) {
        // On cherche un user qui a cet ID mais où le champ guildId N'EXISTE PAS encore
        const oldUser = await User.findOne({ userId: userId, guildId: { $exists: false } });

        // Si on trouve un vieux profil ET qu'on est sur le serveur principal
        if (oldUser && guildId === ORIGINAL_GUILD_ID) {
            console.log(`[MIGRATION] Transfert du profil de ${userId} vers le serveur ${guildId}`);
            
            // On lui assigne le nouveau système
            oldUser.guildId = guildId;
            
            // On s'assure que les nouveaux champs existent
            if (!oldUser.stats) oldUser.stats = {};
            if (!oldUser.cooldowns) oldUser.cooldowns = {};
            
            // On sauvegarde (ça devient un profil V2)
            user = await oldUser.save();
        } 
        else {
            // 3. Sinon (Nouveau joueur OU autre serveur), on crée un profil neuf
            user = new User({ 
                userId: userId,
                guildId: guildId 
            });
            await user.save();
        }
    }
    
    return user;
}

module.exports = { getUser };