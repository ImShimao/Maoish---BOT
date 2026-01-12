const { Events, ActivityType, REST, Routes } = require('discord.js');

module.exports = {
    name: Events.ClientReady, // Utilise Events.ClientReady au lieu de 'ready'
    once: true,
    async execute(client) {
        console.log(`🟢 ${client.user.tag} est prêt !`);

        const rest = new REST({ version: '10' }).setToken(client.token);
        const commandsData = client.commands.map(cmd => cmd.data.toJSON());

        try {
            // Utilise client.user.id au lieu de CLIENT_ID si tu ne l'as pas importé
            await rest.put(Routes.applicationCommands(client.user.id), { body: commandsData });
            console.log('🌐 Commandes Slash synchronisées avec succès.');
        } catch (e) {
            console.error('❌ Erreur lors de la synchro des commandes :', e);
        }
    },
};