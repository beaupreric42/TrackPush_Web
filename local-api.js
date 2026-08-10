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
    reconcileXPLog(db);
    saveDB(db);
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

  if (path === '/api/xp-log' && method === 'GET') {
    reconcileXPLog(db);
    saveDB(db);
    const log = (db.xpLog || []).slice().reverse();
    return { log };
  }

  if (path === '/api/today' && method === 'GET') {
    return { date: todayStr() };
  }

  // ---- Day / month ----
  let m;
  if ((m = path.match(/^\/api\/day\/(today|[\d-]+)$/)) && method === 'GET') {
    const date = m[1] === 'today' ? todayStr() : m[1];
    return dayPayload(db, date);
  }
  if ((m = path.match(/^\/api\/month\/([\d-]+)$/)) && method === 'GET') {
    const [y, mo] = m[1].split('-').map(Number);
    const daysInMonth = new Date(y, mo, 0).getDate();
    const platinumDates = datesInPlatinumWeeks(db, todayStr());
    const days = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const total = totalForDate(db, date);
      const goal = goalForDate(db, date);
      const trophy = trophyForTotal(total, goal);
      const h = habitsForDate(db, date);
      days[date] = {
        total, goal, trophy,
        inPlatinumWeek: platinumDates.has(date),
        hasNote: db.notes.some((n) => n.date === date),
        hasPhoto: (db.photos[date] || []).length > 0,
        hasHabit: HABIT_KEYS.some((k) => h[k]),
        hasBadge: badgesUnlockedForDate(db, date).length > 0,
      };
    }
    return { days, goal: currentGoal(db) };
  }

  if (path === '/api/streaks' && method === 'GET') {
    return { cannabis: streakDays(db, 'cannabis'), cafe: streakDays(db, 'cafe'), alcool: streakDays(db, 'alcool') };
  }

  if (path === '/api/trend' && method === 'GET') {
    const days = 30;
    const today = new Date(todayStr() + 'T00:00:00');
    const todayStrVal = todayStr();
    const platinumCompletions = new Set(platinumWeekInfo(db, todayStrVal).completions);
    const points = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toLocaleDateString('en-CA');
      const total = totalForDate(db, ds);
      const goal = goalForDate(db, ds);
      let trophy = trophyForTotal(total, goal);
      if (platinumCompletions.has(ds)) trophy = 'platine';
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
      bestStreakAlcool: bestStreak(db, 'alcool'),
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
    const daysSinceStart = startDate ? Math.floor((new Date(todayStr() + 'T00:00:00') - new Date(startDate + 'T00:00:00')) / 86400000) + 1 : 0;
    const avgPerDay = daysSinceStart > 0 ? Math.round(totalPushups / daysSinceStart) : 0;
    return {
      totalPushups, bestStreakCannabis: bestStreak(db, 'cannabis'), bestStreakCafe: bestStreak(db, 'cafe'), bestStreakAlcool: bestStreak(db, 'alcool'),
      bestStreakMarche: bestTrueStreak(db, 'marche'), disciplinedDays, disciplinedWeeks, totalPhotos, totalNotes, startDate, avgPerDay,
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

    if (db.activeBoosts && db.activeBoosts.amuletteEndsAt && new Date(db.activeBoosts.amuletteEndsAt) > new Date()) {
      entry.bonusXP = Math.round(count * (db.activeBoosts.amuletteMult - 1));
    }

    db.entries.push(entry);
    pushXPLog(db, date, entry.bonusXP ? 'pushups_amulette' : 'pushups', count + (entry.bonusXP || 0), `${count} push-ups`, entry.id);
    logTrophyProgressForDate(db, date);

    const drops = attemptItemDrop(db, entry);
    const droppedItemsPayload = [];
    drops.forEach((drop) => {
      if (drop.mythic) {
        db.mythicDiscovered[drop.itemId] = { date, sourceEntryId: entry.id };
        const mythicDef = MYTHIC_ITEMS.find((m) => m.id === drop.itemId);
        if (mythicDef.id === 'fragment_eternite') {
          db.bonusXP = (db.bonusXP || 0) + mythicDef.xp;
          pushXPLog(db, date, 'item', mythicDef.xp, 'Fragment d\'Éternité', entry.id);
        } else if (mythicDef.cosmetic) {
          if (!db.mythicActiveStates) db.mythicActiveStates = {};
          db.mythicActiveStates[drop.itemId] = false;
        }
        droppedItemsPayload.push({ itemId: drop.itemId, rarity: 'mythique', mythic: true, details: mythicDef.id === 'fragment_eternite' ? { xp: mythicDef.xp } : {} });
      } else {
        const isFirstEver = !db.itemDiscoveries[drop.itemId];
        if (isFirstEver) db.itemDiscoveries[drop.itemId] = { firstDate: date, firstSourceEntryId: entry.id };
        if (drop.rarity === 'legendaire' && !db.firstLegendaryFound) {
          db.firstLegendaryFound = { date, sourceEntryId: entry.id };
        }
        db.inventory.push({ id: uuid(), itemId: drop.itemId, rarity: drop.rarity, sourceEntryId: entry.id, foundAt: new Date().toISOString() });
        const itemDef = ITEMS.find((i) => i.id === drop.itemId);
        droppedItemsPayload.push({ itemId: drop.itemId, rarity: drop.rarity, mythic: false, firstDiscovery: isFirstEver, details: itemDef.rarities[drop.rarity] });
      }
    });
    if (droppedItemsPayload.length) entry.itemDrops = droppedItemsPayload;

    refreshAutoGoalIfRankChanged(db, date);
    const newlyUnlockedBadges = checkAndUnlockBadges(db);
    const dayResult = dayPayload(db, date);
    let platinumJustShown = false;
    if (dayResult.trophy === 'platine') {
      if (!db.platinumShownDates) db.platinumShownDates = [];
      if (!db.platinumShownDates.includes(date)) {
        db.platinumShownDates.push(date);
        platinumJustShown = true;
      }
    }
    saveDB(db);
    const payload = dayResult;
    payload.trophyJustUnlocked = prevTrophy !== payload.trophy && payload.trophy !== null && !(payload.trophy === 'platine' && !platinumJustShown);
    payload.platinumJustShown = platinumJustShown;
    payload.newlyUnlockedBadges = newlyUnlockedBadges;
    payload.itemDrops = droppedItemsPayload;
    return payload;
  }
  if ((m = path.match(/^\/api\/entries\/([\w-]+)$/)) && method === 'DELETE') {
    const entry = db.entries.find((e) => e.id === m[1]);
    if (!entry) throw new Error('introuvable');

    const drops = entry.itemDrops || (entry.itemDrop ? [entry.itemDrop] : []);
    drops.forEach((drop) => {
      if (drop.mythic) {
        const rec = db.mythicDiscovered[drop.itemId];
        if (rec && rec.sourceEntryId === entry.id) {
          if (drop.itemId === 'fragment_eternite') {
            const mythicDef = MYTHIC_ITEMS.find((m2) => m2.id === 'fragment_eternite');
            db.bonusXP = Math.max(0, (db.bonusXP || 0) - mythicDef.xp);
          } else if (db.mythicActiveStates) {
            delete db.mythicActiveStates[drop.itemId];
          }
          delete db.mythicDiscovered[drop.itemId];
        }
      } else {
        const disc = db.itemDiscoveries[drop.itemId];
        if (disc && disc.firstSourceEntryId === entry.id) {
          delete db.itemDiscoveries[drop.itemId];
        }
        if (db.firstLegendaryFound && db.firstLegendaryFound.sourceEntryId === entry.id) {
          delete db.firstLegendaryFound;
        }
      }
    });
    db.inventory = db.inventory.filter((inst) => inst.sourceEntryId !== entry.id);

    db.entries = db.entries.filter((e) => e.id !== m[1]);
    relockStaleBadges(db);
    if (db.xpLog) {
      db.xpLog = db.xpLog.filter((log) => {
        if (log.sourceId === entry.id) return false;
        if (typeof log.sourceId === 'string' && log.sourceId.startsWith('badge:')) {
          const badgeId = log.sourceId.slice('badge:'.length);
          if (!db.badges[badgeId]) return false;
        }
        return true;
      });
    }
    derelockTrophyProgressForDate(db, entry.date);
    saveDB(db);
    const payload = dayPayload(db, entry.date);
    payload.itemsRemoved = drops;
    return payload;
  }

  // ---- Notes ----
  if ((m = path.match(/^\/api\/notes\/([\d-]+)$/)) && method === 'POST') {
    const date = m[1];
    const text = (body.text || '').trim().slice(0, 2000);
    if (!text) throw new Error('note vide');
    const now = new Date().toISOString();
    const pushupsSoFar = db.entries.filter((e) => e.date === date && e.createdAt <= now).reduce((sum, e) => sum + e.count, 0);
    const note = { id: uuid(), date, time: date === todayStr() ? nowTimeStr() : '00:00', text, moods: sanitizeMoods(body.moods), pushupsAtWrite: pushupsSoFar, createdAt: now, updatedAt: now };
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
    refreshAutoGoalIfRankChanged(db, date);
    relockStaleBadges(db);
    const newlyUnlockedBadges = checkAndUnlockBadges(db);
    logHabitProgressForDate(db, date);
    derelockHabitProgressForDate(db, date);
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
    const newlyUnlockedBadges = checkAndUnlockBadges(db);
    saveDB(db);
    const payload = dayPayload(db, date);
    payload.newlyUnlockedBadges = newlyUnlockedBadges;
    return payload;
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
  // ---- Inventory / Items ----
  if (path === '/api/inventory' && method === 'GET') {
    const items = ITEMS.map((it) => {
      const disc = db.itemDiscoveries[it.id];
      return {
        id: it.id, name: it.name, minRank: it.minRank,
        discovered: !!disc, firstDate: disc ? disc.firstDate : null,
        stock: db.inventory.filter((inst) => inst.itemId === it.id).map((inst) => ({ id: inst.id, rarity: inst.rarity, foundAt: inst.foundAt, details: it.rarities[inst.rarity] })).sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)),
        availableRarities: Object.keys(it.rarities),
        allRarityDetails: it.rarities,
      };
    });
    const mythicItems = MYTHIC_ITEMS.map((it) => {
      const disc = db.mythicDiscovered[it.id];
      return {
        id: it.id, name: it.name, minRank: it.minRank, cosmetic: !!it.cosmetic,
        discovered: !!disc, discoveredDate: disc ? disc.date : null,
        active: it.cosmetic ? !!(db.mythicActiveStates && db.mythicActiveStates[it.id]) : null,
      };
    });
    return { items, mythicItems, activeBoosts: db.activeBoosts, dailyItemEffects: (db.dailyItemEffects && db.dailyItemEffects[todayStr()]) || [], radarPending: !!db.radarPending };
  }

  if ((m = path.match(/^\/api\/inventory\/use\/([\w-]+)$/)) && method === 'POST') {
    const idx = db.inventory.findIndex((inst) => inst.id === m[1]);
    if (idx === -1) throw new Error('introuvable');
    const inst = db.inventory[idx];
    const itemDef = ITEMS.find((it) => it.id === inst.itemId);
    const vals = itemDef.rarities[inst.rarity];
    const force = !!body.force;
    let result;

    if (inst.itemId === 'amulette_xp') {
      if (!force && db.activeBoosts && db.activeBoosts.amuletteEndsAt && new Date(db.activeBoosts.amuletteEndsAt) > new Date()) {
        throw new Error('amulette_deja_active');
      }
      const endsAt = new Date(Date.now() + vals.minutes * 60000).toISOString();
      db.activeBoosts = { ...(db.activeBoosts || {}), amuletteEndsAt: endsAt, amuletteMult: vals.mult, amuletteRarity: inst.rarity };
      result = { effect: 'amulette_xp', mult: vals.mult, minutes: vals.minutes, endsAt };
    } else if (inst.itemId === 'don_xp') {
      db.bonusXP = (db.bonusXP || 0) + vals.xp;
      pushXPLog(db, todayStr(), 'item', vals.xp, 'Don d\'XP');
      result = { effect: 'don_xp', xp: vals.xp };
    } else if (inst.itemId === 'graine_patience') {
      const today = todayStr();
      if (!db.graineUses) db.graineUses = [];
      const existingTodayIdx = db.graineUses.findIndex((u) => u.date === today);
      if (existingTodayIdx !== -1 && !force) {
        throw new Error('graine_deja_active');
      }
      if (existingTodayIdx !== -1) db.graineUses.splice(existingTodayIdx, 1);
      db.graineUses.push({ date: today, mult: vals.mult });
      if (!db.dailyItemEffects) db.dailyItemEffects = {};
      if (!db.dailyItemEffects[today]) db.dailyItemEffects[today] = [];
      if (existingTodayIdx !== -1) db.dailyItemEffects[today] = db.dailyItemEffects[today].filter((e) => e.itemId !== 'graine_patience');
      db.dailyItemEffects[today].push({ itemId: 'graine_patience', rarity: inst.rarity, usedAt: new Date().toISOString() });
      result = { effect: 'graine_patience', mult: vals.mult, deferred: true };
    } else if (inst.itemId === 'plume_legere') {
      const today = todayStr();
      if (!db.plumeUsesToday || db.plumeUsesToday.date !== today) {
        db.plumeUsesToday = { date: today, count: 0 };
      }
      if (db.plumeUsesToday.count >= 2) {
        throw new Error('plume_max_atteint');
      }
      const current = goalForDate(db, today);
      const reduced = Math.max(1, Math.round(current * (1 - vals.reduction)));
      db.goalSnapshots[today] = reduced;
      db.plumeUsesToday.count += 1;
      if (!db.dailyItemEffects) db.dailyItemEffects = {};
      if (!db.dailyItemEffects[today]) db.dailyItemEffects[today] = [];
      db.dailyItemEffects[today] = db.dailyItemEffects[today].filter((e) => e.itemId !== 'plume_legere');
      db.dailyItemEffects[today].push({ itemId: 'plume_legere', rarity: inst.rarity, usedAt: new Date().toISOString() });
      result = { effect: 'plume_legere', newGoal: reduced, usesToday: db.plumeUsesToday.count };
    } else if (inst.itemId === 'talisman_pardon') {
      const key = body.habitKey;
      if (!['cannabis', 'cafe', 'marche'].includes(key)) throw new Error('habitude invalide');
      const targetDate = body.date || todayStr();
      if (!db.protectedHabitDays[key]) db.protectedHabitDays[key] = [];
      if (!db.protectedHabitDays[key].includes(targetDate)) db.protectedHabitDays[key].push(targetDate);
      result = { effect: 'talisman_pardon', habitKey: key, date: targetDate };
    } else if (inst.itemId === 'echo_passe') {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toLocaleDateString('en-CA');
      const eligible = db.notes.filter((n) => n.date <= cutoffStr && n.text);
      if (!eligible.length) throw new Error('aucun souvenir assez ancien');
      const chosen = eligible[Math.floor(Math.random() * eligible.length)];
      const moods = chosen.moods || [];
      const positive = ['motive', 'energique', 'concentre', 'calme', 'fier'];
      const negative = ['fatigue', 'epuise', 'stresse', 'anxieux', 'embrouille', 'emotionnel', 'colere'];
      const hasPositive = moods.some((mm) => positive.includes(mm));
      const hasNegative = moods.some((mm) => negative.includes(mm));
      let framing = 'neutral';
      if (hasPositive && hasNegative) framing = 'mixed';
      else if (hasPositive) framing = 'positive';
      else if (hasNegative) framing = 'negative';
      db.bonusXP = (db.bonusXP || 0) + 20;
      pushXPLog(db, todayStr(), 'item', 20, 'Écho du passé');
      result = { effect: 'echo_passe', note: { date: chosen.date, text: chosen.text, moods }, framing, xp: 20 };
    } else if (inst.itemId === 'detecteur_metal') {
      if (!force && db.activeBoosts && db.activeBoosts.detecteurEndsAt && new Date(db.activeBoosts.detecteurEndsAt) > new Date()) {
        throw new Error('detecteur_deja_actif');
      }
      const endsAt = new Date(Date.now() + vals.minutes * 60000).toISOString();
      db.activeBoosts = { ...(db.activeBoosts || {}), detecteurEndsAt: endsAt, detecteurBonus: vals.boost, detecteurRarity: inst.rarity };
      result = { effect: 'detecteur_metal', boost: vals.boost, minutes: vals.minutes, endsAt };
    } else if (inst.itemId === 'radar_precision') {
      if (!force && db.radarPending) {
        throw new Error('radar_deja_actif');
      }
      db.radarPending = true;
      const today = todayStr();
      if (!db.dailyItemEffects) db.dailyItemEffects = {};
      if (!db.dailyItemEffects[today]) db.dailyItemEffects[today] = [];
      db.dailyItemEffects[today] = db.dailyItemEffects[today].filter((e) => e.itemId !== 'radar_precision');
      db.dailyItemEffects[today].push({ itemId: 'radar_precision', rarity: 'legendaire', usedAt: new Date().toISOString() });
      result = { effect: 'radar_precision' };
    } else {
      throw new Error('effet inconnu');
    }

    db.inventory.splice(idx, 1);
    refreshAutoGoalIfRankChanged(db, todayStr());
    saveDB(db);
    return { ok: true, result, inventory: db.inventory, xp: computeXP(db).xp };
  }

  if ((m = path.match(/^\/api\/inventory\/mythic\/([\w-]+)\/toggle$/)) && method === 'POST') {
    const itemId = m[1];
    const def = MYTHIC_ITEMS.find((it) => it.id === itemId);
    if (!def || !def.cosmetic) throw new Error('objet invalide');
    if (!db.mythicDiscovered[itemId]) throw new Error('pas encore découvert');
    if (!db.mythicActiveStates) db.mythicActiveStates = {};
    db.mythicActiveStates[itemId] = !db.mythicActiveStates[itemId];
    saveDB(db);
    return { itemId, active: db.mythicActiveStates[itemId] };
  }

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
  if (path === '/api/monthly-summary-months' && method === 'GET') {
    const startDate = earliestAnyDataDate(db);
    const currentMonthKey = todayStr().slice(0, 7);
    if (!startDate) return { months: [] };
    const months = [];
    let cursor = monthKeyOf(startDate);
    while (cursor < currentMonthKey) {
      months.push(cursor);
      cursor = nextMonthKey(cursor);
    }
    return { months };
  }
  if ((m = path.match(/^\/api\/monthly-summary\/(\d{4}-\d{2})$/)) && method === 'GET') {
    const monthKey = m[1];
    const currentMonthKey = todayStr().slice(0, 7);
    if (monthKey >= currentMonthKey) throw new Error('mois pas encore termine');
    return { summary: computeMonthlySummary(db, monthKey) };
  }
  if (path === '/api/monthly-summary/acknowledge' && method === 'POST') {
    const currentMonthKey = todayStr().slice(0, 7);
    db.monthlySummaryAcknowledged = previousMonthKey(currentMonthKey);
    saveDB(db);
    return { ok: true };
  }

  throw new Error(`Route locale inconnue: ${method} ${path}`);
}
