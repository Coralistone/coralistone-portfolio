import type { L } from '../i18n'

export const profile = {
  name: 'Coralistone Mikam',
  fullName: 'Coralistone METSA MIKAM',
  title: 'Product Engineer Frontend React',
  email: 'mcoralistone@gmail.com',
  linkedin: 'https://www.linkedin.com/in/cmikam/',
  github: 'https://github.com/Coralistone',
  repo: 'https://github.com/Coralistone/coralistone-portfolio',
  cv: '/cv/CV_Coralistone_METSA_MIKAM.pdf',
}

export const stats: { value: L; label: L }[] = [
  { value: { fr: '≥ 80 %', en: '≥ 80%' }, label: { fr: "Objectif d'accessibilité chez Keepeek, atteint et dépassé", en: 'Accessibility target at Keepeek, met and exceeded' } },
  { value: { fr: '5 sem. → 3 j', en: '5 wks → 3 days' }, label: { fr: "Évolution majeure livrée grâce à l'IA générative, avec tests et revue de code", en: 'Major feature shipped with generative AI, fully tested and reviewed' } },
  { value: { fr: '45 s → 10-20 s', en: '45 s → 10-20 s' }, label: { fr: 'Temps de chargement de pages existantes chez Keepeek', en: 'Load time of existing pages at Keepeek' } },
  { value: { fr: '−80 %', en: '−80%' }, label: { fr: 'De bugs et régressions signalés par semaine sur un back-office', en: 'Weekly bugs and regressions reported on a back office' } },
]

/** Technologies affichées dans le bandeau défilant (logos Devicon, licence MIT) */
export const tech = [
  ['react', 'React'], ['typescript', 'TypeScript'], ['javascript', 'JavaScript'], ['html5', 'HTML5'], ['css3', 'CSS3'],
  ['vitejs', 'Vite'], ['angularjs', 'Angular'], ['vuejs', 'Vue.js'], ['nodejs', 'Node.js'], ['java', 'Java'],
  ['spring', 'Spring Boot'], ['python', 'Python'], ['fastapi', 'FastAPI'], ['postgresql', 'PostgreSQL'], ['mongodb', 'MongoDB'],
  ['elasticsearch', 'Elasticsearch'], ['docker', 'Docker'], ['git', 'Git'], ['gitlab', 'GitLab'], ['jenkins', 'Jenkins'],
  ['figma', 'Figma'], ['jira', 'Jira'], ['confluence', 'Confluence'], ['linux', 'Linux'],
] as const

export const skills: { group: L; items: string[] }[] = [
  { group: { fr: 'Frontend', en: 'Frontend' }, items: ['React', 'TypeScript', 'JavaScript', 'HTML / CSS', 'Vue.js', 'Angular'] },
  { group: { fr: 'Accessibilité & UX', en: 'Accessibility & UX' }, items: ['RGAA', 'WCAG', 'ARIA', 'Figma', 'Performance web'] },
  { group: { fr: 'Backend & intégration', en: 'Backend & integration' }, items: ['Node.js', 'Java / Spring Boot', 'API REST', 'MuleSoft Anypoint', 'FastAPI'] },
  { group: { fr: 'Qualité & delivery', en: 'Quality & delivery' }, items: ['Unit tests', 'Non-regression', 'Git / Bitbucket', 'CI/CD', 'Release management'] },
  { group: { fr: 'Méthode & outils', en: 'Methods & tools' }, items: ['Scrum', 'Jira', 'Confluence', 'Generative AI'] },
]

export type Job = { role: L; org: string; when: L; ctx: L; points: { win?: L; text: L }[]; current?: boolean }
export const jobs: Job[] = [
  {
    role: { fr: 'Product Engineer Frontend React', en: 'Product Engineer, Frontend React' }, org: 'Keepeek', current: true,
    when: { fr: 'févr. 2025 → aujourd’hui · CDI', en: 'Feb 2025 → present · Full-time' },
    ctx: { fr: 'Développement des interfaces de la solution DAM Keepeek, de la conception à la mise en production. Rennes, hybride.', en: 'Building the interfaces of the Keepeek DAM platform, from design to production. Rennes, hybrid.' },
    points: [
      { win: { fr: 'a11y ≥ 80 %', en: 'a11y ≥ 80%' }, text: { fr: "Objectif d'accessibilité atteint et dépassé, grâce au RGAA intégré dès la conception.", en: 'Accessibility target met and exceeded, with RGAA built in from the design phase.' } },
      { win: { fr: '5 sem. → 3 j', en: '5 wks → 3 days' }, text: { fr: "Évolution majeure livrée grâce à un usage maîtrisé de l'IA générative.", en: 'Major feature delivered through a controlled use of generative AI.' } },
      { win: { fr: 'perf', en: 'perf' }, text: { fr: "Temps de chargement de pages existantes réduit de 45 s, voire plus d'une minute, à 10-20 s.", en: 'Load time of existing pages cut from 45 s (sometimes over a minute) to 10-20 s.' } },
      { text: { fr: 'Composants React modulaires connectés aux API REST et aux microservices Node.js, à partir de maquettes Figma.', en: 'Modular React components wired to REST APIs and Node.js microservices, from Figma mock-ups.' } },
      { text: { fr: 'Correctifs CVE à chaque sprint, tests et revues de code, tags Git, release notes et mises en production chez les clients.', en: 'CVE fixes every sprint, tests and code reviews, Git tags, release notes and client deployments.' } },
    ],
  },
  {
    role: { fr: 'Développeuse MuleSoft & FullStack SIG', en: 'MuleSoft & Full-stack GIS Developer' }, org: 'Capgemini',
    when: { fr: 'févr. 2024 → août 2024 · stage', en: 'Feb 2024 → Aug 2024 · Internship' },
    ctx: { fr: "Deux volets : intégration MuleSoft (migration BizTalk → MuleSoft) et développement d'une application SIG (cartographie) utilisée par les cartographes d'Enedis. Nantes.", en: 'Two tracks: MuleSoft integration (BizTalk → MuleSoft migration) and development of a GIS (mapping) application used by Enedis cartographers. Nantes.' },
    points: [
      { text: { fr: "Spécifications d'API (Design Center, Anypoint Exchange), API et batchs sous Anypoint Studio.", en: 'API specifications (Design Center, Anypoint Exchange), APIs and batch jobs in Anypoint Studio.' } },
      { text: { fr: 'Déploiement CloudHub (GitLab CI) et Runtime Fabric (Jenkins), monitoring et dashboards Kibana.', en: 'Deployment to CloudHub (GitLab CI) and Runtime Fabric (Jenkins), monitoring and Kibana dashboards.' } },
      { text: { fr: "Développement SIG en Java et Angular : évolutions et corrections de l'application cartographique d'Enedis, données géographiques (PostgreSQL / PostGIS).", en: "GIS development in Java and Angular: features and fixes on Enedis's mapping application, geographic data (PostgreSQL / PostGIS)." } },
      { text: { fr: 'Automatisation de tests, tests de non-régression, accompagnement des équipes métier en UAT.', en: 'Test automation, non-regression testing, support for business teams during UAT.' } },
    ],
  },
  {
    role: { fr: 'Développeuse Web Frontend React', en: 'Frontend React Web Developer' }, org: 'FindMe',
    when: { fr: 'oct. 2023 → févr. 2024 · stage', en: 'Oct 2023 → Feb 2024 · Internship' },
    ctx: { fr: "Progiciel web d'une startup spécialisée dans l'adressage numérique des domiciles en Afrique. Paris.", en: 'Web software for a startup specialised in digital home addressing in Africa. Paris.' },
    points: [
      { win: { fr: '−80 %', en: '−80%' }, text: { fr: 'De bugs et régressions signalés par semaine sur le back-office.', en: 'Weekly bugs and regressions reported on the back office.' } },
      { win: { fr: 'perf', en: 'perf' }, text: { fr: 'Temps de chargement réduit de 30-45 s à 5-10 s.', en: 'Load time cut from 30-45 s to 5-10 s.' } },
      { text: { fr: 'Interface de visualisation des données cartographiques en React.', en: 'Map data visualisation interface in React.' } },
    ],
  },
  {
    role: { fr: 'Développeuse Web Fullstack Java / React', en: 'Full-stack Java / React Web Developer' }, org: 'Chillo Tech',
    when: { fr: 'janv. 2022 → avr. 2022 · stage', en: 'Jan 2022 → Apr 2022 · Internship' },
    ctx: { fr: "Zeeven : billetterie en ligne et gestion d'invités pour les événements privés.", en: 'Zeeven: online ticketing and guest management for private events.' },
    points: [
      { text: { fr: 'Billets avec QR code nominatif envoyés par WhatsApp, pour un coût divisé par 3.', en: 'Personal QR-code tickets sent via WhatsApp, at a third of the cost.' } },
      { text: { fr: "Gestion des invités : nom, placement VIP, table, contrôle d'accès par scan. Java Spring Boot et React.", en: 'Guest management: name, VIP seating, table, scan-based entry control. Java Spring Boot and React.' } },
    ],
  },
]

export type Demo = { path: string; image: string; kicker: L; title: L; text: L; points: L[]; tags: string[] }
export const demos: Demo[] = [
  {
    path: '/composants', image: '/previews/composants.jpg', kicker: { fr: 'Design system accessible', en: 'Accessible design system' },
    title: { fr: 'Kit de composants React accessibles', en: 'Accessible React component kit' },
    text: { fr: "Modale, onglets, menu et formulaire construits selon les motifs ARIA de référence : utilisables au clavier, au lecteur d'écran et en zoom.", en: 'Dialog, tabs, menu and form built on the reference ARIA patterns: usable with a keyboard, a screen reader and zoom.' },
    points: [
      { fr: 'Focus piégé et restitué dans la modale', en: 'Focus trapped and restored in the dialog' },
      { fr: 'Erreurs de formulaire reliées et annoncées', en: 'Form errors linked and announced' },
      { fr: 'Critères RGAA cités dans le code', en: 'RGAA criteria referenced in the code' },
    ],
    tags: ['React', 'TypeScript', 'ARIA', 'RGAA'],
  },
  {
    path: '/galerie', image: '/previews/galerie.jpg', kicker: { fr: 'Médiathèque DAM', en: 'DAM media library' },
    title: { fr: 'Médiathèque de 1 788 médias', en: '1,788-item media library' },
    text: { fr: "Recherche, filtres, tri, vues grille / liste / mosaïque, pagination (10 à 100 par page), sélection multiple et actions : télécharger, panier, partager, recadrer, supprimer.", en: 'Search, filters, sorting, grid / list / mosaic views, pagination (10 to 100 per page), multi-select and actions: download, basket, share, crop, delete.' },
    points: [
      { fr: 'Téléchargement réel en PNG ou ZIP', en: 'Real PNG or ZIP downloads' },
      { fr: 'Actions groupées sur la sélection', en: 'Bulk actions on the selection' },
      { fr: 'Suppression avec annulation', en: 'Delete with undo' },
    ],
    tags: ['React', 'TypeScript', 'JSZip'],
  },
  {
    path: '/billet', image: '/previews/billet.jpg', kicker: { fr: 'Projet Chillo Tech recréé', en: 'Chillo Tech project, rebuilt' },
    title: { fr: 'Zeeven, billets à QR code', en: 'Zeeven, QR-code tickets' },
    text: { fr: "Billets d'invitation nominatifs à QR code, envoyés par WhatsApp, avec gestion des tables, des VIP et du contrôle à l'entrée.", en: 'Personal QR-code invitation tickets sent via WhatsApp, with table, VIP and entry management.' },
    points: [
      { fr: 'QR code nominatif généré en direct', en: 'Personal QR code generated live' },
      { fr: 'Tableau d’accueil des invités', en: 'Guest check-in board' },
      { fr: 'Coût divisé par 3 vs billets imprimés', en: 'A third of the cost of printed tickets' },
    ],
    tags: ['React', 'TypeScript', 'QR code'],
  },
  {
    path: '/audit', image: '/previews/audit.jpg', kicker: { fr: 'Outil qualité', en: 'Quality tool' },
    title: { fr: "Audit d'accessibilité + extension Chrome", en: 'Accessibility audit + Chrome extension' },
    text: { fr: 'Analyse une page et liste les erreurs (contrastes, alternatives, titres, étiquettes, liens) avec leur référence RGAA et un score.', en: 'Scans a page and lists issues (contrast, alt text, headings, labels, links) with their RGAA reference and a score.' },
    points: [
      { fr: 'Calcul de contraste WCAG', en: 'WCAG contrast computation' },
      { fr: 'Même moteur que l’extension Chrome', en: 'Same engine as the Chrome extension' },
      { fr: 'Ce portfolio obtient 100 / 100', en: 'This portfolio scores 100 / 100' },
    ],
    tags: ['TypeScript', 'WCAG', 'Chrome MV3'],
  },
]

export type Project = { status: L; title: L; text: L; tags: string[]; icon: string; hue: number; image?: string; demo?: string; repo?: string; note?: L }
export const projects: Project[] = [
  { status: { fr: 'exercice technique', en: 'technical exercise' }, title: { fr: 'Explorateur de lieux · API Wemap', en: 'Place explorer · Wemap API' }, icon: '⌖', hue: 200,
    text: { fr: "Recherche de lieux via l'API publique Wemap, liste des résultats et pagination.", en: 'Place search with the public Wemap API, result list and pagination.' }, tags: ['React', 'Vite', 'REST API'],
    repo: 'https://github.com/Coralistone/frontend-test' },
  { status: { fr: 'projet perso', en: 'personal project' }, title: { fr: 'Calculatrice NPI', en: 'RPN calculator' }, icon: '∑', hue: 265,
    text: { fr: 'Calculatrice en notation polonaise inverse : API FastAPI, interface React, conteneurisée avec Docker.', en: 'Reverse Polish notation calculator: FastAPI backend, React UI, containerised with Docker.' }, tags: ['React', 'FastAPI', 'Docker'],
    repo: 'https://github.com/Coralistone/npi_calculator-Test' },
  { status: { fr: 'exercice technique', en: 'technical exercise' }, title: { fr: 'Gestionnaire de tâches', en: 'Task manager' }, icon: '☑', hue: 150,
    text: { fr: 'Application de gestion de tâches (liste, édition, navigation), réalisée en 2 jours.', en: 'Task management app (list, editing, navigation), built in 2 days.' }, tags: ['React', 'JavaScript'],
    repo: 'https://github.com/Coralistone/test-stage' },
  { status: { fr: 'FindMe', en: 'FindMe' }, title: { fr: 'Cartographie FindMe', en: 'FindMe mapping' }, icon: '◎', hue: 25,
    text: { fr: "Visualisation des données cartographiques d'adressage et pages du back-office.", en: 'Visualisation of addressing map data and back-office pages.' }, tags: ['React', 'SVG', 'Maps'], image: '/previews/carte.jpg',
    demo: '/carte', note: { fr: 'Code d’origine privé (FindMe) · démo recréée', en: 'Original code is private (FindMe) · rebuilt demo' } },
  { status: { fr: 'site web', en: 'website' }, title: { fr: 'Site Chillo Services', en: 'Chillo Services website' }, icon: '◧', hue: 210,
    text: { fr: 'Conception et développement du site web de Chillo Services.', en: 'Design and development of the Chillo Services website.' }, tags: ['Website'],
    note: { fr: 'Code privé (propriété de Chillo Services)', en: 'Private code (owned by Chillo Services)' } },
  { status: { fr: 'application web', en: 'web app' }, title: { fr: 'Clone Uber Eats', en: 'Uber Eats clone' }, icon: '🍽', hue: 145,
    text: { fr: 'Catalogue de restaurants, panier, commande et suivi de livraison.', en: 'Restaurant catalogue, cart, ordering and delivery tracking.' }, tags: ['React', 'TypeScript', 'Web app'], image: '/previews/food.jpg',
    demo: '/food', note: { fr: 'Code d’origine non publié · démo recréée', en: 'Original code not published · rebuilt demo' } },
  { status: { fr: 'jeu', en: 'game' }, title: { fr: 'Ludo', en: 'Ludo' }, icon: '🎲', hue: 330,
    text: { fr: 'Le jeu de plateau à 4 couleurs, de 2 à 4 joueurs, entre amis ou contre l’ordinateur : dé animé, sortie sur un 6, captures, cases protégées.', en: 'The 4-colour board game for 2 to 4 players, with friends or against the computer: animated dice, leave home on a 6, captures, safe squares.' }, tags: ['React', 'TypeScript', 'Game'], image: '/previews/ludo.jpg',
    demo: '/ludo', note: { fr: 'Code d’origine non publié · démo recréée', en: 'Original code not published · rebuilt demo' } },
]
