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
4. **SSL/TLS → Origin Server → Create Certificate** (csak **aktív** domainnél működik – „Pending” állapotban hibát ad):
   - „Generate private key and CSR with Cloudflare”, kulcs típusa: RSA (2048), hosztnevek: `newstrends.hu`, `*.newstrends.hu`, érvényesség: 15 év
   - A megjelenő **Origin Certificate** szövegét mentsd `origin.pem`, a lejjebb található **Private Key** szövegét `origin.key` néven – a privát kulcsot a Cloudflare később **nem mutatja meg újra**!

> Az **Edge Certificates** oldalon látható „Universal” tanúsítvány a Cloudflare és a látogatók közötti kapcsolatot védi, azt a Cloudflare automatikusan kezeli – az Origin tanúsítvány ettől külön dolog.

## 4. Resend – e-mail küldés beállítása

A DigitalOcean az új fiókoknál letiltja a kimenő SMTP portokat (25/465/587), ezért a levelek HTTPS API-n mennek ki.

1. Regisztrálj a [resend.com](https://resend.com) oldalon.
2. **Domains → Add Domain** → `newstrends.hu`, régió: **EU (Ireland)**.
   A **click tracking** és az **open tracking** maradjon kikapcsolva (a megerősítő és jelszó-visszaállító linkeket ne írja át a követő szolgáltatás).
3. A megadott DNS rekordokat vedd fel a Cloudflare DNS-be – legegyszerűbb az **Auto configure** (Cloudflare) gomb. Ezek a rekordok **DNS only** (szürke felhő) módban legyenek.
4. Ajánlott DMARC rekord a jobb kézbesíthetőségért (Cloudflare → DNS → Add record): `TXT`, név: `_dmarc`, tartalom: `v=DMARC1; p=none;`
5. Ha a domain **Verified**, hozz létre egy kulcsot: **API Keys → Create API Key** (Sending access). Ezt a `RESEND_API_KEY` változóba írod majd.

## 5. A szerver előkészítése

Csatlakozz a szerverhez (a saját gépedről):

```sh
ssh root@A_DROPLET_IP_CIME
```

A szerveren:

```sh
# Rendszerfrissítés (a noninteractive beállítás miatt nem jönnek fel kérdező ablakok)
apt update && DEBIAN_FRONTEND=noninteractive apt upgrade -y

# Docker telepítése (hivatalos telepítő szkript)
curl -fsSL https://get.docker.com | sh

# 2 GB swap – biztonsági tartalék a build idejére
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Ha a frissítés új kernelt telepített ("Pending kernel upgrade"), indítsd újra, majd lépj be újra
reboot
```

### Tűzfal – DigitalOcean Cloud Firewall

A tűzfalat **nem a szerveren (ufw)**, hanem a DigitalOcean felületén állítjuk be: a Docker a közzétett portjainál megkerüli az ufw szabályait, a Cloud Firewall viszont a szerver *előtt* szűr.

**Networking → Firewalls → Create Firewall**, név: `newstrends-fw`

| Típus | Protokoll | Port | Forrás |
|---|---|---|---|
| SSH | TCP | 22 | All IPv4, All IPv6 |
| HTTP | TCP | 80 | All IPv4, All IPv6 |
| HTTPS | TCP | 443 | All IPv4, All IPv6 |

A kimenő szabályok maradjanak alapértelmezetten (minden engedélyezve), majd **Apply to Droplets** → `newstrends`. Az SSH-ba csak kulccsal lehet belépni.

> Opcionális szigorítás: a 80-as és 443-as port forrását le lehet szűkíteni a [Cloudflare IP tartományaira](https://www.cloudflare.com/ips/), így a szerver kizárólag a Cloudflare-en keresztül érhető el.

## 6. Az alkalmazás telepítése

```sh
# Kód letöltése és a .env létrehozása
git clone https://github.com/DoubleP14/project_2.git /opt/newstrends
cd /opt/newstrends
cp .env.production.example .env

# A négy belső titok automatikus generálása (az értékeket nem kell látni vagy másolni)
for v in POSTGRES_PASSWORD JWT_SECRET CRON_SECRET ENCRYPTION_KEY; do sed -i "s|^$v=.*|$v=$(openssl rand -hex 32)|" .env; done
```

> **Adatköltöztetésnél** (lásd 9. pont) az `ENCRYPTION_KEY`-t ezután írd át a helyi `.env`-ben lévő értékre, különben a mentett API kulcsok nem fejthetők vissza.

A többi érték kitöltése (`nano .env`, mentés: `Ctrl+O` → `Enter`, kilépés: `Ctrl+X`):
- `RESEND_API_KEY`: a 4. pontban létrehozott kulcs
- `STRIPE_SECRET_KEY`, `SZAMLAZZ_API_KEY`, `TELEGRAM_BOT_TOKEN`, `YOUTUBE_API_KEY`: a helyi `.env`-ből átmásolhatók
- `STRIPE_WEBHOOK_SECRET`: egyelőre üres, a 8. pontban kapjuk meg

> A `.env` tartalmáról ne készíts képernyőképet, és ne oszd meg – ha egy kulcs kikerült, cseréld le.

Cloudflare Origin tanúsítvány feltöltése – a **saját gépedről**, abból a mappából, ahová a két fájlt mentetted:

```sh
ssh root@A_DROPLET_IP_CIME "mkdir -p /opt/newstrends/deploy/certs"
scp origin.pem origin.key root@A_DROPLET_IP_CIME:/opt/newstrends/deploy/certs/
```

Majd a szerveren (a Windows Jegyzettömb CRLF sorvégeinek eltávolítása és a kulcs védelme):

```sh
cd /opt/newstrends/deploy/certs && sed -i 's/\r$//' origin.pem origin.key && chmod 600 origin.key && cd /opt/newstrends
```

> Ha a Jegyzettömb `.txt` végződéssel mentette a fájlokat, a szerveren nevezd át őket: `mv origin.pem.txt origin.pem` és `mv origin.key.txt origin.key`.

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
3. Frissítsd az oldalt – a szerepkört a rendszer minden kérésnél az adatbázisból olvassa, így megjelenik az **Admin** menüpont.

## 8. Stripe webhook

1. Stripe Dashboard (teszt mód / Sandbox) → **Developers → Webhooks** (`https://dashboard.stripe.com/test/workbench/webhooks`) → **Add destination**
   - Events from: Your account, payload: **Snapshot**, API verzió: `2026-05-27.dahlia` (egyezik a kódban lévővel)
   - Destination type: **Webhook endpoint**
   - URL: `https://newstrends.hu/api/stripe/webhook`
   - Esemény: `checkout.session.completed`
2. A végpont oldalán a **Signing secret** (`whsec_...`, **Reveal**) értékét írd a szerveren a `.env` `STRIPE_WEBHOOK_SECRET` változójába, majd:
   ```sh
   docker compose up -d
   ```
3. Teszt: **Beállítások → Előfizetés → Pro** csomag, fizetés a Stripe tesztkártyájával (`4242 4242 4242 4242`, bármilyen jövőbeli lejárat és CVC). Sikeres fizetés után a csomag Pro-ra vált, a Számlázz.hu sandboxban megjelenik a tesztszámla, a Stripe webhook oldalán pedig egy 200-as kézbesítés.

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
