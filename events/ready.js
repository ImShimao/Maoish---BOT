const { Events, ActivityType, REST, Routes } = require('discord.js');

module.exports = {
    name: Events.ClientReady, // Utilise Events.ClientReady au lieu de 'ready'
    once: true,
    async execute(client) {
        console.log(`🟢 ${client.user.tag} est prêt !`);

        const rest = new REST({ version: '10' }).setToken(client.token);
        const commandsData = client.commands.map(cmd => cmd.data.toJSON());
        
        const activities = [
            { name: 'Code avec Shimao', type: ActivityType.Playing },
            { name: 'Joue au Casino 🎰', type: ActivityType.Playing },
            { name: '/help pour de l\'aide', type: ActivityType.Watching },
        ];

        let i = 0;

        // Change de statut toutes les 10 secondes (10000 ms)
        setInterval(() => {
            if(i >= activities.length) i = 0; // Si on arrive à la fin, on recommence au début

            client.user.setActivity(activities[i].name, { type: activities[i].type });
            
            i++; 
        }, 10000);
        try {
            // Utilise client.user.id au lieu de CLIENT_ID si tu ne l'as pas importé
            await rest.put(Routes.applicationCommands(client.user.id), { body: commandsData });
            console.log('🌐 Commandes Slash synchronisées avec succès.');
        } catch (e) {
            console.error('❌ Erreur lors de la synchro des commandes :', e);
        }
    },
};