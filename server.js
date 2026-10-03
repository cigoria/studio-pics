import express from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '.env')

if (fs.existsSync(envPath)) {
  try {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(envPath)
    } else {
      const envContent = fs.readFileSync(envPath, 'utf8')
      for (const line of envContent.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim()
          let val = trimmed.slice(eqIdx + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          if (process.env[key] === undefined) {
            process.env[key] = val
          }
        }
      }
    }
  } catch {
    const envContent = fs.readFileSync(envPath, 'utf8')
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim()
        let val = trimmed.slice(eqIdx + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (process.env[key] === undefined) {
          process.env[key] = val
        }
      }
    }
  }
}

const UPLOADS = path.join(__dirname, 'uploads')
const DB_FILE = path.join(__dirname, 'data.json')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'
const isDev = process.env.NODE_ENV === 'development' || process.env.npm_lifecycle_event === 'dev'
const PORT = isDev ? (process.env.SERVER_PORT || 3000) : (process.env.PORT || process.env.SERVER_PORT || 5173)
fs.mkdirSync(UPLOADS, { recursive: true })

const load = () => fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : { users: [], images: [] }
const save = (db) => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
const id = () => crypto.randomBytes(6).toString('hex')

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (_, f, cb) => cb(null, id() + path.extname(f.originalname).toLowerCase())
  }),
  fileFilter: (_, f, cb) => cb(null, /^image\//.test(f.mimetype)),
  limits: { fileSize: 40 * 1024 * 1024 }
})

const app = express()
app.use(express.json())
app.use('/uploads', express.static(UPLOADS))

const admin = (req, res, next) =>
  req.get('x-admin-password') === ADMIN_PASSWORD ? next() : res.status(401).json({ error: 'Hibás jelszó' })

// publikus
app.get('/api/users', (_, res) => {
  const db = load()
  res.json(db.users.map(u => ({ ...u, count: db.images.filter(i => i.userId === u.id).length })))
})
app.get('/api/users/:id/images', (req, res) =>
  res.json(load().images.filter(i => i.userId === req.params.id).map(i => ({ id: i.id, url: '/uploads/' + i.file }))))

// admin
app.post('/api/login', admin, (_, res) => res.json({ ok: true }))
app.post('/api/users', admin, (req, res) => {
  const name = String(req.body.name || '').trim()
  if (!name) return res.status(400).json({ error: 'A név kötelező' })
  const db = load()
  const user = { id: id(), name, color: req.body.color || '#3b82f6', icon: req.body.icon || 'fa-solid fa-user' }
  db.users.push(user); save(db); res.json(user)
})
app.put('/api/users/:id', admin, (req, res) => {
  const db = load()
  const idx = db.users.findIndex(u => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Nincs ilyen felhasználó' })
  if (req.body.name !== undefined) {
    const name = String(req.body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'A név kötelező' })
    db.users[idx].name = name
  }
  if (req.body.color) db.users[idx].color = req.body.color
  if (req.body.icon) db.users[idx].icon = req.body.icon
  save(db); res.json(db.users[idx])
})
app.delete('/api/users/:id', admin, (req, res) => {
  const db = load()
  db.images.filter(i => i.userId === req.params.id).forEach(i => fs.rmSync(path.join(UPLOADS, i.file), { force: true }))
  db.images = db.images.filter(i => i.userId !== req.params.id)
  db.users = db.users.filter(u => u.id !== req.params.id)
  save(db); res.json({ ok: true })
})
app.post('/api/users/:id/images', admin, upload.array('images', 100), (req, res) => {
  const db = load()
  if (!db.users.some(u => u.id === req.params.id)) return res.status(404).json({ error: 'Nincs ilyen felhasználó' })
  const added = (req.files || []).map(f => ({ id: id(), userId: req.params.id, file: f.filename }))
  db.images.push(...added); save(db); res.json({ added: added.length })
})
app.delete('/api/images/:id', admin, (req, res) => {
  const db = load()
  const img = db.images.find(i => i.id === req.params.id)
  if (img) fs.rmSync(path.join(UPLOADS, img.file), { force: true })
  db.images = db.images.filter(i => i.id !== req.params.id)
  save(db); res.json({ ok: true })
})

// build kiszolgálása
const DIST = path.join(__dirname, 'dist')
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get('*', (_, res) => res.sendFile(path.join(DIST, 'index.html')))
}
app.listen(PORT, () => console.log(`Szerver: http://localhost:${PORT}  (admin jelszó: ${ADMIN_PASSWORD})`))
