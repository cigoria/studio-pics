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
    icon TEXT NOT NULL DEFAULT 'fa-solid fa-user'
  );

  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`)

// Automatikus egyszeri migráció a data.json-ból, ha az adatbázis még üres
function migrateFromJsonIfNeeded() {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM users').get()
  if (countRow.count === 0 && fs.existsSync(JSON_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'))
      const insertUser = db.prepare('INSERT INTO users (id, name, color, icon) VALUES (@id, @name, @color, @icon)')
      const insertImage = db.prepare('INSERT INTO images (id, user_id, file) VALUES (@id, @userId, @file)')

      const migrateTx = db.transaction(() => {
        if (Array.isArray(data.users)) {
          for (const u of data.users) {
            insertUser.run({
              id: u.id,
              name: u.name,
              color: u.color || '#3b82f6',
              icon: u.icon || 'fa-solid fa-user'
            })
          }
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

// Felhasználók lekérdezése képszámlálóval
export function getUsers() {
  const stmt = db.prepare(`
    SELECT 
      u.id, 
      u.name, 
      u.color, 
      u.icon, 
      COUNT(i.id) AS count
    FROM users u
    LEFT JOIN images i ON u.id = i.user_id
    GROUP BY u.id, u.name, u.color, u.icon
  `)
  return stmt.all()
}

// Felhasználó lekérése
export function getUser(id) {
  return db.prepare('SELECT id, name, color, icon FROM users WHERE id = ?').get(id)
}

// Felhasználó képeinek lekérése
export function getUserImages(userId) {
  return db.prepare('SELECT id, file FROM images WHERE user_id = ?').all(userId)
}

// Felhasználó létrehozása
export function createUser({ id, name, color, icon }) {
  const stmt = db.prepare('INSERT INTO users (id, name, color, icon) VALUES (?, ?, ?, ?)')
  stmt.run(id, name, color, icon)
  return { id, name, color, icon }
}

// Felhasználó frissítése
export function updateUser(id, { name, color, icon }) {
  const current = getUser(id)
  if (!current) return null

  const newName = name !== undefined ? name : current.name
  const newColor = color !== undefined ? color : current.color
  const newIcon = icon !== undefined ? icon : current.icon

  db.prepare('UPDATE users SET name = ?, color = ?, icon = ? WHERE id = ?').run(newName, newColor, newIcon, id)
  return { id, name: newName, color: newColor, icon: newIcon }
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
