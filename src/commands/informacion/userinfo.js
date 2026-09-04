const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    UserSelectMenuBuilder
} = require('discord.js');
const { COLORS, EMOJIS } = require('../../variables');

module.exports = {
    name: 'userinfo',
    description: 'Muestra información de un usuario con selector desplegable interactivo',
    category: 'informacion',
    aliases: ['usuario', 'perfil', 'whois', 'uinfo'],
    usage: '!userinfo [@usuario_opcional]',
    userPermissions: [],
    botPermissions: ['SendMessages', 'EmbedLinks'],
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Muestra el perfil e información de un miembro del servidor')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario que deseas inspeccionar')
                .setRequired(false)
        ),

    async executeSlash(client, interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        const { embed, components } = this.buildUserEmbed(user, member, interaction.user.id);
        return interaction.reply({ embeds: [embed], components: components });
    },

    async executePrefix(client, message, args) {
        const user = message.mentions.users.first() ||
            (args[0] ? await client.users.fetch(args[0].replace(/<@!?|>/g, '')).catch(() => null) : null) ||
            message.author;

        const member = await message.guild.members.fetch(user.id).catch(() => null);

        const { embed, components } = this.buildUserEmbed(user, member, message.author.id);
        return message.reply({ embeds: [embed], components: components });
    },

    buildUserEmbed(user, member, callerId) {
        const roles = member
            ? member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.toString()).join(' ') || '`Ninguno`'
            : '`No está en el servidor`';

        const embed = new EmbedBuilder()
            .setColor(member?.displayHexColor || COLORS.PRIMARY)
            .setTitle(`${EMOJIS.USER} Perfil de ${user.tag || user.username}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👤 Nombre de Usuario', value: `\`${user.username}\``, inline: true },
                { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
                { name: '🤖 ¿Es Bot?', value: user.bot ? '`Sí`' : '`No`', inline: true },
                { name: '📅 Cuenta Creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`, inline: false }
            );

        if (member) {
            embed.addFields(
                { name: '📥 Ingresó al Servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`, inline: false },
                { name: `🎭 Roles (${member.roles.cache.size - 1})`, value: roles.length > 1024 ? `${roles.substring(0, 1020)}...` : roles, inline: false }
            );
        }

        embed.setFooter({ text: `Consultado por un miembro • ${user.id}` }).setTimestamp();

        // Selector desplegable para inspeccionar cualquier otro usuario
        const menuRow = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId(`userinfo_select_${callerId}`)
                .setPlaceholder('🔍 Selecciona otro usuario para inspeccionar')
        );

        return { embed, components: [menuRow] };
    }
};
