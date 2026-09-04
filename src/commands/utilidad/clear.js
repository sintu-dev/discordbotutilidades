const { SlashCommandBuilder } = require('discord.js');
const clearManager = require('../../components/clearManager');
const { EMOJIS } = require('../../variables');

module.exports = {
    name: 'clear',
    description: 'Elimina mensajes rápidamente con botones interactivos, modal o cantidad directa',
    category: 'utilidad',
    aliases: ['purge', 'limpiar', 'borrarmensajes'],
    usage: '!clear [1-100] [@usuario_opcional] o simplemente !clear',
    userPermissions: ['ManageMessages'],
    botPermissions: ['ManageMessages', 'ReadMessageHistory'],
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Elimina mensajes rápidamente del canal (abre panel interactivo o elimina directo)')
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('Cantidad de mensajes a eliminar (opcional; si se omite, se abre el panel interactivo)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Filtrar y eliminar solo mensajes de un usuario específico')
                .setRequired(false)
        ),

    async executeSlash(client, interaction) {
        const amount = interaction.options.getInteger('cantidad');
        const targetUser = interaction.options.getUser('usuario');

        // Si no se proporcionó cantidad, mostrar panel interactivo
        if (!amount) {
            return clearManager.sendPrompt(interaction);
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const messages = await interaction.channel.messages.fetch({ limit: amount });

            let toDelete = messages;
            if (targetUser) {
                toDelete = messages.filter(m => m.author.id === targetUser.id);
            }

            const deleted = await interaction.channel.bulkDelete(toDelete, true);

            return interaction.editReply({
                content: `${EMOJIS.SUCCESS} Se han eliminado **${deleted.size}** mensajes con éxito.`
            });
        } catch (error) {
            return interaction.editReply({
                content: `${EMOJIS.ERROR} No se pudieron eliminar los mensajes: ${error.message}`
            });
        }
    },

    async executePrefix(client, message, args) {
        if (!args.length || isNaN(args[0])) {
            return clearManager.sendPrompt(message);
        }

        const amount = parseInt(args[0], 10);
        if (amount < 1 || amount > 100) {
            return message.reply({
                content: `${EMOJIS.WARNING} La cantidad debe ser un número entero entre 1 y 100.`
            });
        }

        const targetUser = message.mentions.users.first();

        try {
            if (message.deletable) await message.delete().catch(() => {});

            const messages = await message.channel.messages.fetch({ limit: amount });

            let toDelete = messages;
            if (targetUser) {
                toDelete = messages.filter(m => m.author.id === targetUser.id);
            }

            const deleted = await message.channel.bulkDelete(toDelete, true);

            const tempMsg = await message.channel.send({
                content: `${EMOJIS.SUCCESS} Se eliminaron **${deleted.size}** mensajes correctamente.`
            });

            setTimeout(() => {
                tempMsg.delete().catch(() => {});
            }, 5000);
        } catch (error) {
            return message.channel.send({
                content: `${EMOJIS.ERROR} Error al purgar mensajes: ${error.message}`
            });
        }
    }
};
