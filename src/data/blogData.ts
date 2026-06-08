export interface Article {
  slug:      string;
  cat:       string;
  title:     string;
  excerpt:   string;
  date:      string;
  readTime:  number;
  gradient:  string;
  featured?: boolean;
  author:    { name: string; role: string };
  content:   string; // markdown-like paragraphs séparés par \n\n
  tags:      string[];
}

export const ARTICLES: Article[] = [
  {
    slug:     'lancement-gofolyx-2026',
    cat:      'Produit',
    title:    'GoFolyX 2026 : tout ce qui change pour les créateurs',
    excerpt:  'Nouveau tableau de bord monétisation, statistiques avancées, partage enrichi — voici tout ce que la plateforme prépare pour cette année.',
    date:     '3 juin 2026',
    readTime: 6,
    gradient: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
    featured: true,
    author:   { name: 'Équipe GoFolyX', role: 'Produit' },
    tags:     ['Produit', 'Créateurs', 'Monétisation'],
    content: `Depuis le lancement de GoFolyX, notre priorité a toujours été la même : donner aux créateurs les outils qu'ils méritent. En 2026, nous passons à la vitesse supérieure avec une refonte complète de l'espace créateur.

## Un tableau de bord repensé

Le nouveau Dashboard Créateur centralise tout en un seul endroit : vues, revenus, abonnés, taux d'engagement et performances publicitaires. Fini les allers-retours entre plusieurs écrans — tout est visible d'un coup d'œil, avec des graphiques temps réel qui se mettent à jour toutes les 30 secondes.

Vous pouvez désormais comparer vos performances semaine par semaine, identifier vos contenus les plus performants et recevoir des recommandations personnalisées pour optimiser votre audience.

## Statistiques avancées

Nous lançons les "Insights Avancés" : une section dédiée qui vous permet de comprendre qui regarde votre contenu, d'où viennent vos fans, à quelle heure ils sont actifs et combien de temps ils regardent avant de décrocher.

Ces données étaient auparavant réservées aux grandes plateformes. Chez GoFolyX, elles sont accessibles à tous les créateurs, dès le premier abonné.

## Partage enrichi

Le nouveau système de partage génère automatiquement une miniature optimisée pour WhatsApp, TikTok, Telegram et Instagram. Vos liens s'affichent avec une belle prévisualisation — titre, image, extrait — sans configuration de votre part.

## Ce qui arrive prochainement

Dans les prochaines semaines : la monétisation via les "Super Commentaires" (les fans peuvent payer pour mettre en avant leur message pendant un live), et l'intégration directe avec les plateformes de ticketing partenaires.

Restez connectés — GoFolyX 2026 est juste le début.`,
  },
  {
    slug:     'monetisation-createurs',
    cat:      'Monétisation',
    title:    'Guide complet : toutes les façons de gagner sur GoFolyX',
    excerpt:  'Abonnements, coins, publicités CPM, vente de billets — découvrez comment les créateurs transforment leur audience en revenus récurrents.',
    date:     '28 mai 2026',
    readTime: 10,
    gradient: 'linear-gradient(135deg,#10B981,#059669)',
    featured: false,
    author:   { name: 'Équipe Monétisation', role: 'Growth' },
    tags:     ['Monétisation', 'Revenus', 'Créateurs'],
    content: `Créer du contenu de qualité demande du temps, de l'énergie et souvent de l'argent. GoFolyX a été conçu pour que ce travail soit rémunéré à sa juste valeur. Voici un tour complet de toutes les sources de revenus disponibles sur la plateforme.

## 1. Les abonnements

Le système d'abonnement vous permet de proposer un accès exclusif à votre contenu contre un paiement mensuel fixé par vous. Vous définissez le prix, le contenu réservé aux abonnés, et les avantages (accès anticipé, badge exclusif, canal dédié).

GoFolyX prend une commission de 20% — en dessous de la plupart des plateformes du marché. Les paiements sont versés chaque mois, directement sur votre compte mobile money ou bancaire.

## 2. Les GoCoins

Les fans peuvent acheter des GoCoins et vous les offrir pendant vos lives ou en réaction à vos posts. 1 GoCoin = 0,01 € côté créateur. Les dons sont instantanément visibles et créent un lien fort entre vous et votre communauté.

Astuce : les créateurs qui activent les dons sur leurs lives voient en moyenne 3× plus d'engagement que ceux qui ne le font pas.

## 3. Les publicités CPM

Si vous atteignez 1 000 vues par mois, vous pouvez activer la monétisation publicitaire. GoFolyX insère automatiquement des publicités pertinentes dans vos vidéos et vous reverse une part des revenus calculée sur le CPM (coût pour mille vues).

Les revenus CPM varient entre 0,50 € et 3 € selon la géographie de votre audience et la thématique de votre contenu.

## 4. La vente de billets

Vous organisez un événement ou un concert ? GoFolyX intègre une billetterie directe. Vous créez votre événement, fixez le prix des billets, et nous gérons la vente, la validation QR code à l'entrée, et le versement des fonds sous 48h après l'événement.

## 5. Les partenariats de marque

Une fois votre profil vérifié et votre audience établie, GoFolyX vous met en relation avec des marques qui cherchent des créateurs pour des collaborations. Vous gardez le contrôle total du contenu — la marque finance, vous créez.

## Conseils pour maximiser vos revenus

Diversifier vos sources de revenus est la clé. Les créateurs les plus performants combinent abonnements + lives avec dons + événements ponctuels. Ne misez pas tout sur une seule source.`,
  },
  {
    slug:     'communautes-fonctionnement',
    cat:      'Fonctionnalités',
    title:    'Les communautés GoFolyX : construire une fanbase engagée',
    excerpt:  'Canaux, trésorerie commune, classements, votes — comment transformer vos abonnés en une vraie communauté soudée.',
    date:     '20 mai 2026',
    readTime: 5,
    gradient: 'linear-gradient(135deg,#3B82F6,#2563EB)',
    featured: false,
    author:   { name: 'Équipe Communauté', role: 'Produit' },
    tags:     ['Communauté', 'Engagement', 'Fonctionnalités'],
    content: `Une audience passagère regarde vos vidéos et repart. Une communauté reste, participe, défend votre contenu et revient chaque semaine. GoFolyX a été pensé pour créer la seconde, pas juste la première.

## Les canaux

Chaque communauté peut créer des canaux thématiques — un peu comme des salons Discord, mais intégrés directement dans GoFolyX. Canal général, canal VIP pour les abonnés, canal événements, canal musique... La structure est libre, vous décidez.

Les membres peuvent réagir, commenter et partager directement dans les canaux. Les notifications sont personnalisables — chacun choisit ce qu'il veut recevoir.

## La trésorerie commune

Les membres peuvent contribuer à une trésorerie partagée avec leurs GoCoins. Cette cagnotte peut financer un événement, un cadeau pour le créateur ou un projet communautaire. Toutes les transactions sont transparentes et visibles par tous les membres.

Le trésorier est élu par vote et gère les dépenses avec validation collective. C'est une vraie démocratie participative.

## Les classements

Un leaderboard hebdomadaire et mensuel récompense les membres les plus actifs. Points de présence, de contribution, de partage — les meilleurs grimpent dans le classement et gagnent des badges exclusifs.

Ces classements créent une émulation positive et poussent les membres à s'investir davantage.

## Les demandes d'adhésion

Vous pouvez ouvrir votre communauté librement ou la réserver à des membres approuvés. Le système de demandes d'adhésion vous permet de filtrer, d'accepter ou de refuser avec un simple message d'accueil personnalisé.

## Ce que disent les créateurs

"Depuis que j'ai activé les canaux, mon audience s'anime toute seule. Je n'ai plus besoin de poster chaque jour pour garder l'engagement — la communauté le fait pour moi." — Créateur GoFolyX, 8 000 membres.`,
  },
  {
    slug:     'tips-reels-viraux',
    cat:      'Conseils',
    title:    '10 astuces concrètes pour rendre vos Reels viraux',
    excerpt:  'Durée optimale, accroches, hashtags, heure de publication — les données de notre équipe Growth compilées en conseils actionnables.',
    date:     '12 mai 2026',
    readTime: 4,
    gradient: 'linear-gradient(135deg,#EC4899,#DB2777)',
    featured: false,
    author:   { name: 'Équipe Growth', role: 'Growth' },
    tags:     ['Reels', 'Conseils', 'Croissance'],
    content: `Publier un Reel ne suffit pas. La différence entre un Reel à 200 vues et un à 200 000 tient souvent à quelques détails que la plupart des créateurs ignorent. Voici ce que nos données montrent.

## 1. Les 2 premières secondes sont tout

L'algorithme mesure le taux de complétion. Si les gens arrêtent dans les 2 premières secondes, votre Reel ne sera pas distribué. Commencez par l'élément le plus accrocheur — une question choc, une image surprenante, une déclaration forte.

## 2. La durée idéale : 15 à 30 secondes

Les Reels entre 15 et 30 secondes obtiennent en moyenne 40% de vues en plus que ceux de plus d'une minute. Allez à l'essentiel.

## 3. Sous-titrez toujours

80% des vidéos sont regardées sans le son. Les sous-titres automatiques de GoFolyX sont activables en un clic — utilisez-les systématiquement.

## 4. Un seul message par Reel

Ne cherchez pas à tout dire. Un Reel = une idée = une action souhaitée. La clarté prime sur l'exhaustivité.

## 5. Terminez par un appel à l'action

"Sauvegardez ce Reel", "Partagez à quelqu'un qui en a besoin", "Suivez pour la suite" — ces phrases simples doublent le taux d'engagement post-visionnage.

## 6. Publiez quand votre audience est active

Dans vos statistiques GoFolyX, regardez les heures de pic de votre audience. Publiez 30 minutes avant ce pic — l'algorithme pousse les contenus récents au moment où les gens sont connectés.

## 7. Utilisez 3 à 5 hashtags pertinents

Plus n'est pas mieux. 3 à 5 hashtags ciblés performent mieux que 20 hashtags génériques. Mélangez grand (#musique) et niche (#pianojazz2026).

## 8. Répondez aux commentaires dans l'heure

Les créateurs qui répondent dans la première heure après publication voient leur Reel distribué plus largement. L'engagement précoce est un signal fort pour l'algorithme.

## 9. Recyclicez vos meilleurs formats

Identifiez les 2-3 formats qui fonctionnent le mieux pour vous et déclinez-les régulièrement. La régularité bat l'originalité ponctuelle.

## 10. Collaborez

Un Reel en collab avec un autre créateur expose votre contenu à deux audiences simultanément. C'est le levier de croissance le plus sous-estimé sur GoFolyX.`,
  },
  {
    slug:     'protection-droits-auteur',
    cat:      'Legal',
    title:    'Droits d\'auteur & contenus : comment GoFolyX vous protège',
    excerpt:  'Système de signalement, protection automatique, licences — comment nous protégeons les créateurs tout en gardant une expérience fluide.',
    date:     '4 mai 2026',
    readTime: 7,
    gradient: 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
    featured: false,
    author:   { name: 'Équipe Juridique', role: 'Legal' },
    tags:     ['Legal', 'Droits', 'Protection'],
    content: `La propriété intellectuelle est un sujet sérieux. Trop souvent, les créateurs voient leur travail copié, réutilisé sans autorisation, ou monétisé par d'autres. GoFolyX a mis en place plusieurs mécanismes pour que cela ne vous arrive pas.

## Ce que vous gardez

Lorsque vous publiez sur GoFolyX, vous conservez l'intégralité de vos droits d'auteur. Vous accordez à GoFolyX une licence d'hébergement et de distribution — mais vous restez propriétaire de votre contenu à 100%.

Vous pouvez retirer votre contenu à tout moment. Vos données sont exportables. Vos droits ne sont jamais cédés.

## La détection automatique

GoFolyX analyse chaque upload pour détecter les contenus musicaux sous droits. Si votre vidéo contient de la musique protégée, vous en êtes informé immédiatement — avant publication — avec la possibilité de remplacer la piste ou de continuer avec une mention de la source.

Ce système évite les suppressions surprises et les litiges a posteriori.

## Le système de signalement

Vous pensez que quelqu'un a copié votre contenu ? Le bouton "Signaler une violation" sur chaque publication déclenche un processus de vérification sous 48h. En cas de violation avérée, le contenu est retiré et le créateur original est notifié.

## Que faire si votre contenu est utilisé sans votre accord

1. Signalez le contenu directement depuis l'application
2. Fournissez la preuve de création originale (date de publication, fichier source)
3. Notre équipe traite le signalement et vous tient informé à chaque étape

Pour les cas complexes (utilisation commerciale non autorisée, plagiat massif), contactez directement legal@gofolyx.app.

## Les licences Creative Commons

GoFolyX intègre les licences Creative Commons. Vous pouvez choisir d'autoriser ou d'interdire la réutilisation de votre contenu, avec ou sans modification, à des fins commerciales ou non. Cette flexibilité vous donne le contrôle total sur la diffusion de votre travail.`,
  },
  {
    slug:     'concerts-live-streaming',
    cat:      'Culture',
    title:    'Comment le live streaming transforme les concerts en 2026',
    excerpt:  'Des artistes témoignent : GoFolyX leur a permis de toucher des fans à travers le monde sans quitter leur studio.',
    date:     '25 avril 2026',
    readTime: 8,
    gradient: 'linear-gradient(135deg,#F97316,#EA580C)',
    featured: false,
    author:   { name: 'Rédaction GoFolyX', role: 'Culture' },
    tags:     ['Culture', 'Live', 'Concerts'],
    content: `Il y a trois ans, organiser un concert signifiait louer une salle, gérer la logistique, vendre des billets physiques et espérer que le public soit au rendez-vous. En 2026, la réalité est plus nuancée — et beaucoup plus accessible.

## Le concert hybride devient la norme

La plupart des artistes qui utilisent GoFolyX proposent désormais deux expériences en parallèle : une salle physique pour les fans locaux, et un streaming live pour le reste du monde. Les billets virtuels se vendent souvent mieux que les billets physiques — et sans contrainte de capacité.

Un artiste peut jouer devant 200 personnes dans une salle intime tout en étant regardé par 15 000 fans en direct sur GoFolyX.

## La qualité technique au niveau des grandes salles

GoFolyX encode les streams en temps réel avec une latence inférieure à 3 secondes. Le son est traité séparément de la vidéo pour garantir une qualité audio optimale, même avec une connexion instable côté spectateur.

Les commentaires live apparaissent en temps réel à l'écran — les artistes peuvent interagir, répondre, lire les messages de leurs fans pendant qu'ils jouent.

## La billetterie intégrée

Plus besoin de passer par une plateforme tierce. GoFolyX gère la vente de billets, l'envoi des QR codes, la validation à l'entrée et le reversement des fonds en un seul endroit. Les fonds sont disponibles sous 48h après l'événement.

## Ce que disent les artistes

"Mon premier live sur GoFolyX m'a rapporté plus que six mois de concerts en salle. La différence, c'est l'audience mondiale et les GoCoins que les fans envoient en direct."

"Je pouvais parler à mes fans pendant que je jouais. C'est quelque chose d'impossible dans une grande salle — sur GoFolyX, c'est la base."

## L'avenir du live

Les prochaines fonctionnalités incluent les "rooms" multiscènes — plusieurs artistes en live simultanément avec possibilité de switcher entre les scènes — et les replays premium, accessibles aux abonnés après la fin du concert.

Le concert de demain n'est plus limité par la géographie.`,
  },
];

export const CATS = ['Tous', 'Produit', 'Monétisation', 'Fonctionnalités', 'Conseils', 'Legal', 'Culture'];
