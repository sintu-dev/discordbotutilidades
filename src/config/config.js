require('dotenv').config();
const { DEFAULT_PREFIX, DEFAULT_COLOR } = require('../variables/constants');

module.exports = {
    client: {
        token: process.env.TOKEN || '',
        id: process.env.CLIENT_ID || '',
        prefix: process.env.PREFIX || DEFAULT_PREFIX,
        ownerId: process.env.OWNER_ID || '',
        guildId: process.env.GUILD_ID || '', // Opcional: para registrar comandos slash al instante en un servidor de prueba
    },
    defaults: {
        embedColor: process.env.DEFAULT_EMBED_COLOR || DEFAULT_COLOR,
        footerText: process.env.DEFAULT_FOOTER_TEXT || 'Sistema de Mensajería & Utilidades'
    }
};
