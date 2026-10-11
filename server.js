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
import { spawn } from 'child_process'
import os from 'os'

const UPLOADS = path.join(__dirname, 'uploads')
const TMP_DIR = path.join(__dirname, 'uploads', '.tmp')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'
const isDev = process.env.NODE_ENV === 'development' || process.env.npm_lifecycle_event === 'dev'
const PORT = isDev ? (process.env.SERVER_PORT || 3000) : (process.env.PORT || process.env.SERVER_PORT || 5173)

fs.mkdirSync(UPLOADS, { recursive: true })
fs.mkdirSync(TMP_DIR, { recursive: true })

const id = () => crypto.randomBytes(6).toString('hex')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TMP_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ''
    cb(null, `${id()}_${Date.now()}${ext}`)
  }
})

const upload = multer({
  storage,
  fileFilter: (_, f, cb) => {
    const isImage = /^image\//.test(f.mimetype)
    const isVideo = /^video\//.test(f.mimetype)
    cb(null, isImage || isVideo)
  },
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max per video/file
})

const app = express()
app.use(express.json())

const checkAuth = (req) => {
  const headerPw = req.get('x-admin-password')
  const queryPw = req.query.auth || req.query.adminPassword
  return headerPw === ADMIN_PASSWORD || queryPw === ADMIN_PASSWORD
}

// Uploads kiszolgálása jogosultságkezeléssel
app.use('/uploads', (req, res, next) => {
  const filename = path.basename(req.path)
  if (!filename || filename === '.tmp') return next()

  // Megnézzük az adatbázisban, hogy a fájl privát-e
  const isAuth = checkAuth(req)
  const allImages = db.getAllImages()
  const imgRecord = allImages.find(i => i.file === filename)

  if (imgRecord && imgRecord.requiresAuth && !isAuth) {
    return res.status(401).json({ error: 'Bejelentkezés szükséges a tartalom megtekintéséhez' })
  }
  next()
}, express.static(UPLOADS))

const admin = (req, res, next) =>
  checkAuth(req) ? next() : res.status(401).json({ error: 'Hibás jelszó' })

// Publikus / fél-védett lista (bejelentkezéstől függ a tartalom)
app.get('/api/users', (req, res) => {
  const isAuth = checkAuth(req)
  res.json(db.getUsers(isAuth))
})

app.get('/api/users/:id/images', (req, res) => {
  const isAuth = checkAuth(req)
  const items = db.getUserImages(req.params.id, isAuth).map(i => ({
    id: i.id,
    url: '/uploads/' + i.file,
    mediaType: i.mediaType || 'image',
    requiresAuth: !!i.requiresAuth
  }))
  res.json(items)
})

// admin
app.post('/api/login', admin, (_, res) => res.json({ ok: true }))
app.post('/api/users', admin, (req, res) => {
  const name = String(req.body.name || '').trim()
  if (!name) return res.status(400).json({ error: 'A név kötelező' })
  const user = db.createUser({
    id: id(),
    name,
    color: req.body.color || '#3b82f6',
    icon: req.body.icon || 'fa-solid fa-user',
    sort_order: req.body.sort_order
  })
  res.json(user)
})
app.put('/api/users/reorder', admin, (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'Érvénytelen azonosító lista' })
  db.reorderUsers(ids)
  res.json({ ok: true, users: db.getUsers(true) })
})
app.put('/api/users/:id', admin, (req, res) => {
  if (req.body.name !== undefined) {
    const name = String(req.body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'A név kötelező' })
  }
  const updated = db.updateUser(req.params.id, {
    name: req.body.name,
    color: req.body.color,
    icon: req.body.icon,
    sort_order: req.body.sort_order
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

// FFmpeg transzkódoló segédfüggvény (max 1080p felbontás, takarékos crf 26 H.264 mp4, aac)
function transcodeVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Felbontás limit: beleillesztés max 1920x1080-ba képarány megtartásával, páros oldalhosszúság
    const vf = "scale='w=min(1920,iw):h=min(1080,ih):force_original_aspect_ratio=decrease',scale=trunc(iw/2)*2:trunc(ih/2)*2"
    const args = [
      '-y',
      '-i', inputPath,
      '-vf', vf,
      '-c:v', 'libx264',
      '-crf', '26',
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
      outputPath
    ]

    const proc = spawn('ffmpeg', args)
    let stderr = ''
    proc.stderr.on('data', data => { stderr += data.toString() })
    proc.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg hiba (kód: ${code}): ${stderr.slice(-300)}`))
    })
    proc.on('error', err => reject(err))
  })
}

// Média feltöltés és transzkódolás
app.post('/api/users/:id/images', admin, upload.array('images', 100), async (req, res) => {
  if (!db.getUser(req.params.id)) return res.status(404).json({ error: 'Nincs ilyen felhasználó' })
  const files = req.files || []
  if (!files.length) return res.json({ added: 0 })

  try {
    const added = []
    for (const f of files) {
      const mediaId = id()
      const isVideo = f.mimetype.startsWith('video/')
      const isGif = f.mimetype === 'image/gif'

      try {
        if (isVideo) {
          const filename = `${mediaId}.mp4`
          const outputPath = path.join(UPLOADS, filename)
          await transcodeVideo(f.path, outputPath)
          added.push({
            id: mediaId,
            userId: req.params.id,
            file: filename,
            mediaType: 'video',
            requiresAuth: 0
          })
        } else if (isGif) {
          // Animált GIF -> Animált WebP (max 1080p felbontás, optimális tömörítés)
          const filename = `${mediaId}.webp`
          const outputPath = path.join(UPLOADS, filename)
          await sharp(f.path, { animated: true })
            .rotate()
            .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80, effort: 4 })
            .toFile(outputPath)

          added.push({
            id: mediaId,
            userId: req.params.id,
            file: filename,
            mediaType: 'image',
            requiresAuth: 0
          })
        } else {
          // Normál kép (JPG, PNG, WebP stb.) -> WebP (max 1080p, takarékos 80-as minőség)
          const filename = `${mediaId}.webp`
          const outputPath = path.join(UPLOADS, filename)
          await sharp(f.path)
            .rotate()
            .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80, effort: 4 })
            .toFile(outputPath)

          added.push({
            id: mediaId,
            userId: req.params.id,
            file: filename,
            mediaType: 'image',
            requiresAuth: 0
          })
        }
      } finally {
        // Átmeneti feltöltött fájl takarítása
        try { fs.rmSync(f.path, { force: true }) } catch {}
      }
    }

    if (added.length) {
      db.addImages(added)
    }
    res.json({ added: added.length })
  } catch (err) {
    console.error('Média konvertálási hiba:', err)
    res.status(500).json({ error: 'Hiba történt a média feldolgozása közben: ' + err.message })
  }
})

// Média láthatóságának (requires_auth) módosítása
app.patch('/api/images/:id', admin, (req, res) => {
  const requires_auth = req.body.requiresAuth !== undefined ? req.body.requiresAuth : req.body.requires_auth
  const updated = db.updateImage(req.params.id, { requires_auth: !!requires_auth })
  if (!updated) return res.status(404).json({ error: 'Nincs ilyen média elem' })
  res.json({
    id: updated.id,
    url: '/uploads/' + updated.file,
    mediaType: updated.mediaType,
    requiresAuth: !!updated.requiresAuth
  })
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
