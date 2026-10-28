# Coralistone Mikam · Portfolio

Portfolio et démos de **Coralistone Mikam**, Product Engineer Frontend React spécialisée en accessibilité (RGAA).

## Démos

| Démo | Ce qu'elle montre |
|---|---|
| `/composants` | Kit de composants React accessibles : modale (focus piégé, inert), onglets (roving tabindex), menu d'actions, formulaire avec validation accessible |
| `/galerie` | Galerie de 2 000 médias virtualisée, navigable au clavier, filtres et visionneuse, annonces pour lecteur d'écran |
| `/billet` | Recréation de Zeeven : billets d'invitation à QR code nominatif, gestion des tables et des VIP, accueil des invités |
| `/carte` | Recréation du travail FindMe : carte SVG d'adresses numériques + back-office (recherche, filtres, validation). Données fictives |
| `/food` | Clone Uber Eats : restaurants, filtres, menu, panier, commande et suivi de livraison |
| `/ludo` | Ludo de 2 à 4 joueurs (amis ou ordinateur) : configuration, règles, dé animé, sortie sur un 6, captures, cases protégées, IA |
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
