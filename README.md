# Jeopardy-szerű valós idejű játék (Vue 3 + Node.js + Socket.IO + Prisma + PostgreSQL)

## Projekt célja
Egy online, Jeopardy-hoz hasonló játék egy egyetemi versenyre, ahol:
- van **Host** oldal (kérdés kiválasztás, válasz elbírálás),
- van **Screen** oldal (kivetítő, ezt látja mindenki),
- van **5 Player** oldal (buzzer),
- minden oldal **valós időben** frissül (buzzer “első nyer”, pontok azonnal frissülnek),
- a kérdések, láthatóság és pontok **adatbázisban** tárolódnak, így deploy után is megmaradnak.

---

## Technológiák és indoklás

### Frontend
- **Vue 3 + Vite**  
  Gyors fejlesztés, egyszerű SPA felépítés és routing (/host, /screen, /player/:seat).

- **Pinia**  
  Egyszerű és átlátható state management a kliens oldalon.

### Backend
- **Node.js + Express**  
  Egyszerű HTTP réteg (health endpoint, statikus kiszolgálás productionben).

- **Socket.IO**  
  Valós idejű kétirányú kommunikáció (WebSocket jelleg), event-alapú üzenetek, megbízható reconnect.

### Adatbázis
- **PostgreSQL (Dockerben lokálisan)**  
  Stabil és deploymentre alkalmas (Renderen is jól működik).

- **Prisma (v7)**  
  ORM + migrációk + Prisma Studio. (Prisma 7-ben adapteres kapcsolatot használunk Postgreshez.)

---

## Projekt létrehozása
`npm create vue@latest client`

## Node backend inicializálása
```
mkdir server
cd server
npm init -y
```

## Függőségek telepítése
### Backend (Express + Socket.IO + nodemon)
```
cd server
npm install express socket.io
npm install -D nodemon
```

### Frontend (Socket.IO kliens)
```
cd client
npm install socket.io-client
```
## Lokális PostgreSQL indítása Dockerrel
A `server/docker-compose.yml` fájl alapján:
DB infitasa:
```
cd server
docker compose up -d
```
## Prisma beállítás (migrációk, kliens, Studio)
### Prisma telepites
```
cd server
npm install prisma @prisma/client
```
### Prisma inicializálása (PostgreSQL provider)
```
cd server
npx prisma init --datasource-provider postgresql
```
### Migráció futtatása (táblák létrehozása)
```
cd server
npx prisma migrate dev --name init
```
### Prisma Client generálása
```
cd server
npx prisma generate
```
### Prisma Studio (DB megtekintése)
```
cd server
npx prisma studio
```
## DB seed (játékosok + kérdések feltöltése)
```
cd server
npm run seed
```
A seed tipikusan:
 - létrehozza / frissíti az 5 fix játékost (seat 1..5),
 - betölti a kérdéseket a DB-be.
## Fejlesztői futtatás (dev)
### Backend:
```
cd server
npm run dev
```
### Frontend
```
cd client
npm run dev
```
### URL-ek
Host: `http://localhost:5173/host`
Screen: `http://localhost:5173/screen`
Player: `http://localhost:5173/player/1` … `http://localhost:5173/player/5`
### Reset
```
cd server
npm run reset
```
Tipikus reset műveletek:
 - player pontok lenullázása,
 - kérdések isVisible vissza true,
 - (opcionális) attempt napló törlése.
