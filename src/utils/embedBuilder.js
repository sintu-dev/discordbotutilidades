const { EmbedBuilder } = require('discord.js');
const { COLORS, EMOJIS, CONSTANTS } = require('../variables');

/**
 * Generador Auxiliar de Embeds Estandarizados
 */
class EmbedHelper {
    /**
     * Embed de Éxito
     */
    static success(title, description) {
        return new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle(`${EMOJIS.SUCCESS} ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    /**
     * Embed de Error
     */
    static error(title, description) {
        return new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle(`${EMOJIS.ERROR} ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    /**
     * Embed de Advertencia
     */
    static warning(title, description) {
        return new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle(`${EMOJIS.WARNING} ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    /**
     * Embed de Información General
     */
    static info(title, description) {
        return new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${EMOJIS.INFO} ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    /**
     * Valida una URL para imágenes
     */
    static isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        try {
            const parsed = new URL(url);
            return (parsed.protocol === 'http:' || parsed.protocol === 'https:');
        } catch {
            return false;
        }
    }

    /**
     * Valida y formatea un color hexadecimal
     */
    static parseHexColor(hex) {
        if (!hex) return COLORS.PRIMARY;
        let clean = hex.trim().replace('#', '');
        if (clean.length === 3) {
            clean = clean.split('').map(c => c + c).join('');
        }
        if (/^[0-9A-Fa-f]{6}$/.test(clean)) {
            return `#${clean.toUpperCase()}`;
        }
        return COLORS.PRIMARY;
    }
}

module.exports = EmbedHelper;
