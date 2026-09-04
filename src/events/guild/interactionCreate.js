const Logger = require('../../utils/logger');
const PermissionChecker = require('../../utils/permissionChecker');
const { EMOJIS, MESSAGES } = require('../../variables');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Solo procesamos comandos Slash en este evento (los componentes se manejan en componentHandler)
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            Logger.warn(`Comando Slash no encontrado: ${interaction.commandName}`);
            return interaction.reply({
                content: `${EMOJIS.ERROR} Este comando no está disponible en este momento.`,
                ephemeral: true
            });
        }

        // Validar permisos requeridos
        const permCheck = PermissionChecker.check(
            interaction,
            command.userPermissions || [],
            command.botPermissions || []
        );

        if (!permCheck.hasPermission) {
            return interaction.reply({
                content: permCheck.error || MESSAGES.ERRORS.NO_PERMISSION,
                ephemeral: true
            });
        }

        try {
            if (typeof command.executeSlash === 'function') {
                await command.executeSlash(client, interaction);
            } else if (typeof command.execute === 'function') {
                await command.execute(interaction);
            } else {
                Logger.warn(`El comando ${interaction.commandName} no tiene método executeSlash o execute.`);
            }

            Logger.info(`[Slash] /${interaction.commandName} ejecutado por ${interaction.user.tag} en #${interaction.channel?.name || 'DM'}`);
        } catch (error) {
            Logger.error(`Error al ejecutar /${interaction.commandName}: ${error.stack || error}`);

            const errorMsg = {
                content: MESSAGES.ERRORS.GENERIC,
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMsg).catch(() => {});
            } else {
                await interaction.reply(errorMsg).catch(() => {});
            }
        }
    }
};
