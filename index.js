const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('EVA-MARIYA Bot is Active!'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const config = require('./config');

global.commands = new Map();

const pluginsDir = path.join(__dirname, 'plugins');
if (fs.existsSync(pluginsDir)) {
    const pluginFiles = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
    for (const file of pluginFiles) {
        const plugin = require(path.join(pluginsDir, file));
        if (plugin.name) {
            global.commands.set(plugin.name, plugin);
            if (plugin.alias && Array.isArray(plugin.alias)) {
                plugin.alias.forEach(alias => global.commands.set(alias, plugin));
            }
        }
    }
}

async function startBot() {
    // Clear old corrupted session to get fresh pairing code
    const sessionPath = path.join(__dirname, 'session');
    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath);
    }

    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            let phoneNumber = config.OWNER_NUMBER.replace(/[^0-9]/g, '');
            let code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n========================================\n`);
            console.log(`🔑 YOUR BRAND NEW PAIRING CODE: ${code}`);
            console.log(`\n========================================\n`);
        }, 4000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log('Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Connected successfully! EVA-MARIYA is active.');
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg.message) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            if (!text.startsWith(config.PREFIX)) return;

            const args = text.slice(config.PREFIX.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command = global.commands.get(commandName);
            if (command) {
                await command.execute(sock, msg, args);
            }
        } catch (err) {
            console.error('Error handling message:', err);
        }
    });
}

startBot();
