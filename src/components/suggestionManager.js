const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    PermissionsBitField
} = require('discord.js');

const db = require('../database');
const { COLORS, EMOJIS, MESSAGES } = require('../variables');
const Logger = require('../utils/logger');

class SuggestionManager {
    /**
     * Construye el Modal emergente interactivo para redactar una sugerencia
     */
    createModal(userId) {
        const modal = new ModalBuilder()
            .setCustomId(`sug_modal_create_${userId}`)
            .setTitle('💡 Redactar Nueva Sugerencia');

        const titleInput = new TextInputBuilder()
            .setCustomId('sug_input_title')
            .setLabel('Título / Resumen de la Idea (Opcional)')
            .setPlaceholder('Ej: Añadir canal de memes o bots de música')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(100)
            .setRequired(false);

        const descInput = new TextInputBuilder()
            .setCustomId('sug_input_desc')
            .setLabel('Descripción / Propuesta Detallada *')
            .setPlaceholder('Explica tu idea detalladamente y por qué beneficiaría a la comunidad...')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(2000)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput)
        );

        return modal;
    }

    /**
     * Envía un mensaje interactivo con botón para abrir el formulario modal de sugerencia
     */
    async sendPrompt(context) {
        const user = context.user || context.author;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${EMOJIS.SUGGESTION} Envío de Sugerencias`)
            .setDescription(
                `¿Tienes alguna idea para mejorar el servidor?\n\n` +
                `Haz clic en el botón **Escribir Sugerencia** de abajo para abrir el **formulario emergente** (Modal) y enviarla directamente a votación comunitaria.`
            )
            .setFooter({ text: `Iniciado por ${user.tag || user.username}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`sug_btn_create_${user.id}`)
                .setLabel('Escribir Sugerencia (Formulario)')
                .setEmoji('💡')
                .setStyle(ButtonStyle.Success)
        );

        if (context.isChatInputCommand && context.isChatInputCommand()) {
            return context.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else {
            return context.reply({ embeds: [embed], components: [row] });
        }
    }

    /**
     * Envía un selector de canales para configurar el canal de sugerencias
     */
    async sendSetupMenu(context) {
        const user = context.user || context.author;
        const guildData = db.getGuild(context.guild.id);
        const currentChannel = guildData.suggestionsChannel ? `<#${guildData.suggestionsChannel}>` : '`No configurado`';

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`⚙️ Configuración del Canal de Sugerencias`)
            .setDescription(
                `Canal actual: ${currentChannel}\n\n` +
                `Selecciona en el menú desplegable de abajo el canal de texto donde deseas que el bot publique todas las sugerencias comunitarias:`
            )
            .setTimestamp();

        const menu = new ChannelSelectMenuBuilder()
            .setCustomId(`sug_menu_setup_channel_${user.id}`)
            .setPlaceholder('📌 Elige el canal de sugerencias')
            .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

        const row = new ActionRowBuilder().addComponents(menu);

        if (context.isChatInputCommand && context.isChatInputCommand()) {
            return context.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else {
            return context.reply({ embeds: [embed], components: [row] });
        }
    }

    /**
     * Crea y publica una nueva sugerencia
     */
    async createSuggestion(guild, author, content, title = null) {
        const guildData = db.getGuild(guild.id);
        const channelId = guildData.suggestionsChannel;

        if (!channelId) {
            return {
                success: false,
                message: MESSAGES.SUGGESTIONS.NO_CHANNEL_CONFIGURED
            };
        }

        const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) {
            return {
                success: false,
                message: `${EMOJIS.ERROR} El canal de sugerencias configurado (<#${channelId}>) no fue encontrado.`
            };
        }

        const suggestionId = `sug_${Date.now()}`;
        const formattedContent = title ? `**${title}**\n\n${content}` : content;

        // Datos iniciales de la sugerencia
        const suggestionData = {
            id: suggestionId,
            guildId: guild.id,
            channelId: channel.id,
            messageId: null,
            authorId: author.id,
            authorTag: author.tag || author.username,
            authorAvatar: author.displayAvatarURL({ dynamic: true }),
            content: formattedContent,
            status: 'PENDING', // PENDING, ACCEPTED, REJECTED, CONSIDERED
            statusReason: null,
            moderatorId: null,
            upvotes: [],
            downvotes: [],
            createdAt: new Date().toISOString()
        };

        const embed = this.buildEmbed(suggestionData);
        const components = this.buildComponents(suggestionData);

        const msg = await channel.send({ embeds: [embed], components: components });
        suggestionData.messageId = msg.id;

        // Guardar en la base de datos persistente
        db.saveSuggestion(suggestionData);

        // Crear hilo de debate si es posible
        try {
            if (channel.type === ChannelType.GuildText) {
                await msg.startThread({
                    name: `Debate - Sugerencia #${suggestionId.slice(-4)}`,
                    autoArchiveDuration: 1440 // 24 horas
                });
            }
        } catch (e) {
            // Ignorar si no hay permisos de crear hilos
        }

        return {
            success: true,
            channelId: channel.id,
            messageId: msg.id,
            suggestionId: suggestionId
        };
    }

    /**
     * Construye el Embed visual de una sugerencia según su estado y votos
     */
    buildEmbed(sug) {
        let color = COLORS.SUGGESTION_PENDING;
        let statusText = `${EMOJIS.STATUS_PENDING} **Estado:** Pendiente de revisión`;

        if (sug.status === 'ACCEPTED') {
            color = COLORS.SUGGESTION_ACCEPTED;
            statusText = `${EMOJIS.STATUS_ACCEPTED} **Estado:** Aceptada`;
        } else if (sug.status === 'REJECTED') {
            color = COLORS.SUGGESTION_REJECTED;
            statusText = `${EMOJIS.STATUS_REJECTED} **Estado:** Rechazada`;
        } else if (sug.status === 'CONSIDERED') {
            color = COLORS.SUGGESTION_CONSIDERED;
            statusText = `${EMOJIS.STATUS_CONSIDERED} **Estado:** En consideración`;
        }

        const totalUp = sug.upvotes.length;
        const totalDown = sug.downvotes.length;
        const totalVotes = totalUp + totalDown;
        const upPercentage = totalVotes === 0 ? 50 : Math.round((totalUp / totalVotes) * 100);

        // Barra de progreso visual
        const barLength = 10;
        const filled = Math.round((upPercentage / 100) * barLength);
        const bar = '🟩'.repeat(filled) + '🟥'.repeat(barLength - filled);

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: `Sugerencia de ${sug.authorTag}`,
                iconURL: sug.authorAvatar
            })
            .setDescription(`>>> ${sug.content}`)
            .addFields(
                { name: '📋 Estado', value: statusText, inline: true },
                { name: '📊 Votos', value: `${EMOJIS.THUMBS_UP} **${totalUp}** (${upPercentage}%) | ${EMOJIS.THUMBS_DOWN} **${totalDown}**\n${bar}`, inline: false }
            )
            .setFooter({ text: `ID: ${sug.id} • Persistente` })
            .setTimestamp(new Date(sug.createdAt));

        if (sug.statusReason) {
            embed.addFields({
                name: '💬 Respuesta del Equipo / Staff',
                value: sug.statusReason,
                inline: false
            });
        }

        return embed;
    }

    /**
     * Construye los botones de votación y gestión
     */
    buildComponents(sug) {
        const isClosed = sug.status !== 'PENDING';

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`sug_vote_up_${sug.id}`)
                .setLabel(`Apoyar (${sug.upvotes.length})`)
                .setEmoji(EMOJIS.THUMBS_UP)
                .setStyle(ButtonStyle.Success)
                .setDisabled(isClosed),
            new ButtonBuilder()
                .setCustomId(`sug_vote_down_${sug.id}`)
                .setLabel(`En contra (${sug.downvotes.length})`)
                .setEmoji(EMOJIS.THUMBS_DOWN)
                .setStyle(ButtonStyle.Danger)
                .setDisabled(isClosed),
            new ButtonBuilder()
                .setCustomId(`sug_manage_${sug.id}`)
                .setLabel('Gestionar')
                .setEmoji(EMOJIS.SETTINGS)
                .setStyle(ButtonStyle.Secondary)
        );

        return [row];
    }

    /**
     * Maneja las interacciones de botones de sugerencias
     */
    async handleButton(interaction) {
        const customId = interaction.customId;

        // Abrir modal de creación de sugerencia
        if (customId.startsWith('sug_btn_create_')) {
            const modal = this.createModal(interaction.user.id);
            return interaction.showModal(modal);
        }

        // Abrir modal de moderación directa por ID (Desde panel administrativo)
        if (customId.startsWith('sug_btn_admin_direct_modal_')) {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) &&
                !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({
                    content: `${EMOJIS.ERROR} Solo los administradores o moderadores pueden gestionar sugerencias.`,
                    ephemeral: true
                });
            }

            const modal = new ModalBuilder()
                .setCustomId(`sug_modal_admin_direct_${interaction.user.id}`)
                .setTitle('🛡️ Moderar Sugerencia por ID');

            const idInput = new TextInputBuilder()
                .setCustomId('sug_admin_input_id')
                .setLabel('ID de la Sugerencia *')
                .setPlaceholder('Ej: sug_1788532187614')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(50)
                .setRequired(true);

            const statusInput = new TextInputBuilder()
                .setCustomId('sug_admin_input_status')
                .setLabel('Estado: Aceptar / Rechazar / Considerar *')
                .setPlaceholder('Escribe: Aceptar, Rechazar o Considerar')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(20)
                .setRequired(true);

            const reasonInput = new TextInputBuilder()
                .setCustomId('sug_admin_input_reason')
                .setLabel('Motivo / Respuesta del Staff (Opcional)')
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(1000)
                .setRequired(false)
                .setPlaceholder('Explica el motivo de la decisión tomada...');

            modal.addComponents(
                new ActionRowBuilder().addComponents(idInput),
                new ActionRowBuilder().addComponents(statusInput),
                new ActionRowBuilder().addComponents(reasonInput)
            );

            return interaction.showModal(modal);
        }

        // Votar a favor
        if (customId.startsWith('sug_vote_up_')) {
            const sugId = customId.replace('sug_vote_up_', '');
            return this.processVote(interaction, sugId, 'UP');
        }

        // Votar en contra
        if (customId.startsWith('sug_vote_down_')) {
            const sugId = customId.replace('sug_vote_down_', '');
            return this.processVote(interaction, sugId, 'DOWN');
        }

        // Gestionar estado de sugerencia (Solo Staff con permisos)
        if (customId.startsWith('sug_manage_')) {
            const sugId = customId.replace('sug_manage_', '');
            
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) &&
                !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({
                    content: `${EMOJIS.ERROR} Solo los administradores o moderadores pueden gestionar las sugerencias.`,
                    ephemeral: true
                });
            }

            // Mostrar botones de acción rápida para el staff
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`sug_set_ACCEPTED_${sugId}`)
                    .setLabel('Aceptar')
                    .setEmoji(EMOJIS.CHECK)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`sug_set_REJECTED_${sugId}`)
                    .setLabel('Rechazar')
                    .setEmoji(EMOJIS.CROSS)
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`sug_set_CONSIDERED_${sugId}`)
                    .setLabel('En consideración')
                    .setEmoji(EMOJIS.STATUS_CONSIDERED)
                    .setStyle(ButtonStyle.Primary)
            );

            return interaction.reply({
                content: `### ${EMOJIS.SETTINGS} Gestión de Sugerencia \`${sugId}\`\nSelecciona el nuevo estado para esta sugerencia:`,
                components: [row],
                ephemeral: true
            });
        }

        // Seleccionar estado (Aceptar / Rechazar / Considerar)
        if (customId.startsWith('sug_set_')) {
            const raw = customId.replace('sug_set_', '');
            const firstUnderscore = raw.indexOf('_');
            const newStatus = raw.substring(0, firstUnderscore); // ACCEPTED, REJECTED, CONSIDERED
            const sugId = raw.substring(firstUnderscore + 1);

            // Abrir modal para ingresar motivo / respuesta
            const modal = new ModalBuilder()
                .setCustomId(`sug_modal_status_${newStatus}_${sugId}`)
                .setTitle('Motivo de la Decisión');

            const reasonInput = new TextInputBuilder()
                .setCustomId('sug_reason_input')
                .setLabel('Razón / Respuesta del Staff (Opcional)')
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(1000)
                .setRequired(false)
                .setPlaceholder('Explica el motivo por el cual se tomó esta decisión...');

            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            return interaction.showModal(modal);
        }
    }

    /**
     * Procesa y registra un voto evitando duplicados
     */
    async processVote(interaction, sugId, voteType) {
        const userId = interaction.user.id;
        const sug = db.getSuggestion(sugId);

        if (!sug) {
            return interaction.reply({
                content: `${EMOJIS.ERROR} No se encontró la sugerencia en la base de datos.`,
                ephemeral: true
            });
        }

        if (sug.status !== 'PENDING') {
            return interaction.reply({
                content: `${EMOJIS.WARNING} Esta sugerencia ya ha sido cerrada y no acepta más votos.`,
                ephemeral: true
            });
        }

        if (!Array.isArray(sug.upvotes)) sug.upvotes = [];
        if (!Array.isArray(sug.downvotes)) sug.downvotes = [];

        const hasUpvoted = sug.upvotes.includes(userId);
        const hasDownvoted = sug.downvotes.includes(userId);

        if (voteType === 'UP') {
            if (hasUpvoted) {
                // Quitar voto (toggle)
                sug.upvotes = sug.upvotes.filter(id => id !== userId);
            } else {
                // Añadir voto a favor y quitar en contra si existía
                sug.upvotes.push(userId);
                sug.downvotes = sug.downvotes.filter(id => id !== userId);
            }
        } else if (voteType === 'DOWN') {
            if (hasDownvoted) {
                // Quitar voto (toggle)
                sug.downvotes = sug.downvotes.filter(id => id !== userId);
            } else {
                // Añadir voto en contra y quitar a favor si existía
                sug.downvotes.push(userId);
                sug.upvotes = sug.upvotes.filter(id => id !== userId);
            }
        }

        // Guardar cambios
        db.saveSuggestion(sug);

        // Actualizar mensaje visualmente
        const embed = this.buildEmbed(sug);
        const components = this.buildComponents(sug);

        await interaction.update({ embeds: [embed], components: components });
    }

    /**
     * Maneja el envío de Modals
     */
    async handleModalSubmit(interaction) {
        const customId = interaction.customId;

        // Modal de Crear Sugerencia
        if (customId.startsWith('sug_modal_create_')) {
            const title = interaction.fields.getTextInputValue('sug_input_title') || null;
            const desc = interaction.fields.getTextInputValue('sug_input_desc');

            const result = await this.createSuggestion(
                interaction.guild,
                interaction.user,
                desc,
                title
            );

            if (!result.success) {
                return interaction.reply({ content: result.message, ephemeral: true });
            }

            return interaction.reply({
                content: MESSAGES.SUGGESTIONS.CREATED_SUCCESS(result.channelId),
                ephemeral: true
            });
        }

        // Modal de Moderación Directa por ID (Panel Administrativo)
        if (customId.startsWith('sug_modal_admin_direct_')) {
            const sugId = interaction.fields.getTextInputValue('sug_admin_input_id').trim();
            const statusRaw = interaction.fields.getTextInputValue('sug_admin_input_status').toLowerCase().trim();
            const reason = interaction.fields.getTextInputValue('sug_admin_input_reason') || 'Sin motivo especificado.';

            let newStatus = 'ACCEPTED';
            if (statusRaw.includes('rechaz') || statusRaw === 'no' || statusRaw === 'deny' || statusRaw === 'reject') {
                newStatus = 'REJECTED';
            } else if (statusRaw.includes('consid') || statusRaw === 'estudio') {
                newStatus = 'CONSIDERED';
            } else if (statusRaw.includes('acep') || statusRaw === 'si' || statusRaw === 'accept') {
                newStatus = 'ACCEPTED';
            } else {
                return interaction.reply({
                    content: `${EMOJIS.ERROR} Estado no válido (\`${statusRaw}\`). Escribe: \`Aceptar\`, \`Rechazar\` o \`Considerar\`.`,
                    ephemeral: true
                });
            }

            const sug = db.getSuggestion(sugId);
            if (!sug) {
                return interaction.reply({ content: `${EMOJIS.ERROR} No se encontró ninguna sugerencia con el ID \`${sugId}\`.`, ephemeral: true });
            }

            sug.status = newStatus;
            sug.statusReason = `${reason} — *(Por ${interaction.user.tag || interaction.user.username})*`;
            sug.moderatorId = interaction.user.id;

            db.saveSuggestion(sug);

            try {
                const channel = interaction.guild.channels.cache.get(sug.channelId) || await interaction.guild.channels.fetch(sug.channelId).catch(() => null);
                if (channel && sug.messageId) {
                    const message = await channel.messages.fetch(sug.messageId).catch(() => null);
                    if (message) {
                        const embed = this.buildEmbed(sug);
                        const components = this.buildComponents(sug);
                        await message.edit({ embeds: [embed], components: components }).catch(() => {});
                    }
                }
            } catch (e) {
                Logger.warn(`No se pudo actualizar el mensaje de la sugerencia: ${e.message}`);
            }

            return interaction.reply({
                content: `${EMOJIS.SUCCESS} La sugerencia **${sugId}** ha sido actualizada al estado **${newStatus}** exitosamente.`,
                ephemeral: true
            });
        }

        // Modal de Estado / Motivo de Moderación
        if (customId.startsWith('sug_modal_status_')) {
            const raw = customId.replace('sug_modal_status_', '');
            const firstUnderscore = raw.indexOf('_');
            const newStatus = raw.substring(0, firstUnderscore);
            const sugId = raw.substring(firstUnderscore + 1);
            const reason = interaction.fields.getTextInputValue('sug_reason_input') || 'Sin motivo especificado.';

            const sug = db.getSuggestion(sugId);
            if (!sug) {
                return interaction.reply({ content: `${EMOJIS.ERROR} Sugerencia no encontrada.`, ephemeral: true });
            }

            sug.status = newStatus;
            sug.statusReason = `${reason} — *(Por ${interaction.user.tag || interaction.user.username})*`;
            sug.moderatorId = interaction.user.id;

            db.saveSuggestion(sug);

            // Actualizar el mensaje original de la sugerencia en el canal
            try {
                const channel = interaction.guild.channels.cache.get(sug.channelId) || await interaction.guild.channels.fetch(sug.channelId).catch(() => null);
                if (channel && sug.messageId) {
                    const message = await channel.messages.fetch(sug.messageId).catch(() => null);
                    if (message) {
                        const embed = this.buildEmbed(sug);
                        const components = this.buildComponents(sug);
                        await message.edit({ embeds: [embed], components: components }).catch(() => {});
                    }
                }
            } catch (e) {
                Logger.warn(`No se pudo actualizar el mensaje original de la sugerencia: ${e.message}`);
            }

            return interaction.reply({
                content: `${EMOJIS.SUCCESS} La sugerencia **${sugId}** ha sido actualizada al estado **${newStatus}** exitosamente.`,
                ephemeral: true
            });
        }
    }

    /**
     * Maneja el selector de canal para sugerencias
     */
    async handleSelectMenu(interaction) {
        const customId = interaction.customId;
        if (!customId.startsWith('sug_menu_setup_channel_')) return;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: MESSAGES.ERRORS.NO_PERMISSION,
                ephemeral: true
            });
        }

        const selectedChannelId = interaction.values[0];
        db.updateGuild(interaction.guild.id, { suggestionsChannel: selectedChannelId });

        return interaction.update({
            content: `${EMOJIS.SUCCESS} ¡Canal oficial de sugerencias configurado en <#${selectedChannelId}>!`,
            embeds: [],
            components: []
        });
    }
}

module.exports = new SuggestionManager();
