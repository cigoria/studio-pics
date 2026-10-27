# Diavetítő

Netflix-stílusú profilválasztó + teljes képernyős diavetítés + vezérlőpult (Vue 3, Vite, Font Awesome, Express).

## Konfiguráció (.env)

A beállításokat a `.env` fájl tartalmazza (példa a `.env.example` fájlban):

```env
PORT=5173
ADMIN_PASSWORD=admin
```

## Indítás fejlesztéshez

    npm install
    npm run dev          # frontend: http://localhost:5173 (vagy a megadott PORT), API: :3000

## Éles futtatás

    npm install
    npm run build
    npm start            # http://localhost:5173 (vagy a megadott PORT)

Az admin jelszó és a port a `.env` fájlban módosítható (`ADMIN_PASSWORD`, `PORT`).

## Használat

1. Nyissa meg a `/dashboard` oldalt (vagy a "Vezérlőpult" gombot a főoldalon), és lépjen be.
2. Hozzon létre egy felhasználót, jelölje ki, és húzza rá a képeket.
3. A főoldalon válassza ki a felhasználót: elindul a véletlen sorrendű, teljes képernyős vetítés.
4. Ha a főoldalon a Full Random gombot választja, a diavetítés az összes képből indul el, random sorrendben.

Vetítés vezérlés: ←/→ léptetés, szóköz szünet, F teljes képernyő, Esc kilépés. Az adatok a `data.json` fájlban, a képek az `uploads/` mappában vannak.
