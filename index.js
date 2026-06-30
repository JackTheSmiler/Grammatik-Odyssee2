const express = require("express");
const webpush = require("web-push");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

/* ─── Env / Config ─── */
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BCEIrjtKZrjp5sfYF5TgdEGmg58Mso5zIL1lrDDo_iahzww-M2EFHRm0Mfxj7wohQPuofiF_l_f3v0ms4MuzBCM";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "PagmT46tZ2i-YS_SJGZsEMH976qM045Oco_DOCuspDE";
const PORT = process.env.PORT || 3000;
const SUBS_FILE = path.join(__dirname, "subscriptions.json");

webpush.setVapidDetails(
  "mailto:grammatik@odyssee.app",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

/* ─── Subscription-Persistence ─── */
function loadSubs() {
  try {
    if (!fs.existsSync(SUBS_FILE)) return [];
    return JSON.parse(fs.readFileSync(SUBS_FILE, "utf8"));
  } catch { return []; }
}
function saveSubs(subs) {
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
}

/* ─── Express ─── */
const app = express();
app.use(cors());
app.use(express.json());

/* PUBLIC KEY ausliefern */
app.get("/api/vapid-public-key", (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

/* Subscription speichern */
app.post("/api/subscribe", (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: "Ungültige Subscription" });
  const subs = loadSubs();
  /* Doppelte vermeiden */
  const exists = subs.some(s => s.endpoint === sub.endpoint);
  if (!exists) {
    subs.push(sub);
    saveSubs(subs);
    console.log(`✅ Subscription registriert: ${sub.endpoint.slice(0, 50)}...`);
  }
  res.json({ ok: true });
});

/* Subscription entfernen */
app.post("/api/unsubscribe", (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: "endpoint fehlt" });
  const subs = loadSubs().filter(s => s.endpoint !== endpoint);
  saveSubs(subs);
  console.log(`❌ Subscription entfernt: ${endpoint.slice(0, 50)}...`);
  res.json({ ok: true });
});

/* Manuellen Push auslösen (z.B. per Cron oder Admin-Aufruf) */
app.post("/api/notify", async (req, res) => {
  const { title, body } = req.body;
  const payload = JSON.stringify({
    title: title || "Grammatik-Odyssee",
    body: body || "🔥 Zeit für deine tägliche Grammatik-Übung!",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🔥%3C/text%3E%3C/svg%3E",
    badge: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E📚%3C/text%3E%3C/svg%3E",
    requireInteraction: true
  });
  const subs = loadSubs();
  let success = 0, fail = 0;
  await Promise.allSettled(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(sub, payload);
      success++;
    } catch (err) {
      /* Alte/ungültige Subscription entfernen */
      if (err.statusCode === 410 || err.statusCode === 404) {
        const rest = loadSubs().filter(s => s.endpoint !== sub.endpoint);
        saveSubs(rest);
      }
      fail++;
    }
  }));
  console.log(`📨 Push verschickt: ${success} ok, ${fail} fehlgeschlagen`);
  res.json({ ok: true, success, fail });
});

/* Streak-Risk-Push (wird von Cron-Job aufgerufen) */
app.post("/api/notify-streak-risk", async (req, res) => {
  const { dayStreak } = req.body;
  const body = dayStreak
    ? `⚠️ Du hast heute noch nicht gespielt! Verliere nicht deine ${dayStreak}-Tage-Streak! 🔥`
    : "🔥 Zeit für deine tägliche Grammatik-Übung!";
  const payload = JSON.stringify({
    title: "Grammatik-Odyssee: Streak-Risiko ⚠️",
    body,
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🔥%3C/text%3E%3Csvg%3E",
    badge: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E📚%3C/text%3E%3Csvg%3E",
    requireInteraction: true,
    tag: "streak-reminder"
  });
  const subs = loadSubs();
  let success = 0, fail = 0;
  await Promise.allSettled(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(sub, payload);
      success++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        const rest = loadSubs().filter(s => s.endpoint !== sub.endpoint);
        saveSubs(rest);
      }
      fail++;
    }
  }));
  res.json({ ok: true, success, fail });
});

app.listen(PORT, () => {
  console.log(`📡 Grammatik-Odyssee Push-Server läuft auf Port ${PORT}`);
  console.log(`🔑 VAPID Public Key: ${VAPID_PUBLIC_KEY.slice(0, 30)}...`);
});
