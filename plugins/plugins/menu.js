const config = require('../config');

module.exports = {
  name: "menu",
  alias: ["help", "commands"],
  category: "main",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const pushname = msg.pushName || "User";

    // 🐦 Reaction
    await sock.sendMessage(jid, { react: { text: "🐦", key: msg.key } });

    // ⏱️ Uptime Calculation
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    const uptimeText = `${h}h ${m}m ${s}s`;

    // Category sorting logic
    const commandsList = Array.from(global.commands.values());
    const uniqueCommands = [...new Set(commandsList)];
    
    const categories = {};
    for (const cmd of uniqueCommands) {
      const cat = (cmd.category || "other").toUpperCase();
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(`${config.PREFIX}${cmd.name}`);
    }

    let menu = `• 🕊️ *${config.BOT_NAME}* 🕊️\n\n`;
    menu += `┌─── ❖\n`;
    menu += `│ 👤 USER : ${pushname}\n`;
    menu += `│ 👑 OWNER : ${config.OWNER_NAME}\n`;
    menu += `│ 📍 PREFIX : ${config.PREFIX}\n`;
    menu += `│ 🌐 MODE : ${config.MODE.toUpperCase()}\n`;
    menu += `│ ⏱️ UPTIME : ${uptimeText}\n`;
    menu += `│ 🧩 COMMANDS : ${uniqueCommands.length}\n`;
    menu += `└─── ❖\n\n`;

    for (const category of Object.keys(categories)) {
      menu += `┌─── ❖ [ ${category} ] ─── ❖\n`;
      for (const cmd of categories[category]) {
        menu += `│ ♡ ${cmd}\n`;
      }
      menu += `└─── ❖\n\n`;
    }

    menu += `> *Powered by ${config.BOT_NAME}*`;

    // 🖼️ Send Menu Image
    await sock.sendMessage(jid, {
      image: { url: config.MENU_IMAGE },
      caption: menu
    }, { quoted: msg });
  }
};
        
