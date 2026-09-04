const db = require('../../database');
const config = require('../../config/config');
const Logger = require('../../utils/logger');
const PermissionChecker = require('../../utils/permissionChecker');
const { EMOJIS, MESSAGES } = require('../../variables');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // Ignorar mensajes de bots o canales directos (DM) si se desea
        if (message.author.bot || !message.guild) return;

        // Obtener prefijo del servidor o usar el predeterminado
        const guildData = db.getGuild(message.guild.id);
        const prefix = guildData.prefix || config.client.prefix;

        // Verificar si el mensaje empieza por el prefijo o mención al bot
        const botMention = `<@${client.user.id}>`;
        const botMentionNick = `<@!${client.user.id}>`;

        let usedPrefix = null;
        if (message.content.startsWith(prefix)) {
            usedPrefix = prefix;
        } else if (message.content.startsWith(botMention)) {
            usedPrefix = botMention;
        } else if (message.content.startsWith(botMentionNick)) {
            usedPrefix = botMentionNick;
        }

        if (!usedPrefix) return;

        // Parsear argumentos y nombre del comando
        const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (!commandName) {
            // Si solo mencionaron al bot, responder con el prefijo actual
            return message.reply({
                content: `${EMOJIS.INFO} Mi prefijo en este servidor es \`${prefix}\`. Usa \`${prefix}help\` o \`/help\` para ver mis comandos.`
            });
        }

        // Buscar comando por nombre principal o por alias
        const cmdName = client.aliases.get(commandName) || commandName;
        const command = client.commands.get(cmdName);

        if (!command) return;

        // Validar permisos
        const permCheck = PermissionChecker.check(
            message,
            command.userPermissions || [],
            command.botPermissions || []
        );

        if (!permCheck.hasPermission) {
            return message.reply({
                content: permCheck.error || MESSAGES.ERRORS.NO_PERMISSION
            });
        }

        try {
            if (typeof command.executePrefix === 'function') {
                await command.executePrefix(client, message, args);
            } else if (typeof command.execute === 'function') {
                await command.execute(message, args);
            } else {
                Logger.warn(`El comando ${cmdName} no tiene método executePrefix.`);
            }

            Logger.info(`[Prefix] ${prefix}${commandName} ejecutado por ${message.author.tag} en #${message.channel.name}`);
        } catch (error) {
            Logger.error(`Error al ejecutar el comando prefix ${commandName}: ${error.stack || error}`);
            message.reply({ content: MESSAGES.ERRORS.GENERIC }).catch(() => {});
        }
    }
};
