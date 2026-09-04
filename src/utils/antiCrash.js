const Logger = require('./logger');

/**
 * Sistema Anti-Crash Integral
 * Previene el cierre inesperado del bot ante cualquier error no controlado,
 * rechazos de promesas, excepciones de red o fallos de la API de Discord.
 */
module.exports = (client) => {
    // Capturar rechazos de promesas no manejados
    process.on('unhandledRejection', (reason, promise) => {
        Logger.error(`[AntiCrash] Rechazo no manejado:\n${reason?.stack || reason}`);
    });

    // Capturar excepciones globales no controladas
    process.on('uncaughtException', (err, origin) => {
        Logger.error(`[AntiCrash] Excepción no controlada en [${origin}]:\n${err?.stack || err}`);
    });

    // Monitor de excepciones
    process.on('uncaughtExceptionMonitor', (err, origin) => {
        Logger.warn(`[AntiCrash Monitor] Advertencia de excepción en [${origin}]: ${err?.message || err}`);
    });

    // Capturar advertencias de Node.js
    process.on('warning', (warning) => {
        Logger.warn(`[Node Warning] ${warning.name}: ${warning.message}`);
    });

    // Errores del cliente de Discord
    if (client) {
        client.on('error', (error) => {
            Logger.error(`[Discord Client Error] ${error?.stack || error}`);
        });

        client.on('shardError', (error, shardId) => {
            Logger.error(`[Discord Shard Error] Shard ${shardId}: ${error?.stack || error}`);
        });

        client.on('rateLimit', (rateLimitData) => {
            Logger.warn(`[Discord RateLimit] Límite alcanzado en ruta: ${rateLimitData.route}. Esperando: ${rateLimitData.timeToReset}ms`);
        });
    }

    Logger.success('Sistema Anti-Crash de alta disponibilidad cargado.');
};
