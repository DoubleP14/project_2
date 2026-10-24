# News Trends – Hírtrend-elemző és Értesítő Rendszer

A **News Trends** egy B2B SaaS webalkalmazás, amely cégvezetőknek és elemzőknek nyújt automatizált piac- és médiafigyelést. A rendszer folyamatosan pásztázza a megadott hírforrásokat, nagy nyelvi modellekkel (LLM) emberi beavatkozás nélkül elemzi a cikkeket, és riasztást küld a kritikus történésekről.

> Szakdolgozati, demonstrációs célú projekt. A fizetés Stripe teszt módban, a számlázás Számlázz.hu sandbox környezetben működik.

## Fő funkciók

- **Hírgyűjtés:** RSS hírforrások és YouTube csatornák óránkénti, automatikus feldolgozása.
- **AI elemzés (BYOK):** a felhasználó saját API kulcsával (OpenAI, Anthropic, Google Gemini vagy Groq):
  - objektív, 1–2 mondatos összefoglaló,
  - hangulat: Pozitív / Negatív / Semleges,
  - **Hírérték** pontszám (0–100) és **Clickbait Radar** (0–100),
  - kulcsszavak és témakör-besorolás,
  - azonos eseményről szóló cikkek klaszterezése.
- **Fontossági rangsor:** a kiemelt hírek előre, a clickbait és alacsony hírértékű tartalmak hátra kerülnek.
- **Riasztások** e-mailben, Discordon vagy Telegramon:
  - egyedi kulcsszó találat,
  - feliratkozott témakör (csak kiemelt, 71+ hírértékű hírnél),
  - bombahír (legalább 3 forrás hozta le),
  - gap analízis (a konkurencia megírta, a saját médium nem).
- **Statisztika:** hangulat- és hírérték-megoszlás, forrásonkénti állapot.
- **Forrásfigyelés:** a felhasználó látja forrásai állapotát (működik / hiba / kikapcsolva); 24 egymás utáni hiba után a rendszer automatikusan kikapcsolja a forrást és e-mailben értesít.
- **Admin központ:** felhasználók felfüggesztése, rendszernapló, figyelmet igénylő források (naplózott admin kikapcsolással), kézi frissítés és takarítás.
- **Előfizetés:** Starter / Pro Analyst / Enterprise csomagok, előre fizetett 30 napos hozzáférés (nincs automatikus megújítás), hosszabbítás és csomagváltás értékarányos jóváírással, lejárati emlékeztető, Stripe fizetés, automatikus e-számla.
- **GDPR:** adatkezelési tájékoztató (`/adatvedelem`), visszavonhatatlan fióktörlés minden kapcsolódó adattal együtt.

## Technológiák

| Réteg | Technológia |
|---|---|
| Keretrendszer | SvelteKit 2, Svelte 5, TypeScript, Vite |
| Felület | Tailwind CSS, Flowbite-Svelte, ApexCharts |
| Adatbázis | PostgreSQL 17, Prisma ORM |
| Hitelesítés | JWT (HttpOnly süti), bcrypt, e-mail megerősítés, Google OAuth 2.0 (PKCE) |
| AI | OpenAI SDK (OpenAI, Groq), Anthropic és Gemini REST API, Zod validáció |
| Ütemezés | node-cron |
| Integrációk | Stripe, Számlázz.hu, Resend (HTTPS e-mail API) / Nodemailer (SMTP), Discord webhook, Telegram Bot API |
| Üzemeltetés | Docker, Docker Compose, Caddy, Cloudflare, DigitalOcean (adapter-node) |

## Telepítés és futtatás

### Előfeltételek

- Node.js 20+ (fejlesztve: 24)
- Docker (a PostgreSQL adatbázishoz)

### 1. Függőségek telepítése

```sh
npm install
```

### 2. Adatbázis indítása Dockerben

```sh
docker run -d --name svelte-postgres-17 \
  -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=JELSZO -e POSTGRES_DB=app_db \
  -p 5433:5432 -v pgdata17:/var/lib/postgresql/data postgres:17
```

> Ha a gépen natívan telepített PostgreSQL is fut ugyanazon a porton, a kapcsolat oda fog befutni, és „Authentication failed” hibát kapsz. Ilyenkor állítsd le a natív szolgáltatást, vagy használj másik portot.

### 3. Környezeti változók

```sh
cp .env.example .env
```

Töltsd ki a `.env` fájlt (a változók leírása a `.env.example`-ben található). A `JWT_SECRET`, `ENCRYPTION_KEY` és `CRON_SECRET` legyen hosszú, véletlenszerű szöveg.

> Az `ENCRYPTION_KEY` megváltoztatása után a már elmentett API kulcsok nem fejthetők vissza, ezeket újra meg kell adni.

### 4. Adatbázis séma létrehozása

```sh
npx prisma db push
```

### 5. Fejlesztői szerver

```sh
npm run dev
```

Az alkalmazás a http://localhost:5173 címen érhető el.

### Admin jogosultság beállítása

Regisztráció és e-mail megerősítés után a felhasználót adatbázisból lehet adminná tenni:

```sh
docker exec -it svelte-postgres-17 psql -U admin -d app_db -c "UPDATE \"Felhasznalok\" SET role = 'admin' WHERE email = 'sajat@email.hu';"
```

### Stripe webhook helyi teszteléshez

```sh
stripe listen --forward-to localhost:5173/api/stripe/webhook
```

A kiírt `whsec_...` értéket a `STRIPE_WEBHOOK_SECRET` változóba kell másolni.

## Élesítés

A produkciós telepítés (DigitalOcean Droplet + Cloudflare + Docker Compose) lépésenkénti leírása a [DEPLOY.md](DEPLOY.md) fájlban található.

## Parancsok

| Parancs | Leírás |
|---|---|
| `npm run dev` | Fejlesztői szerver indítása |
| `npm run build` | Produkciós build |
| `npm run preview` | A produkciós build előnézete |
| `npm run check` | Típusellenőrzés (svelte-check) |

## Architektúra

A szerveroldali kód rétegzett felépítésű (`src/lib/server/index.ts`):

```
Config ──► Services ──► Modules ──► Jobs / Route-ok
```

- **Services** (`src/lib/server/services/`): adatelérés és külső szolgáltatások – `hirRepository`, `aiService`, `notificationService`, `emailService`, `archiveService`, `szamlaService`, `loggerService`.
- **Modules** (`src/lib/server/modules/`): üzleti logika – `hirGyujtoModule` (RSS/YouTube gyűjtés), `aiModule` (elemzés, klaszterezés, riasztási döntések).
- **Jobs** (`src/lib/server/jobs.ts`): rendszerszintű háttérfeladatok, amelyeket a cron és az Admin felület egyaránt hív.

### Ütemezett feladatok (`src/hooks.server.ts`)

| Időpont | Feladat |
|---|---|
| Minden óra 0. perce | Minden aktív felhasználó forrásainak letöltése és AI elemzése |
| Minden nap 02:00 | Előfizetések: lejárati emlékeztető (3 nappal előtte), lejárt csomagok visszaváltása Starterre |
| Minden nap 03:00 | A 7 napnál régebbi hírek végleges törlése |

A takarítás külső ütemezőből is indítható: `GET /api/news/cleanup` a `Authorization: Bearer <CRON_SECRET>` fejléccel.

> A cron a Node.js szerverfolyamatban fut, ezért élesítéshez tartósan futó Node szerver (pl. `@sveltejs/adapter-node`) szükséges; serverless környezetben nem fut le.

### Könyvtárszerkezet

```
prisma/schema.prisma        Adatbázis séma
src/hooks.server.ts         Hitelesítés (JWT) és cron ütemezés
src/lib/kategoriak.ts       Közös témakör-szótár (szűrés és riasztás)
src/lib/server/             Szerveroldali rétegek (services, modules, jobs, crypto)
src/routes/                 Oldalak és API végpontok
  ├─ dashboard/             Hírfolyam szűréssel és fontossági rangsorral
  ├─ analytics/             Statisztikák
  ├─ settings/              Beállítások, források, kulcsszavak, előfizetés, fióktörlés
  ├─ admin/                 Admin központ
  ├─ checkout/              Stripe fizetés
  ├─ login, register, forgot-password, reset-password
  ├─ adatvedelem/           Adatkezelési tájékoztató
  └─ api/                   auth, logout, news/cleanup, stripe/webhook
```

## Biztonság

- Jelszavak bcrypt hash-sel, API kulcsok és értesítési azonosítók AES-256 titkosítással tárolva.
- Munkamenet: aláírt JWT, HttpOnly + SameSite=Strict sütiben; letiltott fiók azonnal kijelentkeztetve.
- Munkamenet-visszavonás token verzióval: jelszócsere vagy „Kijelentkezés minden eszközről” után minden korábbi JWT azonnal érvénytelen.
- Jelszó-visszaállító token: csak SHA-256 hash-e tárolódik, 60 percig érvényes, egyszer használható.
- Felhasználói felsorolás elleni védelem az elfelejtett jelszó és az újraküldés végpontokon.
- Minden adatlekérdezés a bejelentkezett felhasználóra szűr; rendszerszintű műveletek csak adminnak.
