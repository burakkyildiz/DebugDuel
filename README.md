# Debug Duel

**Find the bug. Beat your rival.** İki arkadaşın aynı Python mantık hatasını bulmak için yarıştığı web uygulaması.

Ana kaynak: [proje şartnamesi](docs/DEBUG_DUEL_PROJECT_SPEC.md). Çalışma yönergeleri [AGENTS.md](AGENTS.md), durum kaydı [docs/progress.md](docs/progress.md).

## Mevcut durum

Başlangıç temeli hazır: Next.js iskeleti, koyu/mor responsive ana sayfa, giriş/kayıt/recovery ekranları ve Auth handler'ları, gerçek Supabase profil tablosu ve kontrollü profil güncelleme fonksiyonları. Leaderboard ilk 25 gerçek kaydı okur; henüz maç olmadığından doğal boş durum gösterir.

**Practice yerelde oynanabilir.** Özel düello henüz hazırlık durumundadır. Yerel Practice için `pnpm practice:local` çalıştırıp `http://localhost:3002/practice` aç. Uzak geliştirme ortamına migration/seed uygulandı, server secret key yapılandırıldı ve migration geçmişi resmî repair ile eşleştirildi; [Faz 4 raporuna](docs/PHASE_4_REPORT.md) bak. 30 soruluk özel banka ve oyun şeması yerelde hazırdır. Practice akışı, üç turluk atomik motor, özel Realtime, Cron ve XP settlement sonraki fazlardır. Faz 3 kanıtları ve hosted ortam sınırı [Faz 3 raporundadır](docs/PHASE_3_REPORT.md). Mevcut Auth kodu gerçek sağlayıcı smoke testleri tamamlanmadan üretime hazır sayılmaz.

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

`.env.local` içine kendi ortamının değerlerini koy; var olan dosyayı bu komutla ezme. Secret'ları sohbet veya Git üzerinden paylaşma. Bu çalışma alanında oluşturulan `.env.local` zaten ayrı Debug Duel projesinin URL/publishable key değerlerini ve üç rastgele uygulama secret'ını içerir. Sunucu Supabase secret key'i henüz ekli değildir; Auth/profil için gerekli değildir, guest Practice fazında gerekli olacaktır.

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
