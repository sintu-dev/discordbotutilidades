const chalk = require('chalk');
const moment = require('moment');

/**
 * Sistema de Logs Profesional
 */
class Logger {
    static get timestamp() {
        return `[${moment().format('YYYY-MM-DD HH:mm:ss')}]`;
    }

    static info(content) {
        console.log(`${chalk.gray(this.timestamp)} ${chalk.blue('INFO')} ${content}`);
    }

    static warn(content) {
        console.log(`${chalk.gray(this.timestamp)} ${chalk.yellow('WARN')} ${content}`);
    }

    static error(content) {
        console.error(`${chalk.gray(this.timestamp)} ${chalk.red('ERROR')} ${content}`);
    }

    static success(content) {
        console.log(`${chalk.gray(this.timestamp)} ${chalk.green('SUCCESS')} ${content}`);
    }

    static ai(content) {
        console.log(`${chalk.gray(this.timestamp)} ${chalk.magenta('AI')} ${content}`);
    }
}

module.exports = Logger;
