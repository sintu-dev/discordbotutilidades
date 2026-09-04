const { SlashCommandBuilder } = require('discord.js');
const suggestionManager = require('../../components/suggestionManager');
const { EMOJIS, MESSAGES } = require('../../variables');

module.exports = {
    name: 'sugerencia',
    description: 'Envía una sugerencia a la comunidad con formulario emergente (Modal) o texto directo',
    category: 'sugerencias',
    aliases: ['suggest', 'sug', 'proponer', 'sugerir'],
    usage: '!sugerencia [tu propuesta o idea] o simplemente !sugerencia',
    userPermissions: [],
    botPermissions: ['SendMessages', 'EmbedLinks', 'AddReactions'],
    data: new SlashCommandBuilder()
        .setName('sugerencia')
        .setDescription('Envía una sugerencia a la comunidad (abre formulario modal o envía directo)')
        .addStringOption(option =>
            option.setName('idea')
                .setDescription('Describe tu propuesta (opcional; si se omite, se abre el formulario modal)')
                .setRequired(false)
        ),

    async executeSlash(client, interaction) {
        const idea = interaction.options.getString('idea');

        // Si no proporcionó idea como argumento directo, abrir el Modal interactivo
        if (!idea) {
            const modal = suggestionManager.createModal(interaction.user.id);
            return interaction.showModal(modal);
        }

        const result = await suggestionManager.createSuggestion(
            interaction.guild,
            interaction.user,
            idea
        );

        if (!result.success) {
            return interaction.reply({
                content: result.message,
                ephemeral: true
            });
        }

        return interaction.reply({
            content: MESSAGES.SUGGESTIONS.CREATED_SUCCESS(result.channelId),
            ephemeral: true
        });
    },

    async executePrefix(client, message, args) {
        // Si no hay argumentos, enviar botón interactivo para abrir el formulario modal
        if (!args.length) {
            return suggestionManager.sendPrompt(message);
        }

        const idea = args.join(' ');

        const result = await suggestionManager.createSuggestion(
            message.guild,
            message.author,
            idea
        );

        if (!result.success) {
            return message.reply({ content: result.message });
        }

        return message.reply({
            content: MESSAGES.SUGGESTIONS.CREATED_SUCCESS(result.channelId)
        });
    }
};
