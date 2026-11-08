# Debug Duel

**Find the bug. Beat your rival.** İki arkadaşın aynı Python mantık hatasını bulmak için yarıştığı web uygulaması.

Ana kaynak: [proje şartnamesi](docs/DEBUG_DUEL_PROJECT_SPEC.md). Çalışma yönergeleri [AGENTS.md](AGENTS.md), durum kaydı [docs/progress.md](docs/progress.md).

## Mevcut durum

[Ücretsiz pilot canlıda](https://debug-duel-burakkyildiz.vercel.app). Misafir Practice, GitHub/e-posta hesabı, davetli üç turluk düello, özel Realtime/Cron, XP/istatistik/geçmiş ve gerçek leaderboard çalışır. Koyu arayüz turuncu vurgu kullanır. İki fiziksel cihaz maçı ve yeni parola kurtarma/giriş kullanıcıca doğrulandı; kod `37fb0d3` için CI başarılı.

Geliştirme ve üretim Supabase projeleri ayrıdır. Gmail SMTP düşük hacimli pilot içindir; kapasite/SLA ve Auth restore garantisi verilmez. Kanıtlar, ortam sınırları ve rollback sırası [Faz9 raporunda](docs/PHASE_9_REPORT.md) ve [yayın rehberinde](docs/deployment.md). Yerel iki hesaplı oyun için `pnpm match:local` → `http://localhost:3006`; yerel Practice için `pnpm practice:local` → `http://localhost:3002/practice`.

## Gereksinimler

- Node.js `24.12.0` (`.nvmrc`), pnpm `11.25.0`.
- Soru içerik denetimi için Python 3 (CI: 3.12), ek Python paketi gerekmez.
- Yerel Supabase/DB testleri için çalışan Docker. Supabase CLI `2.122.0` geliştirme bağımlılığıdır.
- Dış servisler yalnızca ücretsiz planda kullanılabilir. Ücretli branch, compute, SMTP veya plan yükseltmesi yapılmaz.

## Çalıştırma

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
```

`.env.local` içine kendi ortamının değerlerini koy; var olan dosyayı bu komutla ezme. Secret'ları sohbet veya Git üzerinden paylaşma. URL/publishable key, sunucu Supabase secret key ve üç uygulama secret'ı için `.env.example` alanlarını kullan. Üretim anahtarlarını yerel geliştirme veya Preview ortamına taşıma.

```sh
pnpm dev
```

Uygulama: `http://localhost:3000`. Origin denetimi `NEXT_PUBLIC_SITE_URL` ile eşleşir; farklı hostname/port kullanırsan bu değişkeni de değiştir. Fontlar paketle yerel sunulur; Google Fonts isteği yapılmaz. Build ve dev bu ortamın Turbopack port kısıtı nedeniyle desteklenen Webpack modunu kullanır.

## Yerel Supabase

Docker'ı başlat, ardından:

```sh
pnpm exec supabase start
```

CLI çıktısındaki yerel API URL ve publishable key'i `.env.local` içine aktar; çıktıda sunucu anahtarları da bulunabileceğinden paylaşma. Yerel Studio `http://127.0.0.1:54323`, e-posta test kutusu `http://127.0.0.1:54324` adresindedir. E-posta doğrulaması açık, minimum parola 12 karakterdir. Başlangıçtaki migration'lar boş veritabanına uygulanır; mevcut yerel veriye migration uygulamak için kurulu CLI'nin `supabase migration up --help` çıktısını kontrol et.

`supabase db reset` **yerel veriyi siler**. Bu komut normal kurulum için gerekmez; temiz migration testi için yalnızca yerel test ortamında, silme etkisi bilinerek kullanılabilir. Uzak/üretim ortamında reset kullanılmaz.

GitHub OAuth yerel ayarlarında sağlayıcıyı ayrıca etkinleştir; OAuth client secret'ı frontend env'sine koyma. Gerçek sağlayıcı ayarları için [yayın rehberi](docs/deployment.md).

## Kontroller

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:questions
pnpm test:db
pnpm test:db:clean
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:auth:local
pnpm test:practice:local
```

`test:questions`, güvenilir repository kodunun hatalı/düzeltilmiş sürümlerini 81 davranış vakasında denetler; API kullanıcı kodu çalıştırmaz. Soru ekleme/düzenleme için `supabase/questions/catalog.json` kullan, yeni içerik için version artır; `python3 scripts/check-questions.py --write-seed` ile seed üret ve farkı incele. Uygulamaya katalog import etme.

`test:db:clean` Docker ile ayrı rastgele proje kimliğinde ve 55322 portunda temiz DB kurar, migration/seed/test ve seed tekrarını doğrular, yalnızca kendi geçici ortamını kaldırır. Geliştirme DB'sine reset atmaz.

Mevcut DB'de yeni migration ve seed uygulamak için: `pnpm exec supabase migration up --local`, ardından `pnpm exec supabase db query --local --file supabase/seed.sql`. Tipler: `pnpm db:types`. Bu oturumun Faz 3 migration'ları hosted projeye uygulanmadı.

`test:db` çalışan yerel Supabase ister. E2E'den önce ayrı terminalde `pnpm dev` başlat; varsayılan test URL'si `http://localhost:3000`, gerekirse `PLAYWRIGHT_BASE_URL` kullan. Başlangıç E2E testleri sayfa akışları, erişim yönlendirmesi, Origin/gövde doğrulaması ve 320 px taşmayı kapsar; gerçek düello testi değildir. CI uygulamayı ayrıca başlatır. Mevcut test kanıtları ve kalan testler [test planında](docs/test-plan.md).

`test:auth:local` için yerel Supabase ve Chromium gerekir. Komut kendi izole 3001 sunucusunu açıp gerçek yerel e-posta/PKCE/profil/recovery zincirini test eder; uzak `.env.local` bağlantısını değiştirmez. Normal `test:e2e` bu yerel testi atlar; ayrı komutla çalıştırılır. GitHub ve uzak Auth için açık kalan adımlar [Auth kontrol listesinde](docs/auth-checklist.md).

## Veri ve güvenlik

- İstemciler profil tablosunu doğrudan yazamaz. Profil komutları yalnızca doğrulanmış ve etkin hesabı değiştirir; XP/istatistikler bu fonksiyonlarla değişmez.
- Kullanıcı adı ASCII 3–20 karakterdir; büyük/küçük harf duyarsız benzersizdir.
- Özel yardımcılar Data API'ye açılmaz; profil motoru NOLOGIN rolüdür. Korumalı Supabase Auth tablosunu okuyan dar, argümansız adaptörün ayrıcalık gerekçesi [karar kaydında](docs/decisions.md).
- Public şema tipleri güncel yerel Supabase'den üretildi. İlk üç profil migration'ı hosted geçmişle eşleşir; yeni Faz 3 migration'ları yalnızca yerelde uygulandı.
- Manuel hesap silme talebi için proje sahibine başvurulur. Üretime açılmadan önce devre dışı bırakma, oturum sonlandırma, profil/gelecek maç geçmişi anonimleştirme prosedürü tamamlanmalıdır. FK'ler geçmişi cascade ile silmez.

## Dizinler

`src/app`: sayfalar/API; `src/components`: ortak bileşenler; `src/lib`: Auth, doğrulama, güvenlik ve kural yardımcıları; `src/content`: İngilizce metinler; `supabase`: migration ve DB testleri; `tests`: birim/E2E; `docs`: mimari, kararlar ve ilerleme.

`test:practice:local` artık 3003 portunda `.next-practice-test` dizinine ayrı production build oluşturur; Practice ile foundation testlerini birlikte çalıştırır. Açık 3002 önizlemesi ve onun guest imza anahtarı/kotası korunur. İzole test ortamının sunucusu sonunda kapanır. Testler yalnızca yerel Supabase'i kabul eder; gerçek hosted sunucu anahtarları kullanılmaz.

## Faz 5 — yerel iki oyunculu deneme

Davetli tek tur şu anda yerelde çalışır: **1 × 45 saniye**, maç içi puan, XP/kalıcı istatistik yok. Sonraki faz üç tur ve istemciden bağımsız Cron ilerleticisidir. Güncel kapsam ve ortam farkı: [Faz 5 raporu](docs/PHASE_5_REPORT.md).

Yerel Supabase Auth, PostgREST ve **Realtime** açık olmalıdır. `pnpm match:local` izole ortam değişkenleriyle `http://localhost:3006/play` önizlemesini açar; `.env.local` ve hosted proje değişmez. Yerel e-posta doğrulamasını Supabase'in yerel posta kutusunda tamamla, iki ayrı tarayıcı profili/gizli pencere kullan, her hesap için profil oluştur. İlk oyuncu oda açıp daveti paylaşır; ikinci oyuncu giriş/profil sonrasında **Join Match** der; iki taraf **Ready** olur. Yerel GitHub sağlayıcısı yapılandırılmamıştır; e-posta hesabı kullanılır.

`pnpm test:match:local` 3005 portunda ayrı production build ve iki izole hesapla gerçek DB/Auth/özel Realtime testlerini çalıştırır. Yerel Realtime tenant'ında public kanal erişimini kapatır. Testler sentetik hesapları yalnızca yerel projeye yazar; bu kayıtlar geliştirici DB'sinde kalabilir. Başka porttaki önizlemeler korunur. 3 Kasım takip: Hosted Faz 5 migration'ları ve Realtime private-only ayarı uygulandı. Hosted ve yerel hesaplar ayrıdır; uzak gerçek iki hesaplı browser smoke ayrıca bekler.

## Faz 6 — üç tur ve gerçek Cron

Yeni yerel odalar üç tur oynar: easy → medium → hard, tur başına 45 saniye, aralarda 5 saniye açıklama +3 saniye countdown. XP/profil istatistikleri Faz 7'de kalır. Önceki stage-5 odalar tek tur olarak korunur; yeni motoru denemek için yeni oda oluştur.

`pnpm match:local` ile mevcut iki yerel e-posta hesabını kullanıp 3006'dan deneyebilirsin. `GET /api/health` ready=true olmalıdır; runner hem uygulamayı hem gerçek Cron sağlığını bekler. Yerel e-posta kutusu `http://localhost:54324`, onay bağlantısı kayıt yapılan aynı tarayıcı oturumunda açılır. Hosted 3000 bağlantısı Faz 5 DB'sidir; Faz 6'nın dört migration'ı henüz oraya uygulanmadı.

`pnpm test:engine:local` iki gerçek PostgreSQL oturumuyla kilit/deadline yarışlarını sınar, yalnız yerel fixture'ları oluşturup temizler. `pnpm test:match:local` üç gerçek 45 saniyelik tur, kopma ve tarayıcılar kapalıyken gerçek Cron dahil production E2E'dir; yaklaşık beş dakika sürebilir. Odaklı tekrar: `pnpm test:match:local --grep 'real Cron aborts'`. Son teslim kanıtları ve sınırlar: [Faz 6 raporu](docs/PHASE_6_REPORT.md).
