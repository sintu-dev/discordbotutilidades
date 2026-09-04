const { SlashCommandBuilder, ChannelType } = require('discord.js');
const db = require('../../database');
const suggestionManager = require('../../components/suggestionManager');
const { EMOJIS } = require('../../variables');

module.exports = {
    name: 'sugerencia-setup',
    description: 'Configura el canal de sugerencias mediante menú desplegable interactivo o mención',
    category: 'sugerencias',
    aliases: ['setsugerencias', 'config-sugerencias', 'sugsetup'],
    usage: '!sugerencia-setup [#canal_opcional]',
    userPermissions: ['ManageGuild'],
    botPermissions: ['SendMessages', 'EmbedLinks'],
    data: new SlashCommandBuilder()
        .setName('sugerencia-setup')
        .setDescription('Configura el canal oficial de sugerencias comunitarias')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('El canal de destino (opcional; si se omite, se abre el selector de canales)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)
        ),

    async executeSlash(client, interaction) {
        const targetChannel = interaction.options.getChannel('canal');

        if (!targetChannel) {
            return suggestionManager.sendSetupMenu(interaction);
        }

        db.updateGuild(interaction.guild.id, {
            suggestionsChannel: targetChannel.id
        });

        return interaction.reply({
            content: `${EMOJIS.SUCCESS} ¡Canal de sugerencias configurado exitosamente en ${targetChannel}!`,
            ephemeral: true
        });
    },

    async executePrefix(client, message, args) {
        const targetChannel = message.mentions.channels.first() ||
            (args[0] ? message.guild.channels.cache.get(args[0].replace(/<#|>/g, '')) : null);

        if (!targetChannel) {
            return suggestionManager.sendSetupMenu(message);
        }

        db.updateGuild(message.guild.id, {
            suggestionsChannel: targetChannel.id
        });

        return message.reply({
            content: `${EMOJIS.SUCCESS} ¡Canal de sugerencias establecido en ${targetChannel}!`
        });
    }
};
