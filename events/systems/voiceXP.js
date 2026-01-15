const { Events } = require('discord.js');
const eco = require('../../utils/eco.js'); // On remonte d'un dossier pour trouver utils

module.exports = {
    name: Events.ClientReady,
    once: false, // On laisse false car le setInterval doit continuer à tourner
    execute(client) {
        console.log('🎙️ Système XP Vocal activé.');

        // Boucle de vérification toutes les 5 minutes (300 000 ms)
        setInterval(async () => {
            client.guilds.cache.forEach(async (guild) => {
                // On récupère tous les salons vocaux où il y a du monde
                const voiceChannels = guild.channels.cache.filter(c => c.isVoiceBased() && c.members.size > 0);
                
                for (const channel of voiceChannels.values()) {
                    // On filtre les membres éligibles :
                    // - Pas un bot, Pas en sourdine (SelfDeaf), Min 2 personnes
                    const eligibleMembers = channel.members.filter(m => 
                        !m.user.bot && 
                        !m.voice.selfDeaf && 
                        channel.members.size > 1
                    );

                    for (const member of eligibleMembers.values()) {
                        const xpGain = 50; 
                        // On ajoute l'XP silencieusement
                        await eco.addXP(member.id, xpGain);
                    }
                }
            });
        }, 5 * 60 * 1000); 
    },
};