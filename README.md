# Coralistone Mikam · Portfolio

Portfolio et démos de **Coralistone Mikam**, Product Engineer Frontend React spécialisée en accessibilité (RGAA).

## Démos

| Démo | Ce qu'elle montre |
|---|---|
| `/galerie` | Médiathèque DAM de 1 788 médias : recherche, filtres, tri, vues grille / liste / mosaïque, pagination, sélection et actions (ZIP, panier, partage, recadrage, suppression) |
| `/billet` | Recréation de Zeeven : billets d'invitation à QR code nominatif, gestion des tables et des VIP, accueil des invités |
| `/carte` | Recréation du travail FindMe : carte SVG d'adresses numériques + back-office (recherche, filtres, validation). Données fictives |
| `/food` | Clone Uber Eats : restaurants, filtres, menu, panier, commande et suivi de livraison |
| `/ludo` | Ludo de 2 à 4 joueurs : contre l'ordinateur, entre amis sur le même appareil, ou **en ligne** (WebRTC / PeerJS) avec liens d'invitation, mode spectateur et 15 s par action |
| `/audit` | Moteur d'audit RGAA automatisé (contrastes, alternatives, titres, étiquettes, liens, boutons), analyse d'un site par son URL (fonction serverless) + extension Chrome |

## Stack

React 18 · TypeScript · Vite · CSS sans framework · aucune dépendance d'accessibilité externe (tout est implémenté à la main, selon l'ARIA Authoring Practices Guide).

## Lancer en local

```bash
npm install
npm run dev
```

## Extension Chrome

1. Ouvrir `chrome://extensions`
2. Activer le **Mode développeur**
3. **Charger l'extension non empaquetée** → choisir le dossier `extension/`

## Accessibilité du site

- Lien d'évitement, navigation au clavier complète, focus visible
- Contrastes ≥ 4,5:1 en thème clair et sombre
- Respect de `prefers-reduced-motion`
- Focus replacé sur le contenu principal à chaque changement de page
