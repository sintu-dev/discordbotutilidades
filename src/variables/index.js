/**
 * Exportador Central de Variables
 * Permite importar colores, emojis, constantes y mensajes con una sola referencia
 */

const colors = require('./colors');
const emojis = require('./emojis');
const constants = require('./constants');
const messages = require('./messages');

module.exports = {
    COLORS: colors,
    EMOJIS: emojis,
    CONSTANTS: constants,
    MESSAGES: messages,
    
    // Acceso directo a los elementos más comunes
    ...colors,
    ...emojis,
    ...constants,
    ...messages
};
