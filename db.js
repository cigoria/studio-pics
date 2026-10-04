import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_FILE || path.join(__dirname, 'data.db')
const JSON_FILE = path.join(__dirname, 'data.json')

const db = new Database(DB_PATH)

// Foreign keys bekapcsolása és WAL mód a jobb párhuzamos írás/olvasás érdekében
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Táblák inicializálása
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    icon TEXT NOT NULL DEFAULT 'fa-solid fa-user',
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`)

// Oszlop migráció és kezdeti sorszámok beállítása, ha a sort_order még nem létezett
function migrateSchemaIfNeeded() {
  const columns = db.pragma('table_info(users)').map(c => c.name)
  if (!columns.includes('sort_order')) {
    db.exec('ALTER TABLE users ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0')
  }

  // Ha vannak olyan felhasználók, akiknek sort_order <= 0 vagy mind 0, inicializáljuk 1..N-re
  const usersWithZeroOrder = db.prepare('SELECT id, rowid FROM users WHERE sort_order <= 0 ORDER BY rowid ASC').all()
  if (usersWithZeroOrder.length > 0) {
    const maxOrderRow = db.prepare('SELECT MAX(sort_order) as maxOrder FROM users WHERE sort_order > 0').get()
    let currentMax = maxOrderRow?.maxOrder || 0
    const updateOrder = db.prepare('UPDATE users SET sort_order = ? WHERE id = ?')
    const initTx = db.transaction(() => {
      for (const u of usersWithZeroOrder) {
        currentMax += 1
        updateOrder.run(currentMax, u.id)
      }
    })
    initTx()
  }
}

migrateSchemaIfNeeded()

// Automatikus egyszeri migráció a data.json-ból, ha az adatbázis még üres
function migrateFromJsonIfNeeded() {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM users').get()
  if (countRow.count === 0 && fs.existsSync(JSON_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'))
      const insertUser = db.prepare('INSERT INTO users (id, name, color, icon, sort_order) VALUES (@id, @name, @color, @icon, @sort_order)')
      const insertImage = db.prepare('INSERT INTO images (id, user_id, file) VALUES (@id, @userId, @file)')

      const migrateTx = db.transaction(() => {
        if (Array.isArray(data.users)) {
          data.users.forEach((u, index) => {
            insertUser.run({
              id: u.id,
              name: u.name,
              color: u.color || '#3b82f6',
              icon: u.icon || 'fa-solid fa-user',
              sort_order: u.sort_order !== undefined ? Number(u.sort_order) : index + 1
            })
          })
        }
        if (Array.isArray(data.images)) {
          for (const img of data.images) {
            insertImage.run({
              id: img.id,
              userId: img.userId,
              file: img.file
            })
          }
        }
      })

      migrateTx()
      console.log('Sikeres adatmigráció a data.json fájlból SQLite adatbázisba.')
    } catch (err) {
      console.error('Hiba történt a data.json migrációja közben:', err)
    }
  }
}

migrateFromJsonIfNeeded()

// Felhasználók lekérdezése képszámlálóval és sorrenddel
export function getUsers() {
  const stmt = db.prepare(`
    SELECT 
      u.id, 
      u.name, 
      u.color, 
      u.icon, 
      u.sort_order,
      COUNT(i.id) AS count
    FROM users u
    LEFT JOIN images i ON u.id = i.user_id
    GROUP BY u.id, u.name, u.color, u.icon, u.sort_order
    ORDER BY u.sort_order ASC, u.name ASC, u.id ASC
  `)
  return stmt.all()
}

// Felhasználó lekérése
export function getUser(id) {
  return db.prepare('SELECT id, name, color, icon, sort_order FROM users WHERE id = ?').get(id)
}

// Felhasználó képeinek lekérése
export function getUserImages(userId) {
  return db.prepare('SELECT id, file FROM images WHERE user_id = ?').all(userId)
}

// Felhasználó létrehozása
export function createUser({ id, name, color, icon, sort_order }) {
  let order = Number(sort_order)
  if (!Number.isFinite(order) || order < 1) {
    const maxRow = db.prepare('SELECT MAX(sort_order) as maxOrder FROM users').get()
    order = (maxRow?.maxOrder || 0) + 1
  }
  const stmt = db.prepare('INSERT INTO users (id, name, color, icon, sort_order) VALUES (?, ?, ?, ?, ?)')
  stmt.run(id, name, color, icon, order)
  return { id, name, color, icon, sort_order: order }
}

// Felhasználó frissítése
export function updateUser(id, { name, color, icon, sort_order }) {
  const current = getUser(id)
  if (!current) return null

  const newName = name !== undefined ? name : current.name
  const newColor = color !== undefined ? color : current.color
  const newIcon = icon !== undefined ? icon : current.icon
  const newOrder = (sort_order !== undefined && Number.isFinite(Number(sort_order)))
    ? Number(sort_order)
    : current.sort_order

  db.prepare('UPDATE users SET name = ?, color = ?, icon = ?, sort_order = ? WHERE id = ?')
    .run(newName, newColor, newIcon, newOrder, id)
  return { id, name: newName, color: newColor, icon: newIcon, sort_order: newOrder }
}

// Felhasználók sorrendjének átrendezése ID lista alapján
export function reorderUsers(orderedIds) {
  const updateStmt = db.prepare('UPDATE users SET sort_order = ? WHERE id = ?')
  const tx = db.transaction((ids) => {
    ids.forEach((userId, index) => {
      updateStmt.run(index + 1, userId)
    })
  })
  tx(orderedIds)
}

// Felhasználó törlése (visszaadja a törölt képek fájlneveit, hogy a lemezről is törölhetők legyenek)
export function deleteUser(id) {
  const images = getUserImages(id)
  const stmt = db.prepare('DELETE FROM users WHERE id = ?')
  const res = stmt.run(id)
  return { deleted: res.changes > 0, imageFiles: images.map(i => i.file) }
}

// Képek hozzáadása
export function addImages(images) {
  const insert = db.prepare('INSERT INTO images (id, user_id, file) VALUES (@id, @userId, @file)')
  const insertMany = db.transaction((imgs) => {
    for (const img of imgs) {
      insert.run(img)
    }
  })
  insertMany(images)
}

// Egyedi kép lekérése
export function getImage(id) {
  return db.prepare('SELECT id, user_id as userId, file FROM images WHERE id = ?').get(id)
}

// Kép törlése
export function deleteImage(id) {
  const img = getImage(id)
  if (!img) return null
  db.prepare('DELETE FROM images WHERE id = ?').run(id)
  return img
}

// Összes kép lekérése (karbantartáshoz, konvertáláshoz)
export function getAllImages() {
  return db.prepare('SELECT id, user_id as userId, file FROM images').all()
}

// Képfájlnév frissítése
export function updateImageFile(id, newFile) {
  db.prepare('UPDATE images SET file = ? WHERE id = ?').run(newFile, id)
}

export default db
