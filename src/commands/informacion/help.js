const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ComponentType
} = require('discord.js');

const { COLORS, EMOJIS, CONSTANTS } = require('../../variables');
const db = require('../../database');
const config = require('../../config/config');

module.exports = {
    name: 'help',
    description: 'Muestra la lista de comandos y el menú de ayuda interactivo',
    category: 'informacion',
    aliases: ['ayuda', 'comandos', 'h'],
    usage: '!help [comando_opcional]',
    userPermissions: [],
    botPermissions: ['SendMessages', 'EmbedLinks'],
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra el menú de ayuda con todos los comandos disponibles')
        .addStringOption(option =>
            option.setName('comando')
                .setDescription('Ver detalles específicos de un comando')
                .setRequired(false)
        ),

    async executeSlash(client, interaction) {
        const query = interaction.options.getString('comando');
        const prefix = db.getGuild(interaction.guild?.id || '').prefix || config.client.prefix;

        if (query) {
            return this.sendSpecificHelp(interaction, client, query.toLowerCase(), prefix);
        }

        return this.sendGeneralHelp(interaction, client, prefix);
    },

    async executePrefix(client, message, args) {
        const prefix = db.getGuild(message.guild.id).prefix || config.client.prefix;

        if (args.length > 0) {
            return this.sendSpecificHelp(message, client, args[0].toLowerCase(), prefix);
        }

        return this.sendGeneralHelp(message, client, prefix);
    },

    async sendGeneralHelp(context, client, prefix) {
        const categories = {};

        // Agrupar comandos por categoría
        client.commands.forEach(cmd => {
            const cat = cmd.category || 'otros';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd);
        });

        const mainEmbed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${EMOJIS.HELP} Centro de Ayuda & Comandos`)
            .setDescription(
                `¡Hola! Soy tu asistente de Discord especializado en **creación de anuncios/embeds interactivos**, **sugerencias comunitarias con votación** y **utilidades para el servidor**.\n\n` +
                `📌 **Prefijo actual:** \`${prefix}\`\n` +
                `⚡ **Comandos Slash:** Puedes usar \`/\` para autocompletado en cualquier comando.\n` +
                `🔍 **Detalles:** Usa \`${prefix}help <comando>\` para ver sintaxis y ejemplos.\n\n` +
                `*Selecciona una categoría en el menú desplegable de abajo para explorar:*`
            )
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Total de comandos: ${client.commands.size} • Versión ${CONSTANTS.BOT_VERSION}` })
            .setTimestamp();

        // Opciones del select menu
        const menuOptions = Object.keys(categories).map(catKey => {
            const catInfo = CONSTANTS.CATEGORIES[catKey] || { name: catKey.toUpperCase(), emoji: '📁' };
            return {
                label: catInfo.name,
                value: `help_cat_${catKey}`,
                description: `Ver los ${categories[catKey].length} comandos de ${catInfo.name}`,
                emoji: catInfo.emoji
            };
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select_category')
            .setPlaceholder('📂 Selecciona una categoría para ver sus comandos')
            .addOptions(menuOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        let responseMsg;
        if (context.isChatInputCommand && context.isChatInputCommand()) {
            responseMsg = await context.reply({ embeds: [mainEmbed], components: [row], fetchReply: true });
        } else {
            responseMsg = await context.reply({ embeds: [mainEmbed], components: [row] });
        }

        // Collector interactivo para el select menu
        const collector = responseMsg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000
        });

        collector.on('collect', async (i) => {
            const userId = context.user ? context.user.id : context.author.id;
            if (i.user.id !== userId) {
                return i.reply({ content: `${EMOJIS.ERROR} Este menú no es para ti.`, ephemeral: true });
            }

            const catKey = i.values[0].replace('help_cat_', '');
            const catInfo = CONSTANTS.CATEGORIES[catKey] || { name: catKey.toUpperCase(), emoji: '📁' };
            const cmds = categories[catKey] || [];

            const catEmbed = new EmbedBuilder()
                .setColor(COLORS.PRIMARY)
                .setTitle(`${catInfo.emoji} Categoría: ${catInfo.name}`)
                .setDescription(cmds.map(c => `• **\`${prefix}${c.name}\`** o **\`/${c.name}\`**\n  ↳ ${c.description}`).join('\n\n'))
                .setFooter({ text: `Usa ${prefix}help <comando> para más información` })
                .setTimestamp();

            await i.update({ embeds: [catEmbed], components: [row] });
        });
    },

    async sendSpecificHelp(context, client, query, prefix) {
        const cmdName = client.aliases.get(query) || query;
        const command = client.commands.get(cmdName);

        if (!command) {
            const notFound = `${EMOJIS.ERROR} No encontré ningún comando llamado \`${query}\`. Usa \`${prefix}help\` para ver la lista completa.`;
            if (context.reply) return context.reply({ content: notFound, ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${EMOJIS.INFO} Comando: ${command.name}`)
            .setDescription(`**Descripción:** ${command.description}`)
            .addFields(
                { name: '📂 Categoría', value: `\`${command.category || 'General'}\``, inline: true },
                { name: '🔤 Alias', value: command.aliases && command.aliases.length ? command.aliases.map(a => `\`${a}\``).join(', ') : '`Ninguno`', inline: true },
                { name: '📝 Uso con Prefijo', value: `\`${command.usage || `${prefix}${command.name}`}\``, inline: false },
                { name: '⚡ Uso con Slash', value: `\`/${command.name}\``, inline: false }
            )
            .setFooter({ text: '<> = Obligatorio | [] = Opcional' })
            .setTimestamp();

        if (context.isChatInputCommand && context.isChatInputCommand()) {
            return context.reply({ embeds: [embed] });
        } else {
            return context.reply({ embeds: [embed] });
        }
    }
};
