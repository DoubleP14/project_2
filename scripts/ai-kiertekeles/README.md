# AI-kiértékelés

Ez az eszköz méri, mennyire egyeznek az AI pontszámai és összefoglalói egy ember megítélésével. Az eredmény a szakdolgozat Tesztelés fejezetéhez készül.

A cikkek és az eredmények a `munka/` mappába kerülnek. Ez nincs verziókezelve, mert a cikkek szövege nem a miénk.

## Lépések

### 1. Export letöltése az éles szerverről

A hírek 7 nap után törlődnek, ezért a letöltött fájl őrzi meg a mintát. A szerveren, a saját e-mail címeddel:

```bash
cd /opt/newstrends && git pull
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" --csv -v ON_ERROR_STOP=1 -v email=SAJAT_EMAIL' < scripts/ai-kiertekeles/minta.sql > /tmp/minta.csv
wc -l /tmp/minta.csv
```

A saját gépeden, PowerShellben, a projekt mappájában:

```powershell
New-Item -ItemType Directory -Force scripts/ai-kiertekeles/munka
scp root@SZERVER_IP:/tmp/minta.csv scripts/ai-kiertekeles/munka/minta.csv
ssh root@SZERVER_IP rm /tmp/minta.csv
```

Legalább kb. 200 elemzés kell, hogy a ritka esetek (kiemelt hír, erős clickbait) is bekerüljenek. Ha kevesebb van, várj még néhány napot.

### 2. Gyors vizsgálat kézi pontozás nélkül (nem kötelező)

```bash
node scripts/ai-kiertekeles/3-kiertekeles.mjs --csak-export
```

### 3. Pontozólap készítése

```bash
node scripts/ai-kiertekeles/1-pontozolap.mjs --db 60
```

Két fájl készül:
- `munka/pontozolap.csv`: ezt töltöd ki.
- `munka/kulcs.csv`: az AI pontszámai. **Pontozás előtt ne nyisd meg**, különben a pontjaidat befolyásolhatják.

### 4. Kézi pontozás

Nyisd meg Excelben a `pontozolap.csv` fájlt, töltsd ki a sorokat az alábbi skála szerint, és mentsd **CSV UTF-8** formátumban, ugyanezzel a névvel. Részletekben is haladhatsz.

Először a cikk alapján add meg a saját pontjaidat, és csak utána olvasd el az `ai_osszefoglalo` oszlopot. Ha a `szoveg` oszlop kevés, nyisd meg az `url` címet.

### 5. Más modellek futtatása (nem kötelező)

Ugyanazokat a cikkeket elemzi más modellel, az élessel azonos kóddal és prompttal. A saját kulcsodat használja, ezért költsége lehet. PowerShellben:

```powershell
$env:AI_KULCS = Read-Host "AI kulcs"
node scripts/ai-kiertekeles/2-modellfuttatas.mjs --szolgaltato GROQ --modell openai/gpt-oss-120b
Remove-Item Env:AI_KULCS
```

Ha megszakad, ugyanezzel a paranccsal folytatható.

### 6. Eredmény

```bash
node scripts/ai-kiertekeles/3-kiertekeles.mjs
```

Az eredmény a `munka/eredmeny.md` fájlba kerül.

## Pontozási skála

A skála megegyezik az AI promptjával, hogy ugyanazt a kérdést kapja az ember és a modell. Az éles prompt az `src/lib/server/services/aiService.ts` fájlban van.

### `sajat_hirertek` (0–100)

Mekkora a hír jelentősége egy cégvezető vagy elemző számára? Hány embert, céget vagy piacot érint, és milyen tartós a hatása? Az nem számít, mennyire megrázó vagy érdekes a történet.

| Pont | Jelentés |
|---|---|
| 0–30 | Bulvár, pletyka, időjárás, human interest, celebek, egyéni érdekességek |
| 31–60 | Normál napi hír: egyedi bűnügy vagy baleset, napi politikai csörte, sporteredmény, kisebb üzleti hír |
| 61–80 | Országos jelentőségű döntés vagy törvény, nagyobb cég vagy szektor fontos eseménye, jelentős nemzetközi fejlemény |
| 81–100 | Háború fontos fordulata, makrogazdasági esemény, a piacot vagy az országot széles körben érintő esemény |

### `sajat_clickbait` (0–100)

Csak a cím megfogalmazását pontozd a szöveghez képest. A téma súlya nem számít.

| Pont | Jelentés |
|---|---|
| 0–30 | Tényszerű cím, amely megmondja a lényeget |
| 31–70 | Metafora, kontextus nélküli idézet, enyhe túlzás, érzelemkeltő szófordulat |
| 71–100 | Szándékosan visszatartja a lényeget, vagy hamisan állít a szöveghez képest |

### `sajat_hangulat`

Az esemény jellege alapján:
- `P` (pozitív): növekedés, áttörés, árcsökkenés, üzleti siker, sportgyőzelem, új beruházás.
- `N` (negatív): baleset, bűncselekmény, háború, romlás, botrány, haláleset.
- `S` (semleges): tényszerű bejelentés, pártpolitikai vita, törvényjavaslat.

### `osszefoglalo_pontos`

- `2`: pontos és magyar nyelvű.
- `1`: lényegében jó, de hiányos, vagy nyelvi hiba van benne.
- `0`: hibás: téves tény, felcserélt szereplő, kitalált állítás, vagy nem magyar nyelvű.

Előszűrt soroknál `-` áll benne, ezt hagyd így. A `megjegyzes` oszlopba röviden írd le a hibát, ez a dolgozatban példaként használható.

## Módszertani korlátok

Ezeket a dolgozatban is érdemes jelezni:
- Egy pontozó van, ezért az eredmény az ő megítélését mutatja. Egy második pontozó néhány cikkre már megmutatná, mennyire egyeznek az emberek.
- A pontozó ugyanazt a skálát használja, mint a prompt. Ez az illeszkedést méri, nem azt, hogy a skála jó-e.
- A minta rétegzett: a ritka eseteket felülsúlyozza, ezért az arányok nem a teljes hírfolyamot írják le. A teljes export számai külön szakaszban vannak.
- Az összefoglalót a pontozó látja, ezért a `sajat_*` pontokat érdemes előtte megadni.
- Az előszűrés mérése csak a kiszűrt cikkeket vizsgálja: azt nem méri, hány gyenge cikk jutott át.
- Tokenfogyasztást az eszköz nem mér, csak válaszidőt.
