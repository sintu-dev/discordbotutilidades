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
const Logger = require('../../utils/logger');
const config = require('../../config/config');
const { COLORS, EMOJIS } = require('../../variables');
const util = require('util');

module.exports = {
    name: 'eval',
    description: 'Evalúa código JavaScript directamente o mediante formulario Modal (Solo Propietario)',
    category: 'owner',
    aliases: ['e'],
    usage: '!eval [código] o simplemente !eval',
    userPermissions: [],
    botPermissions: [],
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evalúa código JavaScript directamente en Node.js (Solo Propietario)')
        .addStringOption(option =>
            option.setName('codigo')
                .setDescription('Código JavaScript a evaluar (opcional; si se omite, se abre el modal)')
                .setRequired(false)
        ),

    async executeSlash(client, interaction) {
        if (!this.isOwner(interaction.user.id)) {
            return interaction.reply({
                content: `${EMOJIS.ERROR} Este comando está restringido al desarrollador.`,
                ephemeral: true
            });
        }

        const code = interaction.options.getString('codigo');

        if (!code) {
            const modal = new ModalBuilder()
                .setCustomId(`eval_modal_${interaction.user.id}`)
                .setTitle('💻 Consola Eval JavaScript');

            const codeInput = new TextInputBuilder()
                .setCustomId('eval_input_code')
                .setLabel('Código JavaScript a Ejecutar *')
                .setPlaceholder('Ej: client.guilds.cache.map(g => g.name)')
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(4000)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(codeInput));
            return interaction.showModal(modal);
        }

        await this.runEval(interaction, client, code, true);
    },

    async executePrefix(client, message, args) {
        if (!this.isOwner(message.author.id)) {
            return message.reply({ content: `${EMOJIS.ERROR} Solo el dueño puede ejecutar código.` });
        }

        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor(COLORS.PRIMARY)
                .setTitle('💻 Consola de Evaluación JavaScript')
                .setDescription('Haz clic en el botón de abajo para abrir el **editor modal** y escribir tu script:')
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`eval_btn_modal_${message.author.id}`)
                    .setLabel('Abrir Editor Modal')
                    .setEmoji('💻')
                    .setStyle(ButtonStyle.Primary)
            );

            return message.reply({ embeds: [embed], components: [row] });
        }

        const code = args.join(' ');
        await this.runEval(message, client, code, false);
    },

    async runEval(context, client, code, isSlash) {
        try {
            let evaled = await eval(code);
            if (typeof evaled !== 'string') {
                evaled = util.inspect(evaled, { depth: 0 });
            }

            // Sanitizar token
            const token = client.token;
            if (token) {
                evaled = evaled.replaceAll(token, '[TOKEN_PROTEGIDO]');
            }

            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('💻 Evaluación Exitosa')
                .addFields(
                    { name: '📥 Entrada', value: `\`\`\`js\n${code.substring(0, 1000)}\n\`\`\`` },
                    { name: '📤 Salida', value: `\`\`\`js\n${evaled.substring(0, 1000)}\n\`\`\`` }
                )
                .setTimestamp();

            if (isSlash) {
                if (context.replied || context.deferred) {
                    await context.followUp({ embeds: [embed], ephemeral: true });
                } else {
                    await context.reply({ embeds: [embed], ephemeral: true });
                }
            } else {
                await context.reply({ embeds: [embed] });
            }
        } catch (error) {
            const embed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('❌ Error de Ejecución')
                .addFields(
                    { name: '📥 Entrada', value: `\`\`\`js\n${code.substring(0, 1000)}\n\`\`\`` },
                    { name: '🚩 Error', value: `\`\`\`js\n${error.message.substring(0, 1000)}\n\`\`\`` }
                )
                .setTimestamp();

            if (isSlash) {
                if (context.replied || context.deferred) {
                    await context.followUp({ embeds: [embed], ephemeral: true });
                } else {
                    await context.reply({ embeds: [embed], ephemeral: true });
                }
            } else {
                await context.reply({ embeds: [embed] });
            }
        }
    },

    isOwner(userId) {
        const ownerId = config.client.ownerId || process.env.OWNER_ID;
        return userId === ownerId;
    }
};