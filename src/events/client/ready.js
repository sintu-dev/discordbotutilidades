const { ActivityType } = require('discord.js');
const Logger = require('../../utils/logger');
const config = require('../../config/config');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        Logger.success(`==============================================`);
        Logger.success(`  Bot conectado como: ${client.user.tag}`);
        Logger.success(`  ID del Bot: ${client.user.id}`);
        Logger.success(`  Servidores activos: ${client.guilds.cache.size}`);
        Logger.success(`  Prefijo por defecto: ${config.client.prefix}`);
        Logger.success(`==============================================`);

        // Establecer presencia interactiva
        client.user.setPresence({
            activities: [
                {
                    name: `${config.client.prefix}help | /help | Embeds & Utilidades`,
                    type: ActivityType.Watching
                }
            ],
            status: 'online'
        });

        // Auto-registrar comandos Slash en Discord
        if (typeof client.registerSlashCommands === 'function') {
            await client.registerSlashCommands();
        }
    }
};
