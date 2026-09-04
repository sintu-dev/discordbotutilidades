const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    version: djsVersion
} = require('discord.js');
const { COLORS, EMOJIS, CONSTANTS } = require('../../variables');
const os = require('os');

module.exports = {
    name: 'botinfo',
    description: 'Muestra estadísticas técnicas del bot con botón de refresco en vivo',
    category: 'informacion',
    aliases: ['bot', 'stats', 'sistema', 'info'],
    usage: '!botinfo',
    userPermissions: [],
    botPermissions: ['SendMessages', 'EmbedLinks'],
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Muestra el estado técnico, memoria y especificaciones del bot'),

    async executeSlash(client, interaction) {
        const { embed, components } = this.buildBotInfoEmbed(client, interaction.user.id);
        return interaction.reply({ embeds: [embed], components: components });
    },

    async executePrefix(client, message, args) {
        const { embed, components } = this.buildBotInfoEmbed(client, message.author.id);
        return message.reply({ embeds: [embed], components: components });
    },

    formatUptime(ms) {
        const sec = Math.floor((ms / 1000) % 60);
        const min = Math.floor((ms / (1000 * 60)) % 60);
        const hrs = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hrs > 0) parts.push(`${hrs}h`);
        if (min > 0) parts.push(`${min}m`);
        parts.push(`${sec}s`);

        return parts.join(' ');
    },

    buildBotInfoEmbed(client, userId) {
        const uptime = this.formatUptime(client.uptime || 0);
        const memoryUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const memoryTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${EMOJIS.BOT} Información Técnica del Bot`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🤖 Nombre del Bot', value: `\`${client.user.username}\``, inline: true },
                { name: '👑 Creador', value: `<@834904556101828708>`, inline: true },
                { name: '📦 Versión del Bot', value: `\`v${CONSTANTS.BOT_VERSION}\``, inline: true },
                { name: '⏱️ Tiempo Activo', value: `\`${uptime}\``, inline: false },
                { name: '🏰 Servidores', value: `\`${client.guilds.cache.size}\``, inline: true },
                { name: '👥 Usuarios en Caché', value: `\`${client.users.cache.size}\``, inline: true },
                { name: '⚡ Comandos Registrados', value: `\`${client.commands.size}\``, inline: true },
                { name: '💾 Memoria RAM (Heap / Total)', value: `\`${memoryUsed} MB\` / \`${memoryTotal} GB\``, inline: true },
                { name: '🟢 Node.js', value: `\`${process.version}\``, inline: true },
                { name: '🔷 Discord.js', value: `\`v${djsVersion}\``, inline: true },
                { name: '💻 Sistema Operativo', value: `\`${os.type()} ${os.arch()}\``, inline: true },
                { name: '🛡️ Estado de Persistencia', value: '`JSON Atómico (Offline Friendly)`', inline: true },
                { name: '🛡️ AntiCrash', value: '`Activo y Protegido`', inline: true }
            )
            .setFooter({ text: `Métricas técnicas en tiempo real` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`botinfo_refresh_${userId}`)
                .setLabel('Actualizar Métricas')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary)
        );

        return { embed, components: [row] };
    }
};
