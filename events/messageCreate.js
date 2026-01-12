module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.content.startsWith('+')) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = message.client.commands.get(commandName);

        if (command) {
            try { await command.execute(message, args); } 
            catch (e) { console.error(e); message.reply('❌ Erreur.'); }
        }
    },
};