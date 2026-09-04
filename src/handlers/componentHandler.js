const embedManager = require('../components/embedManager');
const suggestionManager = require('../components/suggestionManager');
const pollManager = require('../components/pollManager');
const anuncioManager = require('../components/anuncioManager');
const decirManager = require('../components/decirManager');
const clearManager = require('../components/clearManager');
const configManager = require('../components/configManager');
const Logger = require('../utils/logger');
const config = require('../config/config');
const db = require('../database');
const { EMOJIS, COLORS, CONSTANTS } = require('../variables');
const { EmbedBuilder, ActionRowBuilder, UserSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const util = require('util');

/**
 * Enrutador Central de Interacciones de Componentes (Botones, Modals, Menús)
 */
module.exports = (client) => {
    client.on('interactionCreate', async (interaction) => {
        try {
            // ==========================================
            // 1. MANEJO DE BOTONES
            // ==========================================
            if (interaction.isButton()) {
                const customId = interaction.customId;

                // Modulos delegados a sus respectivos managers
                if (customId.startsWith('embed_')) {
                    return await embedManager.handleButton(interaction);
                }
                if (customId.startsWith('anuncio_')) {
                    return await anuncioManager.handleButton(interaction);
                }
                if (customId.startsWith('sug_')) {
                    return await suggestionManager.handleButton(interaction);
                }
                if (customId.startsWith('poll_')) {
                    return await pollManager.handleButton(interaction);
                }
                if (customId.startsWith('decir_')) {
                    return await decirManager.handleButton(interaction);
                }
                if (customId.startsWith('clear_')) {
                    return await clearManager.handleButton(interaction);
                }
                if (customId.startsWith('config_')) {
                    return await configManager.handleButton(interaction);
                }

                // Botón de refresco para ServerInfo
                if (customId.startsWith('serverinfo_refresh_')) {
                    const serverinfoCmd = client.commands.get('serverinfo');
                    if (serverinfoCmd) {
                        const { embed, components } = await serverinfoCmd.buildServerEmbed(interaction.guild, interaction.user.id);
                        return await interaction.update({ embeds: [embed], components: components });
                    }
                }

                // Botón de refresco para Ping
                if (customId.startsWith('ping_refresh_')) {
                    const pingCmd = client.commands.get('ping');
                    if (pingCmd) {
                        const roundtrip = Date.now() - interaction.createdTimestamp;
                        const wsPing = client.ws.ping;
                        const { embed, components } = pingCmd.buildPingEmbed(roundtrip, wsPing, interaction.user.id);
                        return await interaction.update({ embeds: [embed], components: components });
                    }
                }

                // Botón de refresco para BotInfo
                if (customId.startsWith('botinfo_refresh_')) {
                    const botinfoCmd = client.commands.get('botinfo');
                    if (botinfoCmd) {
                        const { embed, components } = botinfoCmd.buildBotInfoEmbed(client, interaction.user.id);
                        return await interaction.update({ embeds: [embed], components: components });
                    }
                }

                // Botones de Shutdown
                if (customId.startsWith('shutdown_confirm_')) {
                    const ownerId = config.client.ownerId || process.env.OWNER_ID;
                    if (interaction.user.id !== ownerId) {
                        return interaction.reply({ content: `${EMOJIS.ERROR} No tienes permiso para apagar el bot.`, ephemeral: true });
                    }

                    await interaction.update({
                        content: `${EMOJIS.SUCCESS} **Apagando bot de forma segura...** Guardando datos locales y cerrando sesión.`,
                        embeds: [],
                        components: []
                    });

                    Logger.warn(`Apagado confirmado vía botón por ${interaction.user.tag}`);
                    setTimeout(() => {
                        client.destroy();
                        process.exit(0);
                    }, 1000);
                    return;
                }

                if (customId.startsWith('shutdown_cancel_')) {
                    return await interaction.update({
                        content: `${EMOJIS.CANCEL} **Operación cancelada.** El bot continuará ejecutándose normalmente.`,
                        embeds: [],
                        components: []
                    });
                }

                // Botón para abrir modal de Eval
                if (customId.startsWith('eval_btn_modal_')) {
                    const ownerId = config.client.ownerId || process.env.OWNER_ID;
                    if (interaction.user.id !== ownerId) {
                        return interaction.reply({ content: `${EMOJIS.ERROR} Solo el desarrollador puede usar esta función.`, ephemeral: true });
                    }

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
            }

            // ==========================================
            // 2. MANEJO DE MODALS
            // ==========================================
            if (interaction.isModalSubmit()) {
                const customId = interaction.customId;

                if (customId.startsWith('embed_')) {
                    return await embedManager.handleModalSubmit(interaction);
                }
                if (customId.startsWith('anuncio_')) {
                    return await anuncioManager.handleModalSubmit(interaction);
                }
                if (customId.startsWith('sug_')) {
                    return await suggestionManager.handleModalSubmit(interaction);
                }
                if (customId.startsWith('poll_')) {
                    return await pollManager.handleModalSubmit(interaction);
                }
                if (customId.startsWith('decir_')) {
                    return await decirManager.handleModalSubmit(interaction);
                }
                if (customId.startsWith('clear_')) {
                    return await clearManager.handleModalSubmit(interaction);
                }
                if (customId.startsWith('config_')) {
                    return await configManager.handleModalSubmit(interaction);
                }

                // Modal de Eval
                if (customId.startsWith('eval_modal_')) {
                    const ownerId = config.client.ownerId || process.env.OWNER_ID;
                    if (interaction.user.id !== ownerId) {
                        return interaction.reply({ content: `${EMOJIS.ERROR} No autorizado.`, ephemeral: true });
                    }

                    const code = interaction.fields.getTextInputValue('eval_input_code');
                    const evalCmd = client.commands.get('eval');
                    if (evalCmd) {
                        return await evalCmd.runEval(interaction, client, code, true);
                    }
                }
            }

            // ==========================================
            // 3. MANEJO DE SELECT MENUS (Strings, Canales, Usuarios)
            // ==========================================
            if (interaction.isStringSelectMenu() || interaction.isChannelSelectMenu() || interaction.isUserSelectMenu()) {
                const customId = interaction.customId;

                if (customId.startsWith('embed_')) {
                    return await embedManager.handleSelectMenu(interaction);
                }
                if (customId.startsWith('sug_')) {
                    return await suggestionManager.handleSelectMenu(interaction);
                }
                if (customId.startsWith('config_')) {
                    return await configManager.handleSelectMenu(interaction);
                }

                // Selector de usuario para UserInfo
                if (customId.startsWith('userinfo_select_')) {
                    const selectedUserId = interaction.values[0];
                    const targetUser = await client.users.fetch(selectedUserId).catch(() => null);
                    if (!targetUser) {
                        return interaction.reply({ content: `${EMOJIS.ERROR} No se pudo obtener la información de ese usuario.`, ephemeral: true });
                    }

                    const targetMember = await interaction.guild.members.fetch(selectedUserId).catch(() => null);
                    const userinfoCmd = client.commands.get('userinfo');
                    if (userinfoCmd) {
                        const { embed, components } = userinfoCmd.buildUserEmbed(targetUser, targetMember, interaction.user.id);
                        return await interaction.update({ embeds: [embed], components: components });
                    }
                }

                // Selector de categoría para Help
                if (customId === 'help_select_category') {
                    const catKey = interaction.values[0].replace('help_cat_', '');
                    const catInfo = CONSTANTS.CATEGORIES[catKey] || { name: catKey.toUpperCase(), emoji: '📁' };
                    const prefix = db.getGuild(interaction.guild?.id || '').prefix || config.client.prefix;
                    
                    const cmds = [];
                    client.commands.forEach(cmd => {
                        if ((cmd.category || 'otros') === catKey) {
                            cmds.push(cmd);
                        }
                    });

                    const catEmbed = new EmbedBuilder()
                        .setColor(COLORS.PRIMARY)
                        .setTitle(`${catInfo.emoji} Categoría: ${catInfo.name}`)
                        .setDescription(cmds.length > 0
                            ? cmds.map(c => `• **\`${prefix}${c.name}\`** o **\`/${c.name}\`**\n  ↳ ${c.description}`).join('\n\n')
                            : '*No hay comandos en esta categoría.*'
                        )
                        .setFooter({ text: `Usa ${prefix}help <comando> para más información` })
                        .setTimestamp();

                    return await interaction.update({ embeds: [catEmbed] });
                }
            }
        } catch (error) {
            Logger.error(`Error en componentHandler [${interaction.customId || 'unknown'}]: ${error.stack}`);
            
            const replyContent = `${EMOJIS.ERROR} Ocurrió un error al procesar esta interacción.`;
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: replyContent, ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: replyContent, ephemeral: true }).catch(() => {});
            }
        }
    });

    Logger.success('Enrutador central de componentes, modales y menús cargado.');
};
