import express from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'
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

import * as db from './db.js'

const UPLOADS = path.join(__dirname, 'uploads')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'
const isDev = process.env.NODE_ENV === 'development' || process.env.npm_lifecycle_event === 'dev'
const PORT = isDev ? (process.env.SERVER_PORT || 3000) : (process.env.PORT || process.env.SERVER_PORT || 5173)
fs.mkdirSync(UPLOADS, { recursive: true })

const id = () => crypto.randomBytes(6).toString('hex')

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_, f, cb) => cb(null, /^image\//.test(f.mimetype)),
  limits: { fileSize: 50 * 1024 * 1024 }
})

const app = express()
app.use(express.json())
app.use('/uploads', express.static(UPLOADS))

const admin = (req, res, next) =>
  req.get('x-admin-password') === ADMIN_PASSWORD ? next() : res.status(401).json({ error: 'Hibás jelszó' })

// publikus
app.get('/api/users', (_, res) => {
  res.json(db.getUsers())
})
app.get('/api/users/:id/images', (req, res) =>
  res.json(db.getUserImages(req.params.id).map(i => ({ id: i.id, url: '/uploads/' + i.file }))))

// admin
app.post('/api/login', admin, (_, res) => res.json({ ok: true }))
app.post('/api/users', admin, (req, res) => {
  const name = String(req.body.name || '').trim()
  if (!name) return res.status(400).json({ error: 'A név kötelező' })
  const user = db.createUser({
    id: id(),
    name,
    color: req.body.color || '#3b82f6',
    icon: req.body.icon || 'fa-solid fa-user'
  })
  res.json(user)
})
app.put('/api/users/:id', admin, (req, res) => {
  if (req.body.name !== undefined) {
    const name = String(req.body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'A név kötelező' })
  }
  const updated = db.updateUser(req.params.id, {
    name: req.body.name,
    color: req.body.color,
    icon: req.body.icon
  })
  if (!updated) return res.status(404).json({ error: 'Nincs ilyen felhasználó' })
  res.json(updated)
})
app.delete('/api/users/:id', admin, (req, res) => {
  const result = db.deleteUser(req.params.id)
  if (result.imageFiles && result.imageFiles.length > 0) {
    result.imageFiles.forEach(file => fs.rmSync(path.join(UPLOADS, file), { force: true }))
  }
  res.json({ ok: true })
})
app.post('/api/users/:id/images', admin, upload.array('images', 100), async (req, res) => {
  if (!db.getUser(req.params.id)) return res.status(404).json({ error: 'Nincs ilyen felhasználó' })
  const files = req.files || []
  if (!files.length) return res.json({ added: 0 })

  try {
    const added = await Promise.all(
      files.map(async (f) => {
        const imgId = id()
        const filename = `${imgId}.webp`
        const filepath = path.join(UPLOADS, filename)

        await sharp(f.buffer)
          .rotate()
          .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toFile(filepath)

        return { id: id(), userId: req.params.id, file: filename }
      })
    )

    db.addImages(added)
    res.json({ added: added.length })
  } catch (err) {
    console.error('Kép konvertálási hiba:', err)
    res.status(500).json({ error: 'Hiba történt a képek feldolgozása közben' })
  }
})
app.delete('/api/images/:id', admin, (req, res) => {
  const img = db.deleteImage(req.params.id)
  if (img) fs.rmSync(path.join(UPLOADS, img.file), { force: true })
  res.json({ ok: true })
})

// build kiszolgálása
const DIST = path.join(__dirname, 'dist')
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get('*', (_, res) => res.sendFile(path.join(DIST, 'index.html')))
}
app.listen(PORT, () => console.log(`Szerver: http://localhost:${PORT}  (admin jelszó: ${ADMIN_PASSWORD})`))
