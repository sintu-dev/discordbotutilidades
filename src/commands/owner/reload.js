const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const Logger = require('../../utils/logger');
const config = require('../../config/config');
const { COLORS, EMOJIS } = require('../../variables');

module.exports = {
    name: 'reload',
    description: 'Recarga los comandos y módulos del bot en caliente sin reiniciar el proceso',
    category: 'owner',
    aliases: ['recargar', 'refresh'],
    usage: '!reload',
    userPermissions: [],
    botPermissions: [],
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Recarga todos los comandos del bot en caliente (Solo Propietario)'),

    async executeSlash(client, interaction) {
        if (!this.isOwner(interaction.user.id)) {
            return interaction.reply({
                content: `${EMOJIS.ERROR} Este comando está reservado exclusivamente para el propietario del bot.`,
                ephemeral: true
            });
        }

        return this.executeReload(client, interaction, true);
    },

    async executePrefix(client, message, args) {
        if (!this.isOwner(message.author.id)) {
            return message.reply({
                content: `${EMOJIS.ERROR} Este comando solo puede ser ejecutado por el propietario del bot.`
            });
        }

        return this.executeReload(client, message, false);
    },

    async executeReload(client, context, isSlash) {
        if (isSlash) {
            await context.reply({ content: `${EMOJIS.LOADING} Recargando módulos en caliente...`, ephemeral: true });
        } else {
            await context.reply({ content: `${EMOJIS.LOADING} Recargando módulos en caliente...` });
        }

        try {
            client.commands.clear();
            client.aliases.clear();

            delete require.cache[require.resolve('../../handlers/commandHandler')];
            require('../../handlers/commandHandler')(client);

            const successEmbed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle(`⚡ Recarga en Caliente Exitosa`)
                .setDescription(
                    `• Se recargaron **${client.commands.size}** comandos en memoria.\n` +
                    `• Todos los archivos y rutas han sido refrescados sin desconectar el cliente.`
                )
                .setTimestamp();

            if (isSlash) {
                return context.editReply({ content: null, embeds: [successEmbed] });
            } else {
                return context.reply({ embeds: [successEmbed] });
            }
        } catch (error) {
            Logger.error(`Error durante reload: ${error.stack}`);
            const errorMsg = `${EMOJIS.ERROR} Error al recargar: \`${error.message}\``;
            if (isSlash) {
                return context.editReply({ content: errorMsg });
            } else {
                return context.reply({ content: errorMsg });
            }
        }
    },

    isOwner(userId) {
        const ownerId = config.client.ownerId || process.env.OWNER_ID;
        return userId === ownerId;
    }
};