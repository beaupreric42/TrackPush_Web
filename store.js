// ============================================================
// TrackPush — Standalone client-side data store
// Replicates server.js's logic entirely in the browser, backed
// by localStorage instead of a Node/Express server + db.json.
// ============================================================

const DB_KEY = 'trackpush_db_v1';

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

function nowTimeStr() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh} h ${mm}`;
}

function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const HABIT_KEYS = ['cannabis', 'cafe', 'alcool', 'marche', 'situps', 'journeeTravail', 'journeeConge'];

// ---------- Items / Inventory system ----------

const RARITY_ORDER = ['basique', 'rare', 'epique', 'legendaire', 'mythique'];

// Regular items: found via the normal item drop roll. `rarities` lists which
// tiers this item can appear as (some items are restricted to a subset).
const ITEMS = [
  {
    id: 'plume_legere', name: 'Plume légère', minRank: 0,
    rarities: {
      basique: { reduction: 0.05, maxStack: 5, weight: 1 },
      rare: { reduction: 0.10, maxStack: 3, weight: 1 },
      epique: { reduction: 0.15, maxStack: 2, weight: 1 },
      legendaire: { reduction: 0.20, maxStack: 1, weight: 0.8 },
    },
  },
  {
    id: 'amulette_xp', name: "Amulette d'XP", minRank: 1,
    rarities: {
      basique: { mult: 2, minutes: 5, maxStack: 3, weight: 1 },
      rare: { mult: 3, minutes: 5, maxStack: 2, weight: 1 },
      epique: { mult: 4, minutes: 5, maxStack: 1, weight: 0.9 },
      legendaire: { mult: 5, minutes: 5, maxStack: 1, weight: 0.6 },
    },
  },
  {
    id: 'don_xp', name: "Don d'XP", minRank: 0,
    rarities: {
      basique: { xp: 25, maxStack: Infinity, weight: 1 },
      rare: { xp: 35, maxStack: Infinity, weight: 1 },
      epique: { xp: 50, maxStack: Infinity, weight: 1 },
      legendaire: { xp: 100, maxStack: Infinity, weight: 1 },
    },
  },
  {
    id: 'graine_patience', name: 'Graine de patience', minRank: 1,
    rarities: {
      basique: { mult: 2, maxStack: 3, weight: 1 },
      rare: { mult: 3, maxStack: 2, weight: 1 },
      epique: { mult: 4, maxStack: 1, weight: 0.9 },
      legendaire: { mult: 5, maxStack: 1, weight: 0.85 },
    },
  },
  {
    id: 'talisman_pardon', name: 'Talisman du pardon', minRank: 1,
    rarities: {
      epique: { protect: true, maxStack: 1, weight: 1 },
    },
  },
  {
    id: 'radar_precision', name: 'Radar de précision', minRank: 1,
    rarities: { legendaire: { guarantee: true, maxStack: 1, weight: 1 } },
  },
  {
    id: 'detecteur_metal', name: 'Détecteur de métal', minRank: 0,
    rarities: {
      rare: { boost: 0.15, minutes: 15, maxStack: 3 },
      legendaire: { boost: 0.20, minutes: 15, maxStack: 3 },
    },
  },
  {
    id: 'echo_passe', name: 'Écho du passé', minRank: 1, minAppDays: 30,
    rarities: { rare: { echo: true, maxStack: 2, weight: 1 } },
  },
];

// Mythic items: their own separate, much rarer pool. One-time-only per
// account, never re-obtainable once discovered (regardless of use).
const MYTHIC_ITEMS = [
  { id: 'fragment_eternite', name: "Fragment d'Éternité", minRank: 1, xp: 5000, weight: 1.3 },
  { id: 'toucher_divin', name: 'Toucher du divin', minRank: 1, cosmetic: true, weight: 1 },
  { id: 'poussiere_etoiles', name: "Poussière d'étoiles", minRank: 1, cosmetic: true, weight: 1 },
  { id: 'calendrier_celeste', name: 'Calendrier céleste', minRank: 1, cosmetic: true, weight: 1 },
  // Écho doré retiré du jeu — voir server.js pour la note complète.
  // { id: 'echo_dore', name: 'Écho doré', minRank: 1, cosmetic: true, weight: 1 },
  { id: 'mode_arcenciel', name: 'Mode arc-en-ciel', minRank: 1, cosmetic: true, weight: 1 },
];

const DROP_CHANCE_FLOOR = 0.03;
const DROP_CHANCE_CEIL = 0.08;
const DROP_CHANCE_SET_CAP = 50;
const DROP_CHANCE_RANK_GROWTH = 1.079215;
const DROP_CHANCE_ABS_CEILING = 0.30;

function itemDropChance(count, rankIdx, db) {
  const t = Math.max(0, Math.min(1, (count - 10) / (DROP_CHANCE_SET_CAP - 10)));
  const base = DROP_CHANCE_FLOOR + (DROP_CHANCE_CEIL - DROP_CHANCE_FLOOR) * t;
  const mult = Math.pow(DROP_CHANCE_RANK_GROWTH, Math.max(0, rankIdx - 1));
  let chance = base * mult;
  if (db && db.activeBoosts && db.activeBoosts.detecteurEndsAt && new Date(db.activeBoosts.detecteurEndsAt) > new Date()) {
    chance += db.activeBoosts.detecteurBonus || 0;
  }
  return Math.min(DROP_CHANCE_ABS_CEILING, chance);
}

// Rarity distribution (regular, non-mythic, non-detecteur items) interpolates
// between a "floor" (small sets) and a "ceiling" (50 push-ups, a deliberately
// hidden cap) — never revealed to the user.
const RARITY_FLOOR = { basique: 0.42, rare: 0.36, epique: 0.15, legendaire: 0.07 };
const RARITY_CEIL = { basique: 0.12, rare: 0.35, epique: 0.35, legendaire: 0.18 };
const RARITY_SET_CAP = 50;

// From Légende onward, Basique gets capped and eventually eliminated — its
// share is redistributed proportionally across the remaining tiers.
function basiqueCapForRank(rankIdx) {
  if (rankIdx >= 9) return 0;      // Imbattable and beyond: no more Basique
  if (rankIdx >= 8) return 0.05;   // Légende: 5% max
  return 1;                         // no cap below Légende
}

function rarityDistribution(count, rankIdx) {
  const t = Math.max(0, Math.min(1, (count - 10) / (RARITY_SET_CAP - 10)));
  const dist = {};
  for (const tier of ['basique', 'rare', 'epique', 'legendaire']) {
    dist[tier] = RARITY_FLOOR[tier] + (RARITY_CEIL[tier] - RARITY_FLOOR[tier]) * t;
  }
  const cap = basiqueCapForRank(rankIdx);
  if (dist.basique > cap) {
    const freed = dist.basique - cap;
    dist.basique = cap;
    const others = ['rare', 'epique', 'legendaire'];
    const othersTotal = others.reduce((sum, k) => sum + dist[k], 0);
    others.forEach((k) => { dist[k] += othersTotal > 0 ? freed * (dist[k] / othersTotal) : freed / others.length; });
  }
  return dist;
}

function rollRarity(count, rankIdx, rng) {
  const dist = rarityDistribution(count, rankIdx);
  const r = rng();
  let acc = 0;
  for (const tier of ['legendaire', 'epique', 'rare', 'basique']) {
    acc += dist[tier];
    if (r < acc) return tier;
  }
  return 'basique';
}

// Mythique: a completely independent roll — a player can find a regular
// item AND a mythic item (and/or a Détecteur de métal) from the very same
// set. Fixed odds by set size, gated only by rank (Discipliné+).
function mythiqueChance(count) {
  if (count <= 10) return 1 / 1000;
  if (count <= 24) return 0.0013;
  if (count <= 49) return 1 / 600;
  return 0.0022;
}

// Détecteur de métal: also a fully independent roll, available from any
// rank, flat 7% per set regardless of size. 70% Rare / 30% Épique.
const DETECTEUR_CHANCE = 0.05;
const RADAR_PRECISION_CHANCE = 0.02;
const DETECTEUR_RARE_SHARE = 0.75;

function currentInventoryCount(db, itemId, rarity) {
  return (db.inventory || []).filter((inst) => inst.itemId === itemId && (rarity === undefined || inst.rarity === rarity)).length;
}

function eligibleItemsForRarity(rarity, rankIdx, db) {
  return ITEMS.filter((it) => it.id !== 'detecteur_metal' && it.id !== 'radar_precision' && it.minRank <= rankIdx && it.rarities[rarity] &&
    (!it.minAppDays || appHasBeenUsedForDays(db, it.minAppDays)) &&
    currentInventoryCount(db, it.id, rarity) < (it.rarities[rarity].maxStack ?? 2));
}

function appHasBeenUsedForDays(db, days) {
  if (!db.firstUsedAt) return false;
  const diff = (new Date(todayStr() + 'T00:00:00') - new Date(db.firstUsedAt)) / 86400000;
  return diff >= days;
}

function weightedPick(items, weightFn, rng) {
  const weights = items.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Attempts item drops for a freshly-added entry. Three fully independent
// rolls — a regular item, a mythic item, and Détecteur de métal can all
// land on the very same set. Returns an array (0 to 3 entries), remembered
// on the entry so undoing it later can cleanly and precisely reverse
// everything it granted.
function eligibleWithFallback(preferredRarity, rankIdx, db) {
  const eligible = eligibleItemsForRarity(preferredRarity, rankIdx, db);
  if (eligible.length) return { rarity: preferredRarity, eligible };
  for (const tier of ['basique', 'rare', 'epique', 'legendaire']) {
    if (tier === preferredRarity) continue;
    const alt = eligibleItemsForRarity(tier, rankIdx, db);
    if (alt.length) return { rarity: tier, eligible: alt };
  }
  return null;
}

function attemptItemDrop(db, entry, rng) {
  rng = rng || Math.random;
  const rankIdx = rankIndex(rankForXP(computeXP(db).xp));
  const drops = [];

  if (rng() < itemDropChance(entry.count, rankIdx, db)) {
    const rolledRarity = rollRarity(entry.count, rankIdx, rng);
    const picked = eligibleWithFallback(rolledRarity, rankIdx, db);
    if (picked) {
      const chosen = weightedPick(picked.eligible, (it) => (it.rarities[picked.rarity] && it.rarities[picked.rarity].weight) || 1, rng);
      drops.push({ itemId: chosen.id, rarity: picked.rarity, mythic: false });
    }
  }

  if (rankIdx >= 1 && rng() < mythiqueChance(entry.count)) {
    const eligible = MYTHIC_ITEMS.filter((it) => it.minRank <= rankIdx && !(db.mythicDiscovered || {})[it.id]);
    if (eligible.length) {
      const chosen = weightedPick(eligible, (it) => it.weight, rng);
      drops.push({ itemId: chosen.id, rarity: 'mythique', mythic: true });
    }
  }

  const detecteurAlreadyActive = db.activeBoosts && db.activeBoosts.detecteurEndsAt && new Date(db.activeBoosts.detecteurEndsAt) > new Date();
  if (!detecteurAlreadyActive && rng() < DETECTEUR_CHANCE) {
    const detRarity = rng() < DETECTEUR_RARE_SHARE ? 'rare' : 'legendaire';
    const detCap = ITEMS.find((it) => it.id === 'detecteur_metal').rarities[detRarity].maxStack;
    if (currentInventoryCount(db, 'detecteur_metal', detRarity) < detCap) {
      drops.push({ itemId: 'detecteur_metal', rarity: detRarity, mythic: false });
    }
  }

  if (rankIdx >= 1 && rng() < RADAR_PRECISION_CHANCE) {
    if (currentInventoryCount(db, 'radar_precision', 'legendaire') < 1) {
      drops.push({ itemId: 'radar_precision', rarity: 'legendaire', mythic: false });
    }
  }

  if (db.radarPending) {
    const hasRegularDrop = drops.some((d) => !d.mythic && d.itemId !== 'detecteur_metal' && d.itemId !== 'radar_precision');
    if (!hasRegularDrop) {
      const rolledRarity = rollRarity(entry.count, rankIdx, rng);
      const picked = eligibleWithFallback(rolledRarity, rankIdx, db);
      if (picked) {
        const chosen = weightedPick(picked.eligible, (it) => (it.rarities[picked.rarity] && it.rarities[picked.rarity].weight) || 1, rng);
        drops.push({ itemId: chosen.id, rarity: picked.rarity, mythic: false });
      }
    }
    db.radarPending = false;
    const rToday = todayStr();
    if (db.dailyItemEffects && db.dailyItemEffects[rToday]) {
      db.dailyItemEffects[rToday] = db.dailyItemEffects[rToday].filter((e) => e.itemId !== 'radar_precision');
    }
  }

  return drops;
}


const VALID_MOODS = ['energique', 'calme', 'fatigue', 'epuise', 'stresse', 'anxieux', 'embrouille', 'concentre', 'emotionnel', 'colere', 'motive', 'fier', 'pensif', 'impatient', 'bougon'];

const RANKS = [
  { name: 'Débutant', min: 0, max: 1999, goal: 100 },
  { name: 'Discipliné', min: 2000, max: 4199, goal: 105 },
  { name: 'Déterminé', min: 4200, max: 6959, goal: 105 },
  { name: 'Expert', min: 6960, max: 10719, goal: 110 },
  { name: 'Professionnel', min: 10720, max: 16079, goal: 110 },
  { name: 'Maître', min: 16080, max: 23759, goal: 115 },
  { name: 'Élite', min: 23760, max: 34599, goal: 120 },
  { name: 'Champion', min: 34600, max: 49599, goal: 125 },
  { name: 'Légende', min: 49600, max: 69839, goal: 130 },
  { name: 'Imbattable', min: 69840, max: 96559, goal: 135 },
  { name: 'Invincible', min: 96560, max: 131119, goal: 140 },
  { name: 'Immortel', min: 131120, max: 174999, goal: 145 },
  { name: 'Divin', min: 175000, max: Infinity, goal: 150 },
];

const TROPHY_XP_BASE = { bronze: 2, argent: 7, or: 17 };
const TROPHY_XP_GROWTH = 1.079215;
const TROPHY_XP_RANK_MULT = 1.065589;
function trophyXPTable(rankIdx) {
  const g = TROPHY_XP_RANK_MULT * Math.pow(TROPHY_XP_GROWTH, rankIdx);
  return {
    bronze: Math.round(TROPHY_XP_BASE.bronze * g),
    argent: Math.round(TROPHY_XP_BASE.argent * g),
    or: Math.round(TROPHY_XP_BASE.or * g),
  };
}
function rankIndexForGoal(goal) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) { if (goal >= RANKS[i].goal) idx = i; }
  return idx;
}

// ---------- DB load/save ----------

function freshDB() {
  return {
    settings: { goalMode: 'auto', manualGoal: 100, accentColor: '#FFC800', habitOrder: [...HABIT_KEYS], language: 'fr', timeFormat: '24h', soundEnabled: true },
    entries: [],
    notes: [],
    photos: {},
    goalSnapshots: {},
    habits: {},
    monthlySummaryAcknowledged: null,
    customHabits: [],
    badges: {},
    inventory: [],
    itemDiscoveries: {},
    mythicDiscovered: {},
    bonusXP: 0,
    activeBoosts: { amuletteEndsAt: null, amuletteMult: 1 },
    mythicActiveStates: {},
    protectedHabitDays: {},
    firstLegendaryFound: null,
    firstUsedAt: new Date().toISOString(),
    platinumShownDates: [],
    plumeUsesToday: { date: null, count: 0 },
    xpLog: [],
    xpLogLastDate: null,
  };
}

let _db = null;

function healHabitOrder(db) {
  const orderableIds = [...HABIT_KEYS, ...(db.customHabits || []).map((c) => c.id)];
  if (!Array.isArray(db.settings.habitOrder) || db.settings.habitOrder.length !== orderableIds.length || !orderableIds.every((k) => db.settings.habitOrder.includes(k))) {
    const existing = Array.isArray(db.settings.habitOrder) ? db.settings.habitOrder.filter((k) => orderableIds.includes(k)) : [];
    const missing = orderableIds.filter((k) => !existing.includes(k));
    db.settings.habitOrder = [...existing, ...missing];
  }
}

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    _db = freshDB();
    saveDB(_db);
    return _db;
  }
  const db = JSON.parse(raw);

  if (db.notes && !Array.isArray(db.notes)) {
    const migrated = [];
    for (const [date, text] of Object.entries(db.notes)) {
      if (text && text.trim()) {
        migrated.push({ id: uuid(), date, time: '00:00', text, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
    }
    db.notes = migrated;
  }
  if (!Array.isArray(db.notes)) db.notes = [];
  if (!db.settings.accentColor) db.settings.accentColor = '#FFC800';
  if (!db.settings.language) db.settings.language = 'fr';
  if (!db.settings.timeFormat) db.settings.timeFormat = '24h';
  if (db.settings.soundEnabled === undefined) db.settings.soundEnabled = true;
  if (db.settings.goalMode === undefined) {
    db.settings.manualGoal = db.settings.goal || 100;
    db.settings.goalMode = 'auto';
    delete db.settings.goal;
  }
  healHabitOrder(db);
  if (!db.photos) db.photos = {};
  for (const [date, val] of Object.entries(db.photos)) {
    if (typeof val === 'string') db.photos[date] = [{ filename: val, uploadedAt: new Date().toISOString() }];
  }
  if (!db.habits) db.habits = {};
  if (db.monthlySummaryAcknowledged === undefined) db.monthlySummaryAcknowledged = null;
  if (!db.customHabits) db.customHabits = [];
  if (!db.badges) db.badges = {};
  if (!db.appOpenDatesBackfilled) {
    if (!db.appOpenDates) db.appOpenDates = {};
    const activityDates = new Set();
    db.entries.forEach((e) => activityDates.add(e.date));
    Object.keys(db.habits || {}).forEach((d) => activityDates.add(d));
    db.notes.forEach((n) => activityDates.add(n.date));
    activityDates.forEach((d) => { db.appOpenDates[d] = true; });
    db.appOpenDatesBackfilled = true;
  }
  if (!db.rankBadgesRevalidatedAug2026) {
    const { xp: currentXPForRankCheck } = computeXP(db);
    const rankBadgeCheckMap = {
      'rank-discipline': 1, 'rank-determine': 2, 'rank-expert': 3, 'rank-pro': 4,
      'rank-maitre': 5, 'rank-elite': 6, 'rank-champion': 7, 'rank-legende': 8,
      'rank-imbattable': 9, 'rank-invincible': 10, 'rank-immortel': 11, 'rank-divin': 12,
    };
    Object.keys(rankBadgeCheckMap).forEach((badgeId) => {
      if (db.badges[badgeId] && currentXPForRankCheck < RANKS[rankBadgeCheckMap[badgeId]].min) {
        delete db.badges[badgeId];
      }
    });
    db.rankBadgesRevalidatedAug2026 = true;
  }
  if (!db.inventory) db.inventory = [];
  if (!db.itemDiscoveries) db.itemDiscoveries = {};
  if (!db.mythicDiscovered) db.mythicDiscovered = {};
  if (db.bonusXP === undefined) db.bonusXP = 0;
  if (!db.activeBoosts) db.activeBoosts = { amuletteEndsAt: null, amuletteMult: 1 };
  if (!db.mythicActiveStates) db.mythicActiveStates = {};
  if (db.toucherDivinActive) db.mythicActiveStates.toucher_divin = true;
  if (!db.protectedHabitDays) db.protectedHabitDays = {};
  if (db.firstLegendaryFound === undefined) db.firstLegendaryFound = null;
  if (!db.firstUsedAt) {
    const earliest = earliestAnyDataDate(db);
    db.firstUsedAt = earliest ? new Date(earliest + 'T00:00:00').toISOString() : new Date().toISOString();
  }
  if (!db.platinumShownDates) db.platinumShownDates = [];
  if (!db.plumeUsesToday) db.plumeUsesToday = { date: null, count: 0 };
  if (!db.xpLog) db.xpLog = [];
  if (db.xpLogLastDate === undefined) db.xpLogLastDate = null;
  if (!db.xpLogGraineIconFixed) {
    const graineDates = new Set((db.graineUses || []).map((u) => u.date));
    db.xpLog.forEach((log) => {
      if (log.reason === 'habits' && log.label === 'Habitudes du jour' && graineDates.has(log.date)) {
        log.label = 'Habitudes du jour 🌱';
      }
    });
    db.xpLogGraineIconFixed = true;
  }
  if (!db.xpLogTrophyTierFixed) {
    const TROPHY_LABEL_TO_TIER = { 'Trophée Or': 'or', 'Trophée Argent': 'argent', 'Trophée Bronze': 'bronze' };
    db.xpLog.forEach((log) => {
      if (log.reason === 'trophy' && TROPHY_LABEL_TO_TIER[log.label]) {
        const tier = TROPHY_LABEL_TO_TIER[log.label];
        log.reason = `trophy_${tier}`;
        log.label = `Trophée ${tier.charAt(0).toUpperCase()}${tier.slice(1)}`;
      }
    });
    db.xpLogTrophyTierFixed = true;
  }
  if (!db.xpLogBadgeIconFixed) {
    db.xpLog.forEach((log) => {
      if (log.reason === 'badge' && !log.icon && typeof log.sourceId === 'string' && log.sourceId.startsWith('badge:')) {
        const badgeId = log.sourceId.slice('badge:'.length);
        const b = BADGES.find((x) => x.id === badgeId);
        if (b) log.icon = b.icon;
      }
    });
    db.xpLogBadgeIconFixed = true;
  }
  if (!db.xpLogReconcileBugFixed) {
    db.xpLogLastDate = null;
    db.xpLogReconcileBugFixed = true;
  }

  _db = db;
  return _db;
}

let _badgesCache = null;
function saveDB(db) {
  _badgesCache = null;
  _db = db;
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ---------- Core helpers (ported 1:1 from server.js) ----------

function rankForXP(xp) {
  for (const r of RANKS) if (xp >= r.min && xp <= r.max) return r;
  return RANKS[RANKS.length - 1];
}
function rankIndex(rank) { return RANKS.indexOf(rank); }

function earliestHabitDate(db) {
  const dates = Object.keys(db.habits);
  return dates.length ? dates.sort()[0] : null;
}

function isProtectedHabitDay(db, key, ds) {
  return !!((db.protectedHabitDays && db.protectedHabitDays[key]) || []).includes(ds);
}

function habitXPForDate(db, date) {
  const h = db.habits[date] || {};
  let xp = 0;
  if (!h.cannabis) xp += 15;
  if (!h.cafe) xp += 15;
  if (!h.alcool) xp += 15;
  if (h.marche) xp += 20;
  if (h.situps) xp += 20;
  return xp;
}

function graineBonusXP(db) {
  const today = todayStr();
  return (db.graineUses || []).reduce((sum, use) => {
    if (use.date >= today) return sum;
    return sum + Math.round(habitXPForDate(db, use.date) * (use.mult - 1));
  }, 0);
}

// ---------- XP log ----------
// Journal des 30 dernières actions ayant accordé de l'XP, pour affichage dans
// la fenêtre "Détail de l'XP". N'affecte JAMAIS le calcul réel de l'XP
// (computeXP reste la seule source de vérité) — ce journal est purement
// informatif, écrit en parallèle.
const XP_LOG_MAX = 30;

function pushXPLog(db, date, reason, amount, label, sourceId, icon) {
  if (!amount || amount <= 0) return;
  if (!db.xpLog) db.xpLog = [];
  db.xpLog.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date, reason, amount, label, sourceId: sourceId || null, icon: icon || null, at: new Date().toISOString() });
  if (db.xpLog.length > XP_LOG_MAX) db.xpLog = db.xpLog.slice(db.xpLog.length - XP_LOG_MAX);
}

function logTrophyProgressForDate(db, date) {
  const goal = goalForDate(db, date);
  if (!goal || goal <= 0) return;
  const total = totalForDate(db, date);
  const pct = total / goal;
  const table = trophyXPTable(rankIndexForGoal(goal));
  const logged = new Set((db.xpLog || []).filter((l) => l.date === date).map((l) => l.reason));

  if (pct >= 0.5 && !logged.has('trophy_bronze')) {
    pushXPLog(db, date, 'trophy_bronze', table.bronze, 'Trophée Bronze');
  }
  if (pct >= 0.8 && !logged.has('trophy_argent')) {
    pushXPLog(db, date, 'trophy_argent', table.argent - table.bronze, 'Trophée Argent');
  }
  if (pct >= 1 && !logged.has('trophy_or')) {
    pushXPLog(db, date, 'trophy_or', table.or - table.argent, 'Trophée Or');
  }
}

function derelockTrophyProgressForDate(db, date) {
  if (!db.xpLog) return;
  const goal = goalForDate(db, date);
  const total = totalForDate(db, date);
  const pct = goal > 0 ? total / goal : 0;
  db.xpLog = db.xpLog.filter((log) => {
    if (log.date !== date) return true;
    if (log.reason === 'trophy_bronze' && pct < 0.5) return false;
    if (log.reason === 'trophy_argent' && pct < 0.8) return false;
    if (log.reason === 'trophy_or' && pct < 1) return false;
    return true;
  });
}

function hasXPLogReason(db, date, reason) {
  return (db.xpLog || []).some((l) => l.date === date && l.reason === reason);
}

function logHabitProgressForDate(db, date) {
  const h = db.habits[date] || {};
  const today = todayStr();

  if (h.marche && !hasXPLogReason(db, date, 'habit_marche')) {
    pushXPLog(db, date, 'habit_marche', 20, 'Marche à l\'extérieur');
  }
  if (h.situps && !hasXPLogReason(db, date, 'habit_situps')) {
    pushXPLog(db, date, 'habit_situps', 20, '100 sit-ups');
  }

  if (date < today && !hasXPLogReason(db, date, 'habit_avoidance')) {
    const avoided = [];
    let xp = 0;
    if (!h.cannabis || isProtectedHabitDay(db, 'cannabis', date)) { avoided.push('Cannabis'); xp += 15; }
    if (!h.alcool || isProtectedHabitDay(db, 'alcool', date)) { avoided.push('Alcool'); xp += 15; }
    if (!h.cafe || isProtectedHabitDay(db, 'cafe', date)) { avoided.push('Café'); xp += 15; }
    if (avoided.length > 0) {
      pushXPLog(db, date, 'habit_avoidance', xp, `Journée sans ${avoided.join(' & ')}`);
    }
  }
}

function derelockHabitProgressForDate(db, date) {
  if (!db.xpLog) return;
  const h = db.habits[date] || {};
  db.xpLog = db.xpLog.filter((log) => {
    if (log.date !== date) return true;
    if (log.reason === 'habit_marche' && !h.marche) return false;
    if (log.reason === 'habit_situps' && !h.situps) return false;
    return true;
  });
}

function reconcileXPLog(db) {
  const today = todayStr();
  if (db.xpLogLastDate === today) return;
  const floorStr = db.xpLogLastDate ? null : earliestAnyDataDate(db);
  if (!db.xpLogLastDate && !floorStr) { db.xpLogLastDate = today; return; }

  let cursor = db.xpLogLastDate
    ? new Date(db.xpLogLastDate + 'T00:00:00')
    : new Date(floorStr + 'T00:00:00');
  if (db.xpLogLastDate) cursor.setDate(cursor.getDate() + 1);
  const end = new Date(today + 'T00:00:00');

  while (cursor < end) {
    const ds = cursor.toLocaleDateString('en-CA');
    logHabitProgressForDate(db, ds);

    logTrophyProgressForDate(db, ds);

    if (isPlatinumCompletionDate(db, ds) && !hasXPLogReason(db, ds, 'platinum_week')) pushXPLog(db, ds, 'platinum_week', 50, 'Semaine Platine complétée');

    (db.graineUses || []).filter((u) => u.date === ds).forEach((u) => {
      if (hasXPLogReason(db, ds, 'graine_patience')) return;
      const bonus = Math.round(habitXPForDate(db, ds) * (u.mult - 1));
      if (bonus > 0) pushXPLog(db, ds, 'graine_patience', bonus, 'Graine de patience');
    });

    db.xpLogLastDate = ds;
    cursor.setDate(cursor.getDate() + 1);
  }
}

function cleanDaysCount(db, key) {
  const floorStr = earliestHabitDate(db);
  if (!floorStr) return 0;
  const today = new Date(todayStr() + 'T00:00:00');
  let cursor = new Date(floorStr + 'T00:00:00');
  let count = 0;
  while (cursor < today) {
    const ds = cursor.toLocaleDateString('en-CA');
    const h = db.habits[ds];
    if (!(h && h[key]) || isProtectedHabitDay(db, key, ds)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function weekDatesFor(date) {
  const d = new Date(date + 'T00:00:00');
  const dow = d.getDay();
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - dow);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(sunday);
    dd.setDate(sunday.getDate() + i);
    dates.push(dd.toLocaleDateString('en-CA'));
  }
  return dates;
}

function isBestWeekdayEver(db, date) {
  const todayTotal = totalForDate(db, date);
  if (todayTotal <= 0) return false;
  const targetDow = new Date(date + 'T00:00:00').getDay();
  const distinctDates = [...new Set(db.entries.map((e) => e.date))].filter((d) => d !== date);
  let maxPast = 0;
  let found = false;
  for (const d of distinctDates) {
    if (new Date(d + 'T00:00:00').getDay() !== targetDow) continue;
    found = true;
    const t = totalForDate(db, d);
    if (t > maxPast) maxPast = t;
  }
  if (!found) return false;
  return todayTotal > maxPast;
}

function safeGoalForDate(db, date) {
  return db.goalSnapshots[date] || db.settings.manualGoal || 100;
}

function totalForDate(db, date) {
  return db.entries.filter((e) => e.date === date).reduce((sum, e) => sum + e.count, 0);
}

function platinumWeekInfo(db, uptoDateStr) {
  const floorStr = earliestAnyDataDate(db);
  if (!floorStr) return { completions: [], weekDateSets: [] };
  let cursor = new Date(floorStr + 'T00:00:00');
  const end = new Date(uptoDateStr + 'T00:00:00');
  let streak = [];
  const completions = [];
  const weekDateSets = [];
  while (cursor <= end) {
    const ds = cursor.toLocaleDateString('en-CA');
    const goal = safeGoalForDate(db, ds);
    const total = totalForDate(db, ds);
    const isGold = goal > 0 && total >= goal;
    if (isGold) {
      streak.push(ds);
      if (streak.length === 7) {
        completions.push(ds);
        weekDateSets.push(streak.slice());
        streak = [];
      }
    } else {
      streak = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { completions, weekDateSets };
}

function countPlatinumWeeks(db) {
  return platinumWeekInfo(db, todayStr()).completions.length;
}

function isPlatinumCompletionDate(db, date) {
  return platinumWeekInfo(db, date).completions.includes(date);
}

function datesInPlatinumWeeks(db, uptoDateStr) {
  const info = platinumWeekInfo(db, uptoDateStr);
  const set = new Set();
  info.weekDateSets.forEach((week) => week.forEach((d) => set.add(d)));
  return set;
}

function countTrueDays(db, key) {
  return Object.values(db.habits).filter((h) => h && h[key]).length;
}

function badgeBonusXP(db) {
  if (!db.badges) return 0;
  return Object.keys(db.badges).reduce((sum, id) => {
    const b = BADGES.find((x) => x.id === id);
    return sum + (b ? b.xp : 0);
  }, 0);
}

function dailyTrophyXP(db, date) {
  const total = totalForDate(db, date);
  const goal = goalForDate(db, date);
  if (!goal || goal <= 0) return 0;
  const pct = total / goal;
  const table = trophyXPTable(rankIndexForGoal(goal));
  if (pct >= 1) return table.or;
  if (pct >= 0.8) return table.argent;
  if (pct >= 0.5) return table.bronze;
  return 0;
}

function sumTrophyXP(db) {
  const dates = [...new Set(db.entries.map((e) => e.date))];
  return dates.reduce((sum, d) => sum + dailyTrophyXP(db, d), 0);
}

function computeXP(db) {
  const totalPushups = db.entries.reduce((sum, e) => sum + e.count + (e.bonusXP || 0), 0);
  const cleanCannabisDays = cleanDaysCount(db, 'cannabis');
  const cleanCafeDays = cleanDaysCount(db, 'cafe');
  const cleanAlcoolDays = cleanDaysCount(db, 'alcool');
  const marcheDays = countTrueDays(db, 'marche');
  const situpsDays = countTrueDays(db, 'situps');
  const platinumWeeks = countPlatinumWeeks(db);
  const trophyXP = sumTrophyXP(db);
  const badgeXP = badgeBonusXP(db);
  const itemBonusXP = db.bonusXP || 0;
  const graineXP = graineBonusXP(db);
  const xp = totalPushups * 1 + cleanCannabisDays * 15 + cleanCafeDays * 15 + cleanAlcoolDays * 15 + marcheDays * 20 + situpsDays * 20
    + platinumWeeks * 50 + trophyXP + badgeXP + itemBonusXP + graineXP;
  return { xp, totalPushups, cleanCannabisDays, cleanCafeDays, cleanAlcoolDays, marcheDays, situpsDays, platinumWeeks, trophyXP, badgeXP, itemBonusXP, graineXP };
}

function currentGoal(db) {
  if (db.settings.goalMode === 'manual') return db.settings.manualGoal || 100;
  const { xp } = computeXP(db);
  return rankForXP(xp).goal;
}
function goalForDate(db, date) { return db.goalSnapshots[date] || currentGoal(db); }
function ensureGoalSnapshot(db, date) {
  if (!(date in db.goalSnapshots)) db.goalSnapshots[date] = currentGoal(db);
}
function refreshAutoGoalIfRankChanged(db, date) {
  if (db.settings.goalMode !== 'auto') return;
  if (!db.autoGoalTracker) db.autoGoalTracker = {};
  const priorAutoGoal = db.autoGoalTracker[date];
  const freshAutoGoal = currentGoal(db);
  if (priorAutoGoal === undefined || freshAutoGoal !== priorAutoGoal) {
    db.goalSnapshots[date] = freshAutoGoal;
  }
  db.autoGoalTracker[date] = freshAutoGoal;
}
function trophyForTotal(total, goal) {
  if (!goal || goal <= 0) return null;
  const pct = total / goal;
  if (pct >= 1) return 'or';
  if (pct >= 0.8) return 'argent';
  if (pct >= 0.5) return 'bronze';
  return null;
}

function habitsForDate(db, date) {
  const h = db.habits[date] || {};
  const out = {};
  HABIT_KEYS.forEach((k) => { out[k] = !!h[k]; });
  (db.customHabits || []).forEach((ch) => { out[ch.id] = !!h[ch.id]; });
  return out;
}

function streakDays(db, key) {
  const floorStr = earliestHabitDate(db);
  if (!floorStr) return 0;
  const floor = new Date(floorStr + 'T00:00:00');
  let cursor = new Date(todayStr() + 'T00:00:00');
  let count = 0;
  while (cursor >= floor) {
    const ds = cursor.toLocaleDateString('en-CA');
    const h = db.habits[ds];
    if (h && h[key] && !isProtectedHabitDay(db, key, ds)) break;
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function bestStreak(db, key) {
  const floorStr = earliestHabitDate(db);
  if (!floorStr) return 0;
  const today = new Date(todayStr() + 'T00:00:00');
  let cursor = new Date(floorStr + 'T00:00:00');
  let current = 0, best = 0;
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    const h = db.habits[ds];
    if (h && h[key]) current = 0; else { current++; if (current > best) best = current; }
    cursor.setDate(cursor.getDate() + 1);
  }
  return best;
}

function bestTrueStreak(db, key) {
  const floorStr = earliestHabitDate(db);
  if (!floorStr) return 0;
  const today = new Date(todayStr() + 'T00:00:00');
  let cursor = new Date(floorStr + 'T00:00:00');
  let current = 0, best = 0;
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    const h = db.habits[ds];
    if (h && h[key]) { current++; if (current > best) best = current; } else current = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  return best;
}

// ---------- Personal records ----------

function bestSetRecord(db) {
  if (!db.entries.length) return null;
  let best = db.entries[0];
  db.entries.forEach((e) => { if (e.count > best.count) best = e; });
  return { count: best.count, date: best.date };
}
function bestDayRecord(db) {
  const dates = [...new Set(db.entries.map((e) => e.date))];
  let bestDate = null, bestTotal = -1;
  dates.forEach((d) => { const t = totalForDate(db, d); if (t > bestTotal) { bestTotal = t; bestDate = d; } });
  return bestTotal > 0 ? { total: bestTotal, date: bestDate } : null;
}
function bestDayByWeekday(db) {
  const dates = [...new Set(db.entries.map((e) => e.date))];
  const best = [0, 1, 2, 3, 4, 5, 6].map(() => ({ total: 0, date: null }));
  dates.forEach((d) => {
    const t = totalForDate(db, d);
    const jsDay = new Date(d + 'T00:00:00').getDay();
    const idx = (jsDay + 6) % 7;
    if (t > best[idx].total) { best[idx] = { total: t, date: d }; }
  });
  return best;
}
function bestWeekRecord(db) {
  const dates = [...new Set(db.entries.map((e) => e.date))];
  const weekStarts = new Set(dates.map((d) => weekDatesFor(d)[0]));
  let bestStart = null, bestTotal = -1;
  weekStarts.forEach((ws) => {
    const total = weekDatesFor(ws).reduce((sum, d) => sum + totalForDate(db, d), 0);
    if (total > bestTotal) { bestTotal = total; bestStart = ws; }
  });
  return bestTotal > 0 ? { total: bestTotal, weekStart: bestStart } : null;
}
function bestMonthRecord(db) {
  const monthTotals = {};
  db.entries.forEach((e) => { const mk = e.date.slice(0, 7); monthTotals[mk] = (monthTotals[mk] || 0) + e.count; });
  let bestMonth = null, bestTotal = -1;
  Object.entries(monthTotals).forEach(([mk, t]) => { if (t > bestTotal) { bestTotal = t; bestMonth = mk; } });
  return bestTotal > 0 ? { total: bestTotal, monthKey: bestMonth } : null;
}
function longestPlatinumStreak(db) {
  const info = platinumWeekInfo(db, todayStr());
  let best = 0, current = 0, prevCompletion = null;
  info.completions.forEach((completionDate) => {
    if (prevCompletion) {
      const diffDays = (new Date(completionDate + 'T00:00:00') - new Date(prevCompletion + 'T00:00:00')) / 86400000;
      current = diffDays === 7 ? current + 1 : 1;
    } else {
      current = 1;
    }
    if (current > best) best = current;
    prevCompletion = completionDate;
  });
  return best;
}

function firstDateAtPlatinumStreak(db, target) {
  const info = platinumWeekInfo(db, todayStr());
  let current = 0, prevCompletion = null;
  for (const completionDate of info.completions) {
    if (prevCompletion) {
      const diffDays = (new Date(completionDate + 'T00:00:00') - new Date(prevCompletion + 'T00:00:00')) / 86400000;
      current = diffDays === 7 ? current + 1 : 1;
    } else {
      current = 1;
    }
    if (current >= target) return completionDate;
    prevCompletion = completionDate;
  }
  return null;
}

// ---------- Badge progress (for "presque là" nudges + progress bars) ----------

function currentCleanStreak(db, key) {
  const floorStr = earliestHabitDate(db);
  if (!floorStr) return 0;
  let cursor = new Date(floorStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  let run = 0;
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    const h = db.habits[ds];
    if (h && h[key]) run = 0; else run++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return run;
}

function currentTrueStreak(db, key) {
  const floorStr = earliestHabitDate(db);
  if (!floorStr) return 0;
  let cursor = new Date(floorStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  let run = 0;
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    const h = db.habits[ds];
    if (h && h[key]) run++; else run = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  return run;
}

function currentGoalStreak(db) {
  const datesWithEntries = [...new Set(db.entries.map((e) => e.date))];
  if (!datesWithEntries.length) return 0;
  const floorStr = datesWithEntries.sort()[0];
  let cursor = new Date(floorStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  let run = 0;
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    const total = totalForDate(db, ds);
    const goal = goalForDate(db, ds);
    if (goal > 0 && total >= goal) run++; else run = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  return run;
}

function bestGoalStreak(db) {
  const datesWithEntries = [...new Set(db.entries.map((e) => e.date))];
  if (!datesWithEntries.length) return 0;
  const floorStr = datesWithEntries.sort()[0];
  let cursor = new Date(floorStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  let current = 0;
  let best = 0;
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    const total = totalForDate(db, ds);
    const goal = goalForDate(db, ds);
    if (goal > 0 && total >= goal) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return best;
}

function currentPlatinumStreak(db) {
  const info = platinumWeekInfo(db, todayStr());
  let current = 0, prevCompletion = null;
  for (const completionDate of info.completions) {
    if (prevCompletion) {
      const diffDays = (new Date(completionDate + 'T00:00:00') - new Date(prevCompletion + 'T00:00:00')) / 86400000;
      current = diffDays === 7 ? current + 1 : 1;
    } else {
      current = 1;
    }
    prevCompletion = completionDate;
  }
  return current;
}

function bestSingleEntry(db) {
  return db.entries.reduce((max, e) => Math.max(max, e.count), 0);
}

function bestDailyTotal(db) {
  const dates = [...new Set(db.entries.map((e) => e.date))];
  return dates.reduce((max, d) => Math.max(max, totalForDate(db, d)), 0);
}

function bestMonthlyTotal(db) {
  const byMonth = {};
  db.entries.forEach((e) => {
    const mk = e.date.slice(0, 7);
    byMonth[mk] = (byMonth[mk] || 0) + e.count;
  });
  return Object.values(byMonth).reduce((max, v) => Math.max(max, v), 0);
}

function bestConsecutiveDaySum(db, windowDays) {
  const datesWithEntries = [...new Set(db.entries.map((e) => e.date))];
  if (datesWithEntries.length === 0) return 0;
  const floorStr = datesWithEntries.sort()[0];
  let cursor = new Date(floorStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  const window = [];
  let best = 0;
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    window.push(totalForDate(db, ds));
    if (window.length > windowDays) window.shift();
    if (window.length === windowDays) {
      const sum = window.reduce((a, b) => a + b, 0);
      if (sum > best) best = sum;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return best;
}

const TIME_WINDOW_BADGES = {
  'force-tot': { startHour: 6, endHour: 12, target: 150 },
  'oiseau-nuit': { startHour: 0, endHour: 4, target: 100 },
  'soiree-motivante': { startHour: 18, endHour: 22, target: 150 },
};

function computeTimeWindowProgress(db, badgeId) {
  const cfg = TIME_WINDOW_BADGES[badgeId];
  if (!cfg) return null;
  const nowHour = new Date().getHours();
  if (nowHour < cfg.startHour || nowHour >= cfg.endHour) return null;
  const today = todayStr();
  const sumInWindow = db.entries
    .filter((e) => e.date === today)
    .filter((e) => {
      const h = parseHour(e.time);
      return h !== null && h >= cfg.startHour && h < cfg.endHour;
    })
    .reduce((sum, e) => sum + e.count, 0);
  return { current: sumInWindow, target: cfg.target };
}

function currentAppOpenStreak(db) {
  const dates = Object.keys(db.appOpenDates || {}).sort();
  if (!dates.length) return 0;
  let cursor = new Date(dates[0] + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  let run = 0;
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    if (db.appOpenDates && db.appOpenDates[ds]) run++; else run = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  return run;
}

function daysSinceStart(db) {
  const start = earliestAnyDataDate(db);
  if (!start) return 0;
  const diff = (new Date(todayStr() + 'T00:00:00') - new Date(start + 'T00:00:00')) / 86400000;
  return Math.max(0, Math.floor(diff));
}

function countPerfectHabitDays(db) {
  return Object.keys(db.habits || {}).filter((d) => {
    const h = db.habits[d];
    return h && h.marche && h.situps && !h.cannabis && !h.alcool && !h.cafe;
  }).length;
}

function computeAllBadgeStats(db) {
  return {
    // Enveloppe RANGS (12 badges) — un seul calcul de XP total pour tous
    xp: computeXP(db).xp,

    // Enveloppe STREAKS D'HABITUDES — chaque habitude calculée une fois,
    // réutilisée par tous ses paliers (30/90 jours, etc.)
    cleanStreakCafe: currentCleanStreak(db, 'cafe'),
    cleanStreakAlcool: currentCleanStreak(db, 'alcool'),
    cleanStreakCannabis: currentCleanStreak(db, 'cannabis'),
    trueStreakMarche: currentTrueStreak(db, 'marche'),
    trueDaysSitups: countTrueDays(db, 'situps'),

    // Enveloppe TROPHÉES/PLATINE
    currentGoalStreak: currentGoalStreak(db),
    currentPlatinumStreak: currentPlatinumStreak(db),

    // Enveloppe VOLUME DE PUSH-UPS
    bestSingleEntry: bestSingleEntry(db),
    bestDailyTotal: bestDailyTotal(db),
    bestConsecutive7DaySum: bestConsecutiveDaySum(db, 7),
    bestMonthlyTotal: bestMonthlyTotal(db),
    totalPushupsEver: db.entries.reduce((s, e) => s + e.count, 0),

    // Enveloppe CONTENU PERSONNEL (photos/notes)
    totalPhotos: allPhotosSorted(db).length,
    totalNotes: db.notes.length,

    // Enveloppe FIDÉLITÉ D'OUVERTURE
    appOpenStreak: currentAppOpenStreak(db),

    // Enveloppe ANCIENNETÉ
    daysSinceStart: daysSinceStart(db),

    perfectHabitDays: countPerfectHabitDays(db),
  };
}

function computeBadgeProgress(badgeId, stats, db) {
  const rankBadgeMap = {
    'rank-discipline': 1, 'rank-determine': 2, 'rank-expert': 3, 'rank-pro': 4,
    'rank-maitre': 5, 'rank-elite': 6, 'rank-champion': 7, 'rank-legende': 8,
    'rank-imbattable': 9, 'rank-invincible': 10, 'rank-immortel': 11, 'rank-divin': 12,
  };
  if (rankBadgeMap[badgeId] !== undefined) {
    return { current: stats.xp, target: RANKS[rankBadgeMap[badgeId]].min };
  }
  if (badgeId === 'or-streak-5') return { current: stats.currentGoalStreak, target: 5 };
  if (badgeId === 'mois-brillant') return { current: stats.currentPlatinumStreak, target: 4 };
  if (badgeId === 'decafeine') return { current: stats.cleanStreakCafe, target: 30 };
  if (badgeId === 'sans-alcool') return { current: stats.cleanStreakAlcool, target: 30 };
  if (badgeId === 'clarte') return { current: stats.cleanStreakCannabis, target: 30 };
  if (badgeId === 'decafeine90') return { current: stats.cleanStreakCafe, target: 90 };
  if (badgeId === 'sans-alcool90') return { current: stats.cleanStreakAlcool, target: 90 };
  if (badgeId === 'clarte90') return { current: stats.cleanStreakCannabis, target: 90 };
  if (badgeId === 'go-abdo') return { current: stats.trueDaysSitups, target: 25 };
  if (badgeId === 'semaine-promenades') return { current: stats.trueStreakMarche, target: 7 };
  if (badgeId === 'consistance') return { current: stats.bestSingleEntry, target: 50 };
  if (badgeId === 'trente-en-un') return { current: stats.bestSingleEntry, target: 30 };
  if (badgeId === 'encore-plus') return { current: stats.bestDailyTotal, target: 200 };
  if (badgeId === 'journee-chargee') return { current: stats.bestDailyTotal, target: 300 };
  if (badgeId === 'objectif-mensuel') return { current: stats.bestMonthlyTotal, target: 3500 };
  if (badgeId === 'over-9000') return { current: stats.totalPushupsEver, target: 10000 };
  if (badgeId === 'mille-en-cinq') return { current: stats.bestConsecutive7DaySum, target: 1000 };
  if (badgeId === 'deux-mille-en-7') return { current: stats.bestConsecutive7DaySum, target: 2000 };
  if (badgeId === 'album-complet') return { current: stats.totalPhotos, target: 50 };
  if (badgeId === 'je-note-encore') return { current: stats.totalNotes, target: 100 };
  if (badgeId === 'je-note-encore-plus') return { current: stats.totalNotes, target: 250 };
  if (badgeId === 'je-note-toujours-plus') return { current: stats.totalNotes, target: 500 };
  if (badgeId === 'bonne-habitude') return { current: stats.appOpenStreak, target: 7 };
  if (badgeId === 'fidele-au-poste') return { current: stats.appOpenStreak, target: 30 };
  if (badgeId === 'toujours-fidele') return { current: stats.appOpenStreak, target: 100 };
  if (badgeId === 'six-mois') return { current: stats.daysSinceStart, target: 182 };
  if (badgeId === 'un-an') return { current: stats.daysSinceStart, target: 365 };
  if (badgeId === 'la-totale') return { current: stats.perfectHabitDays, target: 10 };
  if (TIME_WINDOW_BADGES[badgeId]) return computeTimeWindowProgress(db, badgeId);
  return null;
}

// ---------- Badges ----------

function parseHour(timeStr) {
  const m = (timeStr || '').match(/^(\d{1,2})/);
  return m ? parseInt(m[1], 10) : null;
}
function firstDateStreakReaches(db, key, target) {
  const floorStr = earliestHabitDate(db);
  if (!floorStr) return null;
  let cursor = new Date(floorStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  let run = 0;
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    const h = db.habits[ds];
    if (h && h[key]) run = 0; else run++;
    if (run >= target) return ds;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}
function firstPlatinumWeekDate(db) {
  const info = platinumWeekInfo(db, todayStr());
  return info.completions.length ? info.completions[0] : null;
}
function nthDisciplinedDayDate(db, n) {
  const datesWithEntries = [...new Set(db.entries.map((e) => e.date))].sort();
  const qualifying = datesWithEntries.filter((d) => {
    const total = totalForDate(db, d), goal = goalForDate(db, d);
    return goal > 0 && total >= goal;
  });
  return qualifying.length >= n ? qualifying[n - 1] : null;
}

function firstDateAppOpenStreakReaches(db, target) {
  const dates = Object.keys(db.appOpenDates || {}).sort();
  if (!dates.length) return null;
  let cursor = new Date(dates[0] + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  let run = 0;
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    if (db.appOpenDates && db.appOpenDates[ds]) run++; else run = 0;
    if (run >= target) return ds;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

function firstDateAtAnniversary(db, days) {
  const start = earliestAnyDataDate(db);
  if (!start) return null;
  const target = new Date(start + 'T00:00:00');
  target.setDate(target.getDate() + days);
  const targetStr = target.toLocaleDateString('en-CA');
  return todayStr() >= targetStr ? targetStr : null;
}

function firstDateAtNthPerfectHabitDay(db, n) {
  const dates = Object.keys(db.habits || {}).filter((d) => {
    const h = db.habits[d];
    return h && h.marche && h.situps && !h.cannabis && !h.alcool && !h.cafe;
  }).sort();
  return dates.length >= n ? dates[n - 1] : null;
}

function dec25DateReaching(db, minTotal) {
  const years = new Set(db.entries.map((e) => e.date.slice(0, 4)));
  for (const y of years) { const d = `${y}-12-25`; if (totalForDate(db, d) >= minTotal) return d; }
  return null;
}
function firstEntryDateWithMinCount(db, minCount) {
  const matches = db.entries.filter((e) => e.count >= minCount)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  return matches.length ? matches[0].date : null;
}
function firstDateWithMorningTotal(db, minTotal) {
  const byDate = {};
  db.entries.forEach((e) => { const h = parseHour(e.time); if (h !== null && h >= 6 && h < 12) byDate[e.date] = (byDate[e.date] || 0) + e.count; });
  const q = Object.entries(byDate).filter(([, v]) => v >= minTotal).map(([d]) => d).sort();
  return q.length ? q[0] : null;
}
function firstDateWithDailyTotal(db, minTotal) {
  const byDate = {};
  db.entries.forEach((e) => { byDate[e.date] = (byDate[e.date] || 0) + e.count; });
  const q = Object.entries(byDate).filter(([, v]) => v >= minTotal).map(([d]) => d).sort();
  return q.length ? q[0] : null;
}
function firstDateWithHourRangeTotal(db, minTotal, startHour, endHour) {
  const byDate = {};
  db.entries.forEach((e) => { const h = parseHour(e.time); if (h !== null && h >= startHour && h < endHour) byDate[e.date] = (byDate[e.date] || 0) + e.count; });
  const q = Object.entries(byDate).filter(([, v]) => v >= minTotal).map(([d]) => d).sort();
  return q.length ? q[0] : null;
}
function firstDateMonthDayReaching(db, monthDay, minTotal) {
  const years = new Set(db.entries.map((e) => e.date.slice(0, 4)));
  const matches = [...years].map((y) => `${y}-${monthDay}`).filter((d) => totalForDate(db, d) >= minTotal).sort();
  return matches.length ? matches[0] : null;
}
function firstDateOfConsecutiveDaySum(db, targetSum, windowDays) {
  const datesWithEntries = [...new Set(db.entries.map((e) => e.date))];
  if (datesWithEntries.length === 0) return null;
  const floorStr = datesWithEntries.sort()[0];
  let cursor = new Date(floorStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  const window = [];
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    window.push(totalForDate(db, ds));
    if (window.length > windowDays) window.shift();
    if (window.length === windowDays && window.reduce((a, b) => a + b, 0) >= targetSum) return ds;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

function firstDateAtTotalPushups(db, target) {
  const sorted = db.entries.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) || a.createdAt.localeCompare(b.createdAt));
  let running = 0;
  for (const e of sorted) {
    running += e.count;
    if (running >= target) return e.date;
  }
  return null;
}

function firstDateAtMonthlyTotal(db, target) {
  const sorted = db.entries.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) || a.createdAt.localeCompare(b.createdAt));
  let currentMonth = null;
  let running = 0;
  for (const e of sorted) {
    const mk = e.date.slice(0, 7);
    if (mk !== currentMonth) { currentMonth = mk; running = 0; }
    running += e.count;
    if (running >= target) return e.date;
  }
  return null;
}

function firstDateAtSingleSet(db, target) {
  const sorted = db.entries.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) || a.createdAt.localeCompare(b.createdAt));
  const match = sorted.find((e) => e.count >= target);
  return match ? match.date : null;
}

function firstDateAtTrueCount(db, key, target) {
  const dates = Object.keys(db.habits).filter((d) => db.habits[d] && db.habits[d][key]).sort();
  return dates.length >= target ? dates[target - 1] : null;
}

function firstDateTrueStreakReaches(db, key, target) {
  const floorStr = earliestHabitDate(db);
  if (!floorStr) return null;
  let cursor = new Date(floorStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  let run = 0;
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    const h = db.habits[ds];
    if (h && h[key]) { run++; if (run >= target) return ds; } else run = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}
function firstDateGoalStreakReaches(db, target) {
  const datesWithEntries = [...new Set(db.entries.map((e) => e.date))];
  if (!datesWithEntries.length) return null;
  const floorStr = datesWithEntries.sort()[0];
  let cursor = new Date(floorStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  let run = 0;
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    const total = totalForDate(db, ds);
    const goal = goalForDate(db, ds);
    if (goal > 0 && total >= goal) { run++; if (run >= target) return ds; } else run = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

function firstDateAtNthNote(db, n) {
  const sorted = db.notes.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return sorted.length >= n ? sorted[n - 1].date : null;
}
function allPhotosSorted(db) {
  const all = [];
  for (const [date, list] of Object.entries(db.photos)) list.forEach((p) => all.push({ date, filename: p.filename, uploadedAt: p.uploadedAt || date }));
  all.sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
  return all;
}
function firstDateAtNthPhoto(db, n) {
  const all = allPhotosSorted(db);
  return all.length >= n ? all[n - 1].date : null;
}

function totalXPFromEntriesForDate(db, date) {
  return db.entries
    .filter((e) => e.date === date)
    .reduce((sum, e) => sum + e.count + (e.bonusXP || 0), 0);
}

function simulateXPTimeline(db) {
  const entryDates = db.entries.map((e) => e.date);
  const minEntryDate = entryDates.length ? entryDates.sort()[0] : null;
  const habitFloorStr = earliestHabitDate(db);
  const candidates = [habitFloorStr, minEntryDate].filter(Boolean);
  if (!candidates.length) return [];
  const floorStr = candidates.sort()[0];
  let cursor = new Date(floorStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  let cumulative = (db.bonusXP || 0) + badgeBonusXP(db) + graineBonusXP(db);
  const timeline = [];
  const todayStrVal = todayStr();
  const platinumCompletions = new Set(platinumWeekInfo(db, todayStrVal).completions);
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    cumulative += totalXPFromEntriesForDate(db, ds);
    if (habitFloorStr && ds >= habitFloorStr) {
      const h = db.habits[ds];
      if (ds !== todayStrVal) {
        if (!(h && h.cannabis)) cumulative += 15;
        if (!(h && h.cafe)) cumulative += 15;
        if (!(h && h.alcool)) cumulative += 15;
      }
      if (h && h.marche) cumulative += 20;
      if (h && h.situps) cumulative += 20;
    }
    cumulative += dailyTrophyXP(db, ds);
    if (platinumCompletions.has(ds)) cumulative += 50;
    timeline.push({ date: ds, xp: cumulative });
    cursor.setDate(cursor.getDate() + 1);
  }
  return timeline;
}
function firstDateReachingXP(db, xpTarget) {
  const timeline = simulateXPTimeline(db);
  for (const t of timeline) if (t.xp >= xpTarget) return t.date;
  return null;
}

function nthItemDiscoveryDate(db, n) {
  const dates = Object.values(db.itemDiscoveries || {}).map((d) => d.firstDate).sort();
  return dates.length >= n ? dates[n - 1] : null;
}
function nthItemDiscoveryDateExcluding(db, n, excludeId) {
  const dates = Object.entries(db.itemDiscoveries || {})
    .filter(([id]) => id !== excludeId)
    .map(([, d]) => d.firstDate)
    .sort();
  return dates.length >= n ? dates[n - 1] : null;
}
function firstMythicDiscoveryDate(db) {
  const dates = Object.values(db.mythicDiscovered || {}).map((d) => d.date).sort();
  return dates.length ? dates[0] : null;
}
function firstLegendaryDate(db) {
  return (db.firstLegendaryFound && db.firstLegendaryFound.date) || null;
}

const BADGES = [
  { id: 'premiere-serie', name: 'Premier pas', desc: 'Enregistre ta toute première série de push-ups', xp: 10, icon: '👣', check: (db) => firstDateAtTotalPushups(db, 1) },
  { id: 'rank-discipline', name: 'Discipliné', desc: 'Atteindre le rang Discipliné', xp: Math.round(RANKS[1].min * 0.01 / 10) * 10, icon: '⭐', secret: true, check: (db) => firstDateReachingXP(db, RANKS[1].min) },
  { id: 'rank-determine', name: 'Déterminé', desc: 'Atteindre le rang Déterminé', xp: Math.round(RANKS[2].min * 0.01 / 10) * 10, icon: '⭐', secret: true, check: (db) => firstDateReachingXP(db, RANKS[2].min) },
  { id: 'rank-expert', name: 'Expert', desc: 'Atteindre le rang Expert', xp: Math.round(RANKS[3].min * 0.01 / 10) * 10, icon: '⭐', secret: true, check: (db) => firstDateReachingXP(db, RANKS[3].min) },
  { id: 'rank-pro', name: 'Professionnel', desc: 'Atteindre le rang Professionnel', xp: Math.round(RANKS[4].min * 0.01 / 10) * 10, icon: '⭐', secret: true, check: (db) => firstDateReachingXP(db, RANKS[4].min) },
  { id: 'rank-maitre', name: 'Maître', desc: 'Atteindre le rang Maître', xp: Math.round(RANKS[5].min * 0.01 / 10) * 10, icon: '⭐', secret: true, check: (db) => firstDateReachingXP(db, RANKS[5].min) },
  { id: 'rank-elite', name: 'Élite', desc: 'Atteindre le rang Élite', xp: Math.round(RANKS[6].min * 0.01 / 10) * 10, icon: '⭐', secret: true, check: (db) => firstDateReachingXP(db, RANKS[6].min) },
  { id: 'rank-champion', name: 'Champion', desc: 'Atteindre le rang Champion', xp: Math.round(RANKS[7].min * 0.01 / 10) * 10, icon: '⭐', secret: true, check: (db) => firstDateReachingXP(db, RANKS[7].min) },
  { id: 'rank-legende', name: 'Légende', desc: 'Atteindre le rang Légende', xp: Math.round(RANKS[8].min * 0.01 / 10) * 10, icon: '⭐', secret: true, check: (db) => firstDateReachingXP(db, RANKS[8].min) },
  { id: 'rank-imbattable', name: 'Imbattable', desc: 'Atteindre le rang Imbattable', xp: Math.round(RANKS[9].min * 0.01 / 10) * 10, icon: '⭐', secret: true, check: (db) => firstDateReachingXP(db, RANKS[9].min) },
  { id: 'rank-invincible', name: 'Invincible', desc: 'Atteindre le rang Invincible', xp: Math.round(RANKS[10].min * 0.01 / 10) * 10, icon: '⭐', secret: true, check: (db) => firstDateReachingXP(db, RANKS[10].min) },
  { id: 'rank-immortel', name: 'Immortel', desc: 'Atteindre le rang Immortel', xp: Math.round(RANKS[11].min * 0.01 / 10) * 10, icon: '⭐', secret: true, check: (db) => firstDateReachingXP(db, RANKS[11].min) },
  { id: 'rank-divin', name: 'Divin', desc: 'Atteindre le rang Divin', xp: Math.round(RANKS[12].min * 0.01 / 10) * 10, icon: '⭐', secret: true, check: (db) => firstDateReachingXP(db, RANKS[12].min) },
  { id: 'or-streak-5', name: "Ça vaut de l'or", desc: "Atteint l'or 5 jours de suite", xp: 25, icon: '🏅', check: (db) => firstDateGoalStreakReaches(db, 5) },
  { id: 'brillant', name: 'Brillant!', desc: 'Première semaine parfaite (trophée Platine)', xp: 100, icon: '💎', check: (db) => firstPlatinumWeekDate(db) },
  { id: 'mois-brillant', name: 'Un mois brillant!', desc: '4 semaines Platines consécutives', xp: 400, icon: '🌟', check: (db) => firstDateAtPlatinumStreak(db, 4) },
  { id: 'motivation100', name: '100 Motivation?', desc: "Atteindre l'Or pendant 100 jours au total", xp: 300, icon: '🥇', secret: true, check: (db) => nthDisciplinedDayDate(db, 100) },
  { id: 'decafeine', name: 'Décaféiné!', desc: '1 mois complet (30 jours consécutifs) sans caféine', xp: 300, icon: '☕', check: (db) => firstDateStreakReaches(db, 'cafe', 30) },
  { id: 'sans-alcool', name: 'Sans alcool', desc: '1 mois complet (30 jours consécutifs) sans alcool', xp: 300, icon: '🍷', check: (db) => firstDateStreakReaches(db, 'alcool', 30) },
  { id: 'clarte', name: "Clarté d'esprit", desc: '1 mois complet (30 jours consécutifs) sans cannabis', xp: 300, icon: '🧠', check: (db) => firstDateStreakReaches(db, 'cannabis', 30) },
  { id: 'decafeine90', name: 'Décaféiné pour de bon', desc: '3 mois complets (90 jours consécutifs) sans caféine', xp: 650, icon: '☕', check: (db) => firstDateStreakReaches(db, 'cafe', 90) },
  { id: 'sans-alcool90', name: 'Sobriété de fer', desc: '3 mois complets (90 jours consécutifs) sans alcool', xp: 650, icon: '🍷', check: (db) => firstDateStreakReaches(db, 'alcool', 90) },
  { id: 'clarte90', name: 'Clarté durable', desc: '3 mois complets (90 jours consécutifs) sans cannabis', xp: 650, icon: '🧠', check: (db) => firstDateStreakReaches(db, 'cannabis', 90) },
  { id: 'semaine-promenades', name: 'Semaine de promenades', desc: "Prendre une marche à l'extérieur pendant 7 jours consécutifs", xp: 200, icon: '🚶', check: (db) => firstDateTrueStreakReaches(db, 'marche', 7) },
  { id: 'go-abdo', name: 'Go Abdo!', desc: "Accomplir l'habitude des 100 sit-ups 25 fois", xp: 150, icon: '💪', check: (db) => firstDateAtTrueCount(db, 'situps', 25) },
  { id: 'consistance', name: 'La consistance porte fruits', desc: '50 push-ups en une seule série', xp: 75, icon: '💪', check: (db) => firstEntryDateWithMinCount(db, 50) },
  { id: 'trente-en-un', name: "1 c'est bien, mais 30 c'est mieux", desc: 'Effectue 30 push-ups en une seule série', xp: 30, icon: '💥', check: (db) => firstDateAtSingleSet(db, 30) },
  { id: 'force-tot', name: 'Force-tôt!', desc: '150 push-ups entre 6h et midi, dans la même journée', xp: 100, icon: '🌅', check: (db) => firstDateWithMorningTotal(db, 150) },
  { id: 'oiseau-nuit', name: 'Oiseau de nuit', desc: '100 push-ups entre minuit et 4h du matin, dans la même nuit', xp: 120, icon: '🦉', check: (db) => firstDateWithHourRangeTotal(db, 100, 0, 4) },
  { id: 'soiree-motivante', name: 'Soirée motivante', desc: '150 push-ups entre 18h et 22h, dans la même soirée', xp: 100, icon: '🌆', check: (db) => firstDateWithHourRangeTotal(db, 150, 18, 22) },
  { id: 'encore-plus', name: 'Encore plus!', desc: '200 push-ups dans la même journée', xp: 150, icon: '🚀', check: (db) => firstDateWithDailyTotal(db, 200) },
  { id: 'journee-chargee', name: 'Journée chargée', desc: '300 push-ups dans la même journée', xp: 250, icon: '🏋️', check: (db) => firstDateWithDailyTotal(db, 300) },
  { id: 'mille-en-cinq', name: '1000 en 7', desc: 'Effectue 1000 push-ups au total sur 7 jours consécutifs', xp: 300, icon: '🔥', check: (db) => firstDateOfConsecutiveDaySum(db, 1000, 7) },
  { id: 'deux-mille-en-7', name: '2000 en 7', desc: 'Effectue 2000 push-ups au total sur 7 jours consécutifs', xp: 550, icon: '🔥', secret: true, check: (db) => firstDateOfConsecutiveDaySum(db, 2000, 7) },
  { id: 'objectif-mensuel', name: 'Objectif mensuel', desc: 'Effectue 3500 push-ups en 1 mois', xp: 300, icon: '📅', check: (db) => firstDateAtMonthlyTotal(db, 3500) },
  { id: 'plein-dans-le-mille', name: 'En plein dans le mille!', desc: 'Effectue 1000 push-ups au total', xp: 100, icon: '🎯', secret: true, check: (db) => firstDateAtTotalPushups(db, 1000) },
  { id: 'over-9000', name: "Au-dessus de 9000!", desc: 'Effectue 10 000 push-ups au total', xp: 500, icon: '⚡', check: (db) => firstDateAtTotalPushups(db, 10000) },
  { id: 'cent-mille', name: '100k!', desc: 'Atteint 100 000 XP au total', xp: 1000, icon: '💯', secret: true, check: (db) => firstDateReachingXP(db, 100000) },
  { id: 'cadeau-noel', name: 'Un gros cadeau pour les pectoraux', desc: '250 push-ups le 25 décembre', xp: 250, icon: '🎄', check: (db) => dec25DateReaching(db, 250) },
  { id: 'resolution-nouvel-an', name: 'Résolution du Nouvel An', desc: '100 push-ups le 1er janvier', xp: 120, icon: '🎉', check: (db) => firstDateMonthDayReaching(db, '01-01', 100) },
  { id: 'premier-tresor', name: 'Premier trésor', desc: 'Trouve ton tout premier objet (autre que le Détecteur de métal)', xp: 50, icon: '🎁', secret: true, check: (db) => nthItemDiscoveryDateExcluding(db, 1, 'detecteur_metal') },
  { id: 'petit-coffre', name: 'Petit coffre', desc: 'Découvrir 3 objets différents', xp: 100, icon: '🧰', secret: true, check: (db) => nthItemDiscoveryDate(db, 3) },
  { id: 'grand-collectionneur', name: 'Grand collectionneur', desc: 'Découvrir tous les objets existants', xp: 400, icon: '🏆', secret: true, check: (db) => nthItemDiscoveryDate(db, ITEMS.length) },
  { id: 'legendaire-badge', name: 'Légendaire!', desc: "Débloque la version légendaire d'un objet pour la première fois", xp: 125, icon: '✨', secret: true, check: (db) => firstLegendaryDate(db) },
  { id: 'impossible-devient-reel', name: "L'impossible devient réel", desc: 'Trouve ton tout premier objet Mythique', xp: 800, icon: '🌟', secret: true, check: (db) => firstMythicDiscoveryDate(db) },
  { id: 'look-debutant', name: 'Look du débutant', desc: 'Prends ta toute première photo', xp: 15, icon: '🪞', check: (db) => firstDateAtNthPhoto(db, 1) },
  { id: 'top-modele', name: 'Top modèle', desc: '10 photos ajoutées au total', xp: 50, icon: '📸', secret: true, check: (db) => firstDateAtNthPhoto(db, 10) },
  { id: 'album-complet', name: 'Album photos', desc: '50 photos ajoutées au total', xp: 150, icon: '📸', secret: true, check: (db) => firstDateAtNthPhoto(db, 50) },
  { id: 'je-note', name: 'Je note!', desc: '50 notes ajoutées au total', xp: 50, icon: '📝', secret: true, check: (db) => firstDateAtNthNote(db, 50) },
  { id: 'je-note-encore', name: 'Je note encore!', desc: '100 notes ajoutées au total', xp: 100, icon: '📝', secret: true, check: (db) => firstDateAtNthNote(db, 100) },
  { id: 'je-note-encore-plus', name: 'Je note encore plus!', desc: '250 notes ajoutées au total', xp: 250, icon: '📝', secret: true, check: (db) => firstDateAtNthNote(db, 250) },
  { id: 'je-note-toujours-plus', name: 'Je note toujours plus!', desc: '500 notes ajoutées au total', xp: 500, icon: '📝', secret: true, check: (db) => firstDateAtNthNote(db, 500) },
  { id: 'bonne-habitude', name: 'Bonne habitude!', desc: "Ouvrir l'app 7 jours consécutifs", xp: 30, icon: '📅', check: (db) => firstDateAppOpenStreakReaches(db, 7) },
  { id: 'fidele-au-poste', name: 'Fidèle au poste', desc: "Ouvrir l'app 30 jours consécutifs", xp: 75, icon: '📅', check: (db) => firstDateAppOpenStreakReaches(db, 30) },
  { id: 'toujours-fidele', name: 'Toujours fidèle!', desc: "Ouvrir l'app 100 jours consécutifs", xp: 300, icon: '📅', check: (db) => firstDateAppOpenStreakReaches(db, 100) },
  { id: 'six-mois', name: '6 mois déjà!', desc: 'Utilise TrackPush depuis 6 mois', xp: 150, icon: '🎂', secret: true, check: (db) => firstDateAtAnniversary(db, 182) },
  { id: 'un-an', name: 'Un an plus fort', desc: 'Utilise TrackPush depuis 1 an', xp: 400, icon: '🎂', secret: true, check: (db) => firstDateAtAnniversary(db, 365) },
  { id: 'la-totale', name: 'La totale', desc: 'Accomplis les 5 habitudes le même jour, 10 fois au total', xp: 200, icon: '🌈', check: (db) => firstDateAtNthPerfectHabitDay(db, 10) },
];;

function badgesUnlockedForDate(db, date) {
  return Object.entries(db.badges).filter(([, info]) => info.unlockedDate === date).map(([id, info]) => {
    const b = BADGES.find((x) => x.id === id);
    return { id, name: b ? b.name : id, icon: b ? b.icon : '🏅', xp: b ? b.xp : 0, unlockedDate: info.unlockedDate };
  });
}
function checkAndUnlockBadges(db) {
  const newlyUnlocked = [];
  for (const b of BADGES) {
    if (db.badges[b.id]) continue;
    const unlockDate = b.check(db);
    if (unlockDate) {
      db.badges[b.id] = { unlockedDate: unlockDate, unlockedAt: new Date().toISOString() };
      newlyUnlocked.push({ id: b.id, name: b.name, desc: b.desc, xp: b.xp, icon: b.icon, unlockedDate: unlockDate });
      pushXPLog(db, unlockDate, 'badge', b.xp, `Badge : ${b.name}`, `badge:${b.id}`, b.icon);
    }
  }
  return newlyUnlocked;
}
function relockStaleBadges(db) {
  for (const id of Object.keys(db.badges)) {
    const b = BADGES.find((x) => x.id === id);
    if (!b) continue;
    if (!b.check(db)) delete db.badges[id];
  }
}

// ---------- Monthly summary ----------

function monthKeyOf(dateStr) { return dateStr ? dateStr.slice(0, 7) : ''; }
function daysInMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const count = new Date(y, m, 0).getDate();
  const dates = [];
  for (let d = 1; d <= count; d++) dates.push(`${monthKey}-${String(d).padStart(2, '0')}`);
  return dates;
}
function previousMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function nextMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function earliestAnyDataDate(db) {
  const dates = [];
  db.entries.forEach((e) => dates.push(e.date));
  db.notes.forEach((n) => dates.push(n.date));
  Object.keys(db.photos).forEach((d) => dates.push(d));
  Object.keys(db.habits).forEach((d) => dates.push(d));
  return dates.length ? dates.sort()[0] : null;
}
function avgSetSizeForMonth(db, monthKey) {
  const entries = db.entries.filter((e) => monthKeyOf(e.date) === monthKey);
  if (!entries.length) return 0;
  return entries.reduce((sum, e) => sum + e.count, 0) / entries.length;
}
function computeMonthlySummary(db, monthKey) {
  const dates = daysInMonthKey(monthKey);
  const trophyCounts = { bronze: 0, argent: 0, or: 0, platine: 0 };
  dates.forEach((ds) => {
    const total = totalForDate(db, ds), goal = goalForDate(db, ds);
    let trophy = trophyForTotal(total, goal);
    if (isPlatinumCompletionDate(db, ds)) trophy = 'platine';
    if (trophy) trophyCounts[trophy]++;
  });
  const moodCounts = {};
  db.notes.filter((n) => monthKeyOf(n.date) === monthKey).forEach((n) => {
    (n.moods || []).forEach((m) => { moodCounts[m] = (moodCounts[m] || 0) + 1; });
  });
  const monthPhotos = allPhotosSorted(db).filter((p) => monthKeyOf(p.date) === monthKey);
  const firstPhoto = monthPhotos.length ? monthPhotos[0] : null;
  const lastPhoto = monthPhotos.length ? monthPhotos[monthPhotos.length - 1] : null;
  const habitFloor = earliestHabitDate(db);
  let daysWithoutDrugs = 0, daysWithoutCaffeine = 0, daysWithoutAlcool = 0, daysWalked = 0, situpsDaysCount = 0;
  const customHabitCounts = (db.customHabits || []).map((ch) => ({ id: ch.id, name: ch.name, icon: ch.icon, count: 0 }));
  if (habitFloor) {
    dates.forEach((ds) => {
      if (ds < habitFloor) return;
      const h = db.habits[ds];
      if (!(h && h.cannabis)) daysWithoutDrugs++;
      if (!(h && h.cafe)) daysWithoutCaffeine++;
      if (!(h && h.alcool)) daysWithoutAlcool++;
      if (h && h.marche) daysWalked++;
      if (h && h.situps) situpsDaysCount++;
      customHabitCounts.forEach((c) => { if (h && h[c.id]) c.count++; });
    });
  }
  const situpsMinimum = situpsDaysCount * 100;
  const avgSetSize = avgSetSizeForMonth(db, monthKey);
  const avgSetSizePrevMonth = avgSetSizeForMonth(db, previousMonthKey(monthKey));
  const workTotals = [], offTotals = [];
  dates.forEach((ds) => {
    const h = db.habits[ds], total = totalForDate(db, ds);
    if (h && h.journeeTravail) workTotals.push(total);
    if (h && h.journeeConge) offTotals.push(total);
  });
  const avgWorkDay = workTotals.length ? workTotals.reduce((a, b) => a + b, 0) / workTotals.length : null;
  const avgDayOff = offTotals.length ? offTotals.reduce((a, b) => a + b, 0) / offTotals.length : null;
  const monthEntries = db.entries.filter((e) => monthKeyOf(e.date) === monthKey);
  const totalPushups = monthEntries.reduce((sum, e) => sum + e.count, 0);
  const bestSet = monthEntries.length ? Math.max(...monthEntries.map((e) => e.count)) : 0;
  let bestDay = null, bestDayTotal = -1;
  dates.forEach((ds) => { const total = totalForDate(db, ds); if (total > bestDayTotal) { bestDayTotal = total; bestDay = ds; } });
  if (bestDayTotal <= 0) bestDay = null;
  const badgesUnlockedCount = Object.values(db.badges).filter((b) => b && b.unlockedDate && monthKeyOf(b.unlockedDate) === monthKey).length;
  return {
    monthKey, trophyCounts, moodCounts, firstPhoto, lastPhoto, daysWithoutDrugs, daysWithoutCaffeine, daysWithoutAlcool, daysWalked, situpsMinimum, customHabitCounts,
    avgSetSize: Math.round(avgSetSize * 10) / 10,
    avgSetSizePrevMonth: Math.round(avgSetSizePrevMonth * 10) / 10,
    avgWorkDay: avgWorkDay !== null ? Math.round(avgWorkDay * 10) / 10 : null,
    avgDayOff: avgDayOff !== null ? Math.round(avgDayOff * 10) / 10 : null,
    totalPushups, bestSet, bestDay,
    bestDayTotal: bestDayTotal > 0 ? bestDayTotal : 0,
    badgesUnlockedCount,
  };
}

// ---------- Day payload ----------

function specialDayBadgeInfo(db, date) {
  const md = date.slice(5);
  let def = null;
  if (md === '12-25') def = { id: 'cadeau-noel', target: 250 };
  else if (md === '01-01') def = { id: 'resolution-nouvel-an', target: 100 };
  if (!def) return null;
  return { id: def.id, target: def.target, unlocked: !!db.badges[def.id] };
}

function dayPayload(db, date) {
  const entries = db.entries.filter((e) => e.date === date).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const notes = db.notes.filter((n) => n.date === date).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const total = totalForDate(db, date);
  const goal = goalForDate(db, date);
  let trophy = trophyForTotal(total, goal);
  if (isPlatinumCompletionDate(db, date)) trophy = 'platine';
  const weekTotal = weekDatesFor(date).reduce((sum, d) => sum + totalForDate(db, d), 0);
  return {
    date, entries, total, goal, trophy, notes,
    photos: db.photos[date] || [],
    habits: habitsForDate(db, date),
    badges: badgesUnlockedForDate(db, date),
    weekTotal,
    totalPhotosEver: allPhotosSorted(db).length,
    isBestWeekdayEver: isBestWeekdayEver(db, date),
    isFirstEverDay: (() => { const first = earliestAnyDataDate(db); return !first || first === date; })(),
    specialDayBadge: specialDayBadgeInfo(db, date),
  };
}

function sanitizeMoods(moods) {
  if (!Array.isArray(moods)) return [];
  return moods.filter((m) => VALID_MOODS.includes(m));
}

// ---------- Photo blob storage (IndexedDB) ----------

const PHOTO_DB_NAME = 'trackpush_photos';
let _photoDbPromise = null;
function openPhotoDB() {
  if (_photoDbPromise) return _photoDbPromise;
  _photoDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(PHOTO_DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('photos'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _photoDbPromise;
}
async function savePhotoBlob(filename, dataUrl) {
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').put(dataUrl, filename);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function getPhotoBlob(filename) {
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const req = tx.objectStore('photos').get(filename);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function deletePhotoBlob(filename) {
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').delete(filename);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Export / Import ----------

async function exportAllData() {
  const db = loadDB();
  const photos = allPhotosSorted(db);
  const photoBlobs = {};
  for (const p of photos) {
    const dataUrl = await getPhotoBlob(p.filename);
    if (dataUrl) photoBlobs[p.filename] = dataUrl;
  }
  return { exportedAt: new Date().toISOString(), db, photoBlobs };
}

// Restaure une sauvegarde (fichier exporté par exportAllData ou par /api/export
// côté serveur — même forme : { db, photoBlobs }). Remplace complètement les
// données locales actuelles ; l'appelant doit confirmer avec l'utilisateur avant.
async function importAllData(payload) {
  if (!payload || !payload.db) throw new Error('fichier de sauvegarde invalide');
  saveDB(payload.db);
  if (payload.photoBlobs) {
    for (const [filename, dataUrl] of Object.entries(payload.photoBlobs)) {
      await savePhotoBlob(filename, dataUrl);
    }
  }
}
