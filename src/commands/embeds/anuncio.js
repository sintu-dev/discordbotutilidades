const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { COLORS, EMOJIS, MESSAGES } = require('../../variables');
const EmbedHelper = require('../../utils/embedBuilder');
const anuncioManager = require('../../components/anuncioManager');

module.exports = {
    name: 'anuncio',
    description: 'Envía un anuncio formal con formulario emergente (Modal) o texto a un canal',
    category: 'embeds',
    aliases: ['announcement', 'comunicado', 'broadcast', 'anunciar'],
    usage: '!anuncio [#canal] [Título | Mensaje | URL_Imagen] o simplemente !anuncio',
    userPermissions: ['ManageMessages'],
    botPermissions: ['SendMessages', 'EmbedLinks'],
    data: new SlashCommandBuilder()
        .setName('anuncio')
        .setDescription('Redacta y publica un anuncio formal (abre formulario modal interactivo o envía directo)')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal de destino para el anuncio (opcional, por defecto el actual)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('mensaje')
                .setDescription('Contenido del anuncio (opcional; si se omite, se abre el formulario emergente modal)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('Título del anuncio (opcional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('imagen')
                .setDescription('URL de imagen o banner (opcional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('miniatura')
                .setDescription('URL de la miniatura/thumbnail (opcional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Color Hexadecimal (Ej: #5865F2 o #FF0000)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('mencion')
                .setDescription('Mención especial para notificar a los miembros')
                .setRequired(false)
                .addChoices(
                    { name: '@everyone', value: '@everyone' },
                    { name: '@here', value: '@here' },
                    { name: 'Ninguna', value: 'none' }
                )
        ),

    async executeSlash(client, interaction) {
        const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
        const content = interaction.options.getString('mensaje');

        // Si no se proporcionó mensaje como parámetro directo, abrir el Modal interactivo
        if (!content) {
            const modal = anuncioManager.createModal(targetChannel.id, interaction.user.id);
            return interaction.showModal(modal);
        }

        // Si se proporcionó mensaje por opciones directas, enviarlo inmediatamente
        const title = interaction.options.getString('titulo');
        const imageUrl = interaction.options.getString('imagen');
        const thumbUrl = interaction.options.getString('miniatura');
        const colorInput = interaction.options.getString('color');
        const mention = interaction.options.getString('mencion');

        const embedColor = colorInput ? EmbedHelper.parseHexColor(colorInput) : COLORS.PRIMARY;

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setDescription(content)
            .setTimestamp()
            .setFooter({
                text: `Anuncio publicado por ${interaction.user.tag || interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            });

        if (title) embed.setTitle(title);
        if (imageUrl && EmbedHelper.isValidImageUrl(imageUrl)) embed.setImage(imageUrl);
        if (thumbUrl && EmbedHelper.isValidImageUrl(thumbUrl)) embed.setThumbnail(thumbUrl);

        try {
            const sendPayload = { embeds: [embed] };
            if (mention && mention !== 'none') {
                sendPayload.content = mention;
            }

            await targetChannel.send(sendPayload);

            return interaction.reply({
                content: `${EMOJIS.SUCCESS} ¡Anuncio enviado con éxito a ${targetChannel}!`,
                ephemeral: true
            });
        } catch (error) {
            return interaction.reply({
                content: `${EMOJIS.ERROR} Error al enviar el anuncio: ${error.message}`,
                ephemeral: true
            });
        }
    },

    async executePrefix(client, message, args) {
        // 1. Si no hay argumentos, mostrar el mensaje interactivo con botón para abrir el Formulario Modal
        if (!args.length) {
            return anuncioManager.sendPrompt(message, message.channel);
        }

        const rawText = args.join(' ');

        // Detectar si el primer argumento es un canal
        const channelMention = message.mentions.channels.first();
        let targetChannel = channelMention;
        let isFirstArgChannel = false;

        if (!targetChannel) {
            const firstArgClean = args[0].replace(/<#|>/g, '');
            const foundChannel = message.guild.channels.cache.get(firstArgClean);
            if (foundChannel) {
                targetChannel = foundChannel;
                isFirstArgChannel = true;
            }
        } else {
            isFirstArgChannel = true;
        }

        // Si solo se pasó el canal (ej: `!anuncio #general`), mostrar botón para redactar en ese canal
        if (isFirstArgChannel && args.length === 1) {
            return anuncioManager.sendPrompt(message, targetChannel);
        }

        // Si no se especificó canal, usar el canal actual
        if (!targetChannel) {
            targetChannel = message.channel;
        }

        let title = null;
        let content = null;
        let imageUrl = null;

        // 2. Si el usuario usó separadores de barra vertical `|`
        if (rawText.includes('|')) {
            const parts = rawText.split('|').map(p => p.trim());

            if (isFirstArgChannel) {
                // Caso: !anuncio #canal | Título | Mensaje | [URL]
                title = parts.length > 1 ? parts[1] : null;
                content = parts.length > 2 ? parts[2] : null;
                imageUrl = parts.length > 3 ? parts[3] : null;

                if (parts.length === 2) {
                    content = parts[1];
                    title = null;
                }
            } else {
                // Caso: !anuncio Título | Mensaje | [URL]
                title = parts[0];
                content = parts.length > 1 ? parts[1] : null;
                imageUrl = parts.length > 2 ? parts[2] : null;
            }
        } else {
            // 3. Si el usuario escribió texto libre sin `|` (ej: `!anuncio #general Hola a todos`)
            if (isFirstArgChannel) {
                content = args.slice(1).join(' ').trim();
            } else {
                content = args.join(' ').trim();
            }
        }

        if (!content) {
            return anuncioManager.sendPrompt(message, targetChannel);
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setDescription(content)
            .setTimestamp()
            .setFooter({
                text: `Anuncio publicado por ${message.author.tag || message.author.username}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            });

        if (title) embed.setTitle(title);
        if (imageUrl && EmbedHelper.isValidImageUrl(imageUrl)) embed.setImage(imageUrl);

        try {
            await targetChannel.send({ embeds: [embed] });
            return message.reply({ content: `${EMOJIS.SUCCESS} ¡Anuncio enviado exitosamente a ${targetChannel}!` });
        } catch (error) {
            return message.reply({ content: `${EMOJIS.ERROR} No se pudo enviar el anuncio: ${error.message}` });
        }
    }
};
