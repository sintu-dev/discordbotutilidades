const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const config = require('./config/config');
const Logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

// Inicializar Cliente de Discord con los Intents requeridos
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ]
});

// Inicializar colecciones globales
client.commands = new Collection();
client.aliases = new Collection();

// Cargar Sistema Anti-Crash
require('./utils/antiCrash')(client);

// Cargar Handlers de forma modular
const handlersPath = path.join(__dirname, 'handlers');
if (fs.existsSync(handlersPath)) {
    const handlerFiles = fs.readdirSync(handlersPath).filter(file => file.endsWith('.js'));
    for (const file of handlerFiles) {
        try {
            require(`./handlers/${file}`)(client);
        } catch (err) {
            Logger.error(`Error al ejecutar handler ${file}: ${err.stack}`);
        }
    }
}

// Manejo de apagado seguro (Graceful Shutdown)
const shutdownBot = (signal) => {
    Logger.warn(`Recibida señal ${signal}. Cerrando bot de forma segura y guardando datos...`);
    client.destroy();
    Logger.success('Bot apagado correctamente. ¡Hasta la próxima!');
    process.exit(0);
};

process.on('SIGINT', () => shutdownBot('SIGINT'));
process.on('SIGTERM', () => shutdownBot('SIGTERM'));

// Iniciar sesión en Discord
if (!config.client.token || config.client.token === 'TU_TOKEN_AQUÍ') {
    Logger.error('No se ha proporcionado un TOKEN válido en el archivo .env');
    Logger.error('Abre el archivo .env y coloca el TOKEN de tu bot de Discord.');
    process.exit(1);
}

client.login(config.client.token).then(() => {
    Logger.info('Autenticación con el Gateway de Discord iniciada...');
}).catch(err => {
    Logger.error(`Fallo crítico al iniciar sesión en Discord: ${err.message}`);
});
