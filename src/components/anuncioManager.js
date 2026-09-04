const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionsBitField
} = require('discord.js');

const { COLORS, EMOJIS, MESSAGES } = require('../variables');
const EmbedHelper = require('../utils/embedBuilder');
const Logger = require('../utils/logger');

class AnuncioManager {
    /**
     * Construye el Modal emergente (formulario interactivo) para redactar el anuncio
     * @param {string} channelId ID del canal destino
     * @param {string} userId ID del usuario que abrió el formulario
     * @returns {ModalBuilder} Instancia del modal de Discord
     */
    createModal(channelId, userId) {
        const modal = new ModalBuilder()
            .setCustomId(`anuncio_modal_${channelId}_${userId}`)
            .setTitle('📢 Redactar Nuevo Anuncio');

        // Campo 1: Título
        const titleInput = new TextInputBuilder()
            .setCustomId('anuncio_input_title')
            .setLabel('Título del Anuncio (Opcional)')
            .setPlaceholder('Ej: Novedades del Servidor, Mantenimiento, Eventos...')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(256)
            .setRequired(false);

        // Campo 2: Mensaje / Contenido principal
        const contentInput = new TextInputBuilder()
            .setCustomId('anuncio_input_content')
            .setLabel('Mensaje / Contenido del Anuncio *')
            .setPlaceholder('Escribe aquí todo el contenido de tu anuncio o mensaje...')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(4000)
            .setRequired(true);

        // Campo 3: URL de Imagen / Banner
        const imageInput = new TextInputBuilder()
            .setCustomId('anuncio_input_image')
            .setLabel('URL de Imagen o Banner (Opcional)')
            .setPlaceholder('https://ejemplo.com/banner.png')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        // Campo 4: URL de Miniatura
        const thumbInput = new TextInputBuilder()
            .setCustomId('anuncio_input_thumb')
            .setLabel('URL de Miniatura / Thumbnail (Opcional)')
            .setPlaceholder('https://ejemplo.com/logo.png')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        // Campo 5: Mención opcional
        const mentionInput = new TextInputBuilder()
            .setCustomId('anuncio_input_mention')
            .setLabel('Mención (@everyone, @here o vacío)')
            .setPlaceholder('@everyone, @here o déjalo en blanco')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(contentInput),
            new ActionRowBuilder().addComponents(imageInput),
            new ActionRowBuilder().addComponents(thumbInput),
            new ActionRowBuilder().addComponents(mentionInput)
        );

        return modal;
    }

    /**
     * Envía un mensaje interactivo con botón para abrir el formulario modal
     */
    async sendPrompt(context, targetChannel) {
        const user = context.user || context.author;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`📢 Publicar Anuncio en #${targetChannel.name}`)
            .setDescription(
                `Canal de destino seleccionado: ${targetChannel}\n\n` +
                `Haz clic en el botón **Redactar Anuncio** de abajo para abrir el **formulario emergente** (Modal) y escribir tu título, contenido, imágenes y menciones de forma interactiva.`
            )
            .setFooter({
                text: `Iniciado por ${user.tag || user.username}`,
                iconURL: user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`anuncio_btn_modal_${targetChannel.id}_${user.id}`)
                .setLabel('Redactar Anuncio (Formulario)')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Success)
        );

        if (context.isChatInputCommand && context.isChatInputCommand()) {
            return context.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
        } else {
            return context.reply({
                embeds: [embed],
                components: [row]
            });
        }
    }

    /**
     * Maneja el clic en botones de anuncio
     */
    async handleButton(interaction) {
        const customId = interaction.customId;
        if (!customId.startsWith('anuncio_btn_modal_')) return;

        const parts = customId.replace('anuncio_btn_modal_', '').split('_');
        const channelId = parts[0];
        const ownerId = parts[1];

        // Validar permisos del usuario
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: MESSAGES.ERRORS.NO_PERMISSION,
                ephemeral: true
            });
        }

        const modal = this.createModal(channelId, interaction.user.id);
        return interaction.showModal(modal);
    }

    /**
     * Maneja el envío del formulario Modal de anuncio
     */
    async handleModalSubmit(interaction) {
        const customId = interaction.customId;
        if (!customId.startsWith('anuncio_modal_')) return;

        const parts = customId.replace('anuncio_modal_', '').split('_');
        const channelId = parts[0];

        const targetChannel = interaction.guild.channels.cache.get(channelId) || await interaction.guild.channels.fetch(channelId).catch(() => null) || interaction.channel;
        if (!targetChannel) {
            return interaction.reply({
                content: MESSAGES.ERRORS.CHANNEL_NOT_FOUND,
                ephemeral: true
            });
        }

        const title = interaction.fields.getTextInputValue('anuncio_input_title') || null;
        const content = interaction.fields.getTextInputValue('anuncio_input_content');
        const image = interaction.fields.getTextInputValue('anuncio_input_image') || null;
        const thumb = interaction.fields.getTextInputValue('anuncio_input_thumb') || null;
        const mention = interaction.fields.getTextInputValue('anuncio_input_mention') || null;

        // Construir embed del anuncio
        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setDescription(content)
            .setTimestamp()
            .setFooter({
                text: `Anuncio publicado por ${interaction.user.tag || interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            });

        if (title) embed.setTitle(title);
        if (image && EmbedHelper.isValidImageUrl(image)) embed.setImage(image);
        if (thumb && EmbedHelper.isValidImageUrl(thumb)) embed.setThumbnail(thumb);

        try {
            const sendPayload = { embeds: [embed] };

            if (mention) {
                const cleanMention = mention.trim().toLowerCase();
                if (cleanMention === '@everyone' || cleanMention === 'everyone') {
                    sendPayload.content = '@everyone';
                } else if (cleanMention === '@here' || cleanMention === 'here') {
                    sendPayload.content = '@here';
                } else if (mention.trim().length > 0) {
                    sendPayload.content = mention.trim();
                }
            }

            await targetChannel.send(sendPayload);

            return interaction.reply({
                content: `${EMOJIS.SUCCESS} ¡Anuncio publicado exitosamente en ${targetChannel}!`,
                ephemeral: true
            });
        } catch (error) {
            Logger.error(`Error al enviar anuncio a ${targetChannel.id}: ${error.message}`);
            return interaction.reply({
                content: `${EMOJIS.ERROR} Error al publicar el anuncio: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

module.exports = new AnuncioManager();
