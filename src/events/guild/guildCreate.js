const Logger = require('../../utils/logger');

module.exports = {
    name: 'guildCreate',
    execute(guild) {
        Logger.info(`Bot unido a un nuevo servidor: ${guild.name} (ID: ${guild.id})`);
    },
};
