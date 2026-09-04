const { SlashCommandBuilder, ChannelType } = require('discord.js');
const decirManager = require('../../components/decirManager');
const { EMOJIS } = require('../../variables');

module.exports = {
    name: 'decir',
    description: 'Envía un mensaje a través del bot con formulario emergente (Modal) o texto directo',
    category: 'embeds',
    aliases: ['say', 'hablar', 'sendmsg', 'enviarmensaje'],
    usage: '!decir [#canal_opcional] [mensaje] o simplemente !decir',
    userPermissions: ['ManageMessages'],
    botPermissions: ['SendMessages'],
    data: new SlashCommandBuilder()
        .setName('decir')
        .setDescription('Envía un mensaje a través del bot (abre formulario modal o envía directo)')
        .addStringOption(option =>
            option.setName('mensaje')
                .setDescription('El mensaje que deseas que el bot envíe (opcional; si se omite, se abre el modal)')
                .setRequired(false)
        )
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal de destino (opcional, por defecto el canal actual)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)
        ),

    async executeSlash(client, interaction) {
        const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
        const messageText = interaction.options.getString('mensaje');

        // Si no se proporcionó texto, abrir el Modal interactivo
        if (!messageText) {
            const modal = decirManager.createModal(targetChannel.id, interaction.user.id);
            return interaction.showModal(modal);
        }

        try {
            await targetChannel.send(messageText);
            return interaction.reply({
                content: `${EMOJIS.SUCCESS} Mensaje enviado correctamente a ${targetChannel}.`,
                ephemeral: true
            });
        } catch (error) {
            return interaction.reply({
                content: `${EMOJIS.ERROR} Error al enviar mensaje: ${error.message}`,
                ephemeral: true
            });
        }
    },

    async executePrefix(client, message, args) {
        let targetChannel = message.mentions.channels.first();
        let textToSend = '';

        if (targetChannel) {
            textToSend = args.slice(1).join(' ').trim();
        } else {
            const firstArgClean = args[0] ? args[0].replace(/<#|>/g, '') : null;
            const foundChannel = firstArgClean ? message.guild.channels.cache.get(firstArgClean) : null;
            if (foundChannel) {
                targetChannel = foundChannel;
                textToSend = args.slice(1).join(' ').trim();
            } else {
                targetChannel = message.channel;
                textToSend = args.join(' ').trim();
            }
        }

        // Si no hay texto, abrir prompt con botón interactivo
        if (!textToSend) {
            return decirManager.sendPrompt(message, targetChannel);
        }

        try {
            if (message.deletable) {
                await message.delete().catch(() => {});
            }

            await targetChannel.send(textToSend);
        } catch (error) {
            return message.channel.send({
                content: `${EMOJIS.ERROR} Error al enviar mensaje: ${error.message}`
            });
        }
    }
};
