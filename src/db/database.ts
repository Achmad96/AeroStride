import { Platform } from 'react-native';
import type { Run, RunDraft, RunListItem } from '../types';

let isMocked = Platform.OS === 'web';
let mockDb: any = {
  runs: [],
  kv: {},
  idCounter: 1,
};

// Only import SQLite natively.
let SQLite: any = null;
if (!isMocked) {
  SQLite = require('expo-sqlite');
}

let dbPromise: Promise<any> | null = null;

export function getDb(): Promise<any> {
  if (isMocked) return Promise.resolve(mockDb);
  if (!dbPromise) dbPromise = init();
  return dbPromise;
}

async function init() {
  const db = await SQLite.openDatabaseAsync('runs.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      startTime INTEGER NOT NULL,
      durationSec INTEGER NOT NULL,
      distanceM REAL NOT NULL,
      avgPaceSecPerKm REAL NOT NULL,
      routePoints TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_runs_start ON runs(startTime DESC);
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  return db;
}

export async function insertRun(run: RunDraft): Promise<number> {
  if (isMocked) {
    const id = mockDb.idCounter++;
    mockDb.runs.push({ ...run, id });
    return id;
  }
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO runs (startTime, durationSec, distanceM, avgPaceSecPerKm, routePoints) VALUES (?, ?, ?, ?, ?)',
    run.startTime,
    run.durationSec,
    run.distanceM,
    run.avgPaceSecPerKm,
    JSON.stringify(run.routePoints)
  );
  return res.lastInsertRowId;
}

export async function listRuns(): Promise<RunListItem[]> {
  if (isMocked) {
    return mockDb.runs
      .sort((a: any, b: any) => b.startTime - a.startTime)
      .map((r: any) => {
        const { routePoints, ...rest } = r;
        return rest;
      });
  }
  const db = await getDb();
  return db.getAllAsync(
    'SELECT id, startTime, durationSec, distanceM, avgPaceSecPerKm FROM runs ORDER BY startTime DESC'
  ) as Promise<RunListItem[]>;
}

export async function getRun(id: number): Promise<Run | null> {
  if (isMocked) {
    return mockDb.runs.find((r: any) => r.id === id) || null;
  }
  const db = await getDb();
  const row = (await db.getFirstAsync(
    'SELECT * FROM runs WHERE id = ?',
    id
  )) as Omit<Run, 'routePoints'> & { routePoints: string };
  return row ? { ...row, routePoints: JSON.parse(row.routePoints) } : null;
}

export async function deleteRun(id: number): Promise<void> {
  if (isMocked) {
    mockDb.runs = mockDb.runs.filter((r: any) => r.id !== id);
    return;
  }
  const db = await getDb();
  await db.runAsync('DELETE FROM runs WHERE id = ?', id);
}

export interface PeriodStats {
  runs: number;
  distanceM: number;
  durationSec: number;
}

export async function getStatsSince(since: number): Promise<PeriodStats> {
  if (isMocked) {
    const runs = mockDb.runs.filter((r: any) => r.startTime >= since);
    return {
      runs: runs.length,
      distanceM: runs.reduce((acc: number, r: any) => acc + r.distanceM, 0),
      durationSec: runs.reduce((acc: number, r: any) => acc + r.durationSec, 0),
    };
  }
  const db = await getDb();
  const row = (await db.getFirstAsync(
    `SELECT COUNT(*) AS runs, COALESCE(SUM(distanceM), 0) AS distanceM,
            COALESCE(SUM(durationSec), 0) AS durationSec
     FROM runs WHERE startTime >= ?`,
    since
  )) as { runs: number; distanceM: number; durationSec: number };
  return row ?? { runs: 0, distanceM: 0, durationSec: 0 };
}

export async function kvGet(key: string): Promise<string | null> {
  if (isMocked) return mockDb.kv[key] || null;
  const db = await getDb();
  const row = (await db.getFirstAsync('SELECT value FROM kv WHERE key = ?', key)) as { value: string };
  return row?.value ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  if (isMocked) {
    mockDb.kv[key] = value;
    return;
  }
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, value);
}

export async function kvDelete(key: string): Promise<void> {
  if (isMocked) {
    delete mockDb.kv[key];
    return;
  }
  const db = await getDb();
  await db.runAsync('DELETE FROM kv WHERE key = ?', key);
}

export async function getCurrentPerformance(): Promise<{ speedMinsPerKm: number; distanceKm: number } | null> {
  if (isMocked) {
    const recentRuns = mockDb.runs.sort((a: any, b: any) => b.startTime - a.startTime).slice(0, 5);
    if (recentRuns.length === 0) return null;
    
    // Find the longest run to represent their current true ability, bypassing tiny test runs.
    const bestRun = recentRuns.reduce((prev: any, curr: any) => 
      (curr.distanceM > prev.distanceM) ? curr : prev
    );

    const maxDistKm = bestRun.distanceM / 1000;
    const paceSecPerKm = bestRun.durationSec / maxDistKm;
    
    return {
      speedMinsPerKm: paceSecPerKm / 60,
      distanceKm: maxDistKm,
    };
  }
  
  const db = await getDb();
  // Get the longest run out of the 5 most recent runs
  const row = (await db.getFirstAsync(`
    SELECT distanceM, durationSec
    FROM (
      SELECT distanceM, durationSec 
      FROM runs 
      ORDER BY startTime DESC 
      LIMIT 5
    )
    ORDER BY distanceM DESC
    LIMIT 1
  `)) as { distanceM: number; durationSec: number };
  
  if (!row || row.distanceM === 0) {
    return null;
  }
  
  const maxDistKm = row.distanceM / 1000;
  const paceSecPerKm = row.durationSec / maxDistKm;
  
  return {
    speedMinsPerKm: paceSecPerKm / 60,
    distanceKm: maxDistKm,
  };
}
