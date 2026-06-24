const express = require('express')
const cors = require('cors')
const path = require('path')
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  delay,
  downloadMediaMessage
} = require('@whiskeysockets/baileys')
const pino = require('pino')

const app = express()
const PORT = process.env.PORT || 3000
const PREFIX = '.'
const BOT_NAME = 'DENTSU-XMD'
const OWNER = 'NATSU242'
const NATSU_IMG = 'https://i.pinimg.com/736x/8e/42/e2/8e42e2f5c3a3e65c5a76c5d7c5a7b5a4.jpg'

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')))

const pairingSessions = new Map()
const botSessions = new Map()
const MAX_SESSIONS = 50

function getSessionCount() { return pairingSessions.size }

// ─── COMMANDS ───────────────────────────────────────────
const commands = {
  menu: { desc: 'Afficher le menu principal', category: 'General' },
  help: { desc: 'Aide sur une commande', category: 'General' },
  ping: { desc: 'Vérifier si le bot est actif', category: 'General' },
  sticker: { desc: 'Convertir une image en sticker', category: 'Media' },
  toimg: { desc: 'Convertir un sticker en image', category: 'Media' },
  play: { desc: 'Télécharger une musique YouTube', category: 'Media' },
  ytmp4: { desc: 'Télécharger une vidéo YouTube', category: 'Media' },
  tiktok: { desc: 'Télécharger une vidéo TikTok', category: 'Media' },
  instagram: { desc: 'Télécharger une vidéo Instagram', category: 'Media' },
  twitter: { desc: 'Télécharger une vidéo Twitter/X', category: 'Media' },
  alive: { desc: 'Vérifier que le bot est vivant', category: 'Info' },
  owner: { desc: 'Contacter le propriétaire', category: 'Info' },
  speed: { desc: 'Tester la vitesse du bot', category: 'Info' },
  uptime: { desc: 'Temps de fonctionnement du bot', category: 'Info' },
  kick: { desc: 'Expulser un membre du groupe', category: 'Groupe' },
  add: { desc: 'Ajouter un membre au groupe', category: 'Groupe' },
  promote: { desc: 'Promouvoir un membre admin', category: 'Groupe' },
  demote: { desc: 'Rétrograder un admin', category: 'Groupe' },
  tagall: { desc: 'Mentionner tous les membres', category: 'Groupe' },
  antilink: { desc: 'Activer/désactiver anti-lien', category: 'Groupe' },
  mute: { desc: 'Rendre le groupe silencieux', category: 'Groupe' },
  unmute: { desc: 'Réactiver les messages du groupe', category: 'Groupe' },
  ban: { desc: 'Bannir un utilisateur', category: 'Admin' },
  unban: { desc: 'Débannir un utilisateur', category: 'Admin' },
  broadcast: { desc: 'Envoyer un message à tous', category: 'Admin' },
  pair: { desc: 'Générer un code de jumelage', category: 'Bot' },
  setpic: { desc: 'Changer la photo de profil du bot', category: 'Bot' },
  setname: { desc: 'Changer le nom du bot', category: 'Bot' },
}

function buildMenuText(senderName) {
  const cats = {}
  for (const [cmd, info] of Object.entries(commands)) {
    if (!cats[info.category]) cats[info.category] = []
    cats[info.category].push({ cmd, desc: info.desc })
  }

  const now = new Date()
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('fr-FR')

  let menu = `╔══════════════════╗\n`
  menu += `║   🔥 ${BOT_NAME} 🔥   ║\n`
  menu += `╚══════════════════╝\n\n`
  menu += `👤 *Utilisateur:* ${senderName}\n`
  menu += `🕐 *Heure:* ${time} | 📅 ${date}\n`
  menu += `⚡ *Préfixe:* ${PREFIX}\n\n`
  menu += `━━━━━━━━━━━━━━━━━━━\n\n`

  for (const [cat, cmds] of Object.entries(cats)) {
    const icons = {
      General: '🌐', Media: '🎵', Info: 'ℹ️', Groupe: '👥', Admin: '🛡️', Bot: '🤖'
    }
    menu += `${icons[cat] || '▸'} *${cat.toUpperCase()}*\n`
    for (const { cmd, desc } of cmds) {
      menu += `  ┣ \`${PREFIX}${cmd}\` — ${desc}\n`
    }
    menu += `\n`
  }

  menu += `━━━━━━━━━━━━━━━━━━━\n`
  menu += `📌 *Owner:* ${OWNER}\n`
  menu += `🌐 *GitHub:* github.com/natsu242/dentsu-xmd-bot\n`

  return menu
}

// ─── BOT HANDLER (session persistante) ──────────────────
async function startBot(sessionPath) {
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: [BOT_NAME, 'Chrome', '1.0.0'],
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue

      const body =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption || ''

      if (!body.startsWith(PREFIX)) continue

      const args = body.slice(PREFIX.length).trim().split(/\s+/)
      const cmd = args.shift().toLowerCase()
      const jid = msg.key.remoteJid
      const senderJid = msg.key.participant || msg.key.remoteJid
      const senderName = msg.pushName || senderJid.split('@')[0]
      const startTime = Date.now()

      const reply = (text) =>
        sock.sendMessage(jid, { text }, { quoted: msg })

      const replyImg = (url, caption) =>
        sock.sendMessage(jid, { image: { url }, caption }, { quoted: msg })

      switch (cmd) {
        case 'menu':
        case 'help': {
          const menuText = buildMenuText(senderName)
          try {
            await sock.sendMessage(jid, {
              image: { url: 'https://i.pinimg.com/736x/f2/2c/17/f22c17b08f8a1e7e1c4e0e5d1b4fdb6d.jpg' },
              caption: menuText
            }, { quoted: msg })
          } catch {
            await reply(menuText)
          }
          break
        }

        case 'ping': {
          const ms = Date.now() - startTime
          await reply(`🏓 *PONG!*\n⚡ Vitesse: ${ms}ms`)
          break
        }

        case 'alive': {
          await reply(
            `🔥 *${BOT_NAME} est vivant !*\n\n` +
            `👤 *Owner:* ${OWNER}\n` +
            `⚡ *Préfixe:* ${PREFIX}\n` +
            `📦 *Commandes:* ${Object.keys(commands).length}\n` +
            `🟢 *Status:* En ligne`
          )
          break
        }

        case 'ping':
        case 'speed': {
          const ms = Date.now() - startTime
          await reply(`⚡ *Vitesse du bot:* ${ms}ms`)
          break
        }

        case 'owner': {
          await reply(
            `👑 *Propriétaire du bot*\n\n` +
            `📛 *Nom:* ${OWNER}\n` +
            `🔗 *GitHub:* github.com/natsu242\n` +
            `🌐 *Site:* dentsu-xmd-bot.vercel.app`
          )
          break
        }

        case 'uptime': {
          const upMs = process.uptime() * 1000
          const h = Math.floor(upMs / 3600000)
          const m = Math.floor((upMs % 3600000) / 60000)
          const s = Math.floor((upMs % 60000) / 1000)
          await reply(`⏱️ *Uptime du bot:* ${h}h ${m}m ${s}s`)
          break
        }

        case 'pair': {
          const num = args[0]
          if (!num) return reply(`❌ Usage: ${PREFIX}pair <numéro>\nEx: ${PREFIX}pair 2126XXXXXXXX`)
          await reply(`⏳ Génération du code pour *${num}*...`)
          try {
            const res = await fetch(`http://localhost:${PORT}/api/pair`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ number: num })
            })
            const data = await res.json()
            if (data.code) {
              await reply(`🔑 *Code de jumelage:*\n\n\`\`\`${data.code}\`\`\`\n\n📌 Entrez ce code dans WhatsApp → Appareils liés → Lier un appareil`)
            } else {
              await reply(`❌ ${data.error || 'Erreur lors de la génération'}`)
            }
          } catch {
            await reply(`❌ Erreur serveur. Réessayez.`)
          }
          break
        }

        default: {
          await reply(
            `❌ Commande *${PREFIX}${cmd}* inconnue.\n` +
            `Tapez *${PREFIX}menu* pour voir les commandes disponibles.`
          )
        }
      }
    }
  })

  return sock
}

// ─── PAIRING CODE API ───────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({ active: getSessionCount(), limit: MAX_SESSIONS, status: 'online' })
})

app.post('/api/pair', async (req, res) => {
  const { number } = req.body
  if (!number) return res.status(400).json({ error: 'Numéro requis' })

  const clean = number.replace(/[^0-9]/g, '')
  if (clean.length < 7) return res.status(400).json({ error: 'Numéro invalide — inclure le code pays' })
  if (pairingSessions.size >= MAX_SESSIONS) return res.status(503).json({ error: 'Serveur plein — réessayez plus tard' })

  const sessionId = `pair_${clean}_${Date.now()}`
  const sessionPath = path.join('/tmp', sessionId)

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: [BOT_NAME, 'Chrome', '1.0.0'],
    })

    pairingSessions.set(sessionId, sock)
    sock.ev.on('creds.update', saveCreds)

    await delay(1500)

    const code = await sock.requestPairingCode(clean)

    sock.ev.on('connection.update', ({ connection }) => {
      if (connection === 'close' || connection === 'open') {
        pairingSessions.delete(sessionId)
        try { sock.end() } catch {}
      }
    })

    setTimeout(() => {
      pairingSessions.delete(sessionId)
      try { sock.end() } catch {}
    }, 120000)

    return res.json({ code, number: clean })

  } catch (err) {
    pairingSessions.delete(sessionId)
    return res.status(500).json({ error: 'Échec de génération. Vérifiez le numéro.' })
  }
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

app.listen(PORT, () => {
  console.log(`${BOT_NAME} server running on port ${PORT}`)
})
