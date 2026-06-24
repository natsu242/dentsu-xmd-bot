# DENTSU-XMD 🔥

Bot WhatsApp — Générateur de code de jumelage avec Baileys

## Architecture

```
Vercel (frontend HTML/CSS/JS)
       ↓ proxy /api/*
Render (backend Node.js + Baileys)
       ↓
WhatsApp
```

## 🚀 Déploiement — Étape par étape

### ÉTAPE 1 — Backend sur Render.com (OBLIGATOIRE EN PREMIER)

1. Va sur https://render.com → créer un compte gratuit
2. Clique **New → Web Service**
3. Connecte GitHub → sélectionne `dentsu-xmd-bot`
4. Configure :
   - **Name** : `dentsu-xmd-bot`
   - **Build Command** : `npm install`
   - **Start Command** : `node src/index.js`
   - **Environment** : `Node`
5. Clique **Deploy** → attends 2-3 minutes
6. Tu obtiens une URL comme : `https://dentsu-xmd-bot.onrender.com`
7. **Copie cette URL !**

### ÉTAPE 2 — Mettre à jour vercel.json

Dans le fichier `vercel.json`, remplace `REMPLACE_PAR_TON_URL_RENDER` par ton URL Render :

```json
"destination": "https://dentsu-xmd-bot.onrender.com/api/:path*"
```

### ÉTAPE 3 — Déployer sur Vercel

1. Va sur https://vercel.com
2. **New Project** → importe `natsu242/dentsu-xmd-bot`
3. **Ne change rien** dans les paramètres
4. Clique **Deploy**
5. Ton site est en ligne ! 🎉

## Commandes bot (préfixe .)

| Commande | Description |
|---|---|
| `.menu` | Menu principal avec photo Natsu |
| `.ping` | Tester le bot |
| `.alive` | Statut du bot |
| `.sticker` | Image → Sticker |
| `.play` | Télécharger musique YouTube |
| `.tiktok` | Télécharger vidéo TikTok |
| `.ytmp4` | Télécharger vidéo YouTube |
| `.tagall` | Mentionner tout le groupe |
| `.kick` | Expulser un membre |
| `.pair` | Générer code de jumelage |
| `.uptime` | Temps de fonctionnement |
| `.owner` | Contact propriétaire |
