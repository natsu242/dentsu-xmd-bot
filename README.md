# DENTSU-XMD

Bot WhatsApp — Générateur de code de jumelage (Pairing Code)

## Déploiement sur Render

1. Crée un compte sur [render.com](https://render.com)
2. New → Web Service → connecte ce dépôt GitHub
3. **Build Command**: `npm install`
4. **Start Command**: `node src/index.js`
5. **Environment**: Node

## Déploiement sur Vercel (frontend uniquement)

Si tu veux héberger le frontend sur Vercel et le backend sur Render :
- Le frontend est dans `/public`
- Le backend tourne sur Render et expose `/api/pair` et `/api/status`
- Mets l'URL Render dans `/public/app.js` (remplace `/api/` par ton URL Render)

## Variables d'environnement

| Variable | Valeur |
|---|---|
| `PORT` | 3000 (auto sur Render) |

## Stack

- Node.js 18+
- Express.js
- @whiskeysockets/baileys
- HTML/CSS/JS vanilla
