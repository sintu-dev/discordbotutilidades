const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    ComponentType
} = require('discord.js');

const { COLORS, EMOJIS, PRESETS, MESSAGES, CONSTANTS } = require('../variables');
const EmbedHelper = require('../utils/embedBuilder');
const Logger = require('../utils/logger');

class EmbedManager {
    constructor() {
        // Almacena las sesiones de edición activas por usuario
        // Map<userId, { guildId, targetChannelId, data: { title, description, color, image, thumbnail, footer, footerIcon, author, authorIcon, fields, timestamp }, messageId }>
        this.sessions = new Map();
    }

    /**
     * Inicia una nueva sesión del constructor de embeds
     */
    async startSession(context, targetChannel = null) {
        const user = context.user || context.author;
        const guild = context.guild;
        const channel = context.channel;

        // Estado inicial del embed
        const sessionData = {
            guildId: guild.id,
            targetChannelId: targetChannel ? targetChannel.id : channel.id,
            data: {
                title: 'Título de Ejemplo',
                description: 'Este es el contenido de tu nuevo mensaje embed. Usa los botones de abajo para personalizarlo a tu gusto.',
                color: COLORS.PRIMARY,
                image: null,
                thumbnail: null,
                footer: null,
                footerIcon: null,
                author: null,
                authorIcon: null,
                fields: [],
                timestamp: false
            },
            panelMessage: null
        };

        this.sessions.set(user.id, sessionData);

        const { embed, components } = this.renderPanel(user.id);

        let replyMessage;
        if (context.isChatInputCommand && context.isChatInputCommand()) {
            replyMessage = await context.reply({
                content: MESSAGES.EMBED_BUILDER.PANEL_HEADER,
                embeds: [embed],
                components: components,
                ephemeral: true,
                fetchReply: true
            });
        } else {
            replyMessage = await context.reply({
                content: MESSAGES.EMBED_BUILDER.PANEL_HEADER,
                embeds: [embed],
                components: components
            });
        }

        sessionData.panelMessage = replyMessage;
        this.sessions.set(user.id, sessionData);

        return replyMessage;
    }

    /**
     * Renderiza el embed actual y los componentes interactivos del panel
     */
    renderPanel(userId) {
        const session = this.sessions.get(userId);
        if (!session) return null;

        const d = session.data;

        // Construir embed de vista previa
        const previewEmbed = new EmbedBuilder()
            .setColor(d.color || COLORS.PRIMARY);

        if (d.title) previewEmbed.setTitle(d.title);
        if (d.description) previewEmbed.setDescription(d.description);
        if (d.image) previewEmbed.setImage(d.image);
        if (d.thumbnail) previewEmbed.setThumbnail(d.thumbnail);
        if (d.footer) previewEmbed.setFooter({ text: d.footer, iconURL: d.footerIcon || undefined });
        if (d.author) previewEmbed.setAuthor({ name: d.author, iconURL: d.authorIcon || undefined });
        if (d.timestamp) previewEmbed.setTimestamp();

        if (d.fields && d.fields.length > 0) {
            d.fields.forEach(f => {
                previewEmbed.addFields({ name: f.name, value: f.value, inline: f.inline });
            });
        }

        // Fila 1: Edición de Contenido Principal
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`embed_btn_text_${userId}`)
                .setLabel('Texto (Título & Contenido)')
                .setEmoji(EMOJIS.PENCIL)
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`embed_btn_images_${userId}`)
                .setLabel('Imágenes (Banner/Miniatura)')
                .setEmoji(EMOJIS.IMAGE)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`embed_btn_colors_${userId}`)
                .setLabel('Color')
                .setEmoji(EMOJIS.PALETTE)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`embed_btn_meta_${userId}`)
                .setLabel('Autor & Footer')
                .setEmoji(EMOJIS.FOOTER)
                .setStyle(ButtonStyle.Secondary)
        );

        // Fila 2: Campos, Timestamp y Configuración
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`embed_btn_addfield_${userId}`)
                .setLabel(`Añadir Campo (${d.fields.length}/${CONSTANTS.LIMITS.FIELD_COUNT})`)
                .setEmoji(EMOJIS.FIELDS)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`embed_btn_clearfields_${userId}`)
                .setLabel('Limpiar Campos')
                .setEmoji(EMOJIS.TRASH)
                .setStyle(ButtonStyle.Danger)
                .setDisabled(d.fields.length === 0),
            new ButtonBuilder()
                .setCustomId(`embed_btn_toggle_time_${userId}`)
                .setLabel(d.timestamp ? 'Quitar Hora' : 'Añadir Hora')
                .setEmoji(EMOJIS.TIME)
                .setStyle(d.timestamp ? ButtonStyle.Success : ButtonStyle.Secondary)
        );

        // Fila 3: Selección de Canal de Destino
        const row3 = new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(`embed_menu_channel_${userId}`)
                .setPlaceholder(`Canal de destino actual: #${session.targetChannelId}`)
                .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        );

        // Fila 4: Acciones Finales (Enviar / Cancelar)
        const row4 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`embed_btn_send_${userId}`)
                .setLabel(`Enviar al Canal`)
                .setEmoji(EMOJIS.SEND)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`embed_btn_cancel_${userId}`)
                .setLabel('Cancelar')
                .setEmoji(EMOJIS.CANCEL)
                .setStyle(ButtonStyle.Danger)
        );

        return {
            embed: previewEmbed,
            components: [row1, row2, row3, row4]
        };
    }

    /**
     * Maneja las interacciones de botones del panel
     */
    async handleButton(interaction) {
        const customId = interaction.customId;
        const userId = interaction.user.id;

        // Comprobar que sea el propietario de la sesión
        const sessionOwnerId = customId.split('_').pop();
        if (sessionOwnerId !== userId) {
            return interaction.reply({
                content: `${EMOJIS.ERROR} Este panel de creación pertenece a otro usuario.`,
                ephemeral: true
            });
        }

        const session = this.sessions.get(userId);
        if (!session) {
            return interaction.reply({
                content: MESSAGES.EMBED_BUILDER.SESSION_EXPIRED,
                ephemeral: true
            });
        }

        // 1. Abrir Modal de Texto (Título y Descripción)
        if (customId.startsWith('embed_btn_text_')) {
            const modal = new ModalBuilder()
                .setCustomId(`embed_modal_text_${userId}`)
                .setTitle('Editar Título y Contenido');

            const titleInput = new TextInputBuilder()
                .setCustomId('embed_input_title')
                .setLabel('Título del Embed (Opcional)')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(CONSTANTS.LIMITS.TITLE)
                .setRequired(false)
                .setValue(session.data.title || '');

            const descInput = new TextInputBuilder()
                .setCustomId('embed_input_description')
                .setLabel('Contenido / Mensaje (Obligatorio)')
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(CONSTANTS.LIMITS.DESCRIPTION)
                .setRequired(true)
                .setValue(session.data.description || '');

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(descInput)
            );

            return interaction.showModal(modal);
        }

        // 2. Abrir Modal de Imágenes (Banner y Miniatura)
        if (customId.startsWith('embed_btn_images_')) {
            const modal = new ModalBuilder()
                .setCustomId(`embed_modal_images_${userId}`)
                .setTitle('Editar Imágenes');

            const imageInput = new TextInputBuilder()
                .setCustomId('embed_input_image')
                .setLabel('URL del Banner / Imagen Grande (Opcional)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://ejemplo.com/banner.png')
                .setRequired(false)
                .setValue(session.data.image || '');

            const thumbInput = new TextInputBuilder()
                .setCustomId('embed_input_thumb')
                .setLabel('URL de la Miniatura / Thumbnail (Opcional)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://ejemplo.com/logo.png')
                .setRequired(false)
                .setValue(session.data.thumbnail || '');

            modal.addComponents(
                new ActionRowBuilder().addComponents(imageInput),
                new ActionRowBuilder().addComponents(thumbInput)
            );

            return interaction.showModal(modal);
        }

        // 3. Menú de Colores
        if (customId.startsWith('embed_btn_colors_')) {
            const colorOptions = [
                { label: 'Azul Discord', value: PRESETS.azul_discord, emoji: '🔵' },
                { label: 'Verde Esmeralda', value: PRESETS.verde_esmeralda, emoji: '🟢' },
                { label: 'Rojo Rubí', value: PRESETS.rojo_rubi, emoji: '🔴' },
                { label: 'Amarillo Oro', value: PRESETS.amarillo_oro, emoji: '🟡' },
                { label: 'Morado Real', value: PRESETS.morado_real, emoji: '🟣' },
                { label: 'Cian Neón', value: PRESETS.cian_neon, emoji: '🌐' },
                { label: 'Naranja Fuego', value: PRESETS.naranja_fuego, emoji: '🟠' },
                { label: 'Rosa Pastel', value: PRESETS.rosa_pastel, emoji: '🌸' },
                { label: 'Blanco Puro', value: PRESETS.blanco_puro, emoji: '⚪' },
                { label: 'Oscuro Elegante', value: PRESETS.oscuro_elegante, emoji: '⚫' }
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`embed_select_color_${userId}`)
                .setPlaceholder('Elige un color predeterminado')
                .addOptions(colorOptions);

            const customColorBtn = new ButtonBuilder()
                .setCustomId(`embed_btn_custom_hex_${userId}`)
                .setLabel('Introducir Código HEX (#RRGGBB)')
                .setEmoji(EMOJIS.PALETTE)
                .setStyle(ButtonStyle.Primary);

            const backBtn = new ButtonBuilder()
                .setCustomId(`embed_btn_refresh_${userId}`)
                .setLabel('Volver al Panel')
                .setStyle(ButtonStyle.Secondary);

            return interaction.update({
                content: `### ${EMOJIS.PALETTE} Selector de Color\nElige uno de los colores rápidos de la lista o escribe tu propio código Hexadecimal personalizado:`,
                components: [
                    new ActionRowBuilder().addComponents(selectMenu),
                    new ActionRowBuilder().addComponents(customColorBtn, backBtn)
                ]
            });
        }

        // 3.1 Modal de Color HEX personalizado
        if (customId.startsWith('embed_btn_custom_hex_')) {
            const modal = new ModalBuilder()
                .setCustomId(`embed_modal_custom_hex_${userId}`)
                .setTitle('Color Hexadecimal Personalizado');

            const hexInput = new TextInputBuilder()
                .setCustomId('embed_input_hex')
                .setLabel('Código Hexadecimal (Ej: #5865F2 o #FF0055)')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(7)
                .setRequired(true)
                .setValue(session.data.color || '#5865F2');

            modal.addComponents(new ActionRowBuilder().addComponents(hexInput));
            return interaction.showModal(modal);
        }

        // 4. Modal de Autor y Footer
        if (customId.startsWith('embed_btn_meta_')) {
            const modal = new ModalBuilder()
                .setCustomId(`embed_modal_meta_${userId}`)
                .setTitle('Editar Autor y Pie de Página (Footer)');

            const authorInput = new TextInputBuilder()
                .setCustomId('embed_input_author')
                .setLabel('Nombre del Autor (Opcional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(session.data.author || '');

            const authorIconInput = new TextInputBuilder()
                .setCustomId('embed_input_author_icon')
                .setLabel('URL del Icono del Autor (Opcional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(session.data.authorIcon || '');

            const footerInput = new TextInputBuilder()
                .setCustomId('embed_input_footer')
                .setLabel('Texto del Pie de Página / Footer (Opcional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(session.data.footer || '');

            const footerIconInput = new TextInputBuilder()
                .setCustomId('embed_input_footer_icon')
                .setLabel('URL del Icono del Footer (Opcional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(session.data.footerIcon || '');

            modal.addComponents(
                new ActionRowBuilder().addComponents(authorInput),
                new ActionRowBuilder().addComponents(authorIconInput),
                new ActionRowBuilder().addComponents(footerInput),
                new ActionRowBuilder().addComponents(footerIconInput)
            );

            return interaction.showModal(modal);
        }

        // 5. Modal para Añadir Campo
        if (customId.startsWith('embed_btn_addfield_')) {
            if (session.data.fields.length >= CONSTANTS.LIMITS.FIELD_COUNT) {
                return interaction.reply({
                    content: `${EMOJIS.ERROR} Has alcanzado el límite máximo de ${CONSTANTS.LIMITS.FIELD_COUNT} campos por embed.`,
                    ephemeral: true
                });
            }

            const modal = new ModalBuilder()
                .setCustomId(`embed_modal_addfield_${userId}`)
                .setTitle('Añadir Nuevo Campo');

            const nameInput = new TextInputBuilder()
                .setCustomId('field_input_name')
                .setLabel('Nombre / Título del Campo')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(CONSTANTS.LIMITS.FIELD_NAME)
                .setRequired(true);

            const valInput = new TextInputBuilder()
                .setCustomId('field_input_value')
                .setLabel('Valor / Contenido del Campo')
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(CONSTANTS.LIMITS.FIELD_VALUE)
                .setRequired(true);

            const inlineInput = new TextInputBuilder()
                .setCustomId('field_input_inline')
                .setLabel('¿En la misma línea? (escribe "si" o "no")')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('no')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(valInput),
                new ActionRowBuilder().addComponents(inlineInput)
            );

            return interaction.showModal(modal);
        }

        // 6. Limpiar campos
        if (customId.startsWith('embed_btn_clearfields_')) {
            session.data.fields = [];
            this.sessions.set(userId, session);
            const { embed, components } = this.renderPanel(userId);
            return interaction.update({ embeds: [embed], components: components });
        }

        // 7. Alternar Timestamp
        if (customId.startsWith('embed_btn_toggle_time_')) {
            session.data.timestamp = !session.data.timestamp;
            this.sessions.set(userId, session);
            const { embed, components } = this.renderPanel(userId);
            return interaction.update({ embeds: [embed], components: components });
        }

        // 8. Refrescar / Volver
        if (customId.startsWith('embed_btn_refresh_')) {
            const { embed, components } = this.renderPanel(userId);
            return interaction.update({
                content: MESSAGES.EMBED_BUILDER.PANEL_HEADER,
                embeds: [embed],
                components: components
            });
        }

        // 9. Enviar Embed al Canal
        if (customId.startsWith('embed_btn_send_')) {
            const targetChannelId = session.targetChannelId;
            const targetChannel = interaction.guild.channels.cache.get(targetChannelId) || await interaction.guild.channels.fetch(targetChannelId).catch(() => null);

            if (!targetChannel) {
                return interaction.reply({
                    content: MESSAGES.ERRORS.CHANNEL_NOT_FOUND,
                    ephemeral: true
                });
            }

            try {
                // Construir el embed final
                const d = session.data;
                const finalEmbed = new EmbedBuilder().setColor(d.color || COLORS.PRIMARY);
                if (d.title) finalEmbed.setTitle(d.title);
                if (d.description) finalEmbed.setDescription(d.description);
                if (d.image) finalEmbed.setImage(d.image);
                if (d.thumbnail) finalEmbed.setThumbnail(d.thumbnail);
                if (d.footer) finalEmbed.setFooter({ text: d.footer, iconURL: d.footerIcon || undefined });
                if (d.author) finalEmbed.setAuthor({ name: d.author, iconURL: d.authorIcon || undefined });
                if (d.timestamp) finalEmbed.setTimestamp();
                if (d.fields && d.fields.length > 0) {
                    d.fields.forEach(f => finalEmbed.addFields({ name: f.name, value: f.value, inline: f.inline }));
                }

                await targetChannel.send({ embeds: [finalEmbed] });

                // Cerrar sesión
                this.sessions.delete(userId);

                return interaction.update({
                    content: MESSAGES.EMBED_BUILDER.SENT_SUCCESS(targetChannelId),
                    embeds: [],
                    components: []
                });
            } catch (error) {
                Logger.error(`Error al enviar embed al canal ${targetChannelId}: ${error.message}`);
                return interaction.reply({
                    content: `${EMOJIS.ERROR} Error al enviar el mensaje al canal: ${error.message}`,
                    ephemeral: true
                });
            }
        }

        // 10. Cancelar
        if (customId.startsWith('embed_btn_cancel_')) {
            this.sessions.delete(userId);
            return interaction.update({
                content: MESSAGES.EMBED_BUILDER.CANCELLED,
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Maneja el envío de Modals
     */
    async handleModalSubmit(interaction) {
        const customId = interaction.customId;
        const userId = interaction.user.id;
        const session = this.sessions.get(userId);

        if (!session) {
            return interaction.reply({
                content: MESSAGES.EMBED_BUILDER.SESSION_EXPIRED,
                ephemeral: true
            });
        }

        // Modal de Texto
        if (customId.startsWith('embed_modal_text_')) {
            const title = interaction.fields.getTextInputValue('embed_input_title') || null;
            const description = interaction.fields.getTextInputValue('embed_input_description');

            session.data.title = title;
            session.data.description = description;
            this.sessions.set(userId, session);

            const { embed, components } = this.renderPanel(userId);
            return interaction.update({
                content: MESSAGES.EMBED_BUILDER.PANEL_HEADER,
                embeds: [embed],
                components: components
            });
        }

        // Modal de Imágenes
        if (customId.startsWith('embed_modal_images_')) {
            const image = interaction.fields.getTextInputValue('embed_input_image') || null;
            const thumb = interaction.fields.getTextInputValue('embed_input_thumb') || null;

            session.data.image = image;
            session.data.thumbnail = thumb;
            this.sessions.set(userId, session);

            const { embed, components } = this.renderPanel(userId);
            return interaction.update({
                content: MESSAGES.EMBED_BUILDER.PANEL_HEADER,
                embeds: [embed],
                components: components
            });
        }

        // Modal de Color Hexadecimal
        if (customId.startsWith('embed_modal_custom_hex_')) {
            const hex = interaction.fields.getTextInputValue('embed_input_hex');
            session.data.color = EmbedHelper.parseHexColor(hex);
            this.sessions.set(userId, session);

            const { embed, components } = this.renderPanel(userId);
            return interaction.update({
                content: MESSAGES.EMBED_BUILDER.PANEL_HEADER,
                embeds: [embed],
                components: components
            });
        }

        // Modal de Metadatos (Autor y Footer)
        if (customId.startsWith('embed_modal_meta_')) {
            const author = interaction.fields.getTextInputValue('embed_input_author') || null;
            const authorIcon = interaction.fields.getTextInputValue('embed_input_author_icon') || null;
            const footer = interaction.fields.getTextInputValue('embed_input_footer') || null;
            const footerIcon = interaction.fields.getTextInputValue('embed_input_footer_icon') || null;

            session.data.author = author;
            session.data.authorIcon = authorIcon;
            session.data.footer = footer;
            session.data.footerIcon = footerIcon;
            this.sessions.set(userId, session);

            const { embed, components } = this.renderPanel(userId);
            return interaction.update({
                content: MESSAGES.EMBED_BUILDER.PANEL_HEADER,
                embeds: [embed],
                components: components
            });
        }

        // Modal de Añadir Campo
        if (customId.startsWith('embed_modal_addfield_')) {
            const name = interaction.fields.getTextInputValue('field_input_name');
            const value = interaction.fields.getTextInputValue('field_input_value');
            const inlineRaw = interaction.fields.getTextInputValue('field_input_inline') || 'no';
            const inline = ['si', 'yes', 'true', '1', 's'].includes(inlineRaw.toLowerCase().trim());

            session.data.fields.push({ name, value, inline });
            this.sessions.set(userId, session);

            const { embed, components } = this.renderPanel(userId);
            return interaction.update({
                content: MESSAGES.EMBED_BUILDER.PANEL_HEADER,
                embeds: [embed],
                components: components
            });
        }
    }

    /**
     * Maneja la selección en menús desplegables (Colores y Canales)
     */
    async handleSelectMenu(interaction) {
        const customId = interaction.customId;
        const userId = interaction.user.id;
        const session = this.sessions.get(userId);

        if (!session) {
            return interaction.reply({
                content: MESSAGES.EMBED_BUILDER.SESSION_EXPIRED,
                ephemeral: true
            });
        }

        // Menú de colores rápidos
        if (customId.startsWith('embed_select_color_')) {
            const selectedColor = interaction.values[0];
            session.data.color = selectedColor;
            this.sessions.set(userId, session);

            const { embed, components } = this.renderPanel(userId);
            return interaction.update({
                content: MESSAGES.EMBED_BUILDER.PANEL_HEADER,
                embeds: [embed],
                components: components
            });
        }

        // Selector de Canal de Destino
        if (customId.startsWith('embed_menu_channel_')) {
            const selectedChannelId = interaction.values[0];
            session.targetChannelId = selectedChannelId;
            this.sessions.set(userId, session);

            const { embed, components } = this.renderPanel(userId);
            return interaction.update({
                content: `${MESSAGES.EMBED_BUILDER.PANEL_HEADER}\n\n${EMOJIS.CHANNEL} **Canal de destino seleccionado:** <#${selectedChannelId}>`,
                embeds: [embed],
                components: components
            });
        }
    }
}

module.exports = new EmbedManager();
