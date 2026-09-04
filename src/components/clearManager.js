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
const Logger = require('../utils/logger');

class ClearManager {
    /**
     * Envía el panel interactivo de purga de mensajes
     */
    async sendPrompt(context) {
        const user = context.user || context.author;

        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle(`🧹 Limpieza Rápida del Chat`)
            .setDescription(
                `Selecciona una cantidad predeterminada de mensajes para eliminar en este canal o pulsa **Cantidad Personalizada** para ingresar un número exacto (1 a 100):`
            )
            .setFooter({ text: `Acción solicitada por ${user.tag || user.username}` })
            .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`clear_btn_5_${user.id}`)
                .setLabel('5 Mensajes')
                .setEmoji('🧹')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`clear_btn_10_${user.id}`)
                .setLabel('10 Mensajes')
                .setEmoji('🧹')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`clear_btn_25_${user.id}`)
                .setLabel('25 Mensajes')
                .setEmoji('🧹')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`clear_btn_50_${user.id}`)
                .setLabel('50 Mensajes')
                .setEmoji('🧹')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`clear_btn_100_${user.id}`)
                .setLabel('100 Mensajes')
                .setEmoji('💥')
                .setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`clear_btn_custom_modal_${user.id}`)
                .setLabel('Cantidad Personalizada (Modal)')
                .setEmoji('⚙️')
                .setStyle(ButtonStyle.Success)
        );

        if (context.isChatInputCommand && context.isChatInputCommand()) {
            return context.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
        } else {
            return context.reply({ embeds: [embed], components: [row1, row2] });
        }
    }

    /**
     * Maneja las interacciones de botones de limpieza
     */
    async handleButton(interaction) {
        const customId = interaction.customId;
        if (!customId.startsWith('clear_btn_')) return;

        // Validar permisos
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: MESSAGES.ERRORS.NO_PERMISSION,
                ephemeral: true
            });
        }

        // Modal para cantidad personalizada
        if (customId.startsWith('clear_btn_custom_modal_')) {
            const modal = new ModalBuilder()
                .setCustomId(`clear_modal_${interaction.channel.id}_${interaction.user.id}`)
                .setTitle('🧹 Limpieza Personalizada');

            const amountInput = new TextInputBuilder()
                .setCustomId('clear_input_amount')
                .setLabel('Cantidad de Mensajes a Eliminar (1 a 100) *')
                .setPlaceholder('Ej: 15')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(3)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
            return interaction.showModal(modal);
        }

        // Botones con cantidad fija
        const parts = customId.split('_');
        const amount = parseInt(parts[2], 10);

        if (isNaN(amount) || amount < 1 || amount > 100) return;

        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);
            return interaction.reply({
                content: `${EMOJIS.SUCCESS} Se han eliminado **${deleted.size}** mensajes exitosamente.`,
                ephemeral: true
            });
        } catch (error) {
            Logger.error(`Error en clear button: ${error.message}`);
            return interaction.reply({
                content: `${EMOJIS.ERROR} Error al eliminar mensajes: ${error.message}`,
                ephemeral: true
            });
        }
    }

    /**
     * Maneja el formulario Modal de cantidad personalizada
     */
    async handleModalSubmit(interaction) {
        const customId = interaction.customId;
        if (!customId.startsWith('clear_modal_')) return;

        const rawAmount = interaction.fields.getTextInputValue('clear_input_amount');
        const amount = parseInt(rawAmount.trim(), 10);

        if (isNaN(amount) || amount < 1 || amount > 100) {
            return interaction.reply({
                content: `${EMOJIS.WARNING} Debes ingresar un número válido entre 1 y 100.`,
                ephemeral: true
            });
        }

        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);
            return interaction.reply({
                content: `${EMOJIS.SUCCESS} Se han eliminado **${deleted.size}** mensajes exitosamente.`,
                ephemeral: true
            });
        } catch (error) {
            Logger.error(`Error en clear modal: ${error.message}`);
            return interaction.reply({
                content: `${EMOJIS.ERROR} Error al eliminar mensajes: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

module.exports = new ClearManager();
