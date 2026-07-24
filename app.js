const APP_VERSION = '2026-07-24.73';

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

function applyAccent(hex){
  const {r,g,b} = hexToRgb(hex);
  const root = document.documentElement.style;
  root.setProperty('--fire', hex);
  root.setProperty('--fire-dim', darken(hex, 0.45));
  root.setProperty('--fire-r', r);
  root.setProperty('--fire-g', g);
  root.setProperty('--fire-b', b);
  try { localStorage.setItem('trackpush_last_accent', hex); } catch (err) { /* ignore */ }
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
    goal_pill_title: "Voir dans Réglages",
    goal_pill_obj: "OBJ",
    evening_banner_default: "Il te reste du chemin pour atteindre ton objectif aujourd'hui!",
    pushups_word: "push-ups",
    xp_next_default: "Prochain rang: —",
    quickadd_title: "AJOUTER DES PUSH-UPS",
    custom_count_placeholder: "Autre nombre",
    add_button: "Ajouter",
    undo_btn: "↺ Annuler le dernier ajout",
    entries_title: "SÉRIES D'AUJOURD'HUI",
    entries_empty: "Aucune série pour l'instant. Fais-en une! 💪",
    notes_title: "PENSÉES DU MOMENT",
    note_placeholder: "Comment tu te sens? Douleurs, énergie, forme...",
    save_button: "Sauvegarder",
    notes_empty: "Aucune note aujourd'hui.",
    legend_bronze: "Bronze 50%",
    legend_argent: "Argent 80%",
    legend_or: "Or 100%",
    legend_platine: "Platine — semaine parfaite",
    trend_title: "TENDANCE — 30 DERNIERS JOURS",
    trend_legend_bronze: "Bronze",
    trend_legend_argent: "Argent",
    trend_legend_or: "Or",
    trend_legend_platine: "Platine",
    trend_legend_goal: "Objectif",
    streak_cannabis: "Jour {n} sans drogue",
    streak_cafe: "Jour {n} sans caféine",
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
    record_streak_drugs: "Plus long streak sans drogue",
    record_streak_caffeine: "Plus long streak sans caféine",
    record_streak_marche: "Plus long streak de marche",
    record_platinum_streak: "Semaines Platine d'affilée",
    record_none: "—",
    record_days_suffix: "jours",
    record_weeks_suffix: "semaines",
    record_day_singular: "jour",
    record_week_singular: "semaine",
    stat_start_date_label: "Début du suivi",
    stat_total_pushups_label: "Push-ups au total",
    stat_best_cannabis_label: "Record — jours consécutifs sans drogue",
    stat_best_cafe_label: "Record — jours consécutifs sans caféine",
    stat_best_marche_label: "Record — jours consécutifs de marche",
    stat_disciplined_days_label: "Jours disciplinés (Or+)",
    stat_disciplined_weeks_label: "Semaines disciplinées (Platine)",
    stat_total_photos_label: "Photos prises",
    stat_total_notes_label: "Notes écrites",
    badges_title: "BADGES",
    badge_secret_placeholder: "Badge secret — débloque-le pour découvrir son secret!",
    lang_title: "LANGUE",
    time_format_title: "FORMAT DE L'HEURE",
    sound_title: "SONS",
    sound_toggle_label: "Sons de célébration (badge, rang, trophée)",
    offline_primary_title: "MODE HORS-LIGNE (CET APPAREIL)",
    offline_primary_toggle_label: "Faire de cet appareil ma copie principale hors ligne",
    offline_primary_warning: "N'active ceci que sur UN SEUL appareil (celui que tu gardes toujours sur toi). Les autres appareils continueront de parler directement au serveur.",
    offline_primary_confirm: "Ceci va faire de cet appareil ta copie principale hors ligne, avec tout ton historique actuel copié ici. N'active ceci que sur un seul appareil. Continuer?",
    sync_title: "SYNCHRONISATION AVEC LE SERVEUR",
    sync_status_label: "Dernière synchronisation",
    sync_now_btn: "Synchroniser maintenant",
    sync_explainer: "Tes données vivent sur ce téléphone. Une copie est envoyée au serveur automatiquement quand il est accessible.",
    sync_never: "Jamais encore",
    sync_just_now: "À l'instant",
    sync_minutes_ago: "Il y a {n} min",
    sync_in_progress: "Synchronisation...",
    sync_success: "Synchronisé!",
    sync_failed: "Serveur non accessible — réessai automatique plus tard.",
    goal_section_title: "OBJECTIF QUOTIDIEN — NOMBRE DE PUSH-UPS PAR JOUR",
    goal_mode_auto: "Automatique (selon rang)",
    goal_mode_manual: "Manuel",
    goal_auto_info: "Ton objectif actuel est de {goal} push-ups, basé sur ton rang actuel: {rank}.",
    color_section_title: "COULEUR D'ACCENT",
    color_yellow: "Jaune", color_orange: "Orange", color_red: "Rouge", color_green: "Vert", color_blue: "Bleu", color_purple: "Violet",
    custom_color_label: "Couleur personnalisée",
    ranks_title: "RANGS",
    xp_source_title: "COMMENT GAGNER DE L'XP",
    xp_source_pushup: "1 push-up",
    xp_source_drug: "1 jour sans drogue",
    xp_source_caffeine: "1 jour sans caféine",
    xp_source_walk: "1 jour de marche à l'extérieur",
    xp_source_bronze: "Trophée Bronze du jour",
    xp_source_bronze_value: "+2 XP",
    xp_source_argent: "Trophée Argent du jour",
    xp_source_argent_value: "+5 XP de plus",
    xp_source_or: "Trophée Or du jour",
    xp_source_or_value: "+10 XP de plus",
    xp_source_platine: "Trophée Platine (semaine parfaite)",
    xp_source_badges: "Badges débloqués",
    xp_source_variable_prefix: "variable — ",
    xp_source_badges_link: "voir Badges",
    xp_source_note: "L'XP des trophées s'additionne en montant de palier (valeurs pour Débutant, ça grossit avec ton rang). Annuler une série retire aussi son XP.",
    version_label: "Version",
    tab_today: "Aujourd'hui", tab_calendar: "Calendrier", tab_habits: "Historique", tab_badges: "Badges", tab_settings: "Réglages",
    modal_badges_title: "BADGES DÉBLOQUÉS",
    modal_habits_title: "HABITUDES",
    modal_photos_title: "PHOTOS",
    modal_add_photo_btn: "+ Ajouter une photo",
    modal_entries_title: "SÉRIES",
    modal_entries_empty: "Aucune série ce jour-là.",
    celebration_ok: "Merci, continue!",
    rankup_title: "NOUVEAU RANG!",
    rankup_desc_prefix: "Tu es maintenant",
    rankup_new_goal: "Nouvel objectif",
    rankup_new_bronze: "Trophée Bronze",
    rankup_new_argent: "Trophée Argent",
    rankup_new_or: "Trophée Or",
    badge_modal_title: "BADGE DÉBLOQUÉ!",
    photo_modal_title: "PHOTO DU DIMANCHE",
    photo_modal_desc: "Capture ton évolution cette semaine.",
    photo_camera_btn: "Prendre une photo",
    photo_library_btn: "Choisir dans la photothèque",
    photo_skip_btn: "Plus tard",
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
    trophy_desc_platine: "Semaine parfaite — 100%+ chaque jour du dimanche au samedi!",
    trophy_title: "TROPHÉE {name}!",
    reset_default: "—",
    monthly_summary_title: "RÉSUMÉ MENSUEL",
    ms_continue_btn: "Continuer la progression!",
    ms_next_available: "1er {month} {year}.",
    ms_next_available_prefix: "Le prochain résumé sera disponible le",
    ms_trophy_label: "TROPHÉES DU MOIS",
    ms_mood_label: "HUMEURS RESSENTIES",
    ms_mood_none: "Aucune humeur enregistrée ce mois-ci.",
    ms_photo_label: "ÉVOLUTION PHOTO",
    ms_photo_before: "Au tout début",
    ms_photo_after: "Aujourd'hui",
    ms_photo_none: "Aucune photo prise encore.",
    ms_habits_label: "HABITUDES DU MOIS",
    ms_days_no_drugs: "Jours sans drogue",
    ms_days_no_caffeine: "Jours sans caféine",
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
    goal_pill_title: "View in Settings",
    goal_pill_obj: "GOAL",
    evening_banner_default: "You still have some way to go to hit today's goal!",
    pushups_word: "push-ups",
    xp_next_default: "Next rank: —",
    quickadd_title: "ADD PUSH-UPS",
    custom_count_placeholder: "Other number",
    add_button: "Add",
    undo_btn: "↺ Undo last add",
    entries_title: "TODAY'S SETS",
    entries_empty: "No sets yet. Get one in! 💪",
    notes_title: "THOUGHTS OF THE MOMENT",
    note_placeholder: "How are you feeling? Soreness, energy, form...",
    save_button: "Save",
    notes_empty: "No notes today.",
    legend_bronze: "Bronze 50%",
    legend_argent: "Silver 80%",
    legend_or: "Gold 100%",
    legend_platine: "Platinum — perfect week",
    trend_title: "TREND — LAST 30 DAYS",
    trend_legend_bronze: "Bronze",
    trend_legend_argent: "Silver",
    trend_legend_or: "Gold",
    trend_legend_platine: "Platinum",
    trend_legend_goal: "Goal",
    streak_cannabis: "Day {n} drug-free",
    streak_cafe: "Day {n} caffeine-free",
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
    record_streak_drugs: "Longest drug-free streak",
    record_streak_caffeine: "Longest caffeine-free streak",
    record_streak_marche: "Longest walking streak",
    record_platinum_streak: "Platinum weeks in a row",
    record_none: "—",
    record_days_suffix: "days",
    record_weeks_suffix: "weeks",
    record_day_singular: "day",
    record_week_singular: "week",
    stat_start_date_label: "Tracking since",
    stat_total_pushups_label: "Total push-ups",
    stat_best_cannabis_label: "Record — consecutive drug-free days",
    stat_best_cafe_label: "Record — consecutive caffeine-free days",
    stat_best_marche_label: "Record — consecutive walking days",
    stat_disciplined_days_label: "Disciplined days (Gold+)",
    stat_disciplined_weeks_label: "Disciplined weeks (Platinum)",
    stat_total_photos_label: "Photos taken",
    stat_total_notes_label: "Notes written",
    badges_title: "BADGES",
    badge_secret_placeholder: "Secret badge — unlock it to discover its secret!",
    lang_title: "LANGUAGE",
    time_format_title: "TIME FORMAT",
    sound_title: "SOUND",
    sound_toggle_label: "Celebration sounds (badge, rank, trophy)",
    offline_primary_title: "OFFLINE MODE (THIS DEVICE)",
    offline_primary_toggle_label: "Make this device my main offline copy",
    offline_primary_warning: "Only turn this on for ONE device (the one you always carry). Other devices will keep talking directly to the server.",
    offline_primary_confirm: "This will make this device your main offline copy, with all your current history copied here. Only enable this on one device. Continue?",
    sync_title: "SERVER SYNC",
    sync_status_label: "Last synced",
    sync_now_btn: "Sync now",
    sync_explainer: "Your data lives on this phone. A copy is sent to the server automatically whenever it's reachable.",
    sync_never: "Never yet",
    sync_just_now: "Just now",
    sync_minutes_ago: "{n} min ago",
    sync_in_progress: "Syncing...",
    sync_success: "Synced!",
    sync_failed: "Server unreachable — will retry automatically.",
    goal_section_title: "DAILY GOAL — NUMBER OF PUSH-UPS PER DAY",
    goal_mode_auto: "Automatic (by rank)",
    goal_mode_manual: "Manual",
    goal_auto_info: "Your current goal is {goal} push-ups, based on your current rank: {rank}.",
    color_section_title: "ACCENT COLOR",
    color_yellow: "Yellow", color_orange: "Orange", color_red: "Red", color_green: "Green", color_blue: "Blue", color_purple: "Purple",
    custom_color_label: "Custom color",
    ranks_title: "RANKS",
    xp_source_title: "HOW TO EARN XP",
    xp_source_pushup: "1 push-up",
    xp_source_drug: "1 drug-free day",
    xp_source_caffeine: "1 caffeine-free day",
    xp_source_walk: "1 day of walking outside",
    xp_source_bronze: "Bronze trophy for the day",
    xp_source_bronze_value: "+2 XP",
    xp_source_argent: "Silver trophy for the day",
    xp_source_argent_value: "+5 more XP",
    xp_source_or: "Gold trophy for the day",
    xp_source_or_value: "+10 more XP",
    xp_source_platine: "Platinum trophy (perfect week)",
    xp_source_badges: "Unlocked badges",
    xp_source_variable_prefix: "variable — ",
    xp_source_badges_link: "see Badges",
    xp_source_note: "Trophy XP adds up as you climb tiers (values shown are for Beginner rank — it grows with your rank). Undoing a set also removes its XP.",
    version_label: "Version",
    tab_today: "Today", tab_calendar: "Calendar", tab_habits: "History", tab_badges: "Badges", tab_settings: "Settings",
    modal_badges_title: "BADGES UNLOCKED",
    modal_habits_title: "HABITS",
    modal_photos_title: "PHOTOS",
    modal_add_photo_btn: "+ Add a photo",
    modal_entries_title: "SETS",
    modal_entries_empty: "No sets that day.",
    celebration_ok: "Thanks, keep going!",
    rankup_title: "NEW RANK!",
    rankup_desc_prefix: "You are now",
    rankup_new_goal: "New goal",
    rankup_new_bronze: "Bronze trophy",
    rankup_new_argent: "Silver trophy",
    rankup_new_or: "Gold trophy",
    badge_modal_title: "BADGE UNLOCKED!",
    photo_modal_title: "SUNDAY PHOTO",
    photo_modal_desc: "Capture your progress this week.",
    photo_camera_btn: "Take a photo",
    photo_library_btn: "Choose from library",
    photo_skip_btn: "Later",
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
    trophy_desc_platine: "Perfect week — 100%+ every day from Sunday to Saturday!",
    trophy_title: "{name} TROPHY!",
    reset_default: "—",
    monthly_summary_title: "MONTHLY SUMMARY",
    ms_continue_btn: "Keep up the progress!",
    ms_next_available: "{month} 1st, {year}.",
    ms_next_available_prefix: "The next summary will be available on",
    ms_trophy_label: "TROPHIES THIS MONTH",
    ms_mood_label: "MOODS FELT",
    ms_mood_none: "No moods logged this month.",
    ms_photo_label: "PHOTO PROGRESS",
    ms_photo_before: "Right at the start",
    ms_photo_after: "Today",
    ms_photo_none: "No photos taken yet.",
    ms_habits_label: "HABITS THIS MONTH",
    ms_days_no_drugs: "Drug-free days",
    ms_days_no_caffeine: "Caffeine-free days",
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
  decafeine: { name: 'Decaf!', desc: 'A full month (30 consecutive days) caffeine-free' },
  clarte: { name: 'Clarity of Mind', desc: 'A full month (30 consecutive days) drug-free' },
  brillant: { name: 'Brilliant!', desc: 'First perfect week (Platinum trophy)' },
  motivation100: { name: '100 Motivation?', desc: '100 days of discipline (Gold trophy or better)' },
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
  'oiseau-nuit': { name: 'Night Owl', desc: '50 push-ups between midnight and 4am, same night' },
  'resolution-nouvel-an': { name: "New Year's Resolution", desc: '100 push-ups on January 1st' },
  'mille-en-cinq': { name: '1000 in 5', desc: 'At least 200 push-ups per day, 5 days in a row' },
  'semaine-promenades': { name: 'Walking Week', desc: 'Walk outside, 7 days in a row' },
  'je-note': { name: 'I NOTE!', desc: '100 notes added in total' },
  'top-modele': { name: 'Top Model', desc: '30 photos added in total' },
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
    epuise: '🔋 Épuisé', stresse: '😣 Stressé', anxieux: '😰 Anxieux', embrouille: '🌀 Embrouillé',
    concentre: '🎯 Concentré', emotionnel: '🥲 Émotif', colere: '😠 En colère', motive: '💪 Motivé', fier: '😤 Fier',
  },
  en: {
    energique: '⚡ Energetic', calme: '🌙 Calm', fatigue: '😴 Tired',
    epuise: '🔋 Exhausted', stresse: '😣 Stressed', anxieux: '😰 Anxious', embrouille: '🌀 Foggy',
    concentre: '🎯 Focused', emotionnel: '🥲 Emotional', colere: '😠 Angry', motive: '💪 Motivated', fier: '😤 Proud',
  },
};
function MOOD_LABELS(){ return MOOD_LABELS_BY_LANG[state.lang] || MOOD_LABELS_BY_LANG.fr; }

const HABIT_META_BY_LANG = {
  fr: {
    cannabis: { icon:'🌿', label:'Cannabis' },
    cafe: { icon:'☕', label:'Café' },
    creatine: { icon:'💊', label:'Créatine' },
    marche: { icon:'🚶', label:"Marche à l'extérieur" },
    journeeTravail: { icon:'💼', label:'Journée de travail' },
    journeeConge: { icon:'🏖️', label:'Journée de congé' },
  },
  en: {
    cannabis: { icon:'🌿', label:'Cannabis' },
    cafe: { icon:'☕', label:'Coffee' },
    creatine: { icon:'💊', label:'Creatine' },
    marche: { icon:'🚶', label:'Walk outside' },
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
  $$('#mood-row .mood-chip').forEach((chip) => {
    const m = chip.dataset.mood;
    chip.textContent = MOOD_LABELS()[m] || m;
  });
  $('#lang-fr').classList.toggle('active', state.lang === 'fr');
  $('#lang-en').classList.toggle('active', state.lang === 'en');
  $('#time-format-24h').classList.toggle('active', state.timeFormat === '24h');
  $('#time-format-12h').classList.toggle('active', state.timeFormat === '12h');
  $('#sound-toggle').classList.toggle('active', state.soundEnabled);
}

async function api(path, opts){
  return localApi(path, opts || {});
}
// ---------- Ring math ----------
const RING_CIRC = 2 * Math.PI * 104;

function easeOutCubic(x){
  return 1 - Math.pow(1 - x, 3);
}

function updateRing(total, goal){
  const pct = Math.min(1, goal > 0 ? total / goal : 0);
  const ring = $('#ring-progress');
  ring.style.strokeDasharray = RING_CIRC;

  if (pct >= 1) ring.style.stroke = 'var(--or)';
  else if (pct >= 0.8) ring.style.stroke = 'var(--argent)';
  else ring.style.stroke = 'var(--fire)';
  ring.classList.toggle('ring-complete', pct >= 1);

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
    spark.className = 'xp-spark';
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
function flashScreen(){
  const f = $('#flash');
  f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit');
}

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
  const [settings, xp] = await Promise.all([api('/api/settings'), api('/api/xp')]);
  state.goal = settings.goal;
  state.today = settings.today;
  state.accentColor = settings.accentColor || '#FFC800';
  state.goalMode = settings.goalMode || 'auto';
  state.lang = settings.language || 'fr';
  state.timeFormat = settings.timeFormat || '24h';
  state.soundEnabled = settings.soundEnabled !== false;
  applyAccent(state.accentColor);
  applyTranslations();
  $('#goal-value').textContent = settings.goal;
  $('#goal-echo').textContent = settings.goal;
  cacheDisplaySnapshot({ goal: settings.goal });
  $('#custom-color-input').value = state.accentColor;
  updateSwatchSelection();
  updateGoalModeUI(settings, xp);
  renderXPBar(xp);

  $('#today-date').textContent = formatDayHeader(state.today);
  cacheDisplaySnapshot({ dateText: $('#today-date').textContent });

  const day = await api(`/api/day/${state.today}`);
  renderDay(day);
  checkEveningReminder(day);
  maybeShowSundayPhotoPrompt(day);
  loadMonthlySummary(true);

  state.habitOrder = settings.habitOrder || Object.keys(HABIT_META());
  const customHabitsData = await api('/api/custom-habits');
  state.customHabits = customHabitsData.customHabits || [];
  renderHabitsList(day.habits || {});

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

async function refreshDay(){
  const day = await api(`/api/day/${state.today}`);
  renderDay(day);
  checkEveningReminder(day);
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
  updateRing(day.total, day.goal);
  if (day.date === state.today){
    cacheDisplaySnapshot({ total: day.total, goal: day.goal });
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
    li.innerHTML = `
      <div class="note-card-head">
        <span class="note-time">${formatTimeDisplay(n.time)}</span>
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
  punchNumber();
  pulseRing();
  renderDay(day);
  checkEveningReminder(day);
  await refreshXP();
  spawnXPSparkles(count);
  const badges = day.newlyUnlockedBadges || [];
  badges.forEach((b) => enqueueCelebration({ type:'badge', badge:b }));
  if (day.trophyJustUnlocked){
    enqueueCelebration({ type:'trophy', trophy: day.trophy });
  }
}

async function undoLast(){
  const day = await api(`/api/day/${state.today}`);
  if (day.entries.length === 0) return;
  const last = day.entries[day.entries.length - 1];
  const updated = await api(`/api/entries/${last.id}`, { method:'DELETE' });
  renderDay(updated);
  checkEveningReminder(updated);
  refreshXP();
}

async function addNote(text){
  if (!text || !text.trim()) return;
  const day = await api('/api/notes/' + state.today, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ text, moods: state.selectedMoods }),
  });
  state.selectedMoods = [];
  $$('#mood-row .mood-chip').forEach((c) => c.classList.remove('selected'));
  renderDay(day);
}

// ---------- Sunday photo prompt ----------
function maybeShowSundayPhotoPrompt(day){
  const d = new Date(state.today + 'T00:00:00');
  if (d.getDay() !== 0) return;
  if (day.photos && day.photos.length > 0) return;
  const dismissedKey = `pt_photo_dismissed_${state.today}`;
  if (sessionStorage.getItem(dismissedKey)) return;
  $('#photo-modal').hidden = false;
  $('#photo-skip').onclick = () => {
    sessionStorage.setItem(dismissedKey, '1');
    $('#photo-modal').hidden = true;
  };
}

async function uploadPhoto(file, date){
  return localApi(`/api/photos/${date}`, { method:'POST', file });
}

// ---------- Calendar view ----------
function fmtMonth(ym){
  const [y,m] = ym.split('-').map(Number);
  return `${MONTH_NAMES()[m-1]} ${y}`;
}

async function loadCalendar(){
  if (!state.calMonth) state.calMonth = state.today.slice(0,7);
  $('#cal-month-label').textContent = fmtMonth(state.calMonth);

  const myToken = (state.calendarLoadToken = (state.calendarLoadToken || 0) + 1);

  const [data, streaks, trendData] = await Promise.all([
    api(`/api/month/${state.calMonth}`),
    api('/api/streaks'),
    api('/api/trend'),
  ]);

  if (myToken !== state.calendarLoadToken) return;

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
    cell.innerHTML = `<span class="dnum">${d}</span><span class="dtotal">${info.total>0?info.total:''}</span>`;
    cell.addEventListener('click', () => openDayModal(date));
    grid.appendChild(cell);
  }

  $('#streak-cannabis-text').innerHTML = t('streak_cannabis', { n: `<span id="streak-cannabis">${streaks.cannabis}</span>` });
  $('#streak-cafe-text').innerHTML = t('streak_cafe', { n: `<span id="streak-cafe">${streaks.cafe}</span>` });

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
  loadPersonalRecords();
}

function pluralSuffix(n, singularKey, pluralKey){
  return n === 1 ? t(singularKey) : t(pluralKey);
}

async function loadPersonalRecords(){
  const r = await api('/api/personal-records');
  const cards = [
    { icon:'🔥', label:t('record_best_set'), value: r.bestSet ? `${r.bestSet.count}` : null, date: r.bestSet ? formatShortDate(r.bestSet.date) : null },
    { icon:'📅', label:t('record_best_day'), value: r.bestDay ? `${r.bestDay.total}` : null, date: r.bestDay ? formatShortDate(r.bestDay.date) : null },
    { icon:'📈', label:t('record_best_week'), value: r.bestWeek ? `${r.bestWeek.total}` : null, date: r.bestWeek ? formatShortDate(r.bestWeek.weekStart) : null },
    { icon:'🗓️', label:t('record_best_month'), value: r.bestMonth ? `${r.bestMonth.total}` : null, date: r.bestMonth ? fmtMonth(r.bestMonth.monthKey) : null },
    { icon:'🚭', label:t('record_streak_drugs'), value: r.bestStreakCannabis ? `${r.bestStreakCannabis} ${pluralSuffix(r.bestStreakCannabis, 'record_day_singular', 'record_days_suffix')}` : null, date: null },
    { icon:'☕', label:t('record_streak_caffeine'), value: r.bestStreakCafe ? `${r.bestStreakCafe} ${pluralSuffix(r.bestStreakCafe, 'record_day_singular', 'record_days_suffix')}` : null, date: null },
    { icon:'🚶', label:t('record_streak_marche'), value: r.bestStreakMarche ? `${r.bestStreakMarche} ${pluralSuffix(r.bestStreakMarche, 'record_day_singular', 'record_days_suffix')}` : null, date: null },
    { icon:'💎', label:t('record_platinum_streak'), value: r.longestPlatinumStreak ? `${r.longestPlatinumStreak} ${pluralSuffix(r.longestPlatinumStreak, 'record_week_singular', 'record_weeks_suffix')}` : null, date: null },
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
    $('#modal-habits').innerHTML = activeHabits.map(([k]) => {
      const meta = HABIT_META()[k];
      return `<span class="habit-chip">${meta ? meta.icon + ' ' + meta.label : k}</span>`;
    }).join('');
  } else {
    habitsWrap.hidden = true;
  }

  renderPhotoGrid(day.photos || [], date);
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

  try {
    renderMonthlySummarySection(data);
  } catch (err) {
    $('#monthly-summary-section-content').innerHTML = `<div class="ms-empty-note">${t('ms_render_error')}</div>`;
  }

  if (allowPopup && data.available && data.shouldPopup && !state.monthlySummaryPopupShown){
    state.monthlySummaryPopupShown = true;
    try {
      showMonthlySummaryPopup(data.summary);
    } catch (err) { /* ignore popup render failure, section fallback already handled above */ }
  }
}

function renderMonthlySummarySection(data){
  const el = $('#monthly-summary-section-content');
  if (!data.available){
    const d = new Date(data.nextAvailableYear, data.nextAvailableMonthIndex, 1);
    el.innerHTML = `<div class="ms-next-available">${t('ms_next_available_prefix')} ${t('ms_next_available', { month: MONTH_NAMES()[d.getMonth()], year: d.getFullYear() })}</div>`;
    return;
  }
  el.innerHTML = buildMonthlySummaryHTML(data.summary);
  wireMonthlySummaryPhotos(el, data.summary);
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
          <div class="ms-photo-caption">${t('ms_photo_before')}</div>
        </div>
        <div class="ms-photo-col">
          <div class="modal-photo-item blurred" data-ms-photo="${s.lastPhoto.filename}">
            <img alt="" />
            <div class="photo-reveal-overlay">👁️</div>
          </div>
          <div class="ms-photo-caption">${t('ms_photo_after')}</div>
        </div>
      </div>`}
    </div>`;

  const habitsSection = `
    <div class="ms-section">
      <div class="ms-label">${t('ms_habits_label')}</div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_days_no_drugs')}</span><span class="ms-stat-value">${s.daysWithoutDrugs}</span></div>
      <div class="ms-stat-row"><span class="ms-stat-label">${t('ms_days_no_caffeine')}</span><span class="ms-stat-value">${s.daysWithoutCaffeine}</span></div>
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
  return getPhotoBlob(filename);
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
  const grid = $('#badges-grid');
  grid.innerHTML = '';
  data.badges.forEach((b) => {
    const card = document.createElement('div');
    card.className = 'badge-card' + (b.unlocked ? '' : ' locked');
    const dateLabel = b.unlockedDate ? formatShortDate(b.unlockedDate) : '';
    const tr = translateBadge(b.id, b.name, b.desc);
    const descText = tr.desc === null ? t('badge_secret_placeholder') : tr.desc;
    card.innerHTML = `
      <div class="badge-icon">${b.unlocked ? b.icon : '🔒'}</div>
      <div class="badge-name">${tr.name}</div>
      <div class="badge-desc${b.desc === null ? ' secret-desc' : ''}">${descText}</div>
      <div class="badge-xp-tag">+${b.xp} XP</div>
      ${b.unlocked ? `<div class="badge-date">${dateLabel}</div>` : ''}
    `;
    grid.appendChild(card);
  });
}

function formatShortDate(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTH_NAMES()[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}

function formatFullDate(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTH_NAMES()[d.getMonth()]} ${d.getFullYear()}`;
}

function ordinalSuffix(n){
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
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
  if (view === 'calendar') loadCalendar();
  if (view === 'habits') loadHabits();
  if (view === 'badges') loadBadges();
  if (view === 'settings') loadRanks();
}

async function loadRanks(){
  const [data, xp] = await Promise.all([api('/api/ranks'), api('/api/xp')]);
  const list = $('#ranks-list');
  list.innerHTML = data.ranks.map((r, idx) => {
    const isCurrent = idx === xp.rankIndex;
    const xpLabel = isCurrent ? `${formatNumber(xp.xp)} XP` : `${formatNumber(r.min)} XP`;
    return `<div class="rank-row${isCurrent ? ' current-rank' : ''}"><span class="rank-row-name">${translateRankName(r.name)}</span><span class="rank-row-xp">${xpLabel}</span></div>`;
  }).join('');
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
    if (document.visibilityState === 'visible') restartShimmer();
  });
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
    $('#mood-row').hidden = false;
  });
  const notesCard = document.querySelector('.notes');
  document.addEventListener('click', (e) => {
    if (!notesCard.contains(e.target)){
      $('#mood-row').hidden = true;
    }
  });

  $$('#mood-row .mood-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const m = chip.dataset.mood;
      if (state.selectedMoods.includes(m)){
        state.selectedMoods = state.selectedMoods.filter((x) => x !== m);
        chip.classList.remove('selected');
      } else {
        state.selectedMoods.push(m);
        chip.classList.add('selected');
      }
    });
  });

  $('#note-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#note-input');
    addNote(input.value);
    input.value = '';
  });

  $$('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));

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
  $('#day-modal').addEventListener('click', (e) => { if (e.target.id === 'day-modal') $('#day-modal').hidden = true; });

  $('#trophy-ok').addEventListener('click', () => dismissCelebration('#trophy-modal'));
  $('#rankup-ok').addEventListener('click', () => dismissCelebration('#rankup-modal'));
  $('#badge-modal-ok').addEventListener('click', () => dismissCelebration('#badge-modal'));

  $('#ms-modal-close').addEventListener('click', async () => {
    $('#monthly-summary-modal').hidden = true;
    try { await api('/api/monthly-summary/acknowledge', { method:'POST' }); } catch (err) { /* ignore */ }
  });

  $('#goal-pill').addEventListener('click', () => switchView('settings'));

  $('#photo-camera-input').addEventListener('change', async (e) => {
    if (e.target.files[0]){
      await uploadPhoto(e.target.files[0], state.today);
      $('#photo-modal').hidden = true;
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

  $('#xp-source-badges-link').addEventListener('click', (e) => {
    e.preventDefault();
    switchView('badges');
  });

  loadToday();

  $('#build-version').textContent = APP_VERSION;
}

document.addEventListener('DOMContentLoaded', init);
