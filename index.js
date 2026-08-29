const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const config = require('./config');

global.commands = new Map();

// 🔌 Load all plugin commands dynamically
function loadPlugins() {
    const pluginFolder = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginFolder)) {
        fs.mkdirSync(pluginFolder);
    }

    const files = fs.readdirSync(pluginFolder).filter(file => file.endsWith('.js'));
    for (const file of files) {
        try {
            const pluginPath = path.join(pluginFolder, file);
            delete require.cache[require.resolve(pluginPath)];
            const plugin = require(pluginPath);
            if (plugin.name) {
                global.commands.set(plugin.name, plugin);
                if (plugin.alias && Array.isArray(plugin.alias)) {
                    plugin.alias.forEach(a => global.commands.set(a, plugin));
                }
            }
        } catch (err) {
            console.error(`❌ Error loading plugin ${file}:`, err);
        }
    }
    console.log(`✅ Loaded ${global.commands.size} commands/aliases successfully.`);
}

async function startBot() {
    loadPlugins();
    const { state, saveCreds } = await useMultiFileAuthState('./session');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: ['ᴇᴠᴀ-ᴍᴀʀɪʏᴀ🕊️', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🔄 Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(`\n🎉 Bot Connected Successfully!`);
            console.log(`🤖 Bot Name: ${config.BOT_NAME}`);
            console.log(`👑 Owner Name: ${config.OWNER_NAME}`);
        }
    });

    // 📩 Message Handler with Built-in Anti-Spam & Self-Response Protection
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            if (type !== 'notify') return;
            const msg = messages[0];
            if (!msg || !msg.message) return;

            // 🛡️ ANTI-SPAM & SELF-RESPONSE FIX
            if (msg.key.fromMe) return; // Swantham messages fully ignore cheyyum
            if (msg.key.id?.startsWith('BAE5') || msg.key.id?.startsWith('3EB0')) return; // Other bot prefix check

            const jid = msg.key.remoteJid;
            if (!jid) return;

            const text = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || 
                         msg.message.imageMessage?.caption || 
                         msg.message.videoMessage?.caption || '';

            if (!text.startsWith(config.PREFIX)) return;

            const args = text.slice(config.PREFIX.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command = global.commands.get(commandName);
            if (command) {
                await command.execute(sock, msg, args);
            }
        } catch (err) {
            console.error('❌ Error handling message:', err);
        }
    });
}

startBot();

