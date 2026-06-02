import { openDB } from 'idb'

const DB_NAME = 'waynest-offline'
const DB_VERSION = 2

export const openOfflineDb = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('trip-plans', { keyPath: 'key' })
        db.createObjectStore('calendar-entries', { keyPath: 'id' })
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'key' })
        }
      }
    },
  })

/** Trip Plan Cache */
export const cacheTripPlan = async (key, plan) => {
  try {
    const db = await openOfflineDb()
    await db.put('trip-plans', { key, plan, cachedAt: new Date().toISOString() })
  } catch {}
}

export const getCachedTripPlan = async (key) => {
  try {
    const db = await openOfflineDb()
    return (await db.get('trip-plans', key)) ?? null
  } catch {
    return null
  }
}

export const getAllCachedTripPlans = async () => {
  try {
    const db = await openOfflineDb()
    return await db.getAll('trip-plans')
  } catch {
    return []
  }
}

export const removeCachedTripPlan = async (key) => {
  try {
    const db = await openOfflineDb()
    await db.delete('trip-plans', key)
  } catch {}
}

/** Calendar Entry Cache */
export const cacheCalendarEntries = async (entries) => {
  try {
    const db = await openOfflineDb()
    const tx = db.transaction('calendar-entries', 'readwrite')
    await Promise.all([...entries.map((e) => tx.store.put(e)), tx.done])
  } catch {}
}

export const getCachedCalendarEntries = async () => {
  try {
    const db = await openOfflineDb()
    return await db.getAll('calendar-entries')
  } catch {
    return []
  }
}

export const upsertCachedCalendarEntry = async (entry) => {
  try {
    const db = await openOfflineDb()
    await db.put('calendar-entries', entry)
  } catch {}
}

export const removeCachedCalendarEntry = async (id) => {
  try {
    const db = await openOfflineDb()
    await db.delete('calendar-entries', id)
  } catch {}
}

/** Form Drafts */
export const saveFormDraft = async (key, data) => {
  try {
    const db = await openOfflineDb()
    await db.put('drafts', { key, data, savedAt: new Date().toISOString() })
  } catch {}
}

export const getFormDraft = async (key) => {
  try {
    const db = await openOfflineDb()
    const entry = await db.get('drafts', key)
    return entry?.data ?? null
  } catch {
    return null
  }
}

export const removeFormDraft = async (key) => {
  try {
    const db = await openOfflineDb()
    await db.delete('drafts', key)
  } catch {}
}
