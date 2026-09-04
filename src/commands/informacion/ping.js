const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { COLORS, EMOJIS } = require('../../variables');

module.exports = {
    name: 'ping',
    description: 'Comprueba la latencia del bot y de la API con botón de recálculo en vivo',
    category: 'informacion',
    aliases: ['latencia', 'ms'],
    usage: '!ping',
    userPermissions: [],
    botPermissions: ['SendMessages', 'EmbedLinks'],
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Muestra la latencia del bot y del WebSocket de Discord'),

    async executeSlash(client, interaction) {
        const sent = await interaction.reply({ content: `${EMOJIS.LOADING} Calculando ping...`, fetchReply: true });
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
        const wsPing = client.ws.ping;

        const { embed, components } = this.buildPingEmbed(roundtrip, wsPing, interaction.user.id);
        return interaction.editReply({ content: null, embeds: [embed], components: components });
    },

    async executePrefix(client, message, args) {
        const sent = await message.reply({ content: `${EMOJIS.LOADING} Calculando ping...` });
        const roundtrip = sent.createdTimestamp - message.createdTimestamp;
        const wsPing = client.ws.ping;

        const { embed, components } = this.buildPingEmbed(roundtrip, wsPing, message.author.id);
        return sent.edit({ content: null, embeds: [embed], components: components });
    },

    buildPingEmbed(roundtrip, wsPing, userId) {
        const embed = new EmbedBuilder()
            .setColor(roundtrip < 200 ? COLORS.SUCCESS : COLORS.WARNING)
            .setTitle(`${EMOJIS.PING} ¡Pong! Latencia del Sistema`)
            .addFields(
                { name: '🌐 Latencia de la API (Roundtrip)', value: `\`${roundtrip}ms\``, inline: true },
                { name: '⚡ Latencia del WebSocket (Gateway)', value: `\`${wsPing}ms\``, inline: true }
            )
            .setFooter({ text: 'Sistema de monitoreo de latencia en vivo' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ping_refresh_${userId}`)
                .setLabel('Recalcular Ping')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary)
        );

        return { embed, components: [row] };
    }
};
