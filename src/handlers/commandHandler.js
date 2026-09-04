const fs = require('fs');
const path = require('path');
const { REST, Routes, Collection } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');

module.exports = (client) => {
    client.commands = new Collection();
    client.aliases = new Collection();
    client.slashCommandsData = [];

    const commandsPath = path.join(__dirname, '../commands');
    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath, { recursive: true });
    }

    const categories = fs.readdirSync(commandsPath);

    let totalCommands = 0;

    for (const category of categories) {
        const categoryPath = path.join(commandsPath, category);
        if (!fs.statSync(categoryPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(categoryPath, file);
            try {
                // Eliminar de la caché para permitir hot-reload
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                const cmdName = command.name || (command.data && command.data.name);

                if (!cmdName) {
                    Logger.warn(`El archivo ${file} no tiene una propiedad 'name' válida.`);
                    continue;
                }

                // Normalizar propiedad de categoría si no está presente
                command.category = command.category || category;
                command.name = cmdName;

                // Registrar en la colección principal
                client.commands.set(cmdName.toLowerCase(), command);
                totalCommands++;

                // Registrar alias para comandos de prefijo
                if (Array.isArray(command.aliases)) {
                    for (const alias of command.aliases) {
                        client.aliases.set(alias.toLowerCase(), cmdName.toLowerCase());
                    }
                }

                // Guardar datos para registro de Slash Commands
                if (command.data) {
                    client.slashCommandsData.push(
                        typeof command.data.toJSON === 'function' ? command.data.toJSON() : command.data
                    );
                }
            } catch (err) {
                Logger.error(`Error al cargar el comando ${file}: ${err.stack}`);
            }
        }
    }

    Logger.success(`Se cargaron ${totalCommands} comandos híbridos (Slash + Prefix) en ${categories.length} categorías.`);

    // Función para registrar los comandos Slash en Discord
    client.registerSlashCommands = async () => {
        if (!config.client.token || !config.client.id) {
            Logger.warn('TOKEN o CLIENT_ID no configurados. Omitiendo registro de Slash Commands en la API.');
            return;
        }

        const rest = new REST({ version: '10' }).setToken(config.client.token);

        try {
            Logger.info(`Registrando ${client.slashCommandsData.length} Slash Commands en Discord...`);

            let registered = false;
            if (config.client.guildId) {
                try {
                    await rest.put(
                        Routes.applicationGuildCommands(config.client.id, config.client.guildId),
                        { body: client.slashCommandsData }
                    );
                    Logger.success(`Comandos Slash registrados instantáneamente en el servidor: ${config.client.guildId}`);
                    registered = true;
                } catch (guildErr) {
                    Logger.warn(`No se pudo registrar en el servidor de pruebas (${config.client.guildId}): ${guildErr.message}. Intentando registro global...`);
                }
            }

            if (!registered) {
                await rest.put(
                    Routes.applicationCommands(config.client.id),
                    { body: client.slashCommandsData }
                );
                Logger.success('Comandos Slash registrados exitosamente a nivel global.');
            }
        } catch (error) {
            Logger.error(`Error al registrar Slash Commands: ${error.message}`);
            if (error.message.includes('Missing Access')) {
                Logger.warn('CONSEJO: Verifica que el bot fue invitado a tu servidor con el permiso de scope "applications.commands" en el Discord Developer Portal.');
            }
        }
    };
};
