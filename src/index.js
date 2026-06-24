'use strict'

  process.on('uncaughtException', (err) => {
    console.error('FATAL:', err.message, err.stack)
    process.exit(1)
  })
  process.on('unhandledRejection', (reason) => {
    console.error('REJECTION:', reason)
    process.exit(1)
  })

  // ── Baileys chargé UNE SEULE FOIS au démarrage ───────────
  const {
    makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    DisconnectReason
  } = require('@whiskeysockets/baileys')
  const pino    = require('pino')
  const express = require('express')
  const cors    = require('cors')
  const path    = require('path')

  const app      = express()
  const PORT     = process.env.PORT || 3000
  const PREFIX   = '.'
  const BOT_NAME = 'DENTSU-XMD'
  const OWNER    = 'NATSU242'

  app.use(cors())
  app.use(express.json())
  app.use(express.static(path.join(__dirname, '../public')))

  const pairingSessions = new Map()
  const MAX_SESSIONS    = 50

  // ── COMMANDS ─────────────────────────────────────────────
  const commands = {
    menu:      { desc: 'Afficher le menu principal',        category: 'General' },
    ping:      { desc: 'Vérifier si le bot est actif',      category: 'General' },
    alive:     { desc: 'Vérifier que le bot est vivant',    category: 'General' },
    owner:     { desc: 'Contacter le propriétaire',         category: 'General' },
    uptime:    { desc: 'Temps de fonctionnement du bot',    category: 'General' },
    sticker:   { desc: 'Convertir une image en sticker',    category: 'Media'   },
    toimg:     { desc: 'Convertir un sticker en image',     category: 'Media'   },
    play:      { desc: 'Télécharger une musique YouTube',   category: 'Media'   },
    ytmp4:     { desc: 'Télécharger une vidéo YouTube',     category: 'Media'   },
    tiktok:    { desc: 'Télécharger une vidéo TikTok',      category: 'Media'   },
    instagram: { desc: 'Télécharger une vidéo Instagram',   category: 'Media'   },
    kick:      { desc: 'Expulser un membre du groupe',      category: 'Groupe'  },
    add:       { desc: 'Ajouter un membre au groupe',       category: 'Groupe'  },
    promote:   { desc: 'Promouvoir un membre admin',        category: 'Groupe'  },
    demote:    { desc: 'Rétrograder un admin',              category: 'Groupe'  },
    tagall:    { desc: 'Mentionner tous les membres',       category: 'Groupe'  },
    antilink:  { desc: 'Activer/désactiver anti-lien',      category: 'Groupe'  },
    mute:      { desc: 'Rendre le groupe silencieux',       category: 'Groupe'  },
    unmute:    { desc: 'Réactiver les messages',            category: 'Groupe'  },
    ban:       { desc: 'Bannir un utilisateur',             category: 'Admin'   },
    broadcast: { desc: 'Envoyer un message à tous',         category: 'Admin'   },
    pair:      { desc: 'Générer un code de jumelage',       category: 'Bot'     },
  }

  function buildMenuText(senderName) {
    const cats = {}
    for (const [cmd, info] of Object.entries(commands)) {
      if (!cats[info.category]) cats[info.category] = []
      cats[info.category].push({ cmd, desc: info.desc })
    }
    const now   = new Date()
    const time  = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const date  = now.toLocaleDateString('fr-FR')
    const icons = { General: '🌐', Media: '🎵', Groupe: '👥', Admin: '🛡️', Bot: '🤖' }
    let menu = '╔══════════════════╗\n║  🔥 ' + BOT_NAME + ' 🔥  ║\n╚══════════════════╝\n\n'
    menu += '👤 *Utilisateur:* ' + senderName + '\n🕐 *Heure:* ' + time + ' | 📅 ' + date + '\n⚡ *Préfixe:* ' + PREFIX + '\n\n━━━━━━━━━━━━━━━━━━━\n\n'
    for (const [cat, cmds] of Object.entries(cats)) {
      menu += (icons[cat] || '▸') + ' *' + cat.toUpperCase() + '*\n'
      for (const { cmd, desc } of cmds) menu += '  ┣ `' + PREFIX + cmd + '` — ' + desc + '\n'
      menu += '\n'
    }
    menu += '━━━━━━━━━━━━━━━━━━━\n📌 *Owner:* ' + OWNER + '\n'
    return menu
  }

  // ── API STATUS ────────────────────────────────────────────
  app.get('/api/status', (_req, res) => {
    res.json({ active: pairingSessions.size, limit: MAX_SESSIONS, status: 'online' })
  })

  // ── PAIRING CODE — corrigé ────────────────────────────────
  app.post('/api/pair', async (req, res) => {
    const { number } = req.body
    if (!number) return res.status(400).json({ error: 'Numéro requis' })

    // Nettoyer : garder uniquement les chiffres
    const clean = number.replace(/[^0-9]/g, '')
    if (clean.length < 7)  return res.status(400).json({ error: 'Numéro invalide — inclure le code pays (ex: 2126XXXXXXXX)' })
    if (pairingSessions.size >= MAX_SESSIONS) return res.status(503).json({ error: 'Serveur plein — réessayez plus tard' })

    const sessionId   = 'pair_' + clean + '_' + Date.now()
    const sessionPath = path.join('/tmp', sessionId)

    let sock = null

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

      sock = makeWASocket({
        version: [2, 3000, 1015901307],
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        // Fingerprint standard Ubuntu Chrome — WhatsApp l'accepte
        browser: Browsers.ubuntu('Chrome'),
        // Désactiver les fonctions inutiles pour la génération de code
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        getMessage: async () => undefined,
      })

      pairingSessions.set(sessionId, sock)
      sock.ev.on('creds.update', saveCreds)

      // Attendre que le socket soit prêt à faire la requête
      await delay(3000)

      // requestPairingCode — numéro en chiffres purs, sans @s.whatsapp.net
      const code = await sock.requestPairingCode(clean)

      console.log('✅ Pairing code generated for', clean, ':', code)

      // Nettoyer après 2 minutes
      const cleanup = () => {
        pairingSessions.delete(sessionId)
        try { sock.end() } catch (_) {}
      }

      sock.ev.on('connection.update', ({ connection }) => {
        if (connection === 'open' || connection === 'close') cleanup()
      })
      setTimeout(cleanup, 120000)

      // Formater le code : XXXXXXXX → XXXX-XXXX
      const raw = (code || '').replace(/-/g, '')
      const formatted = raw.length >= 8 ? raw.slice(0, 4) + '-' + raw.slice(4, 8) : code

      return res.json({ code: formatted, raw: code, number: clean })

    } catch (err) {
      pairingSessions.delete(sessionId)
      if (sock) try { sock.end() } catch (_) {}
      console.error('❌ Pair error:', err.message)
      console.error(err.stack)
      return res.status(500).json({ error: 'Échec: ' + err.message })
    }
  })

  // ── FRONTEND ──────────────────────────────────────────────
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'))
  })

  app.listen(PORT, () => {
    console.log('✅ ' + BOT_NAME + ' server ready on port ' + PORT)
  })
  