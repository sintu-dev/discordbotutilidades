const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const embedManager = require('../../components/embedManager');
const { EMOJIS } = require('../../variables');

module.exports = {
    name: 'embed',
    description: 'Abre el panel interactivo para diseñar y enviar un Embed a cualquier canal',
    category: 'embeds',
    aliases: ['panel', 'crearembed', 'anunciopanel', 'embedbuilder'],
    usage: '!embed [#canal_opcional]',
    userPermissions: ['ManageMessages'],
    botPermissions: ['SendMessages', 'EmbedLinks'],
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Abre el panel interactivo para crear y enviar un mensaje embed a un canal')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal de destino donde se enviará el embed final (opcional)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)
        ),

    async executeSlash(client, interaction) {
        const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
        await embedManager.startSession(interaction, targetChannel);
    },

    async executePrefix(client, message, args) {
        let targetChannel = message.mentions.channels.first() ||
            message.guild.channels.cache.get(args[0]) ||
            message.channel;

        await embedManager.startSession(message, targetChannel);
    }
};
