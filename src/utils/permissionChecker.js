const { PermissionsBitField } = require('discord.js');
const { MESSAGES } = require('../variables');

/**
 * Validador de Permisos para Comandos Slash y Prefix
 */
class PermissionChecker {
    /**
     * Valida permisos del usuario y del bot
     * @param {Object} context - Objeto de interacción o mensaje
     * @param {Array} userPermissions - Permisos requeridos para el usuario
     * @param {Array} botPermissions - Permisos requeridos para el bot
     * @returns {Object} { hasPermission: boolean, error: string|null }
     */
    static check(context, userPermissions = [], botPermissions = []) {
        const member = context.member;
        const guild = context.guild;

        if (!guild) {
            return { hasPermission: true, error: null };
        }

        const botMember = guild.members.me;

        // Comprobar permisos del bot
        if (botPermissions.length > 0 && botMember) {
            for (const perm of botPermissions) {
                if (!botMember.permissions.has(PermissionsBitField.Flags[perm] || perm)) {
                    return {
                        hasPermission: false,
                        error: MESSAGES.ERRORS.BOT_NO_PERMISSION(perm)
                    };
                }
            }
        }

        // Comprobar permisos del usuario
        if (userPermissions.length > 0 && member) {
            for (const perm of userPermissions) {
                if (!member.permissions.has(PermissionsBitField.Flags[perm] || perm)) {
                    return {
                        hasPermission: false,
                        error: MESSAGES.ERRORS.NO_PERMISSION
                    };
                }
            }
        }

        return { hasPermission: true, error: null };
    }
}

module.exports = PermissionChecker;
