const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'debug-output.txt');

// Ensure log file exists or clear it on start? 
// Let's append, but maybe we want a fresh start sometimes?
// For now, simple append.

function formatMessage(level, message, meta = null) {
    const timestamp = new Date().toISOString();
    let logLine = `[${timestamp}] [${level}] ${message}`;
    if (meta) {
        if (meta instanceof Error) {
            logLine += `\nStack: ${meta.stack}`;
        } else if (typeof meta === 'object') {
            logLine += ` ${JSON.stringify(meta)}`;
        } else {
            logLine += ` ${meta}`;
        }
    }
    return logLine;
}

function writeLog(level, message, meta) {
    const logLine = formatMessage(level, message, meta);

    // Console output with colors
    const colors = {
        INFO: '\x1b[36m', // Cyan
        WARN: '\x1b[33m', // Yellow
        ERROR: '\x1b[31m', // Red
        RESET: '\x1b[0m'
    };

    console.log(`${colors[level] || ''}${logLine}${colors.RESET}`);

    // File output (strip colors?)
    // fs.appendFileSync(LOG_FILE, logLine + '\n');
}

const logger = {
    info: (msg, meta) => writeLog('INFO', msg, meta),
    warn: (msg, meta) => writeLog('WARN', msg, meta),
    error: (msg, meta) => writeLog('ERROR', msg, meta)
};

module.exports = logger;
