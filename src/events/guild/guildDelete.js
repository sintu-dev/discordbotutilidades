const Logger = require('../../utils/logger');

module.exports = {
    name: 'guildDelete',
    execute(guild) {
        Logger.warn(`Bot expulsado o servidor eliminado: ${guild.name} (ID: ${guild.id})`);
    },
};
