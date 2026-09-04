const { SlashCommandBuilder, ChannelType } = require('discord.js');
const pollManager = require('../../components/pollManager');
const { EMOJIS } = require('../../variables');

module.exports = {
    name: 'encuesta',
    description: 'Crea una encuesta interactiva con formulario emergente (Modal) o votación directa',
    category: 'utilidad',
    aliases: ['poll', 'votacion', 'crearencuesta'],
    usage: '!encuesta [¿Pregunta? | Opción 1 | Opción 2...] o simplemente !encuesta',
    userPermissions: ['ManageMessages'],
    botPermissions: ['SendMessages', 'EmbedLinks'],
    data: new SlashCommandBuilder()
        .setName('encuesta')
        .setDescription('Inicia una votación interactiva (abre formulario emergente o envía directo)')
        .addStringOption(option =>
            option.setName('pregunta')
                .setDescription('La pregunta o tema principal (opcional; si se omite, se abre el formulario modal)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('opcion1')
                .setDescription('Primera opción (Opcional, por defecto Sí)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('opcion2')
                .setDescription('Segunda opción (Opcional, por defecto No)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('opcion3')
                .setDescription('Tercera opción (Opcional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('opcion4')
                .setDescription('Cuarta opción (Opcional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('opcion5')
                .setDescription('Quinta opción (Opcional)')
                .setRequired(false)
        ),

    async executeSlash(client, interaction) {
        const question = interaction.options.getString('pregunta');

        // Si no se proporcionó pregunta, abrir el Modal interactivo
        if (!question) {
            const modal = pollManager.createModal(interaction.channel.id, interaction.user.id);
            return interaction.showModal(modal);
        }

        const opt1 = interaction.options.getString('opcion1');
        const opt2 = interaction.options.getString('opcion2');
        const opt3 = interaction.options.getString('opcion3');
        const opt4 = interaction.options.getString('opcion4');
        const opt5 = interaction.options.getString('opcion5');

        let options = [];
        if (opt1) options.push(opt1);
        if (opt2) options.push(opt2);
        if (opt3) options.push(opt3);
        if (opt4) options.push(opt4);
        if (opt5) options.push(opt5);

        if (options.length === 0) {
            options = ['Sí', 'No'];
        } else if (options.length === 1) {
            options.push('No');
        }

        await pollManager.createPoll(
            interaction.channel,
            interaction.user,
            question,
            options
        );

        return interaction.reply({
            content: `${EMOJIS.SUCCESS} ¡Encuesta creada con éxito en este canal!`,
            ephemeral: true
        });
    },

    async executePrefix(client, message, args) {
        // Si no hay argumentos, mostrar el mensaje interactivo con botón para abrir el Formulario Modal
        if (!args.length) {
            return pollManager.sendPrompt(message, message.channel);
        }

        const raw = args.join(' ');
        let question = '';
        let options = [];

        if (raw.includes('|')) {
            const parts = raw.split('|').map(p => p.trim());
            question = parts[0];
            options = parts.slice(1).filter(o => o.length > 0);
        } else {
            question = raw;
            options = ['Sí', 'No'];
        }

        if (options.length === 0) {
            options = ['Sí', 'No'];
        } else if (options.length === 1) {
            options.push('No');
        }

        try {
            if (message.deletable) {
                await message.delete().catch(() => {});
            }

            await pollManager.createPoll(
                message.channel,
                message.author,
                question,
                options
            );
        } catch (error) {
            return message.channel.send({
                content: `${EMOJIS.ERROR} Error al crear la encuesta: ${error.message}`
            });
        }
    }
};
