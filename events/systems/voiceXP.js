const { Events } = require('discord.js');
const eco = require('../../utils/eco.js'); 

module.exports = {
    name: Events.ClientReady,
    once: true, // ✅ IMPORTANT : On ne lance le timer qu'une seule fois au démarrage
    execute(client) {
        console.log('🎙️ Système XP Vocal activé (Cycle: 5 min).');

        // Boucle de vérification toutes les 5 minutes (300 000 ms)
        setInterval(async () => {
            client.guilds.cache.forEach(async (guild) => {
                // On récupère tous les salons vocaux où il y a du monde
                const voiceChannels = guild.channels.cache.filter(c => c.isVoiceBased() && c.members.size > 0);
                
                for (const [channelId, channel] of voiceChannels) {
                    // On filtre les membres éligibles :
                    // - Pas un bot
                    // - Pas en sourdine (SelfDeaf ou ServerDeaf)
                    // - Min 2 personnes dans le salon (Anti-Farm seul)
                    const eligibleMembers = channel.members.filter(m => 
                        !m.user.bot && 
                        !m.voice.selfDeaf && 
                        !m.voice.serverDeaf &&
                        channel.members.size > 1
                    );

                    for (const [memberId, member] of eligibleMembers) {
                        const xpGain = 50; 
                        
                        // ✅ CORRECTION V2 : On passe guild.id
                        try {
                            await eco.addXP(member.id, guild.id, xpGain);
                        } catch (e) {
                            console.error(`Erreur XP Vocal ${member.user.tag}:`, e);
                        }
                    }
                }
            });
        }, 5 * 60 * 1000); 
    },
};