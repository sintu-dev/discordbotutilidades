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

class ConfigManager {
    /**
     * Renderiza el panel interactivo de configuración del servidor
     */
    buildDashboard(guild, userId) {
        const guildData = db.getGuild(guild.id);

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`⚙️ Panel de Configuración — ${guild.name}`)
            .setDescription(
                `Administra todos los ajustes del bot en este servidor usando los controles interactivos de abajo:\n\n` +
                `🔤 **Prefijo actual:** \`${guildData.prefix || '!'}\`\n` +
                `💡 **Canal de Sugerencias:** ${guildData.suggestionsChannel ? `<#${guildData.suggestionsChannel}>` : '`No configurado`'}\n` +
                `📢 **Canal de Anuncios:** ${guildData.announcementsChannel ? `<#${guildData.announcementsChannel}>` : '`No configurado`'}`
            )
            .setFooter({ text: `Usa los botones y menús para modificar los ajustes al instante` })
            .setTimestamp();

        // Fila 1: Botón de cambio de prefijo y reset
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`config_btn_prefix_modal_${userId}`)
                .setLabel('Cambiar Prefijo (Modal)')
                .setEmoji('🔤')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`config_btn_refresh_${userId}`)
                .setLabel('Actualizar Panel')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary)
        );

        // Fila 2: Selector de canal de sugerencias
        const row2 = new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(`config_menu_suggestions_${userId}`)
                .setPlaceholder('💡 Asignar Canal de Sugerencias')
                .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        );

        // Fila 3: Selector de canal de anuncios
        const row3 = new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(`config_menu_announcements_${userId}`)
                .setPlaceholder('📢 Asignar Canal de Anuncios')
                .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        );

        return { embed, components: [row1, row2, row3] };
    }

    /**
     * Envía el panel de configuración al usuario
     */
    async sendDashboard(context) {
        const user = context.user || context.author;
        const { embed, components } = this.buildDashboard(context.guild, user.id);

        if (context.isChatInputCommand && context.isChatInputCommand()) {
            return context.reply({ embeds: [embed], components: components, ephemeral: true });
        } else {
            return context.reply({ embeds: [embed], components: components });
        }
    }

    /**
     * Maneja las interacciones de botones de configuración
     */
    async handleButton(interaction) {
        const customId = interaction.customId;
        if (!customId.startsWith('config_btn_')) return;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: MESSAGES.ERRORS.NO_PERMISSION,
                ephemeral: true
            });
        }

        // Modal de cambio de prefijo
        if (customId.startsWith('config_btn_prefix_modal_')) {
            const modal = new ModalBuilder()
                .setCustomId(`config_modal_prefix_${interaction.user.id}`)
                .setTitle('🔤 Cambiar Prefijo del Bot');

            const prefixInput = new TextInputBuilder()
                .setCustomId('config_input_prefix')
                .setLabel('Nuevo Símbolo de Prefijo (Ej: !, ., $, ?)')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(5)
                .setRequired(true)
                .setValue(db.getGuild(interaction.guild.id).prefix || '!');

            modal.addComponents(new ActionRowBuilder().addComponents(prefixInput));
            return interaction.showModal(modal);
        }

        // Refrescar panel
        if (customId.startsWith('config_btn_refresh_')) {
            const { embed, components } = this.buildDashboard(interaction.guild, interaction.user.id);
            return interaction.update({ embeds: [embed], components: components });
        }
    }

    /**
     * Maneja el formulario Modal de prefijo
     */
    async handleModalSubmit(interaction) {
        const customId = interaction.customId;
        if (!customId.startsWith('config_modal_prefix_')) return;

        const newPrefix = interaction.fields.getTextInputValue('config_input_prefix').trim();
        db.updateGuild(interaction.guild.id, { prefix: newPrefix });

        const { embed, components } = this.buildDashboard(interaction.guild, interaction.user.id);
        return interaction.update({
            content: `${EMOJIS.SUCCESS} ¡Prefijo del servidor cambiado exitosamente a: \`${newPrefix}\`!`,
            embeds: [embed],
            components: components
        });
    }

    /**
     * Maneja la selección de canales en los select menus de configuración
     */
    async handleSelectMenu(interaction) {
        const customId = interaction.customId;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: MESSAGES.ERRORS.NO_PERMISSION,
                ephemeral: true
            });
        }

        const selectedChannelId = interaction.values[0];

        // Canal de sugerencias
        if (customId.startsWith('config_menu_suggestions_')) {
            db.updateGuild(interaction.guild.id, { suggestionsChannel: selectedChannelId });
            const { embed, components } = this.buildDashboard(interaction.guild, interaction.user.id);
            return interaction.update({
                content: `${EMOJIS.SUCCESS} Canal de sugerencias asignado a: <#${selectedChannelId}>`,
                embeds: [embed],
                components: components
            });
        }

        // Canal de anuncios
        if (customId.startsWith('config_menu_announcements_')) {
            db.updateGuild(interaction.guild.id, { announcementsChannel: selectedChannelId });
            const { embed, components } = this.buildDashboard(interaction.guild, interaction.user.id);
            return interaction.update({
                content: `${EMOJIS.SUCCESS} Canal de anuncios asignado a: <#${selectedChannelId}>`,
                embeds: [embed],
                components: components
            });
        }
    }
}

module.exports = new ConfigManager();
