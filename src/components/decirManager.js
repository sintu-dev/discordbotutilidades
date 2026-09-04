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

class DecirManager {
    /**
     * Construye el Modal interactivo para redactar el mensaje a enviar
     */
    createModal(channelId, userId) {
        const modal = new ModalBuilder()
            .setCustomId(`decir_modal_${channelId}_${userId}`)
            .setTitle('💬 Enviar Mensaje como Bot');

        const messageInput = new TextInputBuilder()
            .setCustomId('decir_input_text')
            .setLabel('Mensaje / Contenido a Enviar *')
            .setPlaceholder('Escribe aquí el mensaje exacto que enviará el bot...')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(2000)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
        return modal;
    }

    /**
     * Envía un mensaje con botón para abrir el formulario modal
     */
    async sendPrompt(context, targetChannel) {
        const user = context.user || context.author;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`💬 Enviar Mensaje en #${targetChannel.name}`)
            .setDescription(
                `Canal de destino seleccionado: ${targetChannel}\n\n` +
                `Haz clic en el botón **Redactar Mensaje** para abrir el **formulario emergente** (Modal) y escribir el texto que enviará el bot.`
            )
            .setFooter({ text: `Iniciado por ${user.tag || user.username}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`decir_btn_modal_${targetChannel.id}_${user.id}`)
                .setLabel('Redactar Mensaje (Formulario)')
                .setEmoji('💬')
                .setStyle(ButtonStyle.Primary)
        );

        if (context.isChatInputCommand && context.isChatInputCommand()) {
            return context.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else {
            return context.reply({ embeds: [embed], components: [row] });
        }
    }

    /**
     * Maneja el clic en botones de decir
     */
    async handleButton(interaction) {
        const customId = interaction.customId;
        if (!customId.startsWith('decir_btn_modal_')) return;

        const parts = customId.replace('decir_btn_modal_', '').split('_');
        const channelId = parts[0];

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
     * Maneja el envío del formulario Modal
     */
    async handleModalSubmit(interaction) {
        const customId = interaction.customId;
        if (!customId.startsWith('decir_modal_')) return;

        const parts = customId.replace('decir_modal_', '').split('_');
        const channelId = parts[0];

        const targetChannel = interaction.guild.channels.cache.get(channelId) || await interaction.guild.channels.fetch(channelId).catch(() => null) || interaction.channel;
        if (!targetChannel) {
            return interaction.reply({
                content: MESSAGES.ERRORS.CHANNEL_NOT_FOUND,
                ephemeral: true
            });
        }

        const textToSend = interaction.fields.getTextInputValue('decir_input_text');

        try {
            await targetChannel.send(textToSend);
            return interaction.reply({
                content: `${EMOJIS.SUCCESS} ¡Mensaje enviado con éxito a ${targetChannel}!`,
                ephemeral: true
            });
        } catch (error) {
            Logger.error(`Error al enviar mensaje vía modal a ${targetChannel.id}: ${error.message}`);
            return interaction.reply({
                content: `${EMOJIS.ERROR} No se pudo enviar el mensaje: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

module.exports = new DecirManager();
