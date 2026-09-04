const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '../events');
    if (!fs.existsSync(eventsPath)) {
        fs.mkdirSync(eventsPath, { recursive: true });
    }

    const categories = fs.readdirSync(eventsPath);
    let totalEvents = 0;

    for (const category of categories) {
        const categoryPath = path.join(eventsPath, category);
        if (!fs.statSync(categoryPath).isDirectory()) continue;

        const eventFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(categoryPath, file);
            try {
                const event = require(filePath);
                if (!event.name || !event.execute) {
                    Logger.warn(`El evento en ${file} no tiene propiedades 'name' o 'execute'.`);
                    continue;
                }

                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                totalEvents++;
            } catch (e) {
                Logger.error(`Error al cargar el evento ${file}: ${e.stack}`);
            }
        }
    }

    Logger.success(`Se cargaron ${totalEvents} eventos del cliente.`);
};
