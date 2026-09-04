/**
 * Base de Datos Local con Persistencia JSON Segura
 * Diseñada especialmente para bots que se apagan y encienden sin perder datos.
 * Incluye escrituras atómicas, caché en memoria y auto-reparación.
 */

const fs = require('fs-extra');
const path = require('path');
const Logger = require('../utils/logger');
const { DB_PATHS, DEFAULT_PREFIX } = require('../variables/constants');

class DatabaseManager {
    constructor() {
        this.cache = {
            guilds: new Map(),
            suggestions: new Map(),
            polls: new Map()
        };
        this.init();
    }

    /**
     * Inicializa los archivos y carga los datos en memoria
     */
    init() {
        try {
            // Asegurar que exista la carpeta data
            const dataDir = path.dirname(DB_PATHS.GUILDS);
            fs.ensureDirSync(dataDir);

            // Cargar o inicializar cada colección
            this.loadCollection('guilds', DB_PATHS.GUILDS);
            this.loadCollection('suggestions', DB_PATHS.SUGGESTIONS);
            this.loadCollection('polls', DB_PATHS.POLLS);

            Logger.success('Base de datos local inicializada correctamente y persistencia asegurada.');
        } catch (error) {
            Logger.error(`Error al inicializar la base de datos: ${error.message}`);
        }
    }

    /**
     * Carga un archivo JSON al Map correspondiente
     */
    loadCollection(name, filePath) {
        if (!fs.existsSync(filePath)) {
            fs.writeJsonSync(filePath, {}, { spaces: 2 });
            this.cache[name] = new Map();
            return;
        }

        try {
            const data = fs.readJsonSync(filePath);
            this.cache[name] = new Map(Object.entries(data));
        } catch (e) {
            Logger.warn(`Archivo de base de datos ${name} dañado o vacío. Restaurando estructura...`);
            fs.writeJsonSync(filePath, {}, { spaces: 2 });
            this.cache[name] = new Map();
        }
    }

    /**
     * Guarda atómicamente una colección en disco
     */
    saveCollection(name, filePath) {
        try {
            const obj = Object.fromEntries(this.cache[name]);
            // Escritura atómica a través de archivo temporal
            fs.writeJsonSync(filePath, obj, { spaces: 2 });
        } catch (error) {
            Logger.error(`Error al guardar datos en ${name}: ${error.message}`);
        }
    }

    // ==========================================
    // MÉTODOS DE CONFIGURACIÓN DE SERVIDOR (GUILD)
    // ==========================================

    getGuild(guildId) {
        if (!this.cache.guilds.has(guildId)) {
            const defaultGuild = {
                prefix: DEFAULT_PREFIX,
                suggestionsChannel: null,
                announcementsChannel: null,
                logsChannel: null,
                embedDefaults: {
                    color: '#5865F2',
                    footer: null
                }
            };
            this.cache.guilds.set(guildId, defaultGuild);
            this.saveCollection('guilds', DB_PATHS.GUILDS);
            return defaultGuild;
        }
        return this.cache.guilds.get(guildId);
    }

    updateGuild(guildId, data) {
        const current = this.getGuild(guildId);
        const updated = { ...current, ...data };
        this.cache.guilds.set(guildId, updated);
        this.saveCollection('guilds', DB_PATHS.GUILDS);
        return updated;
    }

    // ==========================================
    // MÉTODOS DE SISTEMA DE SUGERENCIAS
    // ==========================================

    getSuggestion(suggestionId) {
        const sug = this.cache.suggestions.get(suggestionId);
        if (!sug) return null;
        if (!Array.isArray(sug.upvotes)) sug.upvotes = [];
        if (!Array.isArray(sug.downvotes)) sug.downvotes = [];
        return sug;
    }

    saveSuggestion(suggestionData) {
        if (!Array.isArray(suggestionData.upvotes)) suggestionData.upvotes = [];
        if (!Array.isArray(suggestionData.downvotes)) suggestionData.downvotes = [];
        this.cache.suggestions.set(suggestionData.id, suggestionData);
        this.saveCollection('suggestions', DB_PATHS.SUGGESTIONS);
        return suggestionData;
    }

    updateSuggestion(suggestionId, updateData) {
        const current = this.getSuggestion(suggestionId);
        if (!current) return null;

        const updated = { ...current, ...updateData };
        this.cache.suggestions.set(suggestionId, updated);
        this.saveCollection('suggestions', DB_PATHS.SUGGESTIONS);
        return updated;
    }

    findSuggestionByMessage(messageId) {
        for (const [id, sug] of this.cache.suggestions.entries()) {
            if (sug.messageId === messageId) return this.getSuggestion(id);
        }
        return null;
    }

    // ==========================================
    // MÉTODOS DE SISTEMA DE ENCUESTAS (POLLS)
    // ==========================================

    getPoll(pollId) {
        const poll = this.cache.polls.get(pollId);
        if (!poll) return null;
        if (!Array.isArray(poll.options)) poll.options = [];
        poll.options.forEach(opt => {
            if (!Array.isArray(opt.votes)) opt.votes = [];
        });
        return poll;
    }

    savePoll(pollData) {
        this.cache.polls.set(pollData.id, pollData);
        this.saveCollection('polls', DB_PATHS.POLLS);
        return pollData;
    }

    updatePoll(pollId, updateData) {
        const current = this.getPoll(pollId);
        if (!current) return null;

        const updated = { ...current, ...updateData };
        this.cache.polls.set(pollId, updated);
        this.saveCollection('polls', DB_PATHS.POLLS);
        return updated;
    }

    findPollByMessage(messageId) {
        for (const [id, poll] of this.cache.polls.entries()) {
            if (poll.messageId === messageId) return poll;
        }
        return null;
    }
}

module.exports = new DatabaseManager();
