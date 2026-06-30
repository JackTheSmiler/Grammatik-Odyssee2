const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

console.log("╔══════════════════════════════════════════════════╗");
console.log("║       GRAMMATIK-ODYSSEE — VAPID KEYS            ║");
console.log("╚══════════════════════════════════════════════════╝");
console.log("");
console.log("🔑 PUBLIC KEY (kommt ins Frontend):");
console.log(keys.publicKey);
console.log("");
console.log("🔒 PRIVATE KEY (bleibt GEHEIM auf dem Server!):");
console.log(keys.privateKey);
console.log("");
console.log("──────────────────────────────────────────────────");
console.log("📝 In die .env-Datei eintragen:");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("");
console.log("📝 In der index.html / JS ersetzen:");
console.log('applicationServerKey: "' + keys.publicKey + '"');
