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
  return new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const HABIT_KEYS = ['cannabis', 'cafe', 'creatine', 'marche', 'journeeTravail', 'journeeConge'];
const VALID_MOODS = ['energique', 'calme', 'fatigue', 'epuise', 'stresse', 'anxieux', 'embrouille', 'concentre', 'emotionnel', 'colere', 'motive'];

const RANKS = [
  { name: 'Débutant', min: 0, max: 1999, goal: 100 },
  { name: 'Discipliné', min: 2000, max: 4999, goal: 120 },
  { name: 'Professionnel', min: 5000, max: 9999, goal: 150 },
  { name: 'Élite', min: 10000, max: 19999, goal: 170 },
  { name: 'Légende', min: 20000, max: 35999, goal: 190 },
  { name: 'Imbattable', min: 36000, max: 72999, goal: 220 },
  { name: 'Immortel', min: 73000, max: Infinity, goal: 250 },
];

// ---------- DB load/save ----------

function freshDB() {
  return {
    settings: { goalMode: 'auto', manualGoal: 100, accentColor: '#FFC800', habitOrder: [...HABIT_KEYS], language: 'fr', timeFormat: '24h' },
    entries: [],
    notes: [],
    photos: {},
    goalSnapshots: {},
    habits: {},
    monthlySummaryAcknowledged: null,
    badges: {},
  };
}

let _db = null;

function loadDB() {
  if (_db) return _db;
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
  if (db.settings.goalMode === undefined) {
    db.settings.manualGoal = db.settings.goal || 100;
    db.settings.goalMode = 'auto';
    delete db.settings.goal;
  }
  if (!Array.isArray(db.settings.habitOrder) || db.settings.habitOrder.length !== HABIT_KEYS.length || !HABIT_KEYS.every((k) => db.settings.habitOrder.includes(k))) {
    const existing = Array.isArray(db.settings.habitOrder) ? db.settings.habitOrder.filter((k) => HABIT_KEYS.includes(k)) : [];
    const missing = HABIT_KEYS.filter((k) => !existing.includes(k));
    db.settings.habitOrder = [...existing, ...missing];
  }
  if (!db.photos) db.photos = {};
  for (const [date, val] of Object.entries(db.photos)) {
    if (typeof val === 'string') db.photos[date] = [{ filename: val, uploadedAt: new Date().toISOString() }];
  }
  if (!db.habits) db.habits = {};
  if (db.monthlySummaryAcknowledged === undefined) db.monthlySummaryAcknowledged = null;
  if (!db.badges) db.badges = {};

  _db = db;
  return _db;
}

function saveDB(db) {
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

function cleanDaysCount(db, key) {
  const floorStr = earliestHabitDate(db);
  if (!floorStr) return 0;
  const today = new Date(todayStr() + 'T00:00:00');
  let cursor = new Date(floorStr + 'T00:00:00');
  let count = 0;
  while (cursor < today) {
    const ds = cursor.toLocaleDateString('en-CA');
    const h = db.habits[ds];
    if (!(h && h[key])) count++;
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

function safeGoalForDate(db, date) {
  return db.goalSnapshots[date] || db.settings.manualGoal || 100;
}

function totalForDate(db, date) {
  return db.entries.filter((e) => e.date === date).reduce((sum, e) => sum + e.count, 0);
}

function isPlatinumWeek(db, anyDateInWeek) {
  const dates = weekDatesFor(anyDateInWeek);
  return dates.every((date) => {
    const goal = safeGoalForDate(db, date);
    const total = totalForDate(db, date);
    return goal > 0 && total >= goal;
  });
}

function countPlatinumWeeks(db) {
  const datesWithEntries = [...new Set(db.entries.map((e) => e.date))];
  const weekStarts = new Set(datesWithEntries.map((d) => weekDatesFor(d)[0]));
  return [...weekStarts].filter((ws) => isPlatinumWeek(db, ws)).length;
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

function computeXP(db) {
  const totalPushups = db.entries.reduce((sum, e) => sum + e.count, 0);
  const cleanCannabisDays = cleanDaysCount(db, 'cannabis');
  const cleanCafeDays = cleanDaysCount(db, 'cafe');
  const marcheDays = countTrueDays(db, 'marche');
  const platinumWeeks = countPlatinumWeeks(db);
  const badgeXP = badgeBonusXP(db);
  const xp = totalPushups * 1 + cleanCannabisDays * 20 + cleanCafeDays * 10 + marcheDays * 15 + platinumWeeks * 50 + badgeXP;
  return { xp, totalPushups, cleanCannabisDays, cleanCafeDays, marcheDays, platinumWeeks, badgeXP };
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
    if (h && h[key]) break;
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
  const datesWithEntries = [...new Set(db.entries.map((e) => e.date))].sort();
  const weekStarts = [...new Set(datesWithEntries.map((d) => weekDatesFor(d)[0]))].sort();
  for (const ws of weekStarts) if (isPlatinumWeek(db, ws)) return weekDatesFor(ws)[6];
  return null;
}
function nthDisciplinedDayDate(db, n) {
  const datesWithEntries = [...new Set(db.entries.map((e) => e.date))].sort();
  const qualifying = datesWithEntries.filter((d) => {
    const total = totalForDate(db, d), goal = goalForDate(db, d);
    return goal > 0 && total >= goal;
  });
  return qualifying.length >= n ? qualifying[n - 1] : null;
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
function firstDateOfConsecutiveDailyMin(db, minPerDay, consecutiveDays) {
  const datesWithEntries = [...new Set(db.entries.map((e) => e.date))];
  if (!datesWithEntries.length) return null;
  const floorStr = datesWithEntries.sort()[0];
  let cursor = new Date(floorStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  let run = 0;
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    if (totalForDate(db, ds) >= minPerDay) { run++; if (run >= consecutiveDays) return ds; } else run = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
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

function simulateXPTimeline(db) {
  const entryDates = db.entries.map((e) => e.date);
  const minEntryDate = entryDates.length ? entryDates.sort()[0] : null;
  const habitFloorStr = earliestHabitDate(db);
  const candidates = [habitFloorStr, minEntryDate].filter(Boolean);
  if (!candidates.length) return [];
  const floorStr = candidates.sort()[0];
  let cursor = new Date(floorStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  let cumulative = 0;
  const timeline = [];
  const todayStrVal = todayStr();
  while (cursor <= today) {
    const ds = cursor.toLocaleDateString('en-CA');
    cumulative += totalForDate(db, ds);
    if (habitFloorStr && ds >= habitFloorStr) {
      const h = db.habits[ds];
      if (ds !== todayStrVal) {
        if (!(h && h.cannabis)) cumulative += 20;
        if (!(h && h.cafe)) cumulative += 10;
      }
      if (h && h.marche) cumulative += 15;
    }
    if (cursor.getDay() === 6 && isPlatinumWeek(db, ds)) cumulative += 50;
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

const BADGES = [
  { id: 'rank-discipline', name: 'Rang Discipliné', desc: 'Atteindre le rang Discipliné', xp: Math.round(RANKS[1].min * 0.01), icon: '⭐', check: (db) => firstDateReachingXP(db, RANKS[1].min) },
  { id: 'rank-pro', name: 'Rang Professionnel', desc: 'Atteindre le rang Professionnel', xp: Math.round(RANKS[2].min * 0.01), icon: '⭐', check: (db) => firstDateReachingXP(db, RANKS[2].min) },
  { id: 'rank-elite', name: 'Rang Élite', desc: 'Atteindre le rang Élite', xp: Math.round(RANKS[3].min * 0.01), icon: '⭐', check: (db) => firstDateReachingXP(db, RANKS[3].min) },
  { id: 'rank-legende', name: 'Rang Légende', desc: 'Atteindre le rang Légende', xp: Math.round(RANKS[4].min * 0.01), icon: '⭐', check: (db) => firstDateReachingXP(db, RANKS[4].min) },
  { id: 'rank-imbattable', name: 'Rang Imbattable', desc: 'Atteindre le rang Imbattable', xp: Math.round(RANKS[5].min * 0.01), icon: '⭐', check: (db) => firstDateReachingXP(db, RANKS[5].min) },
  { id: 'rank-immortel', name: 'Rang Immortel', desc: 'Atteindre le rang Immortel', xp: Math.round(RANKS[6].min * 0.01), icon: '⭐', check: (db) => firstDateReachingXP(db, RANKS[6].min) },
  { id: 'decafeine', name: 'Décaféiné!', desc: '1 mois complet (30 jours consécutifs) sans caféine', xp: 150, icon: '☕', check: (db) => firstDateStreakReaches(db, 'cafe', 30) },
  { id: 'clarte', name: "Clarté d'esprit", desc: '1 mois complet (30 jours consécutifs) sans drogue', xp: 300, icon: '🧠', check: (db) => firstDateStreakReaches(db, 'cannabis', 30) },
  { id: 'consistance', name: 'La consistance porte fruits', desc: '50 push-ups en une seule série', xp: 75, icon: '💪', check: (db) => firstEntryDateWithMinCount(db, 50) },
  { id: 'force-tot', name: 'Force-tôt!', desc: '150 push-ups entre 6h et midi, dans la même journée', xp: 75, icon: '🌅', check: (db) => firstDateWithMorningTotal(db, 150) },
  { id: 'cadeau-noel', name: 'Un gros cadeau pour les pectoraux', desc: '250 push-ups le 25 décembre', xp: 250, icon: '🎄', check: (db) => dec25DateReaching(db, 250) },
  { id: 'brillant', name: 'Brillant!', desc: 'Première semaine parfaite (trophée Platine)', xp: 100, icon: '💎', check: (db) => firstPlatinumWeekDate(db) },
  { id: 'motivation100', name: '100 Motivation?', desc: '100 jours de discipline (trophée Or ou mieux)', xp: 300, icon: '🥇', check: (db) => nthDisciplinedDayDate(db, 100) },
  { id: 'top-modele', name: 'Top modèle', desc: '30 photos ajoutées au total', xp: 50, icon: '📸', check: (db) => firstDateAtNthPhoto(db, 30) },
  { id: 'oiseau-nuit', name: 'Oiseau de nuit', desc: '50 push-ups entre minuit et 4h du matin, dans la même nuit', xp: 200, icon: '🦉', secret: true, check: (db) => firstDateWithHourRangeTotal(db, 50, 0, 4) },
  { id: 'resolution-nouvel-an', name: 'Résolution du Nouvel An', desc: '100 push-ups le 1er janvier', xp: 300, icon: '🎉', secret: true, check: (db) => firstDateMonthDayReaching(db, '01-01', 100) },
  { id: 'mille-en-cinq', name: '1000 en 5', desc: 'Au moins 200 push-ups par jour, 5 jours consécutifs', xp: 300, icon: '🔥', secret: true, check: (db) => firstDateOfConsecutiveDailyMin(db, 200, 5) },
  { id: 'semaine-promenades', name: 'Semaine de promenades', desc: "Marche à l'extérieur, 7 jours consécutifs", xp: 300, icon: '🚶', secret: true, check: (db) => firstDateTrueStreakReaches(db, 'marche', 7) },
  { id: 'je-note', name: 'Je NOTE!', desc: '100 notes ajoutées au total', xp: 150, icon: '📝', secret: true, check: (db) => firstDateAtNthNote(db, 100) },
];

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
    const dow = new Date(ds + 'T00:00:00').getDay();
    if (dow === 6 && isPlatinumWeek(db, ds)) trophy = 'platine';
    if (trophy) trophyCounts[trophy]++;
  });
  const moodCounts = {};
  db.notes.filter((n) => monthKeyOf(n.date) === monthKey).forEach((n) => {
    (n.moods || []).forEach((m) => { moodCounts[m] = (moodCounts[m] || 0) + 1; });
  });
  const photos = allPhotosSorted(db);
  const firstPhoto = photos.length ? photos[0] : null;
  const lastPhoto = photos.length ? photos[photos.length - 1] : null;
  const habitFloor = earliestHabitDate(db);
  let daysWithoutDrugs = 0, daysWithoutCaffeine = 0;
  if (habitFloor) {
    dates.forEach((ds) => {
      if (ds < habitFloor) return;
      const h = db.habits[ds];
      if (!(h && h.cannabis)) daysWithoutDrugs++;
      if (!(h && h.cafe)) daysWithoutCaffeine++;
    });
  }
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
    monthKey, trophyCounts, moodCounts, firstPhoto, lastPhoto, daysWithoutDrugs, daysWithoutCaffeine,
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

function dayPayload(db, date) {
  const entries = db.entries.filter((e) => e.date === date).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const notes = db.notes.filter((n) => n.date === date).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const total = totalForDate(db, date);
  const goal = goalForDate(db, date);
  let trophy = trophyForTotal(total, goal);
  const dow = new Date(date + 'T00:00:00').getDay();
  if (dow === 6 && isPlatinumWeek(db, date)) trophy = 'platine';
  return {
    date, entries, total, goal, trophy, notes,
    photos: db.photos[date] || [],
    habits: habitsForDate(db, date),
    badges: badgesUnlockedForDate(db, date),
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
async function importAllData(payload) {
  if (!payload || !payload.db) throw new Error('Fichier invalide');
  saveDB(payload.db);
  if (payload.photoBlobs) {
    for (const [filename, dataUrl] of Object.entries(payload.photoBlobs)) {
      await savePhotoBlob(filename, dataUrl);
    }
  }
}
