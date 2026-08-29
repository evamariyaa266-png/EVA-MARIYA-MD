module.exports = {
    name: "ping",
    async execute(sock, msg, args) {
        await sock.sendMessage(msg.key.remoteJid, { text: "ᴇᴠᴀ-ᴍᴀʀɪʏ🇦🕊️" }, { quoted: msg });
    }
};
