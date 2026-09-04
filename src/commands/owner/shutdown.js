const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const Logger = require('../../utils/logger');
const config = require('../../config/config');
const { COLORS, EMOJIS } = require('../../variables');

module.exports = {
    name: 'shutdown',
    description: 'Guarda los datos y apaga el bot de forma segura con confirmación interactiva',
    category: 'owner',
    aliases: ['apagar', 'stop', 'salir'],
    usage: '!shutdown',
    userPermissions: [],
    botPermissions: [],
    data: new SlashCommandBuilder()
        .setName('shutdown')
        .setDescription('Guarda los datos y apaga el bot de forma segura (Solo Propietario)'),

    async executeSlash(client, interaction) {
        if (!this.isOwner(interaction.user.id)) {
            return interaction.reply({
                content: `${EMOJIS.ERROR} Este comando está reservado únicamente para el propietario del bot.`,
                ephemeral: true
            });
        }

        return this.sendConfirmation(interaction);
    },

    async executePrefix(client, message, args) {
        if (!this.isOwner(message.author.id)) {
            return message.reply({
                content: `${EMOJIS.ERROR} Solo el dueño del bot puede apagar el proceso.`
            });
        }

        return this.sendConfirmation(message);
    },

    async sendConfirmation(context) {
        const user = context.user || context.author;

        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle(`⚠️ Confirmación de Apagado`)
            .setDescription(
                `¿Estás seguro de que deseas apagar el bot?\n\n` +
                `• Todos los estados y bases de datos locales serán guardados automáticamente.\n` +
                `• El proceso de Node.js se detendrá de inmediato.`
            )
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`shutdown_confirm_${user.id}`)
                .setLabel('Confirmar Apagado')
                .setEmoji('⚡')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`shutdown_cancel_${user.id}`)
                .setLabel('Cancelar')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary)
        );

        if (context.isChatInputCommand && context.isChatInputCommand()) {
            return context.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else {
            return context.reply({ embeds: [embed], components: [row] });
        }
    },

    isOwner(userId) {
        const ownerId = config.client.ownerId || process.env.OWNER_ID;
        return userId === ownerId;
    }
};