module.exports = (client) => {
    process.on('unhandledRejection', (reason, promise) => {
        console.error('\x1b[31m%s\x1b[0m', ' [ANTI-CRASH] Erreur non gérée :', reason);
    });

    process.on('uncaughtException', (err) => {
        console.error('\x1b[31m%s\x1b[0m', ' [ANTI-CRASH] Exception critique :', err);
    });
    
    console.log('🛡️  Anti-Crash activé.');
};