/* =====================================================================
   CROC — DONNÉES DU SITE
   Tout le contenu du site est ici. Modifie les textes, sauvegarde,
   recharge la page : le site se reconstruit tout seul.
   Rien n'a été inventé en dehors de ta fiche : ce qui n'y figure pas
   est resté « ??? » ou a été omis.
   ===================================================================== */
window.CROC = {

nom: 'CROC',
sousTitre: 'Vampire · 22 ans · Muet de naissance',
frere: 'Eilyn',   /* le seul qui n'est pas un NPC */

/* Lignes tapées par le Système à l'ouverture */
boot: [
  '[SYSTÈME] Ouverture de la fiche…',
  '[SYSTÈME] Nom : ???   Prénom : ???',
  '[SYSTÈME] Espèce : Vampire',
  '[SYSTÈME] Prudence recommandée.',
],

/* IDENTITÉ */
champs: [
  { label: 'Surnom',   valeur: 'Croc' },
  { label: 'Nom',      valeur: '???' },
  { label: 'Prénom',   valeur: '???' },
  { label: 'Âge',      valeur: '22 ans' },
  { label: 'Espèce',   valeur: 'Vampire' },
  { label: 'Taille',   valeur: '1,99 m' },
  { label: 'Poids',    valeur: '95 kg' },
  { label: 'Croyance', valeur: 'Aucune' },
],
physique: [
  "Il soulève de la fonte dès qu'il ne tue pas de monstres : son corps est bâti « comme une machine ».",
  "Il est couvert de cicatrices de toutes tailles, laissées par des monstres comme par des êtres doués de raison.",
  "Muet et handicapé de naissance.",
],

/* PSYCHOLOGIE */
psycho: [
  "Difficile à cerner, distant, froid. Aucune émotion ne passe sur son visage : il semble absorbé dans son propre monde.",
  "Il considère la plupart des gens comme des NPC, une habitude venue des jeux vidéo, auxquels il joue depuis tout petit.",
  "Son frère, Eilyn, est la seule exception, à cause des circonstances inhabituelles de leur naissance.",
  "Il s'en est déjà pris à des gens qu'il jugeait « mauvais NPC » et a causé du Chaos. La frontière entre bon et mauvais NPC est très mince pour lui : prudence en l'abordant.",
],

/* STATISTIQUES (max 20 = barre à niveaux) */
stats: [
  { nom: 'F. Musculaire', val: 1, max: 20, bonus: '+10 %' },
  { nom: 'F. Physique',   val: 2, max: 20, bonus: '+10 %' },
  { nom: 'Agilité',       val: 1, max: 20 },
  { nom: 'Robustesse',    val: 1, max: 20 },
  { nom: 'Endurance',     val: 1, max: 20 },
  { nom: 'Vitalité',      val: 2, max: 20 },
  { nom: 'P. Magique',    val: 1, max: 20 },
  { nom: 'Perception',    val: 1, max: 20 },
],
rolls: [
  { nom: 'Roll Chance', val: 3 },
  { nom: 'Roll Magie',  val: 100 },
],

/* COMPÉTENCES */
competences: [
  {
    nom: 'Lien Infortuné', type: 'Active', icone: 'lien',
    desc: "Crée un lien inséparable avec une cible et lui transfère la chance de l'utilisateur. Le malheur accumulé déclenche un événement catastrophique aléatoire. Le Système prévient quelques secondes avant, mais l'utilisateur est toujours compté parmi les victimes. Les dégâts collatéraux peuvent provoquer des catastrophes plus grandes que prévu.",
    des: 100,   /* dé lancé au LV.5 (1 à des) — valeur à confirmer */
    niveaux: [
      { lv: 1, cout: 40, preavis: 5,  requis: 'Niveau de départ.' },
      { lv: 2, cout: 35, preavis: 5,  requis: '10 catastrophes depuis le niveau précédent.' },
      { lv: 3, cout: 35, preavis: 10, requis: '10 catastrophes depuis le niveau précédent.' },
      { lv: 4, cout: 30, preavis: 10, requis: '20 catastrophes depuis le niveau précédent.' },
      { lv: 5, cout: 30, preavis: 10, requis: '30 catastrophes depuis le niveau précédent.',
        special: "Le Système lance un dé : si le résultat est inférieur à 20, seule la cible est incluse dans la catastrophe." },
    ],
  },
  {
    nom: 'Maîtrise des armes lourdes', type: 'Classique', icone: 'marteau', niveau: 1,
    desc: "Progresse à force d'utiliser des armes lourdes. Il est de mieux en mieux.",
  },
],
/* Événements de la simulation (exemples libres, remplace-les à ta guise) */
catastrophes: [
  'Plafond effondré', 'Rupture de canalisation', 'Panne générale', 'Incendie spontané',
  'Pont rompu', 'Stampede de monstres', 'Court-circuit en chaîne', 'Éboulement',
],

/* TITRE */
titres: [
  {
    nom: 'GROS MOOSKLES !!!',
    condition: "Avoir vaincu un Géant en tête-à-tête, uniquement à mains nues, avec des statistiques de départ.",
    effet: "Force Physique et Force Musculaire augmentées de 10 %.",
  },
],

/* GALERIE (fan arts : droits réservés à leurs auteurs) */
galerie: [
  { src: 'images/croc-accroupi.jpg', alt: 'Croc accroupi, marteau cloué de pointes en main' },
  { src: 'images/croc-encre.jpg',    alt: 'Portrait à l\'encre, sang sur le visage' },
  { src: 'images/croc-couloir.jpg',  alt: 'Croc de dos, descendant un escalier sous une lumière rouge' },
  { src: 'images/croc-marteau.jpg',  alt: 'Croc de profil, le marteau sur l\'épaule' },
  { src: 'images/croc-sourire.jpg',  alt: 'Croc souriant, cicatrices fraîches sur la joue' },
],

/* ---------------------------------------------------------------------
   AJOUT PROPRE À LA VARIANTE « DOSSIER DE TRAQUE » (optionnel)
   Choix des images utilisées à des endroits précis du dossier.
   Si tu supprimes ce bloc, le site prend les images de la galerie.
   --------------------------------------------------------------------- */
dossier: {
  photoFiche:   'images/croc-marteau.jpg',  /* photo trombonée de la fiche signalétique */
  photoCamera:  'images/croc-couloir.jpg',  /* image du flux de la caméra de surveillance */
  photoTableau: 'images/croc-encre.jpg',    /* polaroïd de Croc sur le tableau de liège */
  photoTitre:   'images/croc-sourire.jpg',  /* photo jointe à la note de service du titre */
},

};
