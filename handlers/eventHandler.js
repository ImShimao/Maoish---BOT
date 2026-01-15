const fs = require('fs');
const path = require('path');
const Table = require('cli-table3');

module.exports = (client) => {
    // --- STYLE DU TABLEAU ---
    const table = new Table({
        head: ['\x1b[35mÉvénement\x1b[0m', '\x1b[32mStatut\x1b[0m'], 
        chars: {
            'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
            'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
            'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
            'right': '║', 'right-mid': '╢', 'middle': '│'
        },
        style: { head: [], border: ['grey'] },
        colWidths: [30, 12],
        colAligns: ['left', 'center']
    });

    const eventsPath = path.join(__dirname, '../events');
    
    const getAllFiles = (dirPath, arrayOfFiles) => {
        if (!fs.existsSync(dirPath)) return arrayOfFiles || [];
        const files = fs.readdirSync(dirPath);
        arrayOfFiles = arrayOfFiles || [];

        files.forEach((file) => {
            if (fs.statSync(dirPath + "/" + file).isDirectory()) {
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
            } else {
                if (file.endsWith('.js')) arrayOfFiles.push(path.join(dirPath, file));
            }
        });
        return arrayOfFiles;
    };
    
    let count = 0;
    if (fs.existsSync(eventsPath)) {
        const eventFiles = getAllFiles(eventsPath);
        for (const filePath of eventFiles) {
            try {
                const event = require(filePath);
                if (event.name) {
                    if (event.once) client.once(event.name, (...args) => event.execute(...args));
                    else client.on(event.name, (...args) => event.execute(...args));
                    table.push([event.name, '✅']);
                    count++;
                } else {
                    table.push([path.basename(filePath), '⚠️']);
                }
            } catch (err) {
                table.push([path.basename(filePath), '❌']);
            }
        }
    }

    // ON RETOURNE UN OBJET AVEC LE TABLEAU ET LE COMPTEUR
    return { table: table.toString(), count: count };
};