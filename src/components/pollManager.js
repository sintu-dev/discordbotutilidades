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

const db = require('../database');
const { COLORS, EMOJIS, MESSAGES } = require('../variables');
const Logger = require('../utils/logger');

class PollManager {
    /**
     * Construye el Modal emergente interactivo para crear una encuesta
     */
    createModal(channelId, userId) {
        const modal = new ModalBuilder()
            .setCustomId(`poll_modal_${channelId}_${userId}`)
            .setTitle('📊 Crear Nueva Encuesta');

        const questionInput = new TextInputBuilder()
            .setCustomId('poll_input_question')
            .setLabel('Pregunta o Tema de la Encuesta *')
            .setPlaceholder('Ej: ¿Qué juego deberíamos jugar este fin de semana?')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(256)
            .setRequired(true);

        const opt1Input = new TextInputBuilder()
            .setCustomId('poll_input_opt1')
            .setLabel('Opción 1 *')
            .setPlaceholder('Ej: Minecraft (o Sí)')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(80)
            .setRequired(true);

        const opt2Input = new TextInputBuilder()
            .setCustomId('poll_input_opt2')
            .setLabel('Opción 2 *')
            .setPlaceholder('Ej: GTA V (o No)')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(80)
            .setRequired(true);

        const opt3Input = new TextInputBuilder()
            .setCustomId('poll_input_opt3')
            .setLabel('Opción 3 (Opcional)')
            .setPlaceholder('Ej: Valorant')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(80)
            .setRequired(false);

        const opt4Input = new TextInputBuilder()
            .setCustomId('poll_input_opt4')
            .setLabel('Opción 4 (Opcional)')
            .setPlaceholder('Ej: League of Legends')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(80)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(questionInput),
            new ActionRowBuilder().addComponents(opt1Input),
            new ActionRowBuilder().addComponents(opt2Input),
            new ActionRowBuilder().addComponents(opt3Input),
            new ActionRowBuilder().addComponents(opt4Input)
        );

        return modal;
    }

    /**
     * Envía un mensaje interactivo con botón para abrir el formulario modal de encuesta
     */
    async sendPrompt(context, channel) {
        const user = context.user || context.author;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${EMOJIS.POLL} Creador de Encuestas Interactivo`)
            .setDescription(
                `Canal de destino: ${channel}\n\n` +
                `Haz clic en el botón de abajo para abrir el **formulario emergente** (Modal) y configurar tu pregunta y hasta 5 opciones personalizadas.`
            )
            .setFooter({ text: `Iniciado por ${user.tag || user.username}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`poll_btn_modal_${channel.id}_${user.id}`)
                .setLabel('Crear Encuesta (Formulario)')
                .setEmoji('📊')
                .setStyle(ButtonStyle.Success)
        );

        if (context.isChatInputCommand && context.isChatInputCommand()) {
            return context.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else {
            return context.reply({ embeds: [embed], components: [row] });
        }
    }

    /**
     * Crea una nueva encuesta interactiva
     */
    async createPoll(channel, author, question, options = ['Sí', 'No']) {
        const pollId = `poll_${Date.now()}`;

        const pollData = {
            id: pollId,
            guildId: channel.guild.id,
            channelId: channel.id,
            messageId: null,
            authorId: author.id,
            authorTag: author.tag || author.username,
            question: question,
            options: options.map((opt, idx) => ({
                id: idx,
                text: opt,
                votes: []
            })),
            isClosed: false,
            createdAt: new Date().toISOString()
        };

        const embed = this.buildEmbed(pollData);
        const components = this.buildComponents(pollData);

        const msg = await channel.send({ embeds: [embed], components: components });
        pollData.messageId = msg.id;

        db.savePoll(pollData);
        return pollData;
    }

    /**
     * Construye el Embed visual de la encuesta
     */
    buildEmbed(poll) {
        let totalVotes = 0;
        poll.options.forEach(o => totalVotes += o.votes.length);

        const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        let description = `### ${poll.question}\n\n`;

        poll.options.forEach((opt, index) => {
            const count = opt.votes.length;
            const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
            
            // Barra de progreso visual
            const barLength = 8;
            const filled = Math.round((percentage / 100) * barLength);
            const bar = '🟦'.repeat(filled) + '⬜'.repeat(barLength - filled);

            description += `${optionEmojis[index] || '🔹'} **${opt.text}**\n${bar} **${count}** votos (${percentage}%)\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(poll.isClosed ? COLORS.SECONDARY : COLORS.PRIMARY)
            .setTitle(`${EMOJIS.POLL} Encuesta de la Comunidad`)
            .setDescription(description)
            .setFooter({ text: `Creada por ${poll.authorTag} • Total: ${totalVotes} votos • ID: ${poll.id}` })
            .setTimestamp(new Date(poll.createdAt));

        if (poll.isClosed) {
            embed.setTitle(`${EMOJIS.LOCK} Encuesta Finalizada`);
        }

        return embed;
    }

    /**
     * Construye los botones de votación
     */
    buildComponents(poll) {
        if (poll.isClosed) return [];

        const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const rows = [];
        let currentRow = new ActionRowBuilder();

        poll.options.forEach((opt, index) => {
            const btn = new ButtonBuilder()
                .setCustomId(`poll_vote_${poll.id}_${opt.id}`)
                .setLabel(opt.text.length > 20 ? opt.text.substring(0, 17) + '...' : opt.text)
                .setEmoji(optionEmojis[index] || '🔹')
                .setStyle(ButtonStyle.Primary);

            currentRow.addComponents(btn);

            if (currentRow.components.length === 5) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
            }
        });

        if (currentRow.components.length > 0) {
            rows.push(currentRow);
        }

        return rows;
    }

    /**
     * Maneja las interacciones de botones en encuestas
     */
    async handleButton(interaction) {
        const customId = interaction.customId;

        // Abrir modal de creación de encuesta
        if (customId.startsWith('poll_btn_modal_')) {
            const parts = customId.replace('poll_btn_modal_', '').split('_');
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

        // Votaciones en encuestas existentes
        if (customId.startsWith('poll_vote_')) {
            const raw = customId.replace('poll_vote_', '');
            const lastUnderscore = raw.lastIndexOf('_');
            if (lastUnderscore === -1) return;

            const pollId = raw.substring(0, lastUnderscore);
            const optionId = parseInt(raw.substring(lastUnderscore + 1), 10);
            const userId = interaction.user.id;

            const poll = db.getPoll(pollId);
            if (!poll) {
                return interaction.reply({ content: `${EMOJIS.ERROR} Encuesta no encontrada.`, ephemeral: true });
            }

            if (poll.isClosed) {
                return interaction.reply({ content: `${EMOJIS.WARNING} Esta encuesta ya está cerrada.`, ephemeral: true });
            }

            if (!Array.isArray(poll.options)) {
                return interaction.reply({ content: `${EMOJIS.ERROR} Ocurrió un error al leer las opciones de la encuesta.`, ephemeral: true });
            }

            // Verificar si ya había votado por esta misma opción para alternar (toggle)
            const currentOption = poll.options.find(o => o.id === optionId);
            const alreadyVotedThisOption = currentOption && Array.isArray(currentOption.votes) && currentOption.votes.includes(userId);

            // Remover voto previo de todas las opciones
            poll.options.forEach(opt => {
                if (!Array.isArray(opt.votes)) opt.votes = [];
                opt.votes = opt.votes.filter(id => id !== userId);
            });

            // Si no estaba votada esta opción, agregar el nuevo voto
            if (!alreadyVotedThisOption && currentOption) {
                currentOption.votes.push(userId);
            }

            db.savePoll(poll);

            const embed = this.buildEmbed(poll);
            const components = this.buildComponents(poll);

            return interaction.update({ embeds: [embed], components: components });
        }
    }

    /**
     * Maneja el envío del formulario Modal de encuesta
     */
    async handleModalSubmit(interaction) {
        const customId = interaction.customId;
        if (!customId.startsWith('poll_modal_')) return;

        const parts = customId.replace('poll_modal_', '').split('_');
        const channelId = parts[0];

        const targetChannel = interaction.guild.channels.cache.get(channelId) || await interaction.guild.channels.fetch(channelId).catch(() => null) || interaction.channel;
        if (!targetChannel) {
            return interaction.reply({
                content: MESSAGES.ERRORS.CHANNEL_NOT_FOUND,
                ephemeral: true
            });
        }

        const question = interaction.fields.getTextInputValue('poll_input_question');
        const opt1 = interaction.fields.getTextInputValue('poll_input_opt1');
        const opt2 = interaction.fields.getTextInputValue('poll_input_opt2');
        const opt3 = interaction.fields.getTextInputValue('poll_input_opt3') || null;
        const opt4 = interaction.fields.getTextInputValue('poll_input_opt4') || null;

        const options = [opt1, opt2];
        if (opt3 && opt3.trim()) options.push(opt3.trim());
        if (opt4 && opt4.trim()) options.push(opt4.trim());

        try {
            await this.createPoll(targetChannel, interaction.user, question, options);
            return interaction.reply({
                content: `${EMOJIS.SUCCESS} ¡Encuesta creada con éxito en ${targetChannel}!`,
                ephemeral: true
            });
        } catch (error) {
            Logger.error(`Error al crear encuesta vía modal: ${error.message}`);
            return interaction.reply({
                content: `${EMOJIS.ERROR} Error al crear la encuesta: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

module.exports = new PollManager();
