const APP_VERSION = '2026-08.54';

const state = {
  today: null,
  goal: 100,
  accentColor: '#FFC800',
  view: 'today',
  calMonth: null, // 'YYYY-MM'
  entriesExpanded: false,
  selectedMoods: [],
  goalMode: 'auto',
  rankIndex: 0,
  rankIndexKnown: false,
  celebrationQueue: [],
  celebrationBusy: false,
  habitOrder: null,
  habitsEditMode: false,
  lang: 'fr',
  ringVisualPct: 0,
  ringAnimFrame: null,
  prewarmed: false,
  monthlySummaryPopupShown: false,
  timeFormat: '24h',
  languageSwitching: false,
  soundEnabled: true,
  customHabits: [],
};

function hexToRgb(hex){
  const m = hex.replace('#','');
  return {
    r: parseInt(m.substring(0,2),16),
    g: parseInt(m.substring(2,4),16),
    b: parseInt(m.substring(4,6),16),
  };
}

function darken(hex, factor){
  const {r,g,b} = hexToRgb(hex);
  const d = (c) => Math.round(c * factor).toString(16).padStart(2,'0');
  return `#${d(r)}${d(g)}${d(b)}`;
}

function applyAccent(hex, skipPersist){
  const {r,g,b} = hexToRgb(hex);
  const root = document.documentElement.style;
  root.setProperty('--fire', hex);
  root.setProperty('--fire-dim', darken(hex, 0.45));
  root.setProperty('--fire-r', r);
  root.setProperty('--fire-g', g);
  root.setProperty('--fire-b', b);
  if (!skipPersist){
    try { localStorage.setItem('trackpush_last_accent', hex); } catch (err) { /* ignore */ }
  }
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOW_NAMES_BY_LANG = {
  fr: ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'],
  en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
};
const MONTH_NAMES_BY_LANG = {
  fr: ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
};
function DOW_NAMES(){ return DOW_NAMES_BY_LANG[state.lang]; }
function MONTH_NAMES(){ return MONTH_NAMES_BY_LANG[state.lang]; }

const TROPHY_LABEL_BY_LANG = {
  fr: { bronze:'BRONZE', argent:'ARGENT', or:'OR', platine:'PLATINE' },
  en: { bronze:'BRONZE', argent:'SILVER', or:'GOLD', platine:'PLATINUM' },
};
function trophyLabel(t){
  return (TROPHY_LABEL_BY_LANG[state.lang] || TROPHY_LABEL_BY_LANG.fr)[t] || '';
}
function trophyEmoji(t){
  return { bronze:'🥉', argent:'🥈', or:'🥇', platine:'💎' }[t] || '';
}
function trophyClass(t){
  return t ? `tr-${t}` : '';
}

// ---------- Translations ----------
const TRANSLATIONS = {
  fr: {
    evening_banner_default: "Il te reste du chemin pour atteindre ton objectif aujourd'hui!",
    bestday_record: "🌟 Nouveau record du {day}!",
    nudge_title: "PRESQUE LÀ!",
    pushups_word: "push-ups",
    xp_next_default: "Prochain rang: —",
    quickadd_title: "AJOUTER DES PUSH-UPS",
    custom_count_placeholder: "Autre nombre",
    add_button: "Ajouter",
    undo_btn: "↺ Annuler le dernier ajout",
    entries_title: "SÉRIES D'AUJOURD'HUI",
    entries_empty: "Aucune série pour l'instant. Fais-en une! 💪",
    notes_title: "PENSÉES DU MOMENT",
    mood_picker_open: "😶 Humeur du moment",
    mood_picker_title: "Comment tu te sens?",
    mood_picker_confirm: "Enregistrer",
    mood_picker_selected_count: "({n})",
    note_placeholder: "Comment tu te sens? Douleurs, énergie, forme...",
    save_button: "Sauvegarder",
    notes_empty: "Aucune note aujourd'hui.",
    legend_bronze: "Bronze 50%",
    legend_argent: "Argent 80%",
    legend_or: "Or 100%",
    legend_platine: "Platine — 7 jours Or consécutifs",
    trend_title: "TENDANCE — 30 DERNIERS JOURS",
    trend_legend_bronze: "Bronze",
    trend_legend_argent: "Argent",
    trend_legend_or: "Or",
    trend_legend_platine: "Platine",
    trend_legend_goal: "Objectif",
    streak_cannabis: "Jour {n} sans cannabis",
    streak_cafe: "Jour {n} sans caféine",
    streak_alcool: "Jour {n} sans alcool",
    weekdays_short: ['D','L','M','M','J','V','S'],
    habits_title: "HABITUDES D'AUJOURD'HUI",
    habits_edit_btn: "Modifier",
    add_custom_habit_btn: "+ Ajouter une habitude personnalisée",
    custom_habit_name_placeholder: "Nom de l'habitude",
    custom_habit_delete_confirm: "Retirer cette habitude personnalisée? L'historique déjà coché reste dans tes journées passées, mais elle ne sera plus affichée.",
    habits_edit_btn_done: "Terminé",
    stats_title: "STATISTIQUES DEPUIS LE DÉBUT",
    records_title: "RECORDS PERSONNELS",
    record_best_set: "Meilleure série",
    record_best_day: "Meilleure journée",
    record_best_week: "Meilleure semaine",
    record_best_month: "Meilleur mois",
    record_streak_drugs: "Plus long streak sans cannabis",
    record_streak_alcool: "Plus long streak sans alcool",
    record_streak_marche: "Plus long streak de marche",
    record_platinum_streak: "Platine d'affilée",
    record_none: "Aucun",
    record_days_suffix: "jours",
    record_weeks_suffix: "semaines",
    record_day_singular: "jour",
    record_week_singular: "semaine",
    stat_start_date_label: "Début du suivi",
    stat_total_pushups_label: "Push-ups au total",
    stat_avg_per_day_label: "Moyenne quotidienne",
    stat_disciplined_days_label: "Jours disciplinés (Or)",
    stat_disciplined_weeks_label: "Semaines disciplinées (Platine)",
    stat_total_photos_label: "Photos prises",
    stat_total_notes_label: "Notes écrites",
    badges_section_unlocked: "Badges débloqués ({n})",
    badges_section_locked: "Badges non débloqués ({n})",
    badge_secret_placeholder: "Badge secret — débloque-le pour découvrir son secret!",
    lang_title: "LANGUE",
    time_format_title: "FORMAT DE L'HEURE",
    sound_title: "SONS",
    sound_toggle_label: "Sons de célébration (badge, rang, trophée, objets)",
    offline_primary_title: "MODE HORS-LIGNE (CET APPAREIL)",
    offline_primary_toggle_label: "Faire de cet appareil ma copie principale hors ligne",
    offline_primary_warning: "N'active ceci que sur UN SEUL appareil (celui que tu gardes toujours sur toi). Les autres appareils continueront de parler directement au serveur.",
    offline_primary_confirm: "Ceci va faire de cet appareil ta copie principale hors ligne, avec tout ton historique actuel copié ici. N'active ceci que sur un seul appareil. Continuer?",
    sync_status_label: "Dernière synchronisation",
    sync_now_btn: "Synchroniser maintenant",
    sync_explainer: "Tes données vivent sur ce téléphone. Une copie est envoyée au serveur automatiquement quand il est accessible.",
    sync_title_native: "SYNCHRONISATION AVEC DOCKER",
    sync_explainer_native: "Chaque série et chaque photo ajoutée envoie automatiquement une copie à ton serveur Docker (ANONPURP3). Utilise ce bouton pour forcer une synchronisation immédiate et confirmer qu'elle fonctionne.",
    backup_section_title: "SAUVEGARDE MANUELLE",
    backup_explainer: "Tes données vivent uniquement dans ce navigateur. Télécharge une copie régulièrement pour ne rien perdre si tu changes d'appareil ou si le navigateur efface ses données.",
    backup_export_btn: "Exporter mes données",
    backup_import_btn: "Importer une sauvegarde",
    backup_import_confirm: "Ceci va REMPLACER toutes les données actuelles sur cet appareil par celles du fichier choisi. Cette action est irréversible. Continuer?",
    backup_import_success: "Sauvegarde importée avec succès. L'app va se recharger.",
    backup_import_error: "Ce fichier n'est pas une sauvegarde TrackPush valide.",
    backup_export_error: "L'exportation a échoué. Réessaie, ou vérifie que ton téléphone a assez d'espace libre.",
    sync_in_progress: "Synchronisation...",
    sync_success: "Synchronisé!",
    sync_failed: "Serveur non accessible — réessai automatique plus tard.",
    sync_never: "Jamais",
    sync_just_now: "À l'instant",
    sync_minutes_ago: "Il y a {n} min",
    xp_log_title: "DÉTAIL DE L'XP",
    xp_log_empty: "Aucune action n'a encore accordé d'XP.",
    xp_log_error: "Impossible de charger le journal pour l'instant.",
    xp_log_back_btn: "Retour",
    goal_section_title: "OBJECTIF DE PUSH-UPS QUOTIDIEN",
    goal_mode_auto: "Automatique",
    goal_mode_auto_sub: "(selon le rang)",
    goal_mode_manual: "Manuel",
    goal_auto_info: "L'objectif de ton rang {rank} est actuellement de {goal} push-ups.",
    color_section_title: "COULEUR D'ACCENT",
    color_yellow: "Jaune", color_orange: "Orange", color_red: "Rouge", color_green: "Vert", color_blue: "Bleu", color_purple: "Violet",
    custom_color_label: "Couleur personnalisée",
    ranks_title: "RANGS",
    xp_source_title: "COMMENT GAGNER DE L'XP",
    xp_source_pushup: "1 push-up",
    xp_source_drug: "1 jour sans cannabis",
    xp_source_alcool: "1 jour sans alcool",
    xp_source_caffeine: "1 jour sans caféine",
    xp_source_walk: "1 jour de marche à l'extérieur",
    xp_source_situps: "1 jour de 100 sit-ups",
    xp_source_bronze: "Trophée Bronze du jour",
    xp_source_argent: "Trophée Argent du jour",
    xp_source_or: "Trophée Or du jour",
    xp_source_platine: "Trophée Platine (semaine parfaite)",
    xp_source_badges: "Badges débloqués",
    xp_source_variable_prefix: "variable — ",
    xp_source_badges_link: "voir Badges",
    xp_source_note: "Annuler une série retire aussi son XP.",

    inventory_btn: "🎒 Inventaire",
    inventory_title: "OBJETS COMMUNS",
    inventory_mythic_title: "OBJETS MYTHIQUES",
    inventory_back_btn: "Retour",
    item_odds_title: "CHANCES — OBJETS",
    item_odds_mythic_title: "CHANCES — MYTHIQUES",
    item_odds_rank_note: "Selon ton rang actuel : {rank}",
    item_odds_drop_label: "Chance qu'un objet apparaisse",
    item_odds_rarity_label: "Répartition des raretés (si un objet apparaît)",
    item_odds_details_toggle: "DÉTAILS PAR OBJET",
    item_odds_mythic_label: "Chance mythique ✨",
    item_odds_mythic_details_label: "Répartition entre les objets mythiques",
    item_odds_mythic_locked: "Pas encore accessible à ton rang actuel.",
    item_odds_mythic_remaining: "{found} objet(s) mythique(s) déjà trouvé(s) sur {total} — répartition ci-dessous entre les {remaining} restants.",
    item_odds_detecteur_label: "Détecteur de métal",
    item_odds_radar_label: "Radar de précision",
    rarity_basique: "Commun",
    rarity_rare: "Rare",
    rarity_epique: "Épique",
    rarity_legendaire: "Légendaire",
    inventory_undiscovered: "???",
    inventory_empty_stock: "Épuisé",
    item_drop_title: "OBJET TROUVÉ!",
    item_drop_title_mythique: "OBJET MYTHIQUE!!!",
    item_rank_locked: "Déblocable à partir du rang {rank}",
    item_locked_echo_passe: "Déblocable à partir du rang Discipliné et après 30 jours d'utilisation de l'app",
    item_detail_use_btn: "Utiliser",
    item_detail_type_label: "Type:",
    item_detail_cap_limited: "Limite d'inventaire : {n}",
    item_detail_cap_unlimited: "Limite d'inventaire : illimitée",
    item_footnote_graine_patience: "*L'expérience bonus que procure cet objet est calculé et ajouté lorsque la journée se termine",
    item_same_type_active_desc: "Un objet similaire du même type est déjà actif. Attendez que son effet se termine avant de pouvoir l'utiliser à nouveau.",
    item_same_type_active_ok: "D'accord",
    item_replace_active_desc: "Vous avez déjà un objet similaire d'actif. Voulez-vous tout de même le remplacer par celui-ci?",
    item_replace_active_yes: "Oui, le remplacer",
    item_replace_active_cancel: "Annuler",
    plume_max_title: "Limite atteinte",
    plume_max_desc: "Tu ne peux utiliser plus de 2 Plumes légères dans la même journée.",
    plume_max_ok: "Ok, compris!",
    undo_item_confirm_title: "Annuler cette série?",
    undo_item_confirm_desc: "Cette série t'a donné {item}. Annuler la série va aussi retirer cet objet de ton inventaire.",
    undo_item_confirm_yes: "Oui, annuler quand même",
    undo_item_confirm_no: "Non, garder ma série",
    item_name_plume_legere: "Plume légère",
    item_name_amulette_xp: "Amulette d'XP",
    item_name_don_xp: "Don d'XP",
    item_name_graine_patience: "Graine de patience",
    item_name_talisman_pardon: "Talisman du pardon",
    item_name_echo_passe: "Écho du passé",
    item_name_detecteur_metal: "Détecteur de métal",
    item_name_radar_precision: "Radar de précision",
    item_name_fragment_eternite: "Fragment d'Éternité",
    item_name_toucher_divin: "Toucher du divin",
    item_name_poussiere_etoiles: "Poussière d'étoiles",
    item_name_calendrier_celeste: "Calendrier céleste",
    item_name_echo_dore: "Écho doré",
    item_name_mode_arcenciel: "Mode arc-en-ciel",
    item_desc_plume_legere: "Réduit l'objectif de push-ups pour la journée.",
    item_desc_plume_legere_specific: "Réduit l'objectif de push-ups de {pct}% pour la journée.",
    item_desc_amulette_xp: "Multiplie l'XP de chaque push-up pendant 5 minutes.",
    item_desc_amulette_xp_specific: "Multiplie par {mult} l'XP de chaque push-up pendant 5 minutes.",
    item_desc_don_xp: "Accorde instantanément de l'XP.",
    item_desc_don_xp_specific: "Accorde instantanément {xp} XP.",
    item_desc_graine_patience: "Multiplie l'XP des habitudes d'aujourd'hui",
    item_desc_graine_patience_specific: "Multiplie par {mult} l'XP des habitudes d'aujourd'hui",
    item_desc_talisman_pardon: "Protège le compteur d'une habitude de se réinitialiser pour la journée",
    item_desc_echo_passe: "Fait ressurgir une pensée du passé et procure instantanément 20 XP.",
    item_desc_detecteur_metal: "Pendant 15 minutes, augmente tes chances de trouver un objet en faisant des séries de push-ups. L'effet de cet objet ne s'applique pas aux objets Mythiques.",
    item_desc_detecteur_metal_specific: "Pendant 15 minutes, augmente tes chances de {pct}% de trouver un objet en faisant des séries de push-ups. L'effet de cet objet ne s'applique pas aux objets Mythiques.",
    item_desc_radar_precision: "Garantit l'obtention d'un objet commun aléatoire lors de la prochaine série effectuée",
    item_desc_fragment_eternite: "Le fragment d'un accomplissement immense qui te récompense avec 5000 XP instantanément !",
    item_desc_toucher_divin: "Un halo doré permanent autour de ta barre d'XP. Activable et désactivable à volonté.",
    item_desc_poussiere_etoiles: "Change la couleur des étincelles d'XP pour un argent/violet scintillant.",
    item_desc_calendrier_celeste: "Tes journées Or au calendrier scintillent d'un dégradé or et bleu nuit.",
    item_desc_echo_dore: "Appuie sur TrackPush pour jouer une mélodie qui t'appartient.",
    item_desc_mode_arcenciel: "Ta couleur d'accent défile lentement à travers toutes les teintes de l'arc-en-ciel. Toucher du divin l'emporte si les deux sont actifs.",
    rarity_basique: "Commun",
    rarity_rare: "Rare",
    rarity_epique: "Épique",
    rarity_legendaire: "Légendaire",
    rarity_mythique: "Mythique",
    active_item_time_remaining: "Temps restant",
    use_item_talisman_prompt: "Quelle habitude veux-tu protéger?",
    use_item_talisman_cannabis: "Sans cannabis",
    use_item_talisman_cafe: "Sans caféine",
    use_item_talisman_marche: "Marche à l'extérieur",
    use_item_talisman_result: "Ton streak est protégé pour aujourd'hui.",
    use_item_echo_result_positive: "Ce sentiment, tu peux le revivre aujourd'hui!",
    use_item_echo_result_negative: "Tu te souviens de ce jour-là? Regarde le chemin parcouru depuis.",
    use_item_echo_result_mixed: "Ce jour-là, tu portais plusieurs choses en même temps. Regarde le chemin parcouru depuis.",
    use_item_echo_result_neutral: "Un souvenir d'il y a longtemps.",
    use_item_echo_none: "Aucun souvenir assez ancien pour l'instant.",
    mythic_toggle_on: "Activé",
    mythic_detail_toggle_label: "Effet activé",
    mythic_toggle_off: "Désactivé",
    version_label: "Version",
    tab_today: "Aujourd'hui", tab_calendar: "Calendrier", tab_habits: "Historique", tab_badges: "Badges", tab_settings: "Réglages",
    modal_badges_title: "BADGES DÉBLOQUÉS",
    modal_habits_title: "HABITUDES",
    modal_photos_title: "PHOTOS",
    modal_add_photo_btn: "+ Ajouter une photo",
    cal_camera_fab_title: "Prendre une photo",
    cal_month_total: "Total du mois : {n} push-ups",
    today_week_total: "Push-ups cette semaine : {n}",
    modal_entries_title: "SÉRIES",
    celebration_ok: "Merci, continue!",
    item_drop_ok: "Continuer",
    rankup_title: "NOUVEAU RANG!",
    rankup_desc_prefix: "Tu es maintenant",
    rankup_new_goal: "Nouvel objectif",
    rankup_new_bronze: "Trophée Bronze",
    rankup_new_argent: "Trophée Argent",
    rankup_new_or: "Trophée Or",
    rankup_items_unlock: "Ton engagement porte fruit — de nouveaux objets mystérieux commencent à apparaître sur ton chemin!",
    badge_modal_title: "BADGE DÉBLOQUÉ!",
    photo_modal_title: "PHOTO DU DIMANCHE",
    photo_modal_desc: "Capture ton évolution cette semaine.",
    photo_camera_btn: "Prendre une photo",
    photo_library_btn: "Choisir dans la photothèque",
    photo_skip_btn: "Plus tard",
    photo_never_today_btn: "Ne plus afficher",
    sunday_banner_text: "N'oublie pas de prendre ta photo de la semaine!",
    day1_photo_title: "TA PHOTO DU JOUR 1",
    day1_photo_desc: "Prends une photo de toi aujourd'hui — elle te servira de point de départ dans ton résumé mensuel, pour voir ta progression physique à chaque début de mois.",
    day1_photo_skip_btn: "Me le rappeler plus tard",
    note_edit_link: "Modifier",
    note_delete_link: "Supprimer",
    note_cancel_link: "Annuler",
    entries_show_all: "Voir toutes les séries ({n}) ▾",
    entries_show_less: "Voir moins ▴",
    xp_next: "{n} XP avant {rank}",
    xp_max_rank: "Rang maximum atteint 🏆",
    modal_no_entries: "Aucune série ce jour-là.",
    evening_banner_remaining: "Il te reste {n} push-ups pour atteindre ton objectif aujourd'hui!",
    trophy_desc_bronze: "50% de l'objectif atteint aujourd'hui. Ça chauffe!",
    trophy_desc_argent: "80% atteint. Presque là!",
    trophy_desc_or: "Objectif du jour complété à 100%!",
    trophy_desc_platine: "Semaine parfaite – Objectif atteint pendant 7 jours consécutifs. Continue d'alimenter cette motivation!",
    trophy_title: "TROPHÉE {name}!",
    monthly_summary_title: "RÉSUMÉS MENSUELS",
    ms_continue_btn: "Continuer la progression!",
    ms_next_available: "1er {month} {year}.",
    ms_next_available_prefix: "Le prochain résumé sera disponible le",
    ms_trophy_label: "TROPHÉES DU MOIS",
    ms_mood_label: "HUMEURS RESSENTIES",
    ms_mood_none: "Aucune humeur enregistrée ce mois-ci.",
    ms_photo_label: "ÉVOLUTION PHOTO",
    ms_photo_none: "Aucune photo prise encore.",
    ms_habits_label: "HABITUDES DU MOIS",
    ms_days_no_drugs: "Jours sans cannabis",
    ms_days_no_caffeine: "Jours sans caféine",
    ms_days_no_alcool: "Jours sans alcool",
    ms_days_walked: "Jours de marche à l'extérieur",
    ms_situps_minimum: "Sit-ups faits (minimum)",
    ms_avg_label: "MOYENNE DES SÉRIES",
    ms_avg_this_month: "Ce mois-ci",
    ms_avg_last_month: "Mois précédent",
    ms_workvsoff_label: "TRAVAIL VS CONGÉ",
    ms_avg_workday: "Moy. — jours de travail",
    ms_avg_dayoff: "Moy. — jours de congé",
    ms_workvsoff_none: "Pas assez de données pour comparer.",
    ms_bonus_label: "EN PRIME",
    ms_total_pushups: "Push-ups au total",
    ms_best_set: "Meilleure série",
    ms_best_day: "Meilleure journée",
    ms_badges_unlocked: "Badges débloqués",
    ms_render_error: "Une erreur est survenue en affichant le résumé. Réessaie plus tard.",
  },
  en: {
    evening_banner_default: "You still have some way to go to hit today's goal!",
    bestday_record: "🌟 New {day} record!",
    nudge_title: "ALMOST THERE!",
    pushups_word: "push-ups",
    xp_next_default: "Next rank: —",
    quickadd_title: "ADD PUSH-UPS",
    custom_count_placeholder: "Other number",
    add_button: "Add",
    undo_btn: "↺ Undo last add",
    entries_title: "TODAY'S SETS",
    entries_empty: "No sets yet. Get one in! 💪",
    notes_title: "THOUGHTS OF THE MOMENT",
    mood_picker_open: "😶 Mood right now",
    mood_picker_title: "How are you feeling?",
    mood_picker_confirm: "I feel like this",
    mood_picker_selected_count: "({n})",
    note_placeholder: "How are you feeling? Soreness, energy, form...",
    save_button: "Save",
    notes_empty: "No notes today.",
    legend_bronze: "Bronze 50%",
    legend_argent: "Silver 80%",
    legend_or: "Gold 100%",
    legend_platine: "Platinum — 7 consecutive Gold days",
    trend_title: "TREND — LAST 30 DAYS",
    trend_legend_bronze: "Bronze",
    trend_legend_argent: "Silver",
    trend_legend_or: "Gold",
    trend_legend_platine: "Platinum",
    trend_legend_goal: "Goal",
    streak_cannabis: "Day {n} cannabis-free",
    streak_cafe: "Day {n} caffeine-free",
    streak_alcool: "Day {n} alcohol-free",
    weekdays_short: ['S','M','T','W','T','F','S'],
    habits_title: "TODAY'S HABITS",
    habits_edit_btn: "Edit",
    add_custom_habit_btn: "+ Add a custom habit",
    custom_habit_name_placeholder: "Habit name",
    custom_habit_delete_confirm: "Remove this custom habit? History already checked stays on past days, but it won't be shown anymore.",
    habits_edit_btn_done: "Done",
    stats_title: "STATS SINCE THE START",
    records_title: "PERSONAL RECORDS",
    record_best_set: "Best single set",
    record_best_day: "Best day",
    record_best_week: "Best week",
    record_best_month: "Best month",
    record_streak_drugs: "Longest cannabis-free streak",
    record_streak_alcool: "Longest alcohol-free streak",
    record_streak_marche: "Longest walking streak",
    record_platinum_streak: "Platinum in a row",
    record_none: "None",
    record_days_suffix: "days",
    record_weeks_suffix: "weeks",
    record_day_singular: "day",
    record_week_singular: "week",
    stat_start_date_label: "Tracking since",
    stat_total_pushups_label: "Total push-ups",
    stat_avg_per_day_label: "Daily average",
    stat_disciplined_days_label: "Disciplined days (Gold)",
    stat_disciplined_weeks_label: "Disciplined weeks (Platinum)",
    stat_total_photos_label: "Photos taken",
    stat_total_notes_label: "Notes written",
    badges_section_unlocked: "Unlocked badges ({n})",
    badges_section_locked: "Locked badges ({n})",
    badge_secret_placeholder: "Secret badge — unlock it to discover its secret!",
    lang_title: "LANGUAGE",
    time_format_title: "TIME FORMAT",
    sound_title: "SOUND",
    sound_toggle_label: "Celebration sounds (badge, rank, trophy, items)",
    offline_primary_title: "OFFLINE MODE (THIS DEVICE)",
    offline_primary_toggle_label: "Make this device my main offline copy",
    offline_primary_warning: "Only turn this on for ONE device (the one you always carry). Other devices will keep talking directly to the server.",
    offline_primary_confirm: "This will make this device your main offline copy, with all your current history copied here. Only enable this on one device. Continue?",
    sync_status_label: "Last synced",
    sync_now_btn: "Sync now",
    sync_explainer: "Your data lives on this phone. A copy is sent to the server automatically whenever it's reachable.",
    sync_title_native: "SYNC WITH DOCKER",
    sync_explainer_native: "Every set and photo you add automatically sends a copy to your Docker server (ANONPURP3). Use this button to force an immediate sync and confirm it's working.",
    backup_section_title: "MANUAL BACKUP",
    backup_explainer: "Your data lives only in this browser. Download a copy regularly so you never lose it if you switch devices or the browser clears its data.",
    backup_export_btn: "Export my data",
    backup_import_btn: "Import a backup",
    backup_import_confirm: "This will REPLACE all current data on this device with the data from the chosen file. This action cannot be undone. Continue?",
    backup_import_success: "Backup imported successfully. The app will reload.",
    backup_import_error: "This file isn't a valid TrackPush backup.",
    backup_export_error: "Export failed. Try again, or check that your phone has enough free space.",
    sync_in_progress: "Syncing...",
    sync_success: "Synced!",
    sync_failed: "Server unreachable — will retry automatically.",
    sync_never: "Never",
    sync_just_now: "Just now",
    sync_minutes_ago: "{n} min ago",
    xp_log_title: "XP DETAILS",
    xp_log_empty: "No action has granted XP yet.",
    xp_log_error: "Couldn't load the log right now.",
    xp_log_back_btn: "Back",
    goal_section_title: "DAILY PUSH-UP GOAL",
    goal_mode_auto: "Automatic",
    goal_mode_auto_sub: "(by rank)",
    goal_mode_manual: "Manual",
    goal_auto_info: "Your {rank} rank's goal is currently {goal} push-ups.",
    color_section_title: "ACCENT COLOR",
    color_yellow: "Yellow", color_orange: "Orange", color_red: "Red", color_green: "Green", color_blue: "Blue", color_purple: "Purple",
    custom_color_label: "Custom color",
    ranks_title: "RANKS",
    xp_source_title: "HOW TO EARN XP",
    xp_source_pushup: "1 push-up",
    xp_source_drug: "1 cannabis-free day",
    xp_source_alcool: "1 alcohol-free day",
    xp_source_caffeine: "1 caffeine-free day",
    xp_source_walk: "1 day of walking outside",
    xp_source_situps: "1 day of 100 sit-ups",
    xp_source_bronze: "Bronze trophy for the day",
    xp_source_argent: "Silver trophy for the day",
    xp_source_or: "Gold trophy for the day",
    xp_source_platine: "Platinum trophy (perfect week)",
    xp_source_badges: "Unlocked badges",
    xp_source_variable_prefix: "variable — ",
    xp_source_badges_link: "see Badges",
    xp_source_note: "Undoing a set also removes your XP.",

    inventory_btn: "🎒 Inventory",
    inventory_title: "COMMON ITEMS",
    inventory_mythic_title: "MYTHIC ITEMS",
    inventory_back_btn: "Back",
    item_odds_title: "ODDS — ITEMS",
    item_odds_mythic_title: "ODDS — MYTHICS",
    item_odds_rank_note: "Based on your current rank: {rank}",
    item_odds_drop_label: "Chance an item appears",
    item_odds_rarity_label: "Rarity breakdown (if an item appears)",
    item_odds_details_toggle: "DETAILS BY ITEM",
    item_odds_mythic_label: "Mythic chance ✨",
    item_odds_mythic_details_label: "Breakdown among mythic items",
    item_odds_mythic_locked: "Not yet accessible at your current rank.",
    item_odds_mythic_remaining: "{found} mythic item(s) already found out of {total} — breakdown below among the {remaining} remaining.",
    item_odds_detecteur_label: "Metal detector",
    item_odds_radar_label: "Precision radar",
    rarity_basique: "Common",
    rarity_rare: "Rare",
    rarity_epique: "Epic",
    rarity_legendaire: "Legendary",
    inventory_undiscovered: "???",
    inventory_empty_stock: "Depleted",
    item_drop_title: "ITEM FOUND!",
    item_drop_title_mythique: "MYTHIC ITEM!!!",
    item_rank_locked: "Unlockable at rank {rank}",
    item_locked_echo_passe: "Unlockable at rank Disciplined and after 30 days of app use",
    item_detail_use_btn: "Use",
    item_detail_type_label: "Type:",
    item_detail_cap_limited: "Inventory limit: {n}",
    item_detail_cap_unlimited: "Inventory limit: unlimited",
    item_footnote_graine_patience: "*The bonus experience from this item is calculated and added once the day is over",
    item_same_type_active_desc: "A similar item of the same type is already active. Wait for its effect to end before you can use it again.",
    item_same_type_active_ok: "Got it",
    item_replace_active_desc: "You already have a similar item active. Do you want to replace it with this one anyway?",
    item_replace_active_yes: "Yes, replace it",
    item_replace_active_cancel: "Cancel",
    plume_max_title: "Limit reached",
    plume_max_desc: "You can't use more than 2 Light Feathers on the same day.",
    plume_max_ok: "Got it!",
    undo_item_confirm_title: "Undo this set?",
    undo_item_confirm_desc: "This set gave you {item}. Undoing it will also remove that item from your inventory.",
    undo_item_confirm_yes: "Yes, undo anyway",
    undo_item_confirm_no: "No, keep my set",
    item_name_plume_legere: "Light Feather",
    item_name_amulette_xp: "XP Amulet",
    item_name_don_xp: "XP Gift",
    item_name_graine_patience: "Seed of Patience",
    item_name_talisman_pardon: "Talisman of Forgiveness",
    item_name_echo_passe: "Echo of the Past",
    item_name_detecteur_metal: "Metal Detector",
    item_name_radar_precision: "Precision Radar",
    item_name_fragment_eternite: "Fragment of Eternity",
    item_name_toucher_divin: "Touch of the Divine",
    item_name_poussiere_etoiles: "Stardust",
    item_name_calendrier_celeste: "Celestial Calendar",
    item_name_echo_dore: "Golden Echo",
    item_name_mode_arcenciel: "Rainbow Mode",
    item_desc_plume_legere: "Reduces today's push-up goal.",
    item_desc_plume_legere_specific: "Reduces today's push-up goal by {pct}%.",
    item_desc_amulette_xp: "Multiplies the XP of every push-up for 5 minutes.",
    item_desc_amulette_xp_specific: "Multiplies the XP of every push-up by {mult} for 5 minutes.",
    item_desc_don_xp: "Instantly grants XP.",
    item_desc_don_xp_specific: "Instantly grants {xp} XP.",
    item_desc_graine_patience: "Multiplies today's habit XP",
    item_desc_graine_patience_specific: "Multiplies today's habit XP by {mult}",
    item_desc_talisman_pardon: "Protects a habit's streak counter from resetting for the day",
    item_desc_echo_passe: "Brings back a memory from the past and instantly grants 20 XP.",
    item_desc_detecteur_metal: "For 15 minutes, increases your chances of finding an item from push-up sets. This item's effect doesn't apply to Mythic items.",
    item_desc_detecteur_metal_specific: "For 15 minutes, increases your chances by {pct}% of finding an item from push-up sets. This item's effect doesn't apply to Mythic items.",
    item_desc_radar_precision: "Guarantees a random common item on your next set",
    item_desc_fragment_eternite: "A fragment of something immense that instantly rewards you with 5000 XP!",
    item_desc_toucher_divin: "A permanent golden glow around your XP bar. Can be turned on and off anytime.",
    item_desc_poussiere_etoiles: "Changes your XP sparkles into shimmering silver and purple.",
    item_desc_calendrier_celeste: "Your Gold calendar days shimmer with a gold and midnight-blue gradient.",
    item_desc_echo_dore: "Tap TrackPush to play a melody that's yours alone.",
    item_desc_mode_arcenciel: "Your accent color slowly cycles through every hue of the rainbow. Touch of the Divine takes priority if both are active.",
    rarity_basique: "Common",
    rarity_rare: "Rare",
    rarity_epique: "Epic",
    rarity_legendaire: "Legendary",
    rarity_mythique: "Mythic",
    active_item_time_remaining: "Time remaining",
    use_item_talisman_prompt: "Which habit do you want to protect?",
    use_item_talisman_cannabis: "Cannabis-free",
    use_item_talisman_cafe: "Caffeine-free",
    use_item_talisman_marche: "Walk outside",
    use_item_talisman_result: "Your streak is protected for today.",
    use_item_echo_result_positive: "You can relive this feeling today!",
    use_item_echo_result_negative: "Remember that day? Look how far you've come since.",
    use_item_echo_result_mixed: "That day, you were carrying several things at once. Look how far you've come since.",
    use_item_echo_result_neutral: "A memory from long ago.",
    use_item_echo_none: "No memory old enough yet.",
    mythic_toggle_on: "On",
    mythic_detail_toggle_label: "Effect active",
    mythic_toggle_off: "Off",
    version_label: "Version",
    tab_today: "Today", tab_calendar: "Calendar", tab_habits: "History", tab_badges: "Badges", tab_settings: "Settings",
    modal_badges_title: "BADGES UNLOCKED",
    modal_habits_title: "HABITS",
    modal_photos_title: "PHOTOS",
    modal_add_photo_btn: "+ Add a photo",
    cal_camera_fab_title: "Take a photo",
    cal_month_total: "Month total: {n} push-ups",
    today_week_total: "Push-ups this week: {n}",
    modal_entries_title: "SETS",
    celebration_ok: "Thanks, keep going!",
    item_drop_ok: "Continue",
    rankup_title: "NEW RANK!",
    rankup_desc_prefix: "You are now",
    rankup_new_goal: "New goal",
    rankup_new_bronze: "Bronze trophy",
    rankup_new_argent: "Silver trophy",
    rankup_new_or: "Gold trophy",
    rankup_items_unlock: "Your commitment is paying off — new mysterious items are starting to appear on your path!",
    badge_modal_title: "BADGE UNLOCKED!",
    photo_modal_title: "SUNDAY PHOTO",
    photo_modal_desc: "Capture your progress this week.",
    photo_camera_btn: "Take a photo",
    photo_library_btn: "Choose from library",
    photo_skip_btn: "Later",
    photo_never_today_btn: "Don't show again",
    sunday_banner_text: "Don't forget your weekly photo!",
    day1_photo_title: "YOUR DAY ONE PHOTO",
    day1_photo_desc: "Take a photo of yourself today — it'll be your starting point in your monthly summary, so you can see your physical progress at the start of every month.",
    day1_photo_skip_btn: "Remind me later",
    note_edit_link: "Edit",
    note_delete_link: "Delete",
    note_cancel_link: "Cancel",
    entries_show_all: "Show all sets ({n}) ▾",
    entries_show_less: "Show less ▴",
    xp_next: "{n} XP to {rank}",
    xp_max_rank: "Max rank reached 🏆",
    modal_no_entries: "No sets that day.",
    evening_banner_remaining: "You have {n} push-ups left to hit today's goal!",
    trophy_desc_bronze: "50% of today's goal reached. Heating up!",
    trophy_desc_argent: "80% reached. Almost there!",
    trophy_desc_or: "Today's goal fully completed!",
    trophy_desc_platine: "Perfect week – Goal reached for 7 consecutive days. Keep feeding that motivation!",
    trophy_title: "{name} TROPHY!",
    monthly_summary_title: "MONTHLY SUMMARIES",
    ms_continue_btn: "Keep up the progress!",
    ms_next_available: "{month} 1st, {year}.",
    ms_next_available_prefix: "The next summary will be available on",
    ms_trophy_label: "TROPHIES THIS MONTH",
    ms_mood_label: "MOODS FELT",
    ms_mood_none: "No moods logged this month.",
    ms_photo_label: "PHOTO PROGRESS",
    ms_photo_none: "No photos taken yet.",
    ms_habits_label: "HABITS THIS MONTH",
    ms_days_no_drugs: "Cannabis-free days",
    ms_days_no_caffeine: "Caffeine-free days",
    ms_days_no_alcool: "Alcohol-free days",
    ms_days_walked: "Days walked outside",
    ms_situps_minimum: "Sit-ups done (minimum)",
    ms_avg_label: "AVERAGE SET SIZE",
    ms_avg_this_month: "This month",
    ms_avg_last_month: "Last month",
    ms_workvsoff_label: "WORK VS DAY OFF",
    ms_avg_workday: "Avg. — work days",
    ms_avg_dayoff: "Avg. — days off",
    ms_workvsoff_none: "Not enough data to compare.",
    ms_bonus_label: "BONUS",
    ms_total_pushups: "Total push-ups",
    ms_best_set: "Best single set",
    ms_best_day: "Best day",
    ms_badges_unlocked: "Badges unlocked",
    ms_render_error: "Something went wrong showing the summary. Try again later.",
  },
};

function t(key, vars){
  const dict = TRANSLATIONS[state.lang] || TRANSLATIONS.fr;
  let str = dict[key] !== undefined ? dict[key] : (TRANSLATIONS.fr[key] || key);
  if (vars){
    Object.entries(vars).forEach(([k,v]) => { str = str.replace(`{${k}}`, v); });
  }
  return str;
}

const RANK_NAMES_EN = ['Beginner','Disciplined','Professional','Elite','Legend','Unbeatable','Immortal','Divine'];
const RANK_NAMES_FR = ['Débutant','Discipliné','Professionnel','Élite','Légende','Imbattable','Immortel','Divin'];
function translateRankName(frName){
  if (state.lang !== 'en') return frName;
  const idx = RANK_NAMES_FR.indexOf(frName);
  return idx >= 0 ? RANK_NAMES_EN[idx] : frName;
}

const BADGE_TRANSLATIONS_EN = {
  'premiere-serie': { name: 'First Step', desc: 'Log your very first push-up set' },
  'mois-brillant': { name: 'A Brilliant Month!', desc: '4 consecutive Platinum weeks' },
  decafeine: { name: 'Decaf!', desc: 'A full month (30 consecutive days) caffeine-free' },
  'sans-alcool': { name: 'Alcohol-Free', desc: 'A full month (30 consecutive days) alcohol-free' },
  clarte: { name: 'Clarity of Mind', desc: 'A full month (30 consecutive days) cannabis-free' },
  brillant: { name: 'Shine On!', desc: 'First perfect week (Platinum trophy)' },
  motivation100: { name: '100 Motivation?', desc: 'Reach Gold for 100 days total' },
  'cadeau-noel': { name: 'A Big Gift for the Pecs', desc: '250 push-ups on December 25th' },
  consistance: { name: 'Consistency Pays Off', desc: '50 push-ups in a single set' },
  'rank-discipline': { name: 'Disciplined Rank', desc: 'Reach the Disciplined rank' },
  'rank-pro': { name: 'Professional Rank', desc: 'Reach the Professional rank' },
  'rank-elite': { name: 'Elite Rank', desc: 'Reach the Elite rank' },
  'rank-legende': { name: 'Legend Rank', desc: 'Reach the Legend rank' },
  'rank-imbattable': { name: 'Unbeatable Rank', desc: 'Reach the Unbeatable rank' },
  'rank-immortel': { name: 'Immortal Rank', desc: 'Reach the Immortal rank' },
  'rank-divin': { name: 'Divine Rank', desc: 'Reach the Divine rank' },
  'or-streak-5': { name: 'Worth Its Weight in Gold', desc: 'Reach Gold 5 days in a row' },
  'cent-mille': { name: '100k!', desc: 'Reach 100,000 total XP' },
  'force-tot': { name: 'Early Bird!', desc: '150 push-ups between 6am and noon, same day' },
  'oiseau-nuit': { name: 'Night Owl', desc: '100 push-ups between midnight and 4am, same night' },
  'soiree-motivante': { name: 'Motivated Evening', desc: '150 push-ups between 6pm and 10pm, same evening' },
  'resolution-nouvel-an': { name: "New Year's Resolution", desc: '100 push-ups on January 1st' },
  'encore-plus': { name: 'Even More!', desc: '200 push-ups in the same day' },
  'mille-en-cinq': { name: '1000 in 7', desc: 'Do 1000 total push-ups over 7 consecutive days' },
  'semaine-promenades': { name: 'Walking Week', desc: 'Take a walk outside for 7 consecutive days' },
  'go-abdo': { name: 'Go Abs Go', desc: 'Complete the 100 sit-ups habit 25 times' },
  'je-note': { name: 'I NOTE!', desc: '100 notes added in total' },
  'look-debutant': { name: 'Day One Look', desc: 'Take your very first photo' },
  'top-modele': { name: 'Top Model', desc: '10 photos added in total' },
  'premier-tresor': { name: 'First Treasure', desc: 'Find your very first item (other than the Metal Detector)' },
  'petit-coffre': { name: 'Small Chest', desc: 'Discover 3 different items' },
  'grand-collectionneur': { name: 'Great Collector', desc: 'Discover every existing item' },
  'legendaire-badge': { name: 'Legendary!', desc: "Unlock an item's legendary version for the first time" },
  'impossible-devient-reel': { name: 'The Impossible Becomes Real', desc: 'Find your very first Mythic item' },
  'trente-en-un': { name: '1 is Good, But 30 is Better', desc: 'Do 30 push-ups in a single set' },
  'objectif-mensuel': { name: 'Monthly Goal', desc: 'Do 3500 push-ups in 1 month' },
  'plein-dans-le-mille': { name: 'Right on Target!', desc: 'Do 1000 total push-ups' },
  'over-9000': { name: "It's over 9000!", desc: 'Do 10,000 total push-ups' },
};
function translateBadge(id, name, desc){
  if (state.lang !== 'en') return { name, desc };
  const tr = BADGE_TRANSLATIONS_EN[id];
  if (!tr) return { name, desc };
  return { name: tr.name, desc: desc === null ? null : tr.desc };
}

const MOOD_LABELS_BY_LANG = {
  fr: {
    energique: '⚡ Énergique', calme: '🌙 Calme', fatigue: '😴 Fatigué',
    epuise: '🔋 Épuisé', stresse: '😣 Stressé', anxieux: '😰 Anxieux', impatient: '🙄 Impatient', embrouille: '🌀 Embrouillé',
    concentre: '🎯 Concentré', emotionnel: '🥲 Émotif', bougon: '😒 Bougon', colere: '😠 En colère', motive: '💪 Motivé', fier: '😤 Fier', pensif: '🤔 Pensif',
  },
  en: {
    energique: '⚡ Energetic', calme: '🌙 Calm', fatigue: '😴 Tired',
    epuise: '🔋 Exhausted', stresse: '😣 Stressed', anxieux: '😰 Anxious', impatient: '🙄 Impatient', embrouille: '🌀 Foggy',
    concentre: '🎯 Focused', emotionnel: '🥲 Emotional', bougon: '😒 Grumpy', colere: '😠 Angry', motive: '💪 Motivated', fier: '😤 Proud', pensif: '🤔 Pensive',
  },
};
function updateMoodPickerButtonLabel(){
  const el = $('#mood-picker-open-label');
  if (!state.selectedMoods.length){
    el.textContent = t('mood_picker_open');
    return;
  }
  const emojis = state.selectedMoods.map((m) => (MOOD_LABELS()[m] || '').split(' ')[0]).join(' ');
  el.textContent = `${emojis} ${t('mood_picker_selected_count', { n: state.selectedMoods.length })}`;
}

function MOOD_LABELS(){ return MOOD_LABELS_BY_LANG[state.lang] || MOOD_LABELS_BY_LANG.fr; }

const ITEM_META = {
  plume_legere: { icon: '🪶' },
  amulette_xp: { icon: '🔮' },
  don_xp: { icon: '🎁' },
  graine_patience: { icon: '🌱' },
  talisman_pardon: { icon: '🙏' },
  echo_passe: { icon: '📔' },
  detecteur_metal: { icon: '📡' },
  radar_precision: { icon: '🎯' },
  fragment_eternite: { icon: '💠' },
  toucher_divin: { icon: '✨' },
  poussiere_etoiles: { icon: '🌠' },
  calendrier_celeste: { icon: '🌌' },
  echo_dore: { icon: '🔔' },
  mode_arcenciel: { icon: '🌈' },
};
const RANK_NAMES_FOR_ITEMS = ['Débutant','Discipliné','Professionnel','Élite','Légende','Imbattable','Immortel','Divin'];

const HABIT_META_BY_LANG = {
  fr: {
    cannabis: { icon:'🌿', label:'Cannabis' },
    cafe: { icon:'☕', label:'Café' },
    alcool: { icon:'🍺', label:'Alcool' },
    marche: { icon:'🚶', label:"Marche à l'extérieur" },
    situps: { icon:'💪', label:'Faire 100 sit-ups' },
    journeeTravail: { icon:'💼', label:'Journée de travail' },
    journeeConge: { icon:'🏖️', label:'Journée de congé' },
  },
  en: {
    cannabis: { icon:'🌿', label:'Cannabis' },
    cafe: { icon:'☕', label:'Coffee' },
    alcool: { icon:'🍺', label:'Alcohol' },
    marche: { icon:'🚶', label:'Walk outside' },
    situps: { icon:'💪', label:'Do 100 sit-ups' },
    journeeTravail: { icon:'💼', label:'Work day' },
    journeeConge: { icon:'🏖️', label:'Day off' },
  },
};
function HABIT_META(){ return HABIT_META_BY_LANG[state.lang] || HABIT_META_BY_LANG.fr; }

async function setTimeFormat(fmt){
  if (fmt === state.timeFormat) return;
  await api('/api/settings', {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ timeFormat: fmt }),
  });
  state.timeFormat = fmt;
  applyTranslations();
  await refreshDay();
}

async function setLanguage(lang){
  if (lang === state.lang || state.languageSwitching) return;
  state.languageSwitching = true;
  try {
    await api('/api/settings', {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ language: lang }),
    });
    state.lang = lang;
    applyTranslations();
    await loadToday();
    if (state.view === 'calendar') await loadCalendar();
    if (state.view === 'habits') await loadHabits();
    if (state.view === 'badges') await loadBadges();
    if (state.view === 'settings') await loadRanks();
  } finally {
    state.languageSwitching = false;
  }
}

function applyTranslations(){
  document.documentElement.lang = state.lang;
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  $$('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  const weekdays = t('weekdays_short');
  $$('#cal-weekdays span').forEach((span, i) => { if (weekdays[i]) span.textContent = weekdays[i]; });
  $$('#mood-picker-list .mood-chip').forEach((chip) => {
    const m = chip.dataset.mood;
    chip.textContent = MOOD_LABELS()[m] || m;
  });
  $('#lang-fr').classList.toggle('active', state.lang === 'fr');
  $('#lang-en').classList.toggle('active', state.lang === 'en');
  $('#time-format-24h').classList.toggle('active', state.timeFormat === '24h');
  $('#time-format-12h').classList.toggle('active', state.timeFormat === '12h');
  $('#sound-toggle').classList.toggle('active', state.soundEnabled);
  const isPrimary = typeof isOfflinePrimaryDevice === 'function' && isOfflinePrimaryDevice();
  const primaryToggle = $('#offline-primary-toggle');
  if (primaryToggle) primaryToggle.classList.toggle('active', isPrimary);
  const syncContent = $('#sync-section-content');
  if (syncContent) syncContent.hidden = !isPrimary;
  if (typeof isNativeApp === 'function' && isNativeApp()){
    const toggleBlock = $('#offline-primary-toggle-block');
    if (toggleBlock) toggleBlock.hidden = true;
    const titleEl = $('#offline-primary-title');
    if (titleEl) titleEl.textContent = t('sync_title_native');
    const explainerEl = $('#sync-explainer');
    if (explainerEl) explainerEl.textContent = t('sync_explainer_native');
  }
}

async function api(path, opts){
  if (isOfflinePrimaryDevice()){
    return localApi(path, opts || {});
  }
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ---------- Ring math ----------
const RING_CIRC = 2 * Math.PI * 104;

function easeOutCubic(x){
  return 1 - Math.pow(1 - x, 3);
}

function updateRing(total, goal, trophy){
  state.ringTotal = total;
  state.ringGoal = goal;
  state.ringTrophy = trophy;
  const pct = Math.min(1, goal > 0 ? total / goal : 0);
  const ring = $('#ring-progress');
  ring.style.strokeDasharray = RING_CIRC;

  const rainbowActive = !!(state.mythicActive && state.mythicActive.mode_arcenciel && !state.mythicActive.toucher_divin);
  if (trophy === 'platine') ring.style.stroke = 'var(--platine-a)';
  else if (rainbowActive) { /* leave stroke to the rainbow interval */ }
  else if (pct >= 1) ring.style.stroke = 'var(--or)';
  else if (pct >= 0.8) ring.style.stroke = 'var(--argent)';
  else ring.style.stroke = 'var(--fire)';
  ring.classList.toggle('ring-complete', pct >= 1 && trophy !== 'platine');
  ring.classList.toggle('ring-platine', trophy === 'platine');

  const from = state.ringVisualPct || 0;
  const to = pct;
  if (state.ringAnimFrame) cancelAnimationFrame(state.ringAnimFrame);
  const duration = 550;
  const start = performance.now();

  function step(now){
    const elapsed = now - start;
    const raw = Math.min(1, elapsed / duration);
    const eased = easeOutCubic(raw);
    const current = from + (to - from) * eased;
    const offset = RING_CIRC - current * RING_CIRC;
    ring.style.strokeDashoffset = Math.max(0, offset);
    if (raw < 1){
      state.ringAnimFrame = requestAnimationFrame(step);
    } else {
      state.ringVisualPct = to;
      state.ringAnimFrame = null;
    }
  }
  state.ringAnimFrame = requestAnimationFrame(step);
  return pct;
}

function spawnXPSparkles(pushupCount){
  const layer = $('#xp-sparkle-layer');
  const fill = $('#xp-bar-fill');
  if (!layer || !fill) return;
  const trackWidth = fill.parentElement.offsetWidth;
  const pct = parseFloat(fill.style.width) || 0;
  const fillWidth = Math.min(trackWidth, (pct / 100) * trackWidth);
  const y = fill.offsetHeight / 2;
  if (fillWidth < 1) return;
  const count = Math.max(6, Math.min(28, pushupCount || 18));
  for (let i = 0; i < count; i++){
    const spark = document.createElement('div');
    spark.className = 'xp-spark' + (state.poussiereEtoilesActive ? ' spark-stardust' : '');
    const x = Math.random() * fillWidth;
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 34;
    const ex = Math.cos(angle) * dist;
    const ey = Math.sin(angle) * dist * 0.75;
    const size = 3 + Math.random() * 4;
    const spin = (Math.random() * 240 - 120).toFixed(0);
    spark.style.left = x + 'px';
    spark.style.top = y + 'px';
    spark.style.width = size + 'px';
    spark.style.height = size + 'px';
    spark.style.setProperty('--xp-spark-end', `translate(${ex.toFixed(1)}px, ${ey.toFixed(1)}px) rotate(${spin}deg)`);
    spark.style.animationDelay = (Math.random() * 0.18) + 's';
    layer.appendChild(spark);
    setTimeout(() => spark.remove(), 1300);
  }
}

function pulseRing(){
  const el = $('#ring-ripple');
  el.classList.remove('pulse');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.add('pulse');
    });
  });
}

// ---------- Effects ----------
function punchNumber(){
  const n = $('#today-total');
  n.classList.remove('punch'); void n.offsetWidth; n.classList.add('punch');
}

function burstConfetti(colors){
  const layer = $('#confetti-layer');
  const count = 26;
  for (let i=0;i<count;i++){
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = (45 + Math.random()*10) + '%';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.animationDuration = (1.1 + Math.random()*0.9) + 's';
    p.style.transform = `rotate(${Math.random()*360}deg)`;
    layer.appendChild(p);
    setTimeout(()=>p.remove(), 2200);
  }
}

function trophyColors(t){
  return {
    bronze:['#CD7F32','#E3A15C','#8A5322'],
    argent:['#C7CDD6','#EDEFF2','#8B95A3'],
    or:['#F5B942','#FFDD8A','#B5811A'],
    platine:['#E7F3FF','#9FD8FF','#FFFFFF'],
  }[t] || ['#FF5A2E'];
}

// ---------- Celebration queue (badges, trophies, rank-ups never overlap) ----------
function enqueueCelebration(item){
  state.celebrationQueue.push(item);
  processCelebrationQueue();
}

function processCelebrationQueue(){
  if (state.celebrationBusy) return;
  const item = state.celebrationQueue.shift();
  if (!item) return;
  state.celebrationBusy = true;
  if (item.type === 'badge') showBadgeModal(item.badge);
  else if (item.type === 'trophy') showTrophyModal(item.trophy);
  else if (item.type === 'rankup') showRankUpModal(item.rankName, item.goal, item.rankIndex);
  else if (item.type === 'item') showItemDropModal(item.item);
}

function dismissCelebration(modalId){
  $(modalId).hidden = true;
  state.celebrationBusy = false;
  processCelebrationQueue();
}

let _audioCtx = null;
function getAudioCtx(){
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_audioCtx) _audioCtx = new AC();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function playBoom(ctx, startTime, gainPeak){
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, startTime);
  osc.frequency.exponentialRampToValueAtTime(38, startTime + 0.22);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.30);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + 0.32);
}

function playPluck(ctx, freq, startTime, gainPeak){
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.11);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + 0.13);
}

function playWarmTone(ctx, freq, startTime, duration, gainPeak, wave){
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave || 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playPadChord(ctx, freqs, startTime, duration, gainPeak){
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.35);
    gain.gain.linearRampToValueAtTime(gainPeak * 0.7, startTime + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime + i * 0.02);
    osc.stop(startTime + duration + 0.1);
  });
}

function playEchoDoreMelody(){
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const step = 0.21; // laid-back lo-fi swing grid

  // Soft boom-bass groove — a lazy, swung lo-fi hip-hop pulse (no harsh hats)
  const booms = [0, 3.5, 6, 9.5, 12, 15.5];
  booms.forEach((s) => playBoom(ctx, now + s * step, 0.32));

  // Syncopated triangle plucks riding the groove
  const plucks = [
    { s: 1.5, f: 440.00 },
    { s: 4.5, f: 493.88 },
    { s: 7.5, f: 440.00 },
    { s: 10.5, f: 587.33 },
    { s: 13.5, f: 523.25 },
  ];
  plucks.forEach((n) => playPluck(ctx, n.f, now + n.s * step, 0.09));

  // Warm rising melodic motif — builds motivation upward, triangle wave for softness
  const motif = [
    { s: 2, f: 587.33 },   // D5
    { s: 5, f: 659.25 },   // E5
    { s: 8, f: 783.99 },   // G5
    { s: 11, f: 880.00 },  // A5
    { s: 14, f: 1046.50 }, // C6
  ];
  motif.forEach((n) => playWarmTone(ctx, n.f, now + n.s * step, 0.42, 0.11, 'triangle'));

  // Celestial pad chord finish — a sustained, slowly swelling major-add9 chord
  const padStart = 17 * step;
  playPadChord(ctx, [523.25, 659.25, 783.99, 987.77], now + padStart, 1.8, 0.07);
}

let _rainbowInterval = null;
function hexFromHue(hue){
  const h = hue / 360;
  const s = 0.85, l = 0.55;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
function startRainbowMode(){
  if (_rainbowInterval) return;
  let hue = 0;
  const myInterval = setInterval(() => {
    if (_rainbowInterval !== myInterval) return; // arrêté entre-temps — ignorer ce coup fantôme
    hue = (hue + 1) % 360;
    const hex = hexFromHue(hue);
    applyAccent(hex, true);
    if (!(state.mythicActive && state.mythicActive.toucher_divin)) {
      const ring = $('#ring-progress');
      if (ring && !ring.classList.contains('ring-platine')) {
        ring.style.stroke = hex;
      }
    }
  }, 120);
  _rainbowInterval = myInterval;
}
function stopRainbowMode(){
  if (_rainbowInterval){ clearInterval(_rainbowInterval); _rainbowInterval = null; }
  if (state.accentColor) applyAccent(state.accentColor);
  if (state.ringGoal !== undefined) updateRing(state.ringTotal, state.ringGoal, state.ringTrophy);
}

function playTone(ctx, freq, startTime, duration, gainPeak){
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playCelebrationSound(kind){
  if (!state.soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notesByKind = {
    trophy: [523.25, 659.25],
    badge: [523.25, 659.25, 783.99],
    rank: [392.00, 523.25, 659.25, 783.99],
  };
  const notes = notesByKind[kind] || notesByKind.trophy;
  notes.forEach((freq, i) => { playTone(ctx, freq, now + i * 0.09, 0.5, 0.12); });
}

function showTrophyModal(trophy){
  $('#trophy-big-icon').textContent = trophyEmoji(trophy);
  $('#trophy-title').textContent = t('trophy_title', { name: trophyLabel(trophy) });
  const descKeys = {
    bronze: 'trophy_desc_bronze',
    argent: 'trophy_desc_argent',
    or: 'trophy_desc_or',
    platine: 'trophy_desc_platine',
  };
  $('#trophy-desc').textContent = descKeys[trophy] ? t(descKeys[trophy]) : '';
  $('#trophy-modal').hidden = false;
  burstConfetti(trophyColors(trophy));
  playCelebrationSound('trophy');
}

function trophyXPTableClient(rankIdx){
  const growth = 1.15;
  const g = Math.pow(growth, rankIdx);
  return {
    bronze: Math.round(2 * g),
    argent: Math.round(7 * g),
    or: Math.round(17 * g),
  };
}

function showRankUpModal(rankName, goal, rankIndex){
  $('#rankup-name').textContent = translateRankName(rankName);
  if (goal !== undefined) $('#rankup-goal').textContent = `${goal} ${t('pushups_word')}`;
  if (rankIndex !== undefined){
    const table = trophyXPTableClient(rankIndex);
    $('#rankup-bronze').textContent = `+${table.bronze} XP`;
    $('#rankup-argent').textContent = `+${table.argent} XP`;
    $('#rankup-or').textContent = `+${table.or} XP`;
  }
  const itemsMsg = $('#rankup-items-message');
  if (rankName === 'Discipliné'){
    itemsMsg.textContent = t('rankup_items_unlock');
    itemsMsg.hidden = false;
  } else {
    itemsMsg.hidden = true;
  }
  $('#rankup-modal').hidden = false;
  burstConfetti(['#F5B942','#FFDD8A', state.accentColor, '#FFFFFF']);
  setTimeout(() => burstConfetti(['#F5B942', state.accentColor, '#FFFFFF']), 400);
  playCelebrationSound('rank');
}

function showBadgeModal(badge){
  const tr = translateBadge(badge.id, badge.name, badge.desc);
  $('#badge-modal-icon').textContent = badge.icon;
  $('#badge-modal-name').textContent = tr.name;
  $('#badge-modal-desc').textContent = tr.desc;
  $('#badge-modal-xp').textContent = badge.xp;
  $('#badge-modal').hidden = false;
  burstConfetti(['#F5B942', state.accentColor, '#FFFFFF']);
  setTimeout(() => burstConfetti([state.accentColor, '#F5B942', '#FFFFFF']), 400);
  playCelebrationSound('badge');
}

function rarityLabelHtml(rarity){
  return `<span class="rarity-label rarity-${rarity}">${t('rarity_' + rarity)}</span>`;
}

function detailPlaceholders(details){
  const ph = {};
  if (!details) return ph;
  if (details.reduction !== undefined) ph.pct = Math.round(details.reduction * 100);
  if (details.boost !== undefined) ph.pct = Math.round(details.boost * 100);
  if (details.mult !== undefined) ph.mult = details.mult;
  if (details.minutes !== undefined) ph.minutes = details.minutes;
  if (details.xp !== undefined) ph.xp = details.xp;
  return ph;
}


function showItemDropModal(item){
  const meta = ITEM_META[item.itemId] || { icon: '❔' };
  $('#item-drop-icon').textContent = meta.icon;
  $('#item-drop-name').textContent = t(`item_name_${item.itemId}`);
  const typeLine = `${t('item_detail_type_label')} ${rarityLabelHtml(item.rarity)}`;
  const desc = t(`item_desc_${item.itemId}`, detailPlaceholders(item.details));
  $('#item-drop-desc').innerHTML = `${typeLine}<div class="ms-empty-note" style="margin-top:4px;">${escapeHtml(desc)}</div>`;
  $('#item-drop-rarity-label').textContent = item.mythic ? t('item_drop_title_mythique') : t('item_drop_title');
  $('#item-drop-modal').hidden = false;
  const colors = item.mythic ? ['#FFFFFF','#F5B942','#9FD8FF','#FF6EC7'] : ['#F5B942', state.accentColor, '#FFFFFF'];
  burstConfetti(colors);
  setTimeout(() => burstConfetti(colors.slice().reverse()), 400);
  playCelebrationSound(item.mythic ? 'rank' : 'badge');
}

// ---------- Today view ----------
function restartShimmer(){
  const el = $('.xp-bar-fill');
  if (!el) return;
  el.classList.remove('shimmer-active');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => el.classList.add('shimmer-active'), 60);
    });
  });
}

async function loadToday(){
  const [settings, xp, day] = await Promise.all([api('/api/settings'), api('/api/xp'), api('/api/day/today')]);
  state.goal = settings.goal;
  state.today = settings.today;
  state.accentColor = settings.accentColor || '#FFC800';
  state.goalMode = settings.goalMode || 'auto';
  state.lang = settings.language || 'fr';
  state.timeFormat = settings.timeFormat || '24h';
  state.soundEnabled = settings.soundEnabled !== false;
  applyAccent(state.accentColor);
  applyTranslations();
  $('#goal-echo').textContent = settings.goal;
  cacheDisplaySnapshot({ goal: settings.goal });
  $('#custom-color-input').value = state.accentColor;
  updateSwatchSelection();
  updateGoalModeUI(settings, xp);
  renderXPBar(xp);

  $('#today-date').textContent = formatDayHeader(state.today);
  cacheDisplaySnapshot({ dateText: $('#today-date').textContent });

  updateBestdayBanner(day);

  renderDay(day);
  checkEveningReminder(day);
  maybeShowSundayPhotoPrompt(day);
  maybeShowDay1PhotoPrompt(day);
  loadMonthlySummary(true);

  state.habitOrder = settings.habitOrder || Object.keys(HABIT_META());
  const customHabitsData = await api('/api/custom-habits');
  state.customHabits = customHabitsData.customHabits || [];
  renderHabitsList(day.habits || {});

  const invData = await api('/api/inventory');
  state.lastInventoryData = invData;
  updateActiveBoostDisplay(invData.activeBoosts, invData.dailyItemEffects);
  invData.mythicItems.forEach((it) => {
    if (it.cosmetic) applyMythicCosmetic(it.id, it.active);
  });

  setTimeout(prewarmOtherViews, 1500);
}

// Pre-populates the other tabs' DOM content, then forces one off-screen
// (invisible) render pass for each — display:none elements are never
// laid out at all, so simply filling their innerHTML while hidden pays
// none of the cost. Rendering them off-screen once, quietly, pays that
// one-time text-layout cost before the user ever taps that tab.
async function prewarmOtherViews(){
  if (state.prewarmed) return;
  state.prewarmed = true;
  const ids = ['view-calendar','view-habits','view-badges','view-settings'];
  try {
    await Promise.all([loadCalendar(), loadHabits(), loadBadges(), loadRanks()]);
  } catch (err) { /* ignore prewarm failures, real navigation will just fetch again */ }
  ids.forEach((id) => $(`#${id}`).classList.add('view-prewarm'));
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ids.forEach((id) => $(`#${id}`).classList.remove('view-prewarm'));
    });
  });
}

function updateGoalModeUI(settings, xp){
  const mode = settings.goalMode || 'auto';
  $('#goal-mode-auto').classList.toggle('active', mode === 'auto');
  $('#goal-mode-manual').classList.toggle('active', mode === 'manual');
  $('#goal-auto-info').hidden = mode !== 'auto';
  $('#settings-goal-form').hidden = mode !== 'manual';
  if (mode === 'manual') $('#settings-goal-input').value = settings.goal;
  if (mode === 'auto' && xp){
    $('#goal-auto-info').innerHTML = t('goal_auto_info', {
      goal: `<strong>${settings.goal}</strong>`,
      rank: `<strong>${translateRankName(xp.rankName)}</strong>`,
    });
  }
}

async function setGoalMode(mode){
  await api('/api/settings', {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ goalMode: mode }),
  });
  invalidateCalendarCache();
  await loadToday();
}

async function refreshXP(retryCount){
  try {
    const xp = await api('/api/xp');
    renderXPBar(xp);
  } catch (err) {
    if (!retryCount) setTimeout(() => refreshXP(1), 700);
  }
}

function cacheDisplaySnapshot(partial){
  try {
    const key = 'trackpush_last_snapshot';
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    localStorage.setItem(key, JSON.stringify({ ...existing, ...partial }));
  } catch (err) { /* ignore */ }
}

function renderXPBar(xp){
  $('#xp-rank-name').textContent = translateRankName(xp.rankName).toUpperCase();
  $('#xp-value').textContent = xp.xp;
  $('#xp-bar-fill').style.width = xp.progressPct + '%';
  restartShimmer();
  if (xp.isMaxRank){
    $('#xp-next-label').textContent = t('xp_max_rank');
  } else {
    const remaining = xp.rankMax + 1 - xp.xp;
    $('#xp-next-label').textContent = t('xp_next', { n: remaining, rank: translateRankName(xp.nextRankName) });
  }
  if (state.rankIndexKnown && xp.rankIndex > state.rankIndex){
    enqueueCelebration({ type:'rankup', rankName: xp.rankName, goal: xp.goal, rankIndex: xp.rankIndex });
  }
  state.rankIndex = xp.rankIndex;
  state.rankIndexKnown = true;
  cacheDisplaySnapshot({
    rankName: $('#xp-rank-name').textContent,
    xpValue: $('#xp-value').textContent,
    xpBarPct: xp.progressPct,
    xpNextLabel: $('#xp-next-label').textContent,
  });
}

function updateBestdayBanner(day){
  const bestdayEl = $('#today-bestday');
  if (!bestdayEl) return;
  if (day.isBestWeekdayEver){
    const dow = new Date(state.today + 'T00:00:00').getDay();
    bestdayEl.textContent = t('bestday_record', { day: DOW_NAMES()[dow] });
    bestdayEl.hidden = false;
  } else {
    bestdayEl.hidden = true;
  }
}

async function refreshDay(){
  const day = await api(`/api/day/${state.today}`);
  renderDay(day);
  checkEveningReminder(day);
  updateBestdayBanner(day);
  return day;
}

function checkEveningReminder(day){
  const hour = new Date().getHours();
  const goalMet = day.goal > 0 && day.total >= day.goal;
  const isEvening = hour >= 19;
  const banner = $('#evening-banner');
  if (isEvening && !goalMet){
    const remaining = day.goal - day.total;
    $('#evening-banner-text').textContent = t('evening_banner_remaining', { n: remaining });
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

function renderDay(day){
  $('#today-total').textContent = day.total;
  $('#today-total').classList.toggle('big-number-4digits', String(day.total).length >= 4);
  updateRing(day.total, day.goal, day.trophy);
  if (day.date === state.today){
    cacheDisplaySnapshot({ total: day.total, goal: day.goal, trophy: day.trophy });
    if (day.weekTotal !== undefined){
      $('#today-week-total').innerHTML = t('today_week_total', { n: `<span class="today-week-total-num">${day.weekTotal}</span>` });
    }
  }

  const chip = $('#today-trophy');
  if (day.trophy){
    chip.hidden = false;
    chip.className = 'trophy-chip ' + trophyClass(day.trophy);
    chip.textContent = `${trophyEmoji(day.trophy)} ${trophyLabel(day.trophy)}`;
  } else {
    chip.hidden = true;
  }

  const list = $('#entries-list');
  const empty = $('#entries-empty');
  const toggle = $('#entries-toggle');
  list.innerHTML = '';
  if (day.entries.length === 0){
    list.appendChild(empty);
    toggle.hidden = true;
  } else {
    const recentFirst = day.entries.slice().reverse();
    const showAll = state.entriesExpanded;
    const visible = showAll ? recentFirst : recentFirst.slice(0, 3);
    visible.forEach((e) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="entry-count">+${e.count}</span><span class="entry-time">${formatTimeDisplay(e.time)}</span>`;
      list.appendChild(li);
    });
    if (recentFirst.length > 3){
      toggle.hidden = false;
      toggle.textContent = showAll ? t('entries_show_less') : t('entries_show_all', { n: recentFirst.length });
    } else {
      toggle.hidden = true;
    }
  }

  $('#undo-btn').hidden = day.entries.length === 0;
  renderNotes(day.notes, $('#notes-list'), $('#notes-empty'), state.today, (updated) => renderDay(updated));
}

function autoResizeTextarea(el){
  el.style.height = 'auto';
  const maxHeight = window.innerHeight * 0.4;
  el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
}

function renderNotes(notes, listEl, emptyEl, date, onUpdate){
  listEl.innerHTML = '';
  if (!notes || notes.length === 0){
    if (emptyEl) listEl.appendChild(emptyEl);
    return;
  }
  notes.slice().reverse().forEach((n) => {
    const li = document.createElement('li');
    li.className = 'note-card';
    li.dataset.id = n.id;
    const moods = n.moods || [];
    const moodTagsHtml = moods.length
      ? `<div class="note-mood-tags">${moods.map((m) => `<span class="note-mood-tag">${MOOD_LABELS()[m] || m}</span>`).join('')}</div>`
      : '';
    const pushupsLabel = n.pushupsAtWrite !== undefined ? ` – ${n.pushupsAtWrite} ${t('pushups_word')}` : '';
    li.innerHTML = `
      <div class="note-card-head">
        <span class="note-time">${formatTimeDisplay(n.time)}${pushupsLabel}</span>
        <span class="note-actions">
          <button type="button" class="note-edit-link">${t('note_edit_link')}</button>
          <button type="button" class="note-delete-link">${t('note_delete_link')}</button>
        </span>
      </div>
      <div class="note-text">${escapeHtml(n.text)}</div>
      ${moodTagsHtml}
      <textarea class="note-edit-area">${escapeHtml(n.text)}</textarea>
      <div class="note-edit-actions">
        <button type="button" class="qbtn qbtn-primary note-save-link">${t('save_button')}</button>
        <button type="button" class="qbtn note-cancel-link">${t('note_cancel_link')}</button>
      </div>
    `;
    const editArea = li.querySelector('.note-edit-area');
    const enterEdit = () => {
      li.classList.add('editing');
      autoResizeTextarea(editArea);
    };
    li.querySelector('.note-text').addEventListener('click', enterEdit);
    li.querySelector('.note-edit-link').addEventListener('click', enterEdit);
    editArea.addEventListener('input', () => autoResizeTextarea(editArea));
    li.querySelector('.note-cancel-link').addEventListener('click', () => {
      editArea.value = n.text;
      li.classList.remove('editing');
    });
    li.querySelector('.note-save-link').addEventListener('click', async () => {
      const text = editArea.value.trim();
      if (!text) return;
      const updated = await api(`/api/notes/${date}/${n.id}`, {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text }),
      });
      li.classList.remove('editing');
      if (onUpdate) onUpdate(updated);
    });
    li.querySelector('.note-delete-link').addEventListener('click', async () => {
      const updated = await api(`/api/notes/${date}/${n.id}`, { method:'DELETE' });
      if (onUpdate) onUpdate(updated);
    });
    listEl.appendChild(li);
  });
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function addReps(count){
  if (!count || count <= 0) return;
  const day = await api('/api/entries', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ date: state.today, count }),
  });
  if (typeof isOfflinePrimaryDevice === 'function' && isOfflinePrimaryDevice() && typeof attemptBackgroundSync === 'function'){
    attemptBackgroundSync(false).catch(() => {});
  }
  punchNumber();
  pulseRing();
  renderDay(day);
  checkEveningReminder(day);
  await refreshXP();
  const badges = day.newlyUnlockedBadges || [];
  badges.forEach((b) => enqueueCelebration({ type:'badge', badge:b }));
  invalidateCalendarCache();
  spawnXPSparkles(count);
  if (day.trophyJustUnlocked){
    enqueueCelebration({ type:'trophy', trophy: day.trophy });
  }
  (day.itemDrops || []).forEach((item) => {
    enqueueCelebration({ type:'item', item });
  });
}

function showUndoItemConfirm(itemName){
  return new Promise((resolve) => {
    $('#undo-item-confirm-desc').textContent = t('undo_item_confirm_desc', { item: itemName });
    $('#undo-item-confirm-modal').hidden = false;
    const yesBtn = $('#undo-item-confirm-yes');
    const noBtn = $('#undo-item-confirm-no');
    const cleanup = () => {
      $('#undo-item-confirm-modal').hidden = true;
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
    };
    const onYes = () => { cleanup(); resolve(true); };
    const onNo = () => { cleanup(); resolve(false); };
    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
  });
}

async function undoLast(){
  const day = await api(`/api/day/${state.today}`);
  if (day.entries.length === 0) return;
  const last = day.entries[day.entries.length - 1];
  const drops = last.itemDrops || (last.itemDrop ? [last.itemDrop] : []);
  if (drops.length){
    const itemNames = drops.map((d) => t(`item_name_${d.itemId}`)).join(', ');
    const proceed = await showUndoItemConfirm(itemNames);
    if (!proceed) return;
  }
  const updated = await api(`/api/entries/${last.id}`, { method:'DELETE' });
  renderDay(updated);
  checkEveningReminder(updated);
  refreshXP();
  invalidateCalendarCache();
  loadInventory();
}

async function addNote(text){
  if (!text || !text.trim()) return;
  const day = await api('/api/notes/' + state.today, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ text, moods: state.selectedMoods }),
  });
  state.selectedMoods = [];
  $$('#mood-picker-list .mood-chip').forEach((c) => c.classList.remove('selected'));
  updateMoodPickerButtonLabel();
  renderDay(day);
}

// ---------- Sunday photo prompt ----------
// Mesure le texte RÉELLEMENT rendu sur cet appareil (pas une supposition) et
// réduit la police par petits pas jusqu'à ce que le texte tienne sur une
// seule ligne, sans jamais descendre sous minSize. Fonctionne peu importe
// les particularités de police/rendu du navigateur puisqu'elle vérifie le
// résultat réel à chaque étape plutôt qu'une valeur fixe devinée à l'avance.
function fitTextToOneLine(containerEl, maxSize, minSize, step){
  const span = containerEl.querySelector('span');
  if (!span) return;
  const isWrapped = () => {
    const range = document.createRange();
    range.selectNodeContents(span);
    return range.getClientRects().length > 1;
  };
  let size = maxSize;
  span.style.fontSize = size + 'px';
  while (size > minSize && isWrapped()){
    size -= step;
    span.style.fontSize = size + 'px';
  }
}

function maybeShowSundayPhotoPrompt(day){
  const banner = $('#sunday-photo-banner');
  const d = new Date(state.today + 'T00:00:00');
  const dismissedKey = `pt_photo_never_${state.today}`;
  const snoozeKey = `pt_photo_snooze_${state.today}`;
  const snoozeUntil = parseInt(localStorage.getItem(snoozeKey) || '0', 10);
  const isSnoozed = Date.now() < snoozeUntil;
  const shouldShow = d.getDay() === 0 && !(day.photos && day.photos.length > 0) && !localStorage.getItem(dismissedKey) && !isSnoozed;
  banner.hidden = !shouldShow;
  if (!shouldShow) return;
  fitTextToOneLine(banner, 13.5, 10, 0.5);

  banner.onclick = () => {
    $('#photo-modal').hidden = false;
    $('#photo-skip').hidden = new Date().getHours() >= 18;
  };
  $('#photo-skip').onclick = () => {
    const now = new Date();
    const today6pm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0);
    if (now < today6pm) localStorage.setItem(snoozeKey, String(today6pm.getTime()));
    $('#photo-modal').hidden = true;
    banner.hidden = true;
  };
  $('#photo-never-today').onclick = () => {
    localStorage.setItem(dismissedKey, '1');
    $('#photo-modal').hidden = true;
    banner.hidden = true;
  };
}

// ---------- Day 1 photo prompt ----------
// Encourage a brand-new user to take a "before" photo, useful later for
// comparing physical progress in the monthly summary. Keeps gently
// resurfacing (once, at 18h, per "remind later" tap) until the user either
// takes a photo, or dismisses it permanently — never once they've ever
// taken any photo at all.
function maybeShowDay1PhotoPrompt(day){
  if (day.totalPhotosEver > 0 || !day.isFirstEverDay) return false;
  if (localStorage.getItem('pt_day1_photo_never')) return false;
  const snoozeUntil = parseInt(localStorage.getItem('pt_day1_photo_snooze_until') || '0', 10);
  if (Date.now() < snoozeUntil) return false;

  $('#day1-photo-modal').hidden = false;
  const closeModal = () => { $('#day1-photo-modal').hidden = true; };
  $('#day1-photo-modal-close-x').onclick = closeModal;
  $('#day1-photo-skip').onclick = () => {
    const now = new Date();
    const today6pm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0);
    const target = now < today6pm ? today6pm : new Date(today6pm.getTime() + 24 * 60 * 60 * 1000);
    localStorage.setItem('pt_day1_photo_snooze_until', String(target.getTime()));
    closeModal();
  };
  $('#day1-photo-never').onclick = () => {
    localStorage.setItem('pt_day1_photo_never', '1');
    closeModal();
  };
  return true;
}

async function uploadPhoto(file, date){
  let result;
  if (isOfflinePrimaryDevice()){
    result = await localApi(`/api/photos/${date}`, { method:'POST', file });
  } else {
    const fd = new FormData();
    fd.append('photo', file);
    const res = await fetch(`/api/photos/${date}`, { method:'POST', body: fd });
    result = await res.json();
  }
  if (typeof isOfflinePrimaryDevice === 'function' && isOfflinePrimaryDevice() && typeof attemptBackgroundSync === 'function'){
    attemptBackgroundSync(false).catch(() => {});
  }
  const badges = result.newlyUnlockedBadges || [];
  badges.forEach((b) => enqueueCelebration({ type:'badge', badge:b }));
  return result;
}

// ---------- Calendar view ----------
function fmtMonth(ym){
  const [y,m] = ym.split('-').map(Number);
  return `${MONTH_NAMES()[m-1]} ${y}`;
}

const CALENDAR_CACHE_TTL = 45000; // 45 seconds

function invalidateCalendarCache(){
  state.calendarCache = null;
}

async function loadCalendar(){
  if (!state.calMonth) state.calMonth = state.today.slice(0,7);
  $('#cal-month-label').textContent = fmtMonth(state.calMonth);

  const myToken = (state.calendarLoadToken = (state.calendarLoadToken || 0) + 1);

  const cache = state.calendarCache;
  const cacheValid = cache && cache.month === state.calMonth && (Date.now() - cache.timestamp) < CALENDAR_CACHE_TTL;

  let data, streaks, trendData;
  if (cacheValid){
    ({ data, streaks, trendData } = cache);
  } else {
    [data, streaks, trendData] = await Promise.all([
      api(`/api/month/${state.calMonth}`),
      api('/api/streaks'),
      api('/api/trend'),
    ]);
    state.calendarCache = { month: state.calMonth, data, streaks, trendData, timestamp: Date.now() };
  }

  if (myToken !== state.calendarLoadToken) return;

  const monthTotal = Object.values(data.days).reduce((sum, d) => sum + d.total, 0);
  $('#cal-month-total').innerHTML = t('cal_month_total', { n: `<span class="cal-month-total-num">${monthTotal}</span>` });

  const [y,m] = state.calMonth.split('-').map(Number);
  const firstDow = new Date(y, m-1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();

  const grid = $('#cal-grid');
  grid.innerHTML = '';
  for (let i=0;i<firstDow;i++){
    const e = document.createElement('div');
    e.className = 'cal-day empty';
    grid.appendChild(e);
  }
  for (let d=1; d<=daysInMonth; d++){
    const date = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const info = data.days[date] || { total:0, trophy:null };
    const cell = document.createElement('div');
    cell.className = 'cal-day ' + trophyClass(info.trophy) + (info.inPlatinumWeek ? ' platinum-week' : '') + (date === state.today ? ' is-today' : '');
    const longClass = info.total >= 1000 ? ' dtotal-long' : '';
    cell.innerHTML = `<span class="dnum">${d}</span><span class="dtotal${longClass}">${info.total>0?info.total:''}</span>`;
    cell.addEventListener('click', () => openDayModal(date));
    grid.appendChild(cell);
  }

  $('#streak-cannabis-text').innerHTML = t('streak_cannabis', { n: `<span id="streak-cannabis">${streaks.cannabis}</span>` });
  $('#streak-cafe-text').innerHTML = t('streak_cafe', { n: `<span id="streak-cafe">${streaks.cafe}</span>` });
  $('#streak-alcool-text').innerHTML = t('streak_alcool', { n: `<span id="streak-alcool">${streaks.alcool}</span>` });

  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (myToken !== state.calendarLoadToken) return;
    renderTrendChart(trendData.points);
    if (state.view === 'calendar') window.scrollTo(0, 0);
  }));
}

function renderTrendChart(points){
  const width = 320;
  const height = 130;
  const pad = { top: 8, bottom: 16, left: 2, right: 2 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const gap = 2.5;
  const barW = (chartW - gap * (points.length - 1)) / points.length;

  const maxVal = Math.max(1, ...points.map((p) => p.total), ...points.map((p) => p.goal));
  const todayGoal = points[points.length - 1].goal;
  const goalY = pad.top + chartH - (todayGoal / maxVal) * chartH;

  const trophyColor = { bronze:'var(--bronze)', argent:'var(--argent)', or:'var(--or)', platine:'#B9DFFF' };

  let bars = '';
  points.forEach((p, i) => {
    const x = pad.left + i * (barW + gap);
    const barH = p.total > 0 ? Math.max((p.total / maxVal) * chartH, 2) : 0;
    const y = pad.top + chartH - barH;
    const color = p.trophy ? trophyColor[p.trophy] : 'var(--steel-dim)';
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="1.5" fill="${color}" />`;
  });

  let labels = '';
  points.forEach((p, i) => {
    if (i === 0 || i === points.length - 1 || i % 7 === 0){
      const d = new Date(p.date + 'T00:00:00');
      const x = pad.left + i * (barW + gap) + barW / 2;
      labels += `<text x="${x.toFixed(1)}" y="${height - 4}" font-size="7" fill="var(--text-muted)" text-anchor="middle">${d.getDate()}</text>`;
    }
  });

  $('#trend-chart-wrap').innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="trend-svg" preserveAspectRatio="none">
      <line x1="${pad.left}" y1="${goalY.toFixed(1)}" x2="${width - pad.right}" y2="${goalY.toFixed(1)}"
        stroke="var(--fire)" stroke-width="1.4" stroke-dasharray="4 3" opacity="0.75" />
      ${bars}
      ${labels}
    </svg>
  `;
}

// ---------- Habits page ----------
async function loadHabits(){
  const stats = await api('/api/stats');
  renderStats(stats);
  loadMonthlySummary(false);
  loadMonthlySummaryMonths();
  loadPersonalRecords();
}

function pluralSuffix(n, singularKey, pluralKey){
  return n === 1 ? t(singularKey) : t(pluralKey);
}

async function loadPersonalRecords(){
  const r = await api('/api/personal-records');
  const cards = [
    { icon:'🔥', label:t('record_best_set'), value: r.bestSet ? `${r.bestSet.count}` : null, date: r.bestSet ? formatFullDate(r.bestSet.date) : null },
    { icon:'📅', label:t('record_best_day'), value: r.bestDay ? `${r.bestDay.total}` : null, date: r.bestDay ? formatFullDate(r.bestDay.date) : null },
    { icon:'📈', label:t('record_best_week'), value: r.bestWeek ? `${r.bestWeek.total}` : null, date: r.bestWeek ? formatFullDate(r.bestWeek.weekStart) : null },
    { icon:'🗓️', label:t('record_best_month'), value: r.bestMonth ? `${r.bestMonth.total}` : null, date: r.bestMonth ? fmtMonth(r.bestMonth.monthKey) : null },
    { icon:'💎', label:t('record_platinum_streak'), value: r.longestPlatinumStreak ? `${r.longestPlatinumStreak} ${pluralSuffix(r.longestPlatinumStreak, 'record_week_singular', 'record_weeks_suffix')}` : null, date: null },
    { icon:'🚶', label:t('record_streak_marche'), value: r.bestStreakMarche ? `${r.bestStreakMarche} ${pluralSuffix(r.bestStreakMarche, 'record_day_singular', 'record_days_suffix')}` : null, date: null },
    { icon:'🚭', label:t('record_streak_drugs'), value: r.bestStreakCannabis ? `${r.bestStreakCannabis} ${pluralSuffix(r.bestStreakCannabis, 'record_day_singular', 'record_days_suffix')}` : null, date: null },
    { icon:'🍺', label:t('record_streak_alcool'), value: r.bestStreakAlcool ? `${r.bestStreakAlcool} ${pluralSuffix(r.bestStreakAlcool, 'record_day_singular', 'record_days_suffix')}` : null, date: null },
  ];
  $('#records-grid').innerHTML = cards.map((c) => `
    <div class="record-card${c.value ? '' : ' empty'}">
      <div class="record-icon">${c.icon}</div>
      <div class="record-value">${c.value || t('record_none')}</div>
      <div class="record-label">${c.label}</div>
      ${c.date ? `<div class="record-date">${c.date}</div>` : ''}
    </div>
  `).join('');
}

function renderHabitsList(habitState){
  const list = $('#habits-list');
  list.innerHTML = '';
  const customMap = {};
  (state.customHabits || []).forEach((ch) => { customMap[ch.id] = ch; });

  state.habitOrder.forEach((key, idx) => {
    const custom = customMap[key];
    const meta = custom ? { icon: custom.icon, label: custom.name } : HABIT_META()[key];
    if (!meta) return;
    const row = document.createElement('label');
    row.className = 'habit-row' + (state.habitsEditMode ? ' editing' : '');
    const deleteBtn = custom ? `<button type="button" class="habit-delete-custom" title="Supprimer">✕</button>` : '';
    row.innerHTML = `
      <input type="checkbox" data-habit="${key}" ${habitState[key] ? 'checked' : ''} />
      <span class="habit-check"></span>
      <span class="habit-label">${meta.icon ? meta.icon + ' ' : ''}${escapeHtml(meta.label)}</span>
      <span class="habit-reorder-btns">
        <button type="button" class="habit-up" ${idx === 0 ? 'disabled' : ''}>▲</button>
        <button type="button" class="habit-down" ${idx === state.habitOrder.length - 1 ? 'disabled' : ''}>▼</button>
        ${deleteBtn}
      </span>
    `;
    row.querySelector('input').addEventListener('change', (e) => saveHabit(key, e.target.checked));
    row.querySelector('.habit-up').addEventListener('click', (e) => { e.preventDefault(); moveHabit(idx, -1); });
    row.querySelector('.habit-down').addEventListener('click', (e) => { e.preventDefault(); moveHabit(idx, 1); });
    if (custom){
      row.querySelector('.habit-delete-custom').addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm(t('custom_habit_delete_confirm'))) return;
        const data = await api(`/api/custom-habits/${key}`, { method:'DELETE' });
        state.customHabits = data.customHabits;
        const settings = await api('/api/settings');
        state.habitOrder = settings.habitOrder || state.habitOrder;
        const day = await api(`/api/day/${state.today}`);
        renderHabitsList(day.habits || {});
      });
    }
    list.appendChild(row);
  });
}

async function moveHabit(idx, dir){
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.habitOrder.length) return;
  const order = state.habitOrder.slice();
  [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
  state.habitOrder = order;
  const currentChecks = {};
  $$('#habits-list input[type="checkbox"]').forEach((cb) => { currentChecks[cb.dataset.habit] = cb.checked; });
  renderHabitsList(currentChecks);
  await api('/api/settings', {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ habitOrder: order }),
  });
}

function renderStats(stats){
  $('#stat-start-date').textContent = stats.startDate ? formatFullDate(stats.startDate) : '—';
  $('#stat-total-pushups').textContent = stats.totalPushups;
  $('#stat-avg-per-day').textContent = stats.avgPerDay || 0;
  $('#stat-disciplined-days').textContent = stats.disciplinedDays;
  $('#stat-disciplined-weeks').textContent = stats.disciplinedWeeks;
  $('#stat-total-photos').textContent = stats.totalPhotos;
  $('#stat-total-notes').textContent = stats.totalNotes;
}

async function saveHabit(key, value){
  const day = await api(`/api/habits/${state.today}`, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ [key]: value }),
  });
  refreshXP();
  invalidateCalendarCache();
  (day.newlyUnlockedBadges || []).forEach((b) => enqueueCelebration({ type:'badge', badge:b }));
}

async function openDayModal(date){
  const day = await api(`/api/day/${date}`);
  const d = new Date(date + 'T00:00:00');
  $('#modal-date').textContent = formatDayHeader(date);
  $('#modal-total').textContent = `${day.total} ${t('pushups_word')}`;

  const tEl = $('#modal-trophy');
  if (day.trophy){
    tEl.hidden = false;
    tEl.className = 'modal-trophy ' + trophyClass(day.trophy);
    tEl.textContent = `${trophyEmoji(day.trophy)} ${trophyLabel(day.trophy)}`;
  } else {
    tEl.hidden = true;
  }

  const badgesWrap = $('#modal-badges-wrap');
  const dayBadges = day.badges || [];
  if (dayBadges.length > 0){
    badgesWrap.hidden = false;
    $('#modal-badges').innerHTML = dayBadges.map((b) => {
      const tr = translateBadge(b.id, b.name, '');
      return `<span class="habit-chip">${b.icon} ${tr.name}</span>`;
    }).join('');
  } else {
    badgesWrap.hidden = true;
  }

  const habitsWrap = $('#modal-habits-wrap');
  const activeHabits = Object.entries(day.habits || {}).filter(([, v]) => v);
  if (activeHabits.length > 0){
    habitsWrap.hidden = false;
    const customMap = {};
    (state.customHabits || []).forEach((ch) => { customMap[ch.id] = ch; });
    $('#modal-habits').innerHTML = activeHabits.map(([k]) => {
      const custom = customMap[k];
      const meta = custom ? { icon: custom.icon, label: custom.name } : HABIT_META()[k];
      return `<span class="habit-chip">${meta ? meta.icon + ' ' + meta.label : k}</span>`;
    }).join('');
  } else {
    habitsWrap.hidden = true;
  }

  renderPhotoGrid(day.photos || [], date);
  $('.add-photo-btn').hidden = date !== state.today;
  $('#modal-add-photo-input').onchange = async (e) => {
    if (e.target.files[0]){
      const updated = await uploadPhoto(e.target.files[0], date);
      renderPhotoGrid(updated.photos || [], date);
      e.target.value = '';
    }
  };

  const noteWrap = $('#modal-notes-wrap');
  if (day.notes && day.notes.length > 0){
    noteWrap.hidden = false;
    function refreshModalNotes(updated){
      renderNotes(updated.notes, $('#modal-notes'), null, date, refreshModalNotes);
    }
    renderNotes(day.notes, $('#modal-notes'), null, date, refreshModalNotes);
  } else {
    noteWrap.hidden = true;
  }

  const list = $('#modal-entries');
  list.innerHTML = '';
  if (day.entries.length === 0){
    list.innerHTML = `<li class="empty-state">${t('modal_no_entries')}</li>`;
  } else {
    day.entries.slice().reverse().forEach((e) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="entry-count">+${e.count}</span><span class="entry-time">${formatTimeDisplay(e.time)}</span>`;
      list.appendChild(li);
    });
  }

  $('#day-modal').hidden = false;
}

// ---------- Monthly summary ----------
async function loadMonthlySummary(allowPopup){
  let data;
  try {
    data = await api('/api/monthly-summary');
  } catch (err) { return; }

  if (allowPopup && data.available && data.shouldPopup && !state.monthlySummaryPopupShown){
    state.monthlySummaryPopupShown = true;
    try {
      showMonthlySummaryPopup(data.summary);
    } catch (err) { /* ignore popup render failure */ }
  }
}

async function loadMonthlySummaryMonths(){
  let data;
  try {
    data = await api('/api/monthly-summary-months');
  } catch (err) {
    $('#monthly-summary-section-content').innerHTML = `<div class="ms-empty-note">${t('ms_render_error')}</div>`;
    return;
  }
  renderMonthlySummaryMonthsList(data.months || []);
}

function renderMonthlySummaryMonthsList(months){
  const el = $('#monthly-summary-section-content');
  if (!months.length){
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    el.innerHTML = `<div class="ms-next-available">${t('ms_next_available_prefix')} ${t('ms_next_available', { month: MONTH_NAMES()[d.getMonth()], year: d.getFullYear() })}</div>`;
    return;
  }

  const currentYear = state.today ? state.today.slice(0, 4) : String(new Date().getFullYear());
  const byYear = {};
  months.forEach((mk) => {
    const y = mk.slice(0, 4);
    (byYear[y] = byYear[y] || []).push(mk);
  });
  const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a));

  const monthRowsHTML = (monthKeys) => monthKeys.slice().sort((a, b) => b.localeCompare(a)).map((mk) => {
    const monthIdx = parseInt(mk.slice(5, 7), 10) - 1;
    const monthName = MONTH_NAMES()[monthIdx];
    const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const label = `${capitalized} ${mk.slice(0, 4)}`;
    return `<button type="button" class="ms-month-row" data-month-key="${mk}">
      <span>${label}</span><span class="ms-month-chevron">›</span>
    </button>`;
  }).join('');

  let html = '';
  years.forEach((y) => {
    if (y === currentYear){
      html += monthRowsHTML(byYear[y]);
    } else {
      html += `
        <button type="button" class="ms-year-toggle" data-year="${y}">
          <span>${y}</span><span class="ms-year-chevron">▸</span>
        </button>
        <div class="ms-year-months" id="ms-year-months-${y}" hidden>${monthRowsHTML(byYear[y])}</div>`;
    }
  });
  el.innerHTML = html;

  el.querySelectorAll('.ms-month-row').forEach((btn) => {
    btn.addEventListener('click', () => openMonthlySummaryForMonth(btn.dataset.monthKey));
  });
  el.querySelectorAll('.ms-year-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = $('#ms-year-months-' + btn.dataset.year);
      wrap.hidden = !wrap.hidden;
      btn.querySelector('.ms-year-chevron').textContent = wrap.hidden ? '▸' : '▾';
    });
  });
}

async function openMonthlySummaryForMonth(monthKey){
  let data;
  try {
    data = await api(`/api/monthly-summary/${monthKey}`);
  } catch (err) { return; }
  showMonthlySummaryPopup(data.summary);
}

function showMonthlySummaryPopup(summary){
  const [y, m] = summary.monthKey.split('-').map(Number);
  $('#ms-modal-title').textContent = `${MONTH_NAMES()[m-1]} ${y}`.toUpperCase();
  const content = $('#ms-modal-content');
  content.innerHTML = buildMonthlySummaryHTML(summary);
  wireMonthlySummaryPhotos(content, summary);
  $('#monthly-summary-modal').hidden = false;
}

function deltaIndicator(current, previous){
  if (previous === null || previous === undefined || previous === 0) return '';
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) return '<span class="ms-delta-same">(=)</span>';
  const pct = Math.round((diff / previous) * 100);
  return diff > 0
    ? `<span class="ms-delta-up">▲ ${pct > 0 ? '+' : ''}${pct}%</span>`
    : `<span class="ms-delta-down">▼ ${pct}%</span>`;
}

function buildMonthlySummaryHTML(s){
  const trophyRow = `
    <div class="ms-section">
      <div class="ms-label">${t('ms_trophy_label')}</div>
      <div class="ms-trophy-row">
        <span class="ms-trophy-item">🥉 <span class="ms-trophy-count">${s.trophyCounts.bronze}</span></span>
        <span class="ms-trophy-item">🥈 <span class="ms-trophy-count">${s.trophyCounts.argent}</span></span>
        <span class="ms-trophy-item">🥇 <span class="ms-trophy-count">${s.trophyCounts.or}</span></span>
        <span class="ms-trophy-item">💎 <span class="ms-trophy-count">${s.trophyCounts.platine}</span></span>
      </div>
    </div>`;

  const moodEntries = Object.entries(s.moodCounts || {});
  const moodSection = `
    <div class="ms-section">
      <div class="ms-label">${t('ms_mood_label')}</div>
      ${moodEntries.length === 0
        ? `<div class="ms-empty-note">${t('ms_mood_none')}</div>`
        : `<div class="ms-mood-row">${moodEntries.map(([m,c]) => `<span class="ms-mood-chip">${MOOD_LABELS()[m] || m}<span class="ms-mood-count">×${c}</span></span>`).join('')}</div>`}
    </div>`;

  const hasPhotos = s.firstPhoto && s.lastPhoto;
  const photoSection = `
    <div class="ms-section">
      <div class="ms-label">${t('ms_photo_label')}</div>
      ${!hasPhotos ? `<div class="ms-empty-note">${t('ms_photo_none')}</div>` : `
      <div class="ms-photo-compare">
        <div class="ms-photo-col">
          <div class="modal-photo-item blurred" data-ms-photo="${s.firstPhoto.filename}">
            <img alt="" />
            <div class="photo-reveal-overlay">👁️</div>
          </div>
          <div class="ms-photo-caption">${formatShortDate(s.firstPhoto.date)}</div>
        </div>
        <div class="ms-photo-col">
          <div class="modal-photo-item blurred" data-ms-photo="${s.lastPhoto.filename}">
            <img alt="" />
            <div class="photo-reveal-overlay">👁️</div>
          </div>
          <div class="ms-photo-caption">${formatShortDate(s.lastPhoto.date)}</div>
        </div>
      </div>`}
    </div>`;

  const customHabitRows = (s.customHabitCounts || []).map((c) =>
    `<div class="ms-stat-row"><span class="ms-stat-label">${c.icon} ${escapeHtml(c.name)}</span><span class="ms-stat-value">${c.count}</span></div>`
  ).join('');

  const habitsSection = `
    <div class="ms-section">
      <div class="ms-label">${t('ms_habits_label')}</div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_days_no_drugs')}</span><span class="ms-stat-value">${s.daysWithoutDrugs}</span></div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_days_no_caffeine')}</span><span class="ms-stat-value">${s.daysWithoutCaffeine}</span></div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_days_no_alcool')}</span><span class="ms-stat-value">${s.daysWithoutAlcool}</span></div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_days_walked')}</span><span class="ms-stat-value">${s.daysWalked}</span></div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_situps_minimum')}</span><span class="ms-stat-value">${s.situpsMinimum}</span></div>
      ${customHabitRows}
    </div>`;

  const avgSection = `
    <div class="ms-section">
      <div class="ms-label">${t('ms_avg_label')}</div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_avg_this_month')}</span><span class="ms-stat-value">${s.avgSetSize} ${deltaIndicator(s.avgSetSize, s.avgSetSizePrevMonth)}</span></div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_avg_last_month')}</span><span class="ms-stat-value">${s.avgSetSizePrevMonth}</span></div>
    </div>`;

  const hasWorkOff = s.avgWorkDay !== null || s.avgDayOff !== null;
  const workOffSection = `
    <div class="ms-section">
      <div class="ms-label">${t('ms_workvsoff_label')}</div>
      ${!hasWorkOff ? `<div class="ms-empty-note">${t('ms_workvsoff_none')}</div>` : `
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_avg_workday')}</span><span class="ms-stat-value">${s.avgWorkDay !== null ? s.avgWorkDay : '—'}</span></div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_avg_dayoff')}</span><span class="ms-stat-value">${s.avgDayOff !== null ? s.avgDayOff : '—'}</span></div>`}
    </div>`;

  const bestDayLabel = s.bestDay ? `${formatShortDate(s.bestDay)} — ${s.bestDayTotal}` : '—';
  const bonusSection = `
    <div class="ms-section">
      <div class="ms-label">${t('ms_bonus_label')}</div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_total_pushups')}</span><span class="ms-stat-value">${formatNumber(s.totalPushups)}</span></div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_best_set')}</span><span class="ms-stat-value">${s.bestSet}</span></div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_best_day')}</span><span class="ms-stat-value">${bestDayLabel}</span></div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_badges_unlocked')}</span><span class="ms-stat-value">${s.badgesUnlockedCount}</span></div>
    </div>`;

  return trophyRow + moodSection + photoSection + habitsSection + avgSection + workOffSection + bonusSection;
}

async function resolvePhotoSrc(filename){
  if (isOfflinePrimaryDevice()){
    return getPhotoBlob(filename);
  }
  return `/photos/${filename}`;
}

function wireMonthlySummaryPhotos(container){
  container.querySelectorAll('[data-ms-photo]').forEach((item) => {
    const overlay = item.querySelector('.photo-reveal-overlay');
    const toggle = () => item.classList.toggle('blurred');
    if (overlay) overlay.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    item.querySelector('img').addEventListener('click', toggle);
    resolvePhotoSrc(item.dataset.msPhoto).then((src) => {
      if (src) item.querySelector('img').src = src;
    });
  });
}

function renderPhotoGrid(photos, date){
  const grid = $('#modal-photos-grid');
  grid.innerHTML = '';
  photos.forEach((p) => {
    const item = document.createElement('div');
    item.className = 'modal-photo-item blurred';
    item.innerHTML = `
      <img alt="Photo de progression" />
      <div class="photo-reveal-overlay">👁️</div>
      <button type="button" class="photo-delete">×</button>
    `;
    resolvePhotoSrc(p.filename).then((src) => {
      if (src) item.querySelector('img').src = src;
    });
    item.querySelector('.photo-reveal-overlay').addEventListener('click', (e) => {
      e.stopPropagation();
      item.classList.toggle('blurred');
    });
    item.querySelector('img').addEventListener('click', () => {
      item.classList.toggle('blurred');
    });
    item.querySelector('.photo-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      const updated = await api(`/api/photos/${date}/${p.filename}`, { method:'DELETE' });
      renderPhotoGrid(updated.photos || [], date);
    });
    grid.appendChild(item);
  });
}

// ---------- View switching ----------
async function loadBadges(){
  const data = await api('/api/badges');
  const unlocked = data.badges.filter((b) => b.unlocked);
  const locked = data.badges.filter((b) => !b.unlocked).sort((a, b) => (a.secret ? 1 : 0) - (b.secret ? 1 : 0));

  $('#badges-unlocked-title').textContent = t('badges_section_unlocked', { n: unlocked.length });
  $('#badges-locked-title').textContent = t('badges_section_locked', { n: locked.length });

  const renderInto = (gridEl, list) => {
    gridEl.innerHTML = '';
    list.forEach((b) => {
      const card = document.createElement('div');
      card.className = 'badge-card' + (b.unlocked ? '' : ' locked');
      const dateLabel = b.unlockedDate ? formatFullDate(b.unlockedDate) : '';
      const tr = translateBadge(b.id, b.name, b.desc);
      const descText = tr.desc === null ? t('badge_secret_placeholder') : tr.desc;
      const pct = b.progress ? Math.min(100, Math.round((b.progress.current / b.progress.target) * 100)) : null;
      card.innerHTML = `
        <div class="badge-icon">${b.unlocked ? b.icon : '🔒'}</div>
        <div class="badge-name">${tr.name}</div>
        <div class="badge-desc${b.desc === null ? ' secret-desc' : ''}">${descText}</div>
        <div class="badge-xp-tag">+${b.xp} XP</div>
        ${b.unlocked ? `<div class="badge-date">${dateLabel}</div>` : ''}
        ${pct !== null ? `<div class="badge-progress-track"><div class="badge-progress-fill" style="width:${pct}%"></div></div>` : ''}
      `;
      gridEl.appendChild(card);
    });
  };

  renderInto($('#badges-grid-unlocked'), unlocked);
  renderInto($('#badges-grid-locked'), locked);

  updateNudgeCard(locked);
}

const BADGE_PROGRESS_UNIT = {
  'rank-discipline': 'XP', 'rank-pro': 'XP', 'rank-elite': 'XP', 'rank-legende': 'XP',
  'rank-imbattable': 'XP', 'rank-immortel': 'XP', 'rank-divin': 'XP',
  'or-streak-5': 'jours', 'mois-brillant': 'semaines',
  'decafeine': 'jours', 'sans-alcool': 'jours', 'clarte': 'jours', 'go-abdo': 'jours',
  'consistance': 'push-ups', 'trente-en-un': 'push-ups', 'encore-plus': 'push-ups',
  'objectif-mensuel': 'push-ups', 'over-9000': 'push-ups', 'mille-en-cinq': 'push-ups',
  'force-tot': 'push-ups', 'oiseau-nuit': 'push-ups', 'soiree-motivante': 'push-ups',
};

function updateNudgeCard(locked){
  const card = $('#nudge-card');
  const candidates = locked.filter((b) => !b.secret && b.progress && b.progress.target > 0);
  if (!candidates.length){
    card.hidden = true;
    return;
  }
  let best = candidates[0];
  let bestPct = best.progress.current / best.progress.target;
  candidates.forEach((b) => {
    const pct = b.progress.current / b.progress.target;
    if (pct > bestPct){ best = b; bestPct = pct; }
  });
  const pct = Math.min(100, Math.round(bestPct * 100));
  const tr = translateBadge(best.id, best.name, best.desc);
  $('#nudge-icon').textContent = best.icon;
  $('#nudge-name').textContent = tr.name;
  $('#nudge-progress-fill').style.width = pct + '%';
  const unit = BADGE_PROGRESS_UNIT[best.id] || '';
  $('#nudge-count').textContent = `${formatNumber(best.progress.current)} / ${formatNumber(best.progress.target)} ${unit}`;
  card.hidden = false;
}

function formatShortDate(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTH_NAMES()[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}

function formatFullDate(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTH_NAMES()[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTimeDisplay(timeStr){
  if (state.timeFormat !== '12h' || !timeStr) return timeStr;
  const m = timeStr.match(/(\d{1,2})\s*h\s*(\d{2})/);
  if (!m) return timeStr;
  const h = parseInt(m[1], 10);
  const min = m[2];
  const suffix = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}h${min} ${suffix}`;
}

function formatDayHeader(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  const dow = DOW_NAMES()[d.getDay()];
  const day = d.getDate();
  const month = MONTH_NAMES()[d.getMonth()];
  if (state.lang === 'en'){
    return `${dow}, ${month} ${day}`;
  }
  return `${dow} ${day} ${month}`;
}

function playCascade(viewEl){
  if (!viewEl) return;
  viewEl.classList.remove('cascade-play');
  void viewEl.offsetWidth;
  viewEl.classList.add('cascade-play');
}

function switchView(view){
  if (state.view === view){
    window.scrollTo(0, 0);
    return;
  }
  state.view = view;
  window.scrollTo(0, 0);
  $('#view-today').hidden = view !== 'today';
  $('#view-calendar').hidden = view !== 'calendar';
  $('#view-habits').hidden = view !== 'habits';
  $('#view-badges').hidden = view !== 'badges';
  $('#view-settings').hidden = view !== 'settings';
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  playCascade($(`#view-${view}`));
  if (view === 'calendar') loadCalendar();
  if (view === 'habits') loadHabits();
  if (view === 'today') updateActiveBoostDisplay();
  if (view === 'badges') loadBadges();
  if (view === 'settings') loadRanks();
}

const XP_LOG_REASON_ICONS = {
  pushups: '💪', pushups_amulette: '💪🔮', habits: '📋', habit_marche: '🚶', habit_situps: '🔥', habit_avoidance: '🛡️',
  trophy_bronze: '🥉', trophy_argent: '🥈', trophy_or: '🥇', badge: '🏅',
  item: '🎁', platinum_week: '💎', graine_patience: '🌱',
};

function openXPLog(){
  $('#xp-log-modal').hidden = false;
  loadXPLog();
}

async function loadXPLog(){
  const listEl = $('#xp-log-list');
  const emptyEl = $('#xp-log-empty');
  listEl.innerHTML = '';
  let data;
  try {
    data = await api('/api/xp-log');
  } catch (err) {
    emptyEl.hidden = false;
    emptyEl.textContent = t('xp_log_error');
    return;
  }
  const log = data.log || [];
  if (log.length === 0){
    emptyEl.hidden = false;
    emptyEl.textContent = t('xp_log_empty');
    return;
  }
  emptyEl.hidden = true;
  listEl.innerHTML = log.map((entry) => {
    const icon = entry.icon || XP_LOG_REASON_ICONS[entry.reason] || '✨';
    return `<li>
      <div class="xp-log-row-left">
        <span class="xp-log-row-label">${icon} ${escapeHtml(entry.label)}</span>
        <span class="xp-log-row-date">${formatFullDate(entry.date)}</span>
      </div>
      <span class="xp-log-row-amount">+${entry.amount} XP</span>
    </li>`;
  }).join('');
}

function openInventory(){
  $('#inventory-modal').hidden = false;
  loadInventory();
}
function closeInventory(){
  $('#inventory-modal').hidden = true;
}

async function loadInventory(){
  const data = await api('/api/inventory');
  state.lastInventoryData = data;
  const grid = $('#inventory-grid');
  grid.innerHTML = data.items.map((it) => renderInventoryCard(it)).join('');
  const mgrid = $('#mythic-grid');
  mgrid.innerHTML = data.mythicItems.map((it) => renderMythicCard(it)).join('');

  grid.querySelectorAll('.inventory-item.discovered').forEach((el) => {
    el.addEventListener('click', () => openItemDetail(el.dataset.itemId));
  });
  mgrid.querySelectorAll('.inventory-item[data-mythic-item-id]').forEach((el) => {
    el.addEventListener('click', () => openMythicDetail(el.dataset.mythicItemId));
  });

  updateActiveBoostDisplay(data.activeBoosts, data.dailyItemEffects);
}

function renderInventoryCard(it){
  const iconMeta = ITEM_META[it.id] || { icon: '❔' };
  const name = it.discovered ? t(`item_name_${it.id}`) : t('inventory_undiscovered');
  const hasStock = it.stock && it.stock.length > 0;
  const cls = ['inventory-item'];
  if (it.discovered) cls.push('discovered');
  if (hasStock) cls.push('available');
  const qtyBadge = hasStock && it.stock.length > 1 ? `<div class="inv-qty">×${it.stock.length}</div>` : '';
  const rankLabel = !it.discovered
    ? `<div class="inv-rank-lock">${it.id === 'echo_passe' ? t('item_locked_echo_passe') : t('item_rank_locked', { rank: translateRankName(RANK_NAMES_FOR_ITEMS[it.minRank]) })}</div>`
    : '';
  return `
    <div class="${cls.join(' ')}" ${it.discovered ? `data-item-id="${it.id}"` : ''}>
      ${qtyBadge}
      <div class="inv-icon">${iconMeta.icon}</div>
      <div class="inv-name">${name}</div>
      ${it.discovered && hasStock ? `<div class="inv-rarity-row">${rarityLabelHtml(it.stock[0].rarity)}</div>` : ''}
      ${it.discovered && !hasStock ? `<div class="inv-rank-lock">${t('inventory_empty_stock')}</div>` : ''}
      ${rankLabel}
    </div>
  `;
}

function renderMythicCard(it){
  const iconMeta = ITEM_META[it.id] || { icon: '❔' };
  const name = it.discovered ? t(`item_name_${it.id}`) : t('inventory_undiscovered');
  const cls = ['inventory-item'];
  if (it.discovered) cls.push('discovered', 'available');
  const toggle = (it.cosmetic && it.discovered) ? `<div class="inv-rank-lock">${it.active ? t('mythic_toggle_on') : t('mythic_toggle_off')}</div>` : '';
  return `
    <div class="${cls.join(' ')}" ${it.discovered ? `data-mythic-item-id="${it.id}"` : ''}>
      <div class="inv-icon">${iconMeta.icon}</div>
      <div class="inv-name">${name}</div>
      ${toggle}
      ${!it.discovered ? `<div class="inv-rank-lock">${t('item_rank_locked', { rank: translateRankName(RANK_NAMES_FOR_ITEMS[it.minRank]) })}</div>` : ''}
    </div>
  `;
}

function openMythicDetail(itemId){
  const data = state.lastInventoryData;
  const it = data && data.mythicItems.find((m) => m.id === itemId);
  if (!it) return;
  state.selectedMythicId = itemId;
  $('#mythic-detail-icon').textContent = (ITEM_META[itemId] || { icon: '✨' }).icon;
  $('#mythic-detail-name').textContent = t(`item_name_${itemId}`);
  $('#mythic-detail-desc').textContent = t(`item_desc_${itemId}`);
  const toggleRow = $('#mythic-detail-toggle-row');
  if (it.cosmetic){
    toggleRow.hidden = false;
    $('#mythic-detail-toggle').classList.toggle('active', !!it.active);
  } else {
    toggleRow.hidden = true;
  }
  $('#mythic-detail-modal').hidden = false;
}

function applyMythicCosmetic(itemId, active){
  if (!state.mythicActive) state.mythicActive = {};
  state.mythicActive[itemId] = !!active;
  if (itemId === 'toucher_divin'){
    $('#ring-wrap').classList.toggle('divine-halo-active', !!active);
    $('.xp-card').classList.toggle('aura-active', !!active);
    if (!active && !(state.mythicActive && state.mythicActive.mode_arcenciel) && state.ringGoal !== undefined) {
      updateRing(state.ringTotal, state.ringGoal, state.ringTrophy);
    }
  } else if (itemId === 'poussiere_etoiles'){
    state.poussiereEtoilesActive = !!active;
  } else if (itemId === 'calendrier_celeste'){
    state.calendrierCelesteActive = !!active;
    document.body.classList.toggle('calendrier-celeste-active', !!active);
  } else if (itemId === 'echo_dore'){
    state.echoDoreActive = !!active;
    document.body.classList.toggle('echo-dore-active', !!active);
  } else if (itemId === 'mode_arcenciel'){
    if (active) startRainbowMode();
    else stopRainbowMode();
  }
}

function renderItemTypeAndDesc(itemId, rarity, details){
  $('#item-detail-type-picker').innerHTML = rarity
    ? `${t('item_detail_type_label')} ${rarityLabelHtml(rarity)}`
    : '';
  const specificKey = `item_desc_${itemId}_specific`;
  const hasSpecific = TRANSLATIONS.fr[specificKey] !== undefined;
  $('#item-detail-desc').textContent = rarity
    ? t(hasSpecific ? specificKey : `item_desc_${itemId}`, detailPlaceholders(details))
    : t(`item_desc_${itemId}`);
  const footnoteKey = `item_footnote_${itemId}`;
  const footnoteEl = $('#item-detail-footnote');
  if (rarity && TRANSLATIONS.fr[footnoteKey] !== undefined){
    footnoteEl.textContent = t(footnoteKey);
    footnoteEl.hidden = false;
  } else {
    footnoteEl.hidden = true;
  }
  const capEl = $('#item-detail-cap');
  if (rarity && details && 'maxStack' in details) {
    const isUnlimited = details.maxStack === null || details.maxStack === Infinity;
    const capText = isUnlimited ? t('item_detail_cap_unlimited') : t('item_detail_cap_limited', { n: details.maxStack });
    capEl.textContent = capText;
  } else {
    capEl.textContent = '';
  }
}

function openItemDetail(itemId){
  const data = state.lastInventoryData;
  const it = data && data.items.find((i) => i.id === itemId);
  if (!it) return;
  state.selectedItemId = itemId;
  state.selectedItemInstance = null;
  $('#item-detail-icon').textContent = (ITEM_META[itemId] || { icon: '❔' }).icon;
  $('#item-detail-name').textContent = t(`item_name_${itemId}`);
  const chipsBox = $('#item-detail-chips');
  const useBtn = $('#item-detail-use-btn');
  const stock = it.stock || [];
  const allRarities = it.allRarityDetails || {};
  const byRarity = {};
  stock.forEach((s) => { (byRarity[s.rarity] = byRarity[s.rarity] || []).push(s); });
  const distinctRarities = Object.keys(byRarity).sort((a, b) => RARITY_ORDER.indexOf(a) - RARITY_ORDER.indexOf(b));

  if (stock.length === 0){
    chipsBox.innerHTML = '';
    const possibleRarities = Object.keys(allRarities);
    if (possibleRarities.length === 1){
      const referenceRarity = possibleRarities[0];
      renderItemTypeAndDesc(itemId, referenceRarity, allRarities[referenceRarity]);
    } else {
      renderItemTypeAndDesc(itemId, null, null);
    }
    useBtn.hidden = true;
  } else if (distinctRarities.length === 1){
    chipsBox.innerHTML = '';
    const only = byRarity[distinctRarities[0]][0];
    renderItemTypeAndDesc(itemId, only.rarity, only.details);
    state.selectedItemInstance = only;
    useBtn.hidden = false;
  } else {
    chipsBox.innerHTML = `<div class="goal-mode-toggle">${distinctRarities.map((rarity) =>
      `<button type="button" class="mode-btn item-rarity-chip" data-rarity="${rarity}">${rarityLabelHtml(rarity)} ×${byRarity[rarity].length}</button>`
    ).join('')}</div>`;
    renderItemTypeAndDesc(itemId, null, null);
    useBtn.hidden = true;
    chipsBox.querySelectorAll('.item-rarity-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        chipsBox.querySelectorAll('.item-rarity-chip').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const chosen = byRarity[btn.dataset.rarity][0];
        state.selectedItemInstance = chosen;
        renderItemTypeAndDesc(itemId, chosen.rarity, chosen.details);
        useBtn.hidden = false;
      });
    });
  }
  $('#item-detail-modal').hidden = false;
}

function closeItemDetail(){
  $('#item-detail-modal').hidden = true;
}

function showItemSameTypeActiveModal(itemId){
  $('#item-same-type-active-icon').textContent = ITEM_META[itemId].icon;
  $('#item-same-type-active-modal').hidden = false;
}

function showItemReplaceActiveModal(itemId, instanceId){
  $('#item-replace-active-icon').textContent = ITEM_META[itemId].icon;
  state.pendingItemUse = { itemId, instanceId };
  $('#item-replace-active-modal').hidden = false;
}

async function confirmUseSelectedItem(){
  const itemId = state.selectedItemId;
  const instance = state.selectedItemInstance;
  if (!itemId || !instance) return;

  if (itemId === 'amulette_xp' || itemId === 'detecteur_metal' || itemId === 'graine_patience'){
    const invData = await api('/api/inventory');
    let activeRarity = null;
    if (itemId === 'amulette_xp'){
      const boosts = invData.activeBoosts;
      if (boosts && boosts.amuletteEndsAt && new Date(boosts.amuletteEndsAt) > new Date()) activeRarity = boosts.amuletteRarity;
    } else if (itemId === 'detecteur_metal'){
      const boosts = invData.activeBoosts;
      if (boosts && boosts.detecteurEndsAt && new Date(boosts.detecteurEndsAt) > new Date()) activeRarity = boosts.detecteurRarity;
    } else if (itemId === 'graine_patience'){
      const todayUse = (invData.dailyItemEffects || []).find((e) => e.itemId === 'graine_patience');
      if (todayUse) activeRarity = todayUse.rarity;
    }
    if (activeRarity){
      closeItemDetail();
      if (activeRarity === instance.rarity){
        showItemSameTypeActiveModal(itemId);
      } else {
        showItemReplaceActiveModal(itemId, instance.id);
      }
      return;
    }
  }

  if (itemId === 'radar_precision'){
    const invData = await api('/api/inventory');
    if (invData.radarPending){
      closeItemDetail();
      showItemSameTypeActiveModal(itemId);
      return;
    }
  }

  closeItemDetail();
  openUseItemPicker(itemId, instance.id);
}

function openUseItemPicker(itemId, instanceId, rarity){
  if (itemId === 'talisman_pardon'){
    const body = `
      <p>${t('use_item_talisman_prompt')}</p>
      <div class="goal-mode-toggle">
        <button type="button" class="mode-btn" data-key="cannabis">${t('use_item_talisman_cannabis')}</button>
        <button type="button" class="mode-btn" data-key="cafe">${t('use_item_talisman_cafe')}</button>
        <button type="button" class="mode-btn" data-key="marche">${t('use_item_talisman_marche')}</button>
      </div>
    `;
    $('#use-item-icon').textContent = ITEM_META[itemId].icon;
    $('#use-item-name').textContent = t(`item_name_${itemId}`);
    $('#use-item-body').innerHTML = body;
    $('#use-item-modal').hidden = false;
    $('#use-item-body').querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', async () => {
        const res = await api(`/api/inventory/use/${instanceId}`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ habitKey: b.dataset.key }),
        });
        $('#use-item-body').innerHTML = `<p>${t('use_item_talisman_result')}</p>`;
        refreshXP();
        invalidateCalendarCache();
        loadInventory();
      });
    });
    return;
  }
  useItemDirect(itemId, instanceId);
}

async function useItemDirect(itemId, instanceId, force){
  try {
    const res = await api(`/api/inventory/use/${instanceId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(force ? { force: true } : {}) });
    const r = res.result;
    if (r.effect === 'echo_passe'){
      const msg = t('use_item_echo_result_' + r.framing) + `<div class="ms-empty-note" style="margin-top:10px;">"${escapeHtml(r.note.text)}"</div>`;
      $('#use-item-icon').textContent = ITEM_META[itemId].icon;
      $('#use-item-name').textContent = t(`item_name_${itemId}`);
      $('#use-item-body').innerHTML = `<p>${msg}</p>`;
      $('#use-item-modal').hidden = false;
    }
    refreshXP();
    invalidateCalendarCache();
    await refreshDay();
    if (r.effect === 'plume_legere'){
      $('#goal-echo').textContent = r.newGoal;
    }
    loadInventory();
    updateActiveBoostDisplay();
  } catch (err) {
    if (itemId === 'echo_passe') alert(t('use_item_echo_none'));
    else if (itemId === 'amulette_xp' || itemId === 'detecteur_metal' || itemId === 'graine_patience' || itemId === 'radar_precision') showItemSameTypeActiveModal(itemId);
    else if (itemId === 'plume_legere') $('#plume-max-modal').hidden = false;
  }
}

const RARITY_COLORS = { basique: '#4A9EFF', rare: '#A855F7', epique: '#EC4899', legendaire: '#F97316' };

function formatRemaining(ms){
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2,'0')}`;
}

function findItemRarityDetails(itemId, rarity){
  const data = state.lastInventoryData;
  if (!data) return null;
  const it = (data.items || []).find((x) => x.id === itemId);
  return it && it.allRarityDetails ? it.allRarityDetails[rarity] : null;
}

let _boostTimerHandle = null;
let _boostTimerHandleDetecteur = null;
async function updateActiveBoostDisplay(boosts, dailyItemEffects){
  if (!boosts){
    const data = await api('/api/inventory');
    boosts = data.activeBoosts;
    dailyItemEffects = data.dailyItemEffects;
    state.lastInventoryData = data;
  }

  const amuCorner = $('#hero-amulette-corner');
  if (_boostTimerHandle) clearInterval(_boostTimerHandle);
  if (boosts && boosts.amuletteEndsAt && new Date(boosts.amuletteEndsAt) > new Date()){
    const color = RARITY_COLORS[boosts.amuletteRarity] || RARITY_COLORS.basique;
    amuCorner.hidden = false;
    amuCorner.style.setProperty('--corner-color', color);
    amuCorner.innerHTML = `<div class="hero-corner-icon-circle">🔮</div><div class="hero-corner-pct">×${boosts.amuletteMult} XP</div><div class="hero-corner-timer" id="hero-amulette-timer">—</div>`;
    amuCorner.onclick = () => openActiveItemDetail('amulette_xp', boosts.amuletteRarity, boosts.amuletteEndsAt);
    const tick = () => {
      const remaining = new Date(boosts.amuletteEndsAt) - new Date();
      if (remaining <= 0){ amuCorner.hidden = true; clearInterval(_boostTimerHandle); return; }
      const el = document.getElementById('hero-amulette-timer');
      if (el) el.textContent = formatRemaining(remaining);
    };
    tick();
    _boostTimerHandle = setInterval(tick, 1000);
  } else {
    amuCorner.hidden = true;
  }

  const detCorner = $('#hero-detecteur-corner');
  if (_boostTimerHandleDetecteur) clearInterval(_boostTimerHandleDetecteur);
  if (boosts && boosts.detecteurEndsAt && new Date(boosts.detecteurEndsAt) > new Date()){
    const color = RARITY_COLORS[boosts.detecteurRarity] || RARITY_COLORS.rare;
    detCorner.hidden = false;
    detCorner.style.setProperty('--corner-color', color);
    detCorner.innerHTML = `<div class="hero-corner-icon-circle">📡</div><div class="hero-corner-pct">+${Math.round((boosts.detecteurBonus||0)*100)}%</div><div class="hero-corner-timer" id="hero-detecteur-timer">—</div>`;
    detCorner.onclick = () => openActiveItemDetail('detecteur_metal', boosts.detecteurRarity, boosts.detecteurEndsAt);
    const tickD = () => {
      const remaining = new Date(boosts.detecteurEndsAt) - new Date();
      if (remaining <= 0){ detCorner.hidden = true; clearInterval(_boostTimerHandleDetecteur); return; }
      const el = document.getElementById('hero-detecteur-timer');
      if (el) el.textContent = formatRemaining(remaining);
    };
    tickD();
    _boostTimerHandleDetecteur = setInterval(tickD, 1000);
  } else {
    detCorner.hidden = true;
  }

  renderDailyItemsCorner(dailyItemEffects || []);
}

function renderDailyItemsCorner(effects){
  const stack = $('#hero-daily-items-corner');
  const sorted = effects.slice().sort((a, b) => {
    const rarityDiff = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    if (rarityDiff !== 0) return rarityDiff;
    return new Date(a.usedAt) - new Date(b.usedAt);
  });
  stack.innerHTML = sorted.map((e) => {
    const color = RARITY_COLORS[e.rarity] || RARITY_COLORS.basique;
    const meta = ITEM_META[e.itemId] || { icon: '❔' };
    return `<div class="hero-corner-icon-circle" style="--corner-color:${color};" data-daily-item-id="${e.itemId}" data-daily-item-rarity="${e.rarity}">${meta.icon}</div>`;
  }).join('');
  stack.querySelectorAll('[data-daily-item-id]').forEach((el) => {
    el.addEventListener('click', () => openActiveItemDetail(el.dataset.dailyItemId, el.dataset.dailyItemRarity, null));
  });
}

function openActiveItemDetail(itemId, rarity, endsAt){
  const color = RARITY_COLORS[rarity] || RARITY_COLORS.basique;
  const meta = ITEM_META[itemId] || { icon: '❔' };
  const details = findItemRarityDetails(itemId, rarity);
  $('#active-item-detail-icon').textContent = meta.icon;
  $('#active-item-detail-name').textContent = t(`item_name_${itemId}`);
  $('#active-item-detail-type').innerHTML = `${t('item_detail_type_label')} ${rarityLabelHtml(rarity)}`;
  const activeSpecificKey = `item_desc_${itemId}_specific`;
  const activeHasSpecific = TRANSLATIONS.fr[activeSpecificKey] !== undefined;
  $('#active-item-detail-desc').textContent = t(activeHasSpecific ? activeSpecificKey : `item_desc_${itemId}`, detailPlaceholders(details));
  const footnoteKey = `item_footnote_${itemId}`;
  const footnoteEl = $('#active-item-detail-footnote');
  if (TRANSLATIONS.fr[footnoteKey] !== undefined){
    footnoteEl.textContent = t(footnoteKey);
    footnoteEl.hidden = false;
  } else {
    footnoteEl.hidden = true;
  }
  const modal = $('#active-item-detail-modal');
  modal.style.setProperty('--corner-color', color);
  modal.style.setProperty('--corner-bg', color + '1A');
  const timerBox = $('#active-item-detail-timer-box');
  if (endsAt){
    timerBox.hidden = false;
    const updateTimer = () => {
      const remaining = new Date(endsAt) - new Date();
      $('#active-item-detail-timer-value').textContent = remaining > 0 ? formatRemaining(remaining) : '0:00';
    };
    updateTimer();
  } else {
    timerBox.hidden = true;
  }
  modal.hidden = false;
}

async function loadRanks(){
  const [data, xp] = await Promise.all([api('/api/ranks'), api('/api/xp')]);
  const list = $('#ranks-list');
  list.innerHTML = data.ranks.map((r, idx) => {
    const isCurrent = idx === xp.rankIndex;
    const xpLabel = isCurrent ? `${formatNumber(xp.xp)} XP` : `${formatNumber(r.min)} XP`;
    return `<div class="rank-row${isCurrent ? ' current-rank' : ''}"><span class="rank-row-name">${translateRankName(r.name)}</span><span class="rank-row-xp">${xpLabel}</span></div>`;
  }).join('');

  const table = trophyXPTableClient(xp.rankIndex);
  $('#xp-source-bronze-value').textContent = `+${table.bronze} XP`;
  $('#xp-source-argent-value').textContent = `+${table.argent - table.bronze} XP`;
  $('#xp-source-or-value').textContent = `+${table.or - table.argent} XP`;
}

function formatNumber(n){
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function updateSwatchSelection(){
  $$('.swatch').forEach((s) => {
    s.classList.toggle('selected', s.dataset.color.toLowerCase() === state.accentColor.toLowerCase());
  });
}

async function saveAccentColor(hex){
  state.accentColor = hex;
  applyAccent(hex);
  updateSwatchSelection();
  $('#custom-color-input').value = hex;
  await api('/api/settings', {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ accentColor: hex }),
  });
}

// ---------- Wire up ----------
function init(){
  window.scrollTo(0, 0);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible'){
      restartShimmer();
      updateActiveBoostDisplay();
    }
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') updateActiveBoostDisplay();
  }, 15000);
  $$('.qbtn[data-add]').forEach((b) => {
    b.addEventListener('click', () => addReps(parseInt(b.dataset.add,10)));
  });
  $('#custom-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#custom-count');
    addReps(parseInt(input.value,10));
    input.value = '';
  });
  $('#undo-btn').addEventListener('click', undoLast);

  $('#entries-toggle').addEventListener('click', () => {
    state.entriesExpanded = !state.entriesExpanded;
    refreshDay();
  });

  $('#note-input').addEventListener('focus', () => {
    $('#note-form-actions').hidden = false;
  });
  const notesCard = document.querySelector('.notes');
  document.addEventListener('click', (e) => {
    if (!notesCard.contains(e.target) && !$('#mood-picker-modal').contains(e.target)){
      $('#note-form-actions').hidden = true;
    }
  });

  $('#mood-picker-open-btn').addEventListener('click', () => {
    $('#mood-picker-modal').hidden = false;
  });
  $$('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target !== backdrop) return;
      const closeBtn = backdrop.querySelector('.modal-close');
      if (closeBtn) closeBtn.click();
    });
  });
  $('#mood-picker-confirm').addEventListener('click', () => {
    $('#mood-picker-modal').hidden = true;
  });

  $$('#mood-picker-list .mood-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const m = chip.dataset.mood;
      if (state.selectedMoods.includes(m)){
        state.selectedMoods = state.selectedMoods.filter((x) => x !== m);
        chip.classList.remove('selected');
      } else {
        state.selectedMoods.push(m);
        chip.classList.add('selected');
      }
      updateMoodPickerButtonLabel();
    });
  });

  $('#note-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#note-input');
    addNote(input.value);
    input.value = '';
    $('#note-form-actions').hidden = true;
  });

  $$('.tab').forEach((t) => {
    t.addEventListener('touchstart', () => {
      switchView(t.dataset.view);
    }, { passive: true });
    t.addEventListener('click', () => switchView(t.dataset.view));
  });

  $('#cal-prev').addEventListener('click', () => {
    const [y,m] = state.calMonth.split('-').map(Number);
    const d = new Date(y, m-2, 1);
    state.calMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    loadCalendar();
  });
  $('#cal-next').addEventListener('click', () => {
    const [y,m] = state.calMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    state.calMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    loadCalendar();
  });

  $('#day-modal-close').addEventListener('click', () => { $('#day-modal').hidden = true; });
  $('#active-item-detail-close-x').addEventListener('click', () => { $('#active-item-detail-modal').hidden = true; });
  $('#trophy-modal-close-x').addEventListener('click', () => dismissCelebration('#trophy-modal'));
  $('#rankup-modal-close-x').addEventListener('click', () => dismissCelebration('#rankup-modal'));
  $('#badge-modal-close-x').addEventListener('click', () => dismissCelebration('#badge-modal'));
  $('#item-drop-close-x').addEventListener('click', () => dismissCelebration('#item-drop-modal'));
  $('#item-same-type-active-close-x').addEventListener('click', () => { $('#item-same-type-active-modal').hidden = true; });
  $('#item-same-type-active-ok').addEventListener('click', () => { $('#item-same-type-active-modal').hidden = true; });
  $('#item-replace-active-close-x').addEventListener('click', () => { $('#item-replace-active-modal').hidden = true; state.pendingItemUse = null; });
  $('#item-replace-active-cancel').addEventListener('click', () => { $('#item-replace-active-modal').hidden = true; state.pendingItemUse = null; });
  $('#item-replace-active-yes').addEventListener('click', () => {
    $('#item-replace-active-modal').hidden = true;
    if (state.pendingItemUse){
      const { itemId, instanceId } = state.pendingItemUse;
      state.pendingItemUse = null;
      useItemDirect(itemId, instanceId, true);
    }
  });
  $('#plume-max-close-x').addEventListener('click', () => { $('#plume-max-modal').hidden = true; });
  $('#mood-picker-close-x').addEventListener('click', () => { $('#mood-picker-modal').hidden = true; });
  $('#use-item-close-x').addEventListener('click', () => { $('#use-item-modal').hidden = true; });
  $('#photo-modal-close-x').addEventListener('click', () => { $('#photo-modal').hidden = true; });
  $('#monthly-summary-close-x').addEventListener('click', async () => {
    $('#monthly-summary-modal').hidden = true;
    try { await api('/api/monthly-summary/acknowledge', { method:'POST' }); } catch (err) { /* ignore */ }
  });
  $('#day-modal').addEventListener('click', (e) => { if (e.target.id === 'day-modal') $('#day-modal').hidden = true; });

  $('#trophy-ok').addEventListener('click', () => dismissCelebration('#trophy-modal'));
  $('#rankup-ok').addEventListener('click', () => dismissCelebration('#rankup-modal'));
  $('#badge-modal-ok').addEventListener('click', () => dismissCelebration('#badge-modal'));
  $('#item-drop-ok').addEventListener('click', () => dismissCelebration('#item-drop-modal'));
  $('#use-item-close').addEventListener('click', () => { $('#use-item-modal').hidden = true; });
  $('#item-detail-close-x').addEventListener('click', closeItemDetail);
  $('#mythic-detail-close-x').addEventListener('click', () => { $('#mythic-detail-modal').hidden = true; });
  $('#mythic-detail-toggle').addEventListener('click', async () => {
    const itemId = state.selectedMythicId;
    if (!itemId) return;
    const data = await api(`/api/inventory/mythic/${itemId}/toggle`, { method: 'POST' });
    applyMythicCosmetic(itemId, data.active);
    $('#mythic-detail-toggle').classList.toggle('active', !!data.active);
    loadInventory();
  });
  $('#item-detail-use-btn').addEventListener('click', confirmUseSelectedItem);
  $('#plume-max-ok').addEventListener('click', () => { $('#plume-max-modal').hidden = true; });
  $('#inventory-header-btn').addEventListener('click', openInventory);
  $('#app-wordmark').addEventListener('click', () => {
    if (state.echoDoreActive) playEchoDoreMelody();
  });
  $('#inventory-back-btn').addEventListener('click', closeInventory);
  $('#inventory-close-x').addEventListener('click', closeInventory);

  let itemOddsIsMythic = false;
  const RARITY_ORDER_CLIENT = ['basique', 'rare', 'epique', 'legendaire'];

  function renderRarityBars(breakdown){
    const el = $('#item-odds-rarity-bars');
    el.innerHTML = RARITY_ORDER_CLIENT.map((tier) => {
      const pct = Math.round((breakdown[tier] || 0) * 1000) / 10;
      return `
        <div class="item-odds-rarity-row">
          <span class="item-odds-rarity-name">${t('rarity_' + tier)}</span>
          <div class="item-odds-rarity-track"><div class="item-odds-rarity-fill" style="width:${pct}%"></div></div>
          <span class="item-odds-rarity-pct">${pct}%</span>
        </div>
      `;
    }).join('');
  }

  function renderPerItemDetails(perItem){
    const el = $('#item-odds-details-list');
    const sorted = [...perItem].sort((a, b) => b.chance - a.chance);
    el.innerHTML = sorted.map((it) => {
      const tr = t(`item_name_${it.id}`);
      const pct = Math.round(it.chance * 1000) / 10;
      return `<div class="item-odds-detail-row"><span class="item-odds-detail-name">${tr} (${t('rarity_' + it.rarity)})</span><span class="item-odds-detail-value">${pct}%</span></div>`;
    }).join('');
  }

  function renderMythicDetails(perMythic){
    const el = $('#item-odds-mythic-list');
    if (!perMythic.length){
      el.innerHTML = `<div class="ms-empty-note">${t('item_odds_mythic_locked')}</div>`;
      return;
    }
    const sorted = [...perMythic].sort((a, b) => b.chance - a.chance);
    el.innerHTML = sorted.map((it) => {
      const tr = t(`item_name_${it.id}`);
      const pct = Math.round(it.chance * 10000) / 100;
      return `<div class="item-odds-detail-row"><span class="item-odds-detail-name">${tr}</span><span class="item-odds-detail-value">${pct}%</span></div>`;
    }).join('');
  }

  async function refreshItemOdds(){
    const count = parseInt($('#item-odds-slider').value, 10);
    $('#item-odds-count').textContent = count;
    const data = await api(`/api/item-odds?count=${count}`);
    $('#item-odds-drop-value').textContent = Math.round(data.dropChance * 1000) / 10 + '%';
    $('#item-odds-rank-note').textContent = t('item_odds_rank_note', { rank: translateRankName(RANK_NAMES_FR[data.rankIdx]) });
    if (itemOddsIsMythic){
      $('#item-odds-mythic-value').textContent = Math.round(data.mythicChance * 1000) / 10 + '%';
      const remaining = data.mythicTotalCount - data.mythicDiscoveredCount;
      const foundNote = $('#item-odds-mythic-found-note');
      if (data.mythicDiscoveredCount > 0 && remaining > 0){
        foundNote.hidden = false;
        foundNote.textContent = t('item_odds_mythic_remaining', {
          found: data.mythicDiscoveredCount, total: data.mythicTotalCount, remaining,
        });
      } else {
        foundNote.hidden = true;
      }
      renderMythicDetails(data.perMythic);
    } else {
      renderRarityBars(data.rarityBreakdown);
      renderPerItemDetails(data.perItem);
      $('#item-odds-detecteur-value').textContent = Math.round(data.detecteurChance * 1000) / 10 + '%';
      $('#item-odds-radar-value').textContent = Math.round(data.radarChance * 1000) / 10 + '%';
    }
  }

  function openItemOddsModal(isMythic){
    itemOddsIsMythic = isMythic;
    $('#item-odds-title').textContent = t(isMythic ? 'item_odds_mythic_title' : 'item_odds_title');
    $('#item-odds-drop-headline').hidden = isMythic;
    $('#item-odds-rarity-block').hidden = isMythic;
    $('#item-odds-mythic-block').hidden = !isMythic;
    $('#item-odds-other-row').hidden = isMythic;
    $('#item-odds-details-list').hidden = true;
    $('#item-odds-details-chevron').classList.remove('is-expanded');
    $('#item-odds-modal').hidden = false;
    refreshItemOdds();
  }

  $('#item-odds-trigger').addEventListener('click', () => openItemOddsModal(false));
  $('#mythic-odds-trigger').addEventListener('click', () => openItemOddsModal(true));
  $('#item-odds-slider').addEventListener('input', refreshItemOdds);
  $('#item-odds-details-toggle').addEventListener('click', () => {
    const list = $('#item-odds-details-list');
    const chevron = $('#item-odds-details-chevron');
    list.hidden = !list.hidden;
    chevron.classList.toggle('is-expanded', !list.hidden);
  });
  const closeItemOdds = () => { $('#item-odds-modal').hidden = true; };
  $('#item-odds-back-btn').addEventListener('click', closeItemOdds);
  $('#item-odds-close-x').addEventListener('click', closeItemOdds);

  $('#xp-card-btn').addEventListener('click', openXPLog);
  $('#xp-card-btn').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openXPLog(); }
  });
  $('#xp-log-close-x').addEventListener('click', () => { $('#xp-log-modal').hidden = true; });
  $('#xp-log-back-btn').addEventListener('click', () => { $('#xp-log-modal').hidden = true; });

  const setupBadgesSectionToggle = (toggleId, chevronId, gridId) => {
    $(toggleId).addEventListener('click', () => {
      const grid = $(gridId);
      grid.hidden = !grid.hidden;
      $(chevronId).classList.toggle('is-expanded', !grid.hidden);
      $(toggleId).closest('.card').classList.toggle('is-collapsed', grid.hidden);
    });
  };
  setupBadgesSectionToggle('#badges-unlocked-toggle', '#badges-unlocked-chevron', '#badges-grid-unlocked');
  setupBadgesSectionToggle('#badges-locked-toggle', '#badges-locked-chevron', '#badges-grid-locked');

  $('#ms-modal-close').addEventListener('click', async () => {
    $('#monthly-summary-modal').hidden = true;
    try { await api('/api/monthly-summary/acknowledge', { method:'POST' }); } catch (err) { /* ignore */ }
  });


  $('#photo-camera-input').addEventListener('change', async (e) => {
    if (e.target.files[0]){
      await uploadPhoto(e.target.files[0], state.today);
      $('#photo-modal').hidden = true;
    }
  });
  $('#cal-camera-input').addEventListener('change', async (e) => {
    if (e.target.files[0]){
      await uploadPhoto(e.target.files[0], state.today);
      e.target.value = '';
      invalidateCalendarCache();
      loadCalendar();
    }
  });
  $('#photo-library-input').addEventListener('change', async (e) => {
    if (e.target.files.length > 0){
      for (const file of e.target.files){
        await uploadPhoto(file, state.today);
      }
      $('#photo-modal').hidden = true;
    }
  });
  $('#day1-photo-camera-input').addEventListener('change', async (e) => {
    if (e.target.files[0]){
      await uploadPhoto(e.target.files[0], state.today);
      $('#day1-photo-modal').hidden = true;
    }
  });
  $('#day1-photo-library-input').addEventListener('change', async (e) => {
    if (e.target.files[0]){
      await uploadPhoto(e.target.files[0], state.today);
      $('#day1-photo-modal').hidden = true;
    }
  });

  $('#goal-mode-auto').addEventListener('click', () => setGoalMode('auto'));
  $('#goal-mode-manual').addEventListener('click', () => setGoalMode('manual'));

  $('#settings-goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const manualGoal = parseInt($('#settings-goal-input').value, 10);
    if (!manualGoal || manualGoal <= 0) return;
    await api('/api/settings', {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ manualGoal }),
    });
    invalidateCalendarCache();
    await loadToday();
  });

  $$('.swatch').forEach((s) => {
    s.addEventListener('click', () => saveAccentColor(s.dataset.color));
  });
  $('#custom-color-input').addEventListener('input', (e) => {
    saveAccentColor(e.target.value.toUpperCase());
  });

  $('#habits-edit-toggle').addEventListener('click', () => {
    state.habitsEditMode = !state.habitsEditMode;
    const btn = $('#habits-edit-toggle');
    btn.textContent = state.habitsEditMode ? t('habits_edit_btn_done') : t('habits_edit_btn');
    btn.classList.toggle('active', state.habitsEditMode);
    const currentChecks = {};
    $$('#habits-list input[type="checkbox"]').forEach((cb) => { currentChecks[cb.dataset.habit] = cb.checked; });
    renderHabitsList(currentChecks);
  });

  $('#add-custom-habit-btn').addEventListener('click', () => {
    $('#custom-habit-form').hidden = false;
    $('#add-custom-habit-btn').hidden = true;
    $('#custom-habit-name').focus();
  });

  document.addEventListener('click', (e) => {
    const form = $('#custom-habit-form');
    const addBtn = $('#add-custom-habit-btn');
    if (form.hidden) return;
    const clickedInside = form.contains(e.target) || e.target === addBtn;
    if (!clickedInside){
      form.hidden = true;
      addBtn.hidden = false;
      $('#custom-habit-name').value = '';
    }
  });

  $('#custom-habit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#custom-habit-name').value.trim();
    if (!name) return;
    const icon = '';
    const data = await api('/api/custom-habits', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name, icon }),
    });
    state.customHabits = data.customHabits;
    const settings = await api('/api/settings');
    state.habitOrder = settings.habitOrder || state.habitOrder;
    $('#custom-habit-name').value = '';
    $('#custom-habit-form').hidden = true;
    $('#add-custom-habit-btn').hidden = false;
    const day = await api(`/api/day/${state.today}`);
    renderHabitsList(day.habits || {});
  });

  $('#lang-fr').addEventListener('click', () => setLanguage('fr'));
  $('#lang-en').addEventListener('click', () => setLanguage('en'));

  $('#time-format-24h').addEventListener('click', () => setTimeFormat('24h'));
  $('#time-format-12h').addEventListener('click', () => setTimeFormat('12h'));

  $('#sound-toggle').addEventListener('click', async () => {
    state.soundEnabled = !state.soundEnabled;
    $('#sound-toggle').classList.toggle('active', state.soundEnabled);
    await api('/api/settings', {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ soundEnabled: state.soundEnabled }),
    });
    if (state.soundEnabled) playCelebrationSound('trophy');
  });

  $('#sync-now-btn').addEventListener('click', async () => {
    $('#sync-status').textContent = t('sync_in_progress');
    await attemptBackgroundSync(true);
    const last = parseInt(localStorage.getItem('trackpush_last_synced') || '0', 10);
    const justSynced = Date.now() - last < 5000;
    if (justSynced){
      $('#sync-status').textContent = t('sync_success');
    } else {
      const detail = (typeof getLastSyncError === 'function' && getLastSyncError()) || '';
      $('#sync-status').textContent = detail ? `${t('sync_failed')} (${detail})` : t('sync_failed');
    }
    setTimeout(updateSyncIndicator, 4000);
  });

  $('#offline-primary-toggle').addEventListener('click', async () => {
    const currentlyPrimary = isOfflinePrimaryDevice();
    if (!currentlyPrimary){
      if (!confirm(t('offline_primary_confirm'))) return;
      localStorage.setItem('trackpush_offline_primary', '1');
      await migrateFromServerIfNeeded();
    } else {
      localStorage.setItem('trackpush_offline_primary', '0');
    }
    location.reload();
  });

  $('#backup-export-btn').addEventListener('click', async () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `trackpush-sauvegarde-${dateStr}.json`;

    if (typeof isNativeApp === 'function' && isNativeApp()){
      try {
        const payload = await exportAllData();
        const { Filesystem, Share } = window.Capacitor.Plugins;
        const written = await Filesystem.writeFile({
          path: filename,
          data: JSON.stringify(payload),
          directory: 'CACHE',
          encoding: 'utf8',
        });
        await Share.share({ title: filename, url: written.uri, dialogTitle: t('backup_export_btn') });
      } catch (err) {
        alert(t('backup_export_error'));
      }
      return;
    }

    if (isOfflinePrimaryDevice()){
      const payload = await exportAllData();
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } else {
      window.location.href = '/api/export';
    }
  });

  $('#backup-import-btn').addEventListener('click', () => {
    $('#backup-import-input').click();
  });

  $('#backup-import-input').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm(t('backup_import_confirm'))) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await importAllData(payload);
      alert(t('backup_import_success'));
      location.reload();
    } catch (err) {
      alert(t('backup_import_error'));
    }
  });

  $('#xp-source-badges-link').addEventListener('click', (e) => {
    e.preventDefault();
    switchView('badges');
  });

  const revealApp = () => { document.body.classList.add('app-ready'); playCascade($('#view-today')); };
  const revealTimeout = setTimeout(revealApp, 5000);
  loadToday().finally(() => { clearTimeout(revealTimeout); revealApp(); });
  if (typeof initBackgroundSync === 'function' && typeof isOfflinePrimaryDevice === 'function' && isOfflinePrimaryDevice()){
    initBackgroundSync();
  }

  $('#build-version').textContent = APP_VERSION;

  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (typeof isOfflinePrimaryDevice === 'function' && isOfflinePrimaryDevice()
        && typeof migrateFromServerIfNeeded === 'function'){
      await migrateFromServerIfNeeded();
    }
  } catch (err) { /* migration best-effort only, never block startup */ }
  init();
});
