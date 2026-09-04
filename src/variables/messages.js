/**
 * Variables de Mensajes y Plantillas del Bot
 * Mensajes de respuesta, avisos de permisos y textos estandarizados en español
 */

const EMOJIS = require('./emojis');

module.exports = {
    ERRORS: {
        NO_PERMISSION: `${EMOJIS.ERROR} **No tienes permisos suficientes** para ejecutar esta acción.`,
        BOT_NO_PERMISSION: (perm) => `${EMOJIS.ERROR} **No tengo el permiso necesario** (\`${perm}\`) para completar esta acción.`,
        CHANNEL_NOT_FOUND: `${EMOJIS.ERROR} No se pudo encontrar el canal especificado o no tengo acceso a él.`,
        COOLDOWN: (time) => `${EMOJIS.LOADING} Por favor espera **${time}s** antes de volver a usar este comando.`,
        INVALID_URL: `${EMOJIS.ERROR} La URL proporcionada no es válida. Asegúrate de que empiece por \`http://\` o \`https://\` y termine en una extensión de imagen válida (.png, .jpg, .gif, .webp).`,
        INVALID_HEX: `${EMOJIS.ERROR} El código hexadecimal no es válido. Debe ser en formato \`#RRGGBB\` (ejemplo: \`#5865F2\`).`,
        GENERIC: `${EMOJIS.ERROR} Ocurrió un error inesperado al procesar la solicitud. El error ha sido registrado de forma segura.`
    },
    
    SUGGESTIONS: {
        NO_CHANNEL_CONFIGURED: `${EMOJIS.WARNING} No se ha configurado un canal de sugerencias en este servidor. Un administrador debe configurarlo con \`/sugerencia-setup\`.`,
        CREATED_SUCCESS: (channelId) => `${EMOJIS.SUCCESS} ¡Tu sugerencia ha sido enviada con éxito al canal <#${channelId}>!`,
        STATUS_UPDATED: (status) => `${EMOJIS.SUCCESS} El estado de la sugerencia ha sido actualizado a **${status}**.`,
        ALREADY_VOTED: `${EMOJIS.WARNING} Ya has registrado tu voto en esta sugerencia. Puedes cambiar tu voto haciendo clic en la otra opción.`
    },

    EMBED_BUILDER: {
        PANEL_HEADER: `### ${EMOJIS.PANEL} Panel de Creación de Embed Interactivo\nUsa los botones a continuación para personalizar cada sección del mensaje. Cuando esté listo, pulsa **Enviar al Canal**.`,
        SENT_SUCCESS: (channelId) => `${EMOJIS.SUCCESS} **¡Embed enviado exitosamente** al canal <#${channelId}>!`,
        CANCELLED: `${EMOJIS.CANCEL} El panel de creación de embed ha sido cancelado y cerrado.`,
        SESSION_EXPIRED: `${EMOJIS.TIME} La sesión de creación de embed ha expirado por inactividad.`
    }
};
