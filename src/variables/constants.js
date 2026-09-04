/**
 * Variables de Constantes del Bot
 * Límites de Discord, rutas de persistencia y configuraciones por defecto
 */

const path = require('path');

module.exports = {
    // Valores por defecto
    DEFAULT_PREFIX: '!',
    DEFAULT_COLOR: '#5865F2',
    BOT_VERSION: '2.0.0',
    BUILDER_TIMEOUT: 15 * 60 * 1000, // 15 minutos de inactividad para sesiones de embed

    // Límites Oficiales de la API de Discord para Embeds y Modals
    LIMITS: {
        TITLE: 256,
        DESCRIPTION: 4000,
        FIELD_NAME: 256,
        FIELD_VALUE: 1024,
        FIELD_COUNT: 25,
        FOOTER_TEXT: 2048,
        AUTHOR_NAME: 256,
        TOTAL_EMBED_CHARS: 6000
    },

    // Rutas de Persistencia de la Base de Datos Local
    DB_PATHS: {
        GUILDS: path.join(__dirname, '../database/data/guilds.json'),
        SUGGESTIONS: path.join(__dirname, '../database/data/suggestions.json'),
        POLLS: path.join(__dirname, '../database/data/polls.json')
    },

    // Categorías de Comandos
    CATEGORIES: {
        embeds: { name: 'Constructor de Embeds & Anuncios', emoji: '📋' },
        sugerencias: { name: 'Sistema de Sugerencias', emoji: '💡' },
        utilidad: { name: 'Utilidades & Encuestas', emoji: '🛠️' },
        informacion: { name: 'Información del Servidor & Bot', emoji: 'ℹ️' },
        owner: { name: 'Desarrollador / Propietario', emoji: '👑' }
    }
};
