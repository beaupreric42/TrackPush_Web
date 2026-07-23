// ============================================================
// TrackPush — Local API dispatcher
// Mirrors server.js's Express routes exactly, so app.js's
// existing api(path, opts) calls can be redirected here with
// zero changes to its rendering/UI logic.
// ============================================================

async function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function localApi(path, opts) {
  opts = opts || {};
  const method = (opts.method || 'GET').toUpperCase();
  const body = opts.body ? JSON.parse(opts.body) : {};
  const db = loadDB();

  // ---- Settings ----
  if (path === '/api/settings' && method === 'GET') {
    return { ...db.settings, goal: currentGoal(db), today: todayStr() };
  }
  if (path === '/api/settings' && method === 'PUT') {
    if (body.goalMode !== undefined) {
      if (!['auto', 'manual'].includes(body.goalMode)) throw new Error('mode invalide');
      db.settings.goalMode = body.goalMode;
    }
    if (body.manualGoal !== undefined) {
      const goal = parseInt(body.manualGoal, 10);
      if (!Number.isFinite(goal) || goal <= 0) throw new Error('objectif invalide');
      db.settings.manualGoal = goal;
    }
    if (body.accentColor !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(body.accentColor)) throw new Error('couleur invalide');
      db.settings.accentColor = body.accentColor;
    }
    if (body.habitOrder !== undefined) {
      const order = body.habitOrder;
      const orderableIds = [...HABIT_KEYS, ...(db.customHabits || []).map((c) => c.id)];
      const isValid = Array.isArray(order) && order.length === orderableIds.length && orderableIds.every((k) => order.includes(k));
      if (!isValid) throw new Error('ordre invalide');
      db.settings.habitOrder = order;
    }
    if (body.language !== undefined) {
      if (!['fr', 'en'].includes(body.language)) throw new Error('langue invalide');
      db.settings.language = body.language;
    }
    if (body.timeFormat !== undefined) {
      if (!['24h', '12h'].includes(body.timeFormat)) throw new Error('format invalide');
      db.settings.timeFormat = body.timeFormat;
    }
    if (body.soundEnabled !== undefined) {
      db.settings.soundEnabled = !!body.soundEnabled;
    }
    saveDB(db);
    return { ...db.settings, goal: currentGoal(db) };
  }

  if (path === '/api/ranks' && method === 'GET') {
    return { ranks: RANKS.map((r) => ({ name: r.name, min: r.min, max: r.max === Infinity ? null : r.max, goal: r.goal })) };
  }

  if (path === '/api/xp' && method === 'GET') {
    const { xp } = computeXP(db);
    const rank = rankForXP(xp);
    const idx = rankIndex(rank);
    const isMaxRank = rank.max === Infinity;
    const progressPct = isMaxRank ? 100 : Math.min(100, ((xp - rank.min) / (rank.max + 1 - rank.min)) * 100);
    return {
      xp, rankName: rank.name, rankIndex: idx, rankMin: rank.min,
      rankMax: isMaxRank ? null : rank.max,
      nextRankName: isMaxRank ? null : RANKS[idx + 1].name,
      progressPct, isMaxRank, goal: currentGoal(db), goalMode: db.settings.goalMode,
    };
  }

  if (path === '/api/today' && method === 'GET') {
    return { date: todayStr() };
  }

  // ---- Day / month ----
  let m;
  if ((m = path.match(/^\/api\/day\/([\d-]+)$/)) && method === 'GET') {
    return dayPayload(db, m[1]);
  }
  if ((m = path.match(/^\/api\/month\/([\d-]+)$/)) && method === 'GET') {
    const [y, mo] = m[1].split('-').map(Number);
    const daysInMonth = new Date(y, mo, 0).getDate();
    const days = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const total = totalForDate(db, date);
      const goal = goalForDate(db, date);
      let trophy = trophyForTotal(total, goal);
      const dow = new Date(date + 'T00:00:00').getDay();
      const weekIsPlatinum = isPlatinumWeek(db, date);
      if (dow === 6 && weekIsPlatinum) trophy = 'platine';
      const h = habitsForDate(db, date);
      days[date] = {
        total, goal, trophy,
        inPlatinumWeek: weekIsPlatinum,
        hasNote: db.notes.some((n) => n.date === date),
        hasPhoto: (db.photos[date] || []).length > 0,
        hasHabit: HABIT_KEYS.some((k) => h[k]),
        hasBadge: badgesUnlockedForDate(db, date).length > 0,
      };
    }
    return { days, goal: currentGoal(db) };
  }

  if (path === '/api/streaks' && method === 'GET') {
    return { cannabis: streakDays(db, 'cannabis'), cafe: streakDays(db, 'cafe') };
  }

  if (path === '/api/trend' && method === 'GET') {
    const days = 30;
    const today = new Date(todayStr() + 'T00:00:00');
    const points = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toLocaleDateString('en-CA');
      const total = totalForDate(db, ds);
      const goal = goalForDate(db, ds);
      let trophy = trophyForTotal(total, goal);
      if (d.getDay() === 6 && isPlatinumWeek(db, ds)) trophy = 'platine';
      points.push({ date: ds, total, goal, trophy });
    }
    return { points };
  }

  if (path === '/api/personal-records' && method === 'GET') {
    return {
      bestSet: bestSetRecord(db),
      bestDay: bestDayRecord(db),
      bestWeek: bestWeekRecord(db),
      bestMonth: bestMonthRecord(db),
      bestStreakCannabis: bestStreak(db, 'cannabis'),
      bestStreakCafe: bestStreak(db, 'cafe'),
      bestStreakMarche: bestTrueStreak(db, 'marche'),
      longestPlatinumStreak: longestPlatinumStreak(db),
    };
  }

  if (path === '/api/stats' && method === 'GET') {
    const totalPushups = db.entries.reduce((sum, e) => sum + e.count, 0);
    const datesWithEntries = [...new Set(db.entries.map((e) => e.date))];
    const disciplinedDays = datesWithEntries.filter((d) => {
      const total = totalForDate(db, d), goal = goalForDate(db, d);
      return goal > 0 && total >= goal;
    }).length;
    const disciplinedWeeks = countPlatinumWeeks(db);
    const totalPhotos = Object.values(db.photos).reduce((sum, arr) => sum + arr.length, 0);
    const totalNotes = db.notes.length;
    const startDate = datesWithEntries.length ? datesWithEntries.sort()[0] : null;
    return {
      totalPushups, bestStreakCannabis: bestStreak(db, 'cannabis'), bestStreakCafe: bestStreak(db, 'cafe'),
      bestStreakMarche: bestTrueStreak(db, 'marche'), disciplinedDays, disciplinedWeeks, totalPhotos, totalNotes, startDate,
    };
  }

  // ---- Entries ----
  if (path === '/api/entries' && method === 'POST') {
    const date = body.date || todayStr();
    const count = parseInt(body.count, 10);
    if (!Number.isFinite(count) || count <= 0) throw new Error('nombre invalide');
    ensureGoalSnapshot(db, date);
    const prevTotal = totalForDate(db, date);
    const prevGoal = goalForDate(db, date);
    const prevTrophy = trophyForTotal(prevTotal, prevGoal);
    const entry = { id: uuid(), date, time: date === todayStr() ? nowTimeStr() : '00:00', count, createdAt: new Date().toISOString() };
    db.entries.push(entry);
    const newlyUnlockedBadges = checkAndUnlockBadges(db);
    saveDB(db);
    const payload = dayPayload(db, date);
    payload.trophyJustUnlocked = prevTrophy !== payload.trophy && payload.trophy !== null;
    payload.newlyUnlockedBadges = newlyUnlockedBadges;
    return payload;
  }
  if ((m = path.match(/^\/api\/entries\/([\w-]+)$/)) && method === 'DELETE') {
    const entry = db.entries.find((e) => e.id === m[1]);
    if (!entry) throw new Error('introuvable');
    db.entries = db.entries.filter((e) => e.id !== m[1]);
    relockStaleBadges(db);
    saveDB(db);
    return dayPayload(db, entry.date);
  }

  // ---- Notes ----
  if ((m = path.match(/^\/api\/notes\/([\d-]+)$/)) && method === 'POST') {
    const date = m[1];
    const text = (body.text || '').trim().slice(0, 2000);
    if (!text) throw new Error('note vide');
    const now = new Date().toISOString();
    const note = { id: uuid(), date, time: date === todayStr() ? nowTimeStr() : '00:00', text, moods: sanitizeMoods(body.moods), createdAt: now, updatedAt: now };
    db.notes.push(note);
    saveDB(db);
    return dayPayload(db, date);
  }
  if ((m = path.match(/^\/api\/notes\/([\d-]+)\/([\w-]+)$/)) && method === 'PUT') {
    const [, date, id] = m;
    const note = db.notes.find((n) => n.id === id && n.date === date);
    if (!note) throw new Error('introuvable');
    const text = (body.text || '').trim().slice(0, 2000);
    if (!text) throw new Error('note vide');
    note.text = text;
    if (body.moods !== undefined) note.moods = sanitizeMoods(body.moods);
    note.updatedAt = new Date().toISOString();
    saveDB(db);
    return dayPayload(db, date);
  }
  if ((m = path.match(/^\/api\/notes\/([\d-]+)\/([\w-]+)$/)) && method === 'DELETE') {
    const [, date, id] = m;
    const exists = db.notes.some((n) => n.id === id && n.date === date);
    if (!exists) throw new Error('introuvable');
    db.notes = db.notes.filter((n) => n.id !== id);
    saveDB(db);
    return dayPayload(db, date);
  }

  // ---- Habits ----
  if ((m = path.match(/^\/api\/habits\/([\d-]+)$/)) && method === 'PUT') {
    const date = m[1];
    const current = habitsForDate(db, date);
    const updated = {};
    const allKeys = [...HABIT_KEYS, ...(db.customHabits || []).map((c) => c.id)];
    allKeys.forEach((k) => { updated[k] = body[k] !== undefined ? !!body[k] : current[k]; });
    db.habits[date] = updated;
    relockStaleBadges(db);
    const newlyUnlockedBadges = checkAndUnlockBadges(db);
    saveDB(db);
    const payload = dayPayload(db, date);
    payload.newlyUnlockedBadges = newlyUnlockedBadges;
    return payload;
  }

  if (path === '/api/custom-habits' && method === 'GET') {
    return { customHabits: db.customHabits || [] };
  }
  if (path === '/api/custom-habits' && method === 'POST') {
    const name = (body.name || '').trim().slice(0, 40);
    if (!name) throw new Error('nom requis');
    const icon = (body.icon || '').trim().slice(0, 4);
    const habit = { id: 'custom_' + uuid(), name, icon };
    if (!db.customHabits) db.customHabits = [];
    db.customHabits.push(habit);
    healHabitOrder(db);
    saveDB(db);
    return { customHabits: db.customHabits, habitOrder: db.settings.habitOrder };
  }
  if ((m = path.match(/^\/api\/custom-habits\/([\w-]+)$/)) && method === 'DELETE') {
    db.customHabits = (db.customHabits || []).filter((c) => c.id !== m[1]);
    healHabitOrder(db);
    saveDB(db);
    return { customHabits: db.customHabits, habitOrder: db.settings.habitOrder };
  }

  // ---- Photos ----
  if ((m = path.match(/^\/api\/photos\/([\d-]+)$/)) && method === 'POST') {
    const date = m[1];
    const file = opts.file;
    if (!file) throw new Error('aucune photo recue');
    const dataUrl = await readFileAsDataURL(file);
    const ext = (file.name.match(/\.\w+$/) || ['.jpg'])[0];
    const filename = `${date}-${uuid()}${ext}`;
    await savePhotoBlob(filename, dataUrl);
    if (!db.photos[date]) db.photos[date] = [];
    db.photos[date].push({ filename, uploadedAt: new Date().toISOString() });
    saveDB(db);
    return dayPayload(db, date);
  }
  if ((m = path.match(/^\/api\/photos\/([\d-]+)\/(.+)$/)) && method === 'DELETE') {
    const [, date, filename] = m;
    const list = db.photos[date] || [];
    const found = list.find((p) => p.filename === filename);
    if (!found) throw new Error('introuvable');
    db.photos[date] = list.filter((p) => p.filename !== filename);
    await deletePhotoBlob(filename);
    saveDB(db);
    return dayPayload(db, date);
  }

  // ---- Badges ----
  if (path === '/api/badges' && method === 'GET') {
    checkAndUnlockBadges(db);
    saveDB(db);
    return {
      badges: BADGES.map((b) => {
        const unlocked = db.badges[b.id];
        const isSecretLocked = b.secret && !unlocked;
        return {
          id: b.id, name: b.name, desc: isSecretLocked ? null : b.desc, xp: b.xp, icon: b.icon,
          secret: !!b.secret, unlocked: !!unlocked, unlockedDate: unlocked ? unlocked.unlockedDate : null,
        };
      }),
    };
  }

  // ---- Monthly summary ----
  if (path === '/api/monthly-summary' && method === 'GET') {
    const startDate = earliestAnyDataDate(db);
    const currentMonthKey = todayStr().slice(0, 7);
    const prevMonthKey = previousMonthKey(currentMonthKey);
    if (!startDate || monthKeyOf(startDate) >= currentMonthKey) {
      const nMonthKey = nextMonthKey(currentMonthKey);
      const [ny, nm] = nMonthKey.split('-').map(Number);
      return { available: false, nextAvailableMonthKey: nMonthKey, nextAvailableMonthIndex: nm - 1, nextAvailableYear: ny };
    }
    const summary = computeMonthlySummary(db, prevMonthKey);
    const shouldPopup = db.monthlySummaryAcknowledged !== prevMonthKey;
    return { available: true, shouldPopup, summary };
  }
  if (path === '/api/monthly-summary/acknowledge' && method === 'POST') {
    const currentMonthKey = todayStr().slice(0, 7);
    db.monthlySummaryAcknowledged = previousMonthKey(currentMonthKey);
    saveDB(db);
    return { ok: true };
  }

  throw new Error(`Route locale inconnue: ${method} ${path}`);
}
