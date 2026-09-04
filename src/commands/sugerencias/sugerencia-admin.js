const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const db = require('../../database');
const suggestionManager = require('../../components/suggestionManager');
const { COLORS, EMOJIS, MESSAGES } = require('../../variables');
const Logger = require('../../utils/logger');

module.exports = {
    name: 'sugerencia-admin',
    description: 'Acepta, rechaza o modera sugerencias con panel interactivo o comando directo',
    category: 'sugerencias',
    aliases: ['sug-admin', 'sugadmin', 'mod-sugerencia'],
    usage: '!sugerencia-admin [ID_sugerencia] [aceptar|rechazar|considerar] [motivo]',
    userPermissions: ['ManageGuild'],
    botPermissions: ['SendMessages', 'EmbedLinks'],
    data: new SlashCommandBuilder()
        .setName('sugerencia-admin')
        .setDescription('Administra el estado de una sugerencia existente')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID de la sugerencia (opcional; si se omite, se abre el panel interactivo)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('estado')
                .setDescription('El nuevo estado de la propuesta')
                .setRequired(false)
                .addChoices(
                    { name: 'Aceptar', value: 'ACCEPTED' },
                    { name: 'Rechazar', value: 'REJECTED' },
                    { name: 'En consideración', value: 'CONSIDERED' }
                )
        )
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('Motivo o comentario del staff')
                .setRequired(false)
        ),

    async executeSlash(client, interaction) {
        const sugId = interaction.options.getString('id')?.trim();
        const status = interaction.options.getString('estado');
        const reason = interaction.options.getString('motivo') || 'Sin motivo especificado.';

        // Si no se pasaron argumentos, mostrar el panel interactivo
        if (!sugId || !status) {
            return this.sendAdminPanel(interaction);
        }

        return this.processStatusChange(interaction, sugId, status, reason, true);
    },

    async executePrefix(client, message, args) {
        if (args.length < 2) {
            return this.sendAdminPanel(message);
        }

        const sugId = args[0].trim();
        const statusRaw = args[1].toLowerCase();
        const reason = args.slice(2).join(' ') || 'Sin motivo especificado.';

        let status = 'ACCEPTED';
        if (statusRaw.includes('rechaz') || statusRaw === 'no' || statusRaw === 'deny' || statusRaw === 'reject') {
            status = 'REJECTED';
        } else if (statusRaw.includes('consid') || statusRaw === 'estudio') {
            status = 'CONSIDERED';
        } else if (statusRaw.includes('acep') || statusRaw === 'si' || statusRaw === 'accept') {
            status = 'ACCEPTED';
        } else {
            return message.reply({
                content: `${EMOJIS.ERROR} Estado no válido. Usa: \`aceptar\`, \`rechazar\` o \`considerar\`.`
            });
        }

        return this.processStatusChange(message, sugId, status, reason, false);
    },

    async sendAdminPanel(context) {
        const user = context.user || context.author;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`🛡️ Panel de Moderación de Sugerencias`)
            .setDescription(
                `Administra las sugerencias comunitarias de forma rápida e interactiva.\n\n` +
                `💡 **Opciones disponibles:**\n` +
                `• Puedes pulsar el botón **Gestionar** directamente en el mensaje de cualquier sugerencia.\n` +
                `• O usa el botón **Moderar por ID** para ingresar el ID de una sugerencia y resolverla con un formulario modal.`
            )
            .setFooter({ text: `Panel solicitado por ${user.tag || user.username}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`sug_btn_admin_direct_modal_${user.id}`)
                .setLabel('Moderar por ID (Formulario)')
                .setEmoji('⚙️')
                .setStyle(ButtonStyle.Primary)
        );

        if (context.isChatInputCommand && context.isChatInputCommand()) {
            return context.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else {
            return context.reply({ embeds: [embed], components: [row] });
        }
    },

    async processStatusChange(context, sugId, status, reason, isSlash) {
        const sug = db.getSuggestion(sugId);
        const user = context.user || context.author;

        if (!sug) {
            const errorMsg = `${EMOJIS.ERROR} No se encontró ninguna sugerencia con el ID \`${sugId}\`.`;
            if (isSlash) return context.reply({ content: errorMsg, ephemeral: true });
            return context.reply({ content: errorMsg });
        }

        sug.status = status;
        sug.statusReason = `${reason} — *(Por ${user.tag || user.username})*`;
        sug.moderatorId = user.id;

        db.saveSuggestion(sug);

        // Actualizar el mensaje de la sugerencia en el canal
        try {
            const guild = context.guild;
            const channel = guild.channels.cache.get(sug.channelId) || await guild.channels.fetch(sug.channelId).catch(() => null);
            if (channel && sug.messageId) {
                const message = await channel.messages.fetch(sug.messageId).catch(() => null);
                if (message) {
                    const embed = suggestionManager.buildEmbed(sug);
                    const components = suggestionManager.buildComponents(sug);
                    await message.edit({ embeds: [embed], components: components }).catch(() => {});
                }
            }
        } catch (e) {
            Logger.warn(`No se pudo actualizar el mensaje de la sugerencia: ${e.message}`);
        }

        const successMsg = `${EMOJIS.SUCCESS} La sugerencia **${sugId}** ha sido actualizada a **${status}**.`;
        if (isSlash) {
            return context.reply({ content: successMsg, ephemeral: true });
        } else {
            return context.reply({ content: successMsg });
        }
    }
};
