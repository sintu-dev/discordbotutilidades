const { SlashCommandBuilder, ChannelType } = require('discord.js');
const db = require('../../database');
const configManager = require('../../components/configManager');
const { EMOJIS } = require('../../variables');

module.exports = {
    name: 'config',
    description: 'Abre el panel interactivo de configuración del servidor (prefijo, canales)',
    category: 'utilidad',
    aliases: ['settings', 'configuracion', 'ajustes', 'setup'],
    usage: '!config [ver | prefix <nuevo> | sugerencias <#canal>] o simplemente !config',
    userPermissions: ['ManageGuild'],
    botPermissions: ['SendMessages', 'EmbedLinks'],
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Administra las configuraciones del servidor para el bot')
        .addSubcommand(sub =>
            sub.setName('panel')
                .setDescription('Abre el panel de control interactivo con botones y menús')
        )
        .addSubcommand(sub =>
            sub.setName('prefijo')
                .setDescription('Cambia el prefijo para comandos de texto')
                .addStringOption(opt =>
                    opt.setName('nuevo')
                        .setDescription('Nuevo símbolo de prefijo (ej: !, ., $, ?)')
                        .setMaxLength(5)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal_sugerencias')
                .setDescription('Establece el canal oficial de sugerencias')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Canal de destino')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal_anuncios')
                .setDescription('Establece el canal predeterminado de anuncios')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Canal de destino')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(true)
                )
        ),

    async executeSlash(client, interaction) {
        const sub = interaction.options.getSubcommand(false);

        if (!sub || sub === 'panel') {
            return configManager.sendDashboard(interaction);
        }

        const guildId = interaction.guild.id;

        if (sub === 'prefijo') {
            const newPrefix = interaction.options.getString('nuevo').trim();
            db.updateGuild(guildId, { prefix: newPrefix });

            return interaction.reply({
                content: `${EMOJIS.SUCCESS} El prefijo para este servidor ha sido cambiado a: \`${newPrefix}\``,
                ephemeral: true
            });
        }

        if (sub === 'canal_sugerencias') {
            const channel = interaction.options.getChannel('canal');
            db.updateGuild(guildId, { suggestionsChannel: channel.id });

            return interaction.reply({
                content: `${EMOJIS.SUCCESS} Canal de sugerencias asignado a: ${channel}`,
                ephemeral: true
            });
        }

        if (sub === 'canal_anuncios') {
            const channel = interaction.options.getChannel('canal');
            db.updateGuild(guildId, { announcementsChannel: channel.id });

            return interaction.reply({
                content: `${EMOJIS.SUCCESS} Canal de anuncios asignado a: ${channel}`,
                ephemeral: true
            });
        }
    },

    async executePrefix(client, message, args) {
        const guildId = message.guild.id;

        if (!args.length || args[0].toLowerCase() === 'panel' || args[0].toLowerCase() === 'ver') {
            return configManager.sendDashboard(message);
        }

        const sub = args[0].toLowerCase();

        if (sub === 'prefix' || sub === 'prefijo') {
            if (!args[1]) {
                return message.reply({ content: `${EMOJIS.WARNING} Debes especificar el nuevo prefijo. Ejemplo: \`!config prefix ?\`` });
            }
            const newPrefix = args[1].trim();
            db.updateGuild(guildId, { prefix: newPrefix });
            return message.reply({ content: `${EMOJIS.SUCCESS} Prefijo cambiado exitosamente a: \`${newPrefix}\`` });
        }

        if (sub === 'sugerencias' || sub === 'sugs') {
            const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]?.replace(/<#|>/g, ''));
            if (!targetChannel) {
                return message.reply({ content: `${EMOJIS.WARNING} Debes mencionar un canal válido. Ejemplo: \`!config sugerencias #sugerencias\`` });
            }
            db.updateGuild(guildId, { suggestionsChannel: targetChannel.id });
            return message.reply({ content: `${EMOJIS.SUCCESS} Canal de sugerencias configurado en: ${targetChannel}` });
        }

        return configManager.sendDashboard(message);
    }
};
