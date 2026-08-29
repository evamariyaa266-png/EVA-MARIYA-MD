module.exports = {
    name: "ping",
    alias: ["speed", "p"],
    category: "main",
    async execute(sock, msg, args) {
        const start = Date.now();
        const jid = msg.key.remoteJid;
        
        // ⚡ Reaction
        await sock.sendMessage(jid, { react: { text: "⚡", key: msg.key } });
        
        const latency = Date.now() - start;
        
        await sock.sendMessage(jid, { 
            text: `⚡ *Pong!*\n\n Speed: *${latency}ms*\n🤖 Bot: *ᴇᴠᴀ-ᴍᴀʀɪʏᴀ🕊️*` 
        }, { quoted: msg });
    }
};

