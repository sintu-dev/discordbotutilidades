const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType
} = require('discord.js');
const { COLORS, EMOJIS } = require('../../variables');

module.exports = {
    name: 'serverinfo',
    description: 'Muestra estadísticas del servidor con botón de actualización en vivo',
    category: 'informacion',
    aliases: ['servidor', 'guildinfo', 'server'],
    usage: '!serverinfo',
    userPermissions: [],
    botPermissions: ['SendMessages', 'EmbedLinks'],
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Muestra estadísticas y detalles completos del servidor actual'),

    async executeSlash(client, interaction) {
        const { embed, components } = await this.buildServerEmbed(interaction.guild, interaction.user.id);
        return interaction.reply({ embeds: [embed], components: components });
    },

    async executePrefix(client, message, args) {
        const { embed, components } = await this.buildServerEmbed(message.guild, message.author.id);
        return message.reply({ embeds: [embed], components: components });
    },

    async buildServerEmbed(guild, userId) {
        await guild.fetch().catch(() => {});
        const owner = await guild.fetchOwner().catch(() => null);

        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

        const totalMembers = guild.memberCount;
        const rolesCount = guild.roles.cache.size - 1; // Excluir @everyone
        const emojisCount = guild.emojis.cache.size;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${EMOJIS.SERVER} Información de ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👑 Propietario', value: owner ? `${owner.user.tag || owner.user.username} (\`${owner.id}\`)` : '`Desconocido`', inline: true },
                { name: '🆔 ID del Servidor', value: `\`${guild.id}\``, inline: true },
                { name: '📅 Creación', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: false },
                { name: `👥 Miembros (${totalMembers})`, value: `Total: **${totalMembers}**`, inline: true },
                { name: `💬 Canales (${guild.channels.cache.size})`, value: `📝 Texto: **${textChannels}**\n🔊 Voz: **${voiceChannels}**\n📁 Categorías: **${categories}**`, inline: true },
                { name: `💎 Mejoras (Boosts)`, value: `Nivel: **${guild.premiumTier}**\nBoosts: **${guild.premiumSubscriptionCount || 0}**`, inline: true },
                { name: '🎭 Roles', value: `\`${rolesCount}\` roles`, inline: true },
                { name: '😃 Emojis', value: `\`${emojisCount}\` emojis`, inline: true },
                { name: '🛡️ Nivel de Seguridad', value: `\`${guild.verificationLevel}\``, inline: true }
            )
            .setFooter({ text: `Estadísticas en tiempo real • ${guild.name}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`serverinfo_refresh_${userId}`)
                .setLabel('Actualizar Estadísticas')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary)
        );

        return { embed, components: [row] };
    }
};
