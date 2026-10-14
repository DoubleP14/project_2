# Élesítés – DigitalOcean + Cloudflare

Ez az útmutató lépésről lépésre végigvezet a News Trends élesítésén a `newstrends.hu` domainen.

```
Látogató ──► Cloudflare (DNS, HTTPS, DDoS védelem)
                 │  Full (strict) TLS, Origin tanúsítvány
                 ▼
        DigitalOcean Droplet (Frankfurt)
        ┌──────────── docker compose ────────────┐
        │ caddy :443 ─► app :3000 ─► db (Postgres)│
        │                    backup (napi mentés) │
        └─────────────────────────────────────────┘
E-mail: app ──► Resend HTTPS API (a Droplet SMTP portjai le vannak tiltva)
```

**Becsült idő:** 1–2 óra (ebből a DNS átállás várakozás lehet több óra is).

---

## 1. Cloudflare – a domain felvétele

1. Regisztrálj a [cloudflare.com](https://dash.cloudflare.com/sign-up) oldalon, majd **Add a site** → `newstrends.hu` → **Free** csomag.
2. A Cloudflare kiír **két névszervert** (pl. `xxx.ns.cloudflare.com`).
3. Lépj be a domain regisztrátorodhoz (ahol a `newstrends.hu`-t vetted), és a domain névszervereit cseréld le erre a kettőre.
4. Várd meg, amíg a Cloudflare jelzi, hogy a domain **Active** (néhány perc – 24 óra).

## 2. DigitalOcean – a szerver létrehozása

1. Regisztrálj a [digitalocean.com](https://www.digitalocean.com) oldalon (új fióknál próbaidős kredit jár).
2. Ha még nincs SSH kulcsod, a saját gépeden hozz létre egyet:
   ```sh
   ssh-keygen -t ed25519 -C "newstrends"
   ```
   A nyilvános kulcs a `~/.ssh/id_ed25519.pub` fájlban van (Windowson: `C:\Users\<név>\.ssh\id_ed25519.pub`).
3. **Create → Droplets**:
   - Régió: **Frankfurt (FRA1)**
   - Image: **Ubuntu 24.04 LTS**
   - Méret: **Basic → Regular → 2 GB RAM / 1 vCPU** (kb. 12 $/hó)
   - Hitelesítés: **SSH Key** → add hozzá a nyilvános kulcsodat
   - Hostname: `newstrends`
   - (Opcionális) **Backups** bekapcsolása – a beépített napi adatbázis mentés mellé teljes gépmentés
4. Jegyezd fel a Droplet **IP címét**.

## 3. Cloudflare – DNS és HTTPS beállítása

1. **DNS → Records**:
   | Típus | Név | Tartalom | Proxy |
   |---|---|---|---|
   | A | `@` | a Droplet IP címe | Proxied (narancs felhő) |
   | CNAME | `www` | `newstrends.hu` | Proxied (narancs felhő) |
2. **SSL/TLS → Overview**: titkosítási mód: **Full (strict)**.
3. **SSL/TLS → Edge Certificates**: **Always Use HTTPS** bekapcsolása.
4. **SSL/TLS → Origin Server → Create Certificate**:
   - Kulcs típusa: RSA (2048), hosztnevek: `newstrends.hu`, `*.newstrends.hu`, érvényesség: 15 év
   - A megjelenő **Origin Certificate** és **Private Key** szövegét másold ki és tedd félre – a privát kulcsot a Cloudflare később **nem mutatja meg újra**!

## 4. Resend – e-mail küldés beállítása

A DigitalOcean az új fiókoknál letiltja a kimenő SMTP portokat (25/465/587), ezért a levelek HTTPS API-n mennek ki.

1. Regisztrálj a [resend.com](https://resend.com) oldalon.
2. **Domains → Add Domain** → `newstrends.hu`, régió: **EU (Ireland)**.
3. A megadott DNS rekordokat (TXT/MX) vedd fel a Cloudflare DNS-be – a Resend felajánlja az automatikus Cloudflare beállítást is. Ezek a rekordok **DNS only** (szürke felhő) módban legyenek.
4. Ha a domain **Verified**, hozz létre egy kulcsot: **API Keys → Create API Key** (Sending access). Ezt a `RESEND_API_KEY` változóba írod majd.

## 5. A szerver előkészítése

Csatlakozz a szerverhez (a saját gépedről):

```sh
ssh root@A_DROPLET_IP_CIME
```

A szerveren:

```sh
# Rendszerfrissítés
apt update && apt upgrade -y

# Tűzfal: csak SSH, HTTP és HTTPS
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Docker telepítése (hivatalos telepítő szkript)
curl -fsSL https://get.docker.com | sh

# 2 GB swap – biztonsági tartalék a build idejére
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 6. Az alkalmazás telepítése

```sh
# Kód letöltése
git clone https://github.com/DoubleP14/project_2.git /opt/newstrends
cd /opt/newstrends

# Környezeti változók
cp .env.production.example .env
nano .env
```

A `.env` kitöltése:
- `POSTGRES_PASSWORD`: `openssl rand -hex 24` kimenete
- `JWT_SECRET`, `CRON_SECRET`: egy-egy `openssl rand -hex 32` kimenet
- `ENCRYPTION_KEY`: **új telepítésnél** `openssl rand -hex 32`; **adatköltöztetésnél** (lásd 9. pont) a helyi `.env`-ben lévő értékkel egyezzen meg!
- `RESEND_API_KEY`: a 4. pontban létrehozott kulcs
- Stripe, Számlázz.hu, Telegram: a helyi `.env`-ből átmásolhatók (a `STRIPE_WEBHOOK_SECRET` a 8. pontban változik)

Cloudflare Origin tanúsítvány elhelyezése:

```sh
mkdir -p deploy/certs
nano deploy/certs/origin.pem   # ide az "Origin Certificate" szövege
nano deploy/certs/origin.key   # ide a "Private Key" szövege
chmod 600 deploy/certs/origin.key
```

Indítás:

```sh
docker compose up -d --build
```

Az első build néhány percig tart. Az állapot és a naplók:

```sh
docker compose ps
docker compose logs -f app
```

Ha a naplóban megjelenik a `Listening on http://0.0.0.0:3000` sor, nyisd meg a **https://newstrends.hu** címet.

## 7. Admin fiók

1. Regisztrálj a weboldalon, és erősítsd meg az e-mail címedet.
2. A szerveren tedd adminná:
   ```sh
   cd /opt/newstrends
   docker compose exec db psql -U newstrends -d newstrends -c "UPDATE \"Felhasznalok\" SET role = 'admin' WHERE email = 'sajat@email.hu';"
   ```
3. Jelentkezz ki és be – megjelenik az **Admin** menüpont.

## 8. Stripe webhook

1. Stripe Dashboard (teszt mód) → **Developers → Webhooks → Add endpoint**
   - URL: `https://newstrends.hu/api/stripe/webhook`
   - Esemény: `checkout.session.completed`
2. A **Signing secret** (`whsec_...`) értékét írd a szerveren a `.env` `STRIPE_WEBHOOK_SECRET` változójába, majd:
   ```sh
   docker compose up -d
   ```

## 9. (Opcionális) A helyi adatok átköltöztetése

Csak akkor, ha a helyi fejlesztői adatbázis tartalmát is élesbe akarod vinni. **Az alkalmazás első indítása előtt** végezd el (vagy töröld előtte az éles adatbázist).

A saját gépeden:

```sh
docker exec svelte-postgres-17 pg_dump -U admin -d app_db --no-owner --no-acl > dump.sql
scp dump.sql root@A_DROPLET_IP_CIME:/opt/newstrends/
```

A szerveren (az `ENCRYPTION_KEY` egyezzen meg a helyivel!):

```sh
cd /opt/newstrends
docker compose up -d db
docker compose exec -T db psql -U newstrends -d newstrends < dump.sql
rm dump.sql
docker compose up -d --build
```

## Üzemeltetés

**Frissítés új verzióra** (miután pusholtál a GitHubra):

```sh
cd /opt/newstrends
git pull
docker compose up -d --build
```

**Adatbázis mentések:** naponta automatikusan a `/opt/newstrends/backups` mappába kerülnek, 14 napig megmaradnak. Visszaállítás:

```sh
gunzip -c backups/newstrends_ÉÉÉÉ-HH-NN_ÓÓPP.sql.gz | docker compose exec -T db psql -U newstrends -d newstrends
```

Érdemes időnként egy mentést a saját gépedre is letölteni:

```sh
scp root@A_DROPLET_IP_CIME:/opt/newstrends/backups/newstrends_*.sql.gz .
```

## Hibaelhárítás

| Tünet | Valószínű ok és megoldás |
|---|---|
| Cloudflare **521** hiba | A Caddy nem fut, vagy a tűzfal blokkol: `docker compose ps`, `ufw status` |
| Cloudflare **525/526** hiba | Tanúsítvány gond: ellenőrizd a `deploy/certs` fájlokat és hogy a mód **Full (strict)** |
| **502 Bad Gateway** | Az alkalmazás nem indult el: `docker compose logs app` |
| Az alkalmazás leáll induláskor | Hiányzó változó (`JWT_SECRET`, `ENCRYPTION_KEY`) vagy adatvesztéssel járó séma változás – nézd meg a naplót |
| Űrlap küldésnél **403** | A `.env`-ben a `DOMAIN` nem egyezik a böngészőben használt címmel |
| Nem érkeznek e-mailek | `RESEND_API_KEY` hiányzik, vagy a domain nincs **Verified** állapotban a Resendben |
| Rossz domain az e-mail linkekben | A `DOMAIN` változó hibás a `.env`-ben |
