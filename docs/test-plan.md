# Test planı ve kanıtlar

## 2 Kasım 2026 — başlangıç kapsamı

- Birim: puan deadline/sınır örnekleri, XP sonucu/kota/cevapsız durumlar, iç yönlendirme allowlist'i ve strict Auth/profil girişleri. **32 test geçti.** TypeScript hesaplayıcıları yalnızca sözleşme önizlemesidir; PostgreSQL oyun motoru henüz yoktur.
- Veritabanı: yeni geliştirme Supabase projesinde, transaction içinde sentetik Auth kullanıcılarıyla anon/authenticated ve A/B/doğrulanmamış C bağlamları. **25 pgTAP testi geçti.** RLS, doğrudan yazma/XP reddi, motor rolü izolasyonu, case-insensitive kullanıcı adı, aktif/verified hesap, yasaklı/silinmiş hesap eski JWT reddi, dar Auth adaptörünün çalıştırılamaması ve RPC hız sınırı doğrulandı. Test sonunda rollback yapıldı; test kullanıcıları/profilleri kalıcı bırakılmadı.
- Lint ve TypeScript kontrolü geçti. Üretim build'i desteklenen Webpack modu ile geçti; Turbopack bu çalışma ortamında process/port iznine takıldı.
- Supabase güvenlik advisor: son kontrolde bulgu listesi boştu. Bu sonuç bütün uygulamanın güvenli olduğu iddiası değildir.
- Başlangıç tarayıcı testleri: ana sayfa/giriş navigasyonu, korunan profil yönlendirmesi, bozuk callback, strict API/Origin ve 320 px taşma. Chromium kurulup test bağlamı/seçicileri düzeltildikten sonra masaüstü ve mobil projelerde **8 test geçti**. Ana sayfanın masaüstü/mobil ekran görüntüleri görsel olarak incelendi; yatay sayfa taşması yok.

## Yerel test önkoşulları

İlk kontrolde Docker kapalıydı. Faz 2 çalışmasında Docker başlatıldı, yerel Supabase temiz kurulumunda üç migration ve seed uygulandı. `supabase test db` ile **25/25 pgTAP testi yerelde geçti**; Auth testlerinin yerel profilleri varken tekrar da geçti. Sayım testleri fixture UUID'leriyle sınırlıdır; mevcut meşru profiller sonucu bozmaz. `pnpm test:db` çalışan Docker ve yerel Supabase gerektirir.

`pnpm test:e2e` için `pnpm exec playwright install chromium` ve açık uygulama sunucusu gerekir. Snapshot/trace dosyaları gitignore altındadır. Testler gerçek OAuth sağlayıcısını taklit ederek AC-01'i geçti saymaz.

## Faz 2 — yerel Auth kanıtı

- Birim testleri **46/46** geçti. Yeni testler gerçek Route Handler'a sahte sağlayıcı yanıtları vererek signup/forgot/resend için geçici hata → 503, hız sınırı → 429/Retry-After, hesap varlığını gizleyen nötr yanıt, bilinmeyen alan reddi ve güvenli callback hedefini doğrular.
- `pnpm test:auth:local`: **1 gerçek uçtan uca zincir geçti**. Yerel Supabase Auth ve Mailpit ile kayıt → e-posta/PKCE doğrulama → profil → refresh → logout/login → recovery → eski parola reddi → yeni parola kabulü. Test tracing kapalıdır; sentetik hesaplar yalnızca yerelde oluşturulur.
- Lint, typecheck ve production build geçti. Genel foundation E2E'si yerel Auth testini bilerek atlar; ayrı komut zorunludur.
- Son genel E2E, derlenmiş üretim çıktısı üzerinde **8/8 geçti**; yerel Auth senaryosunun desktop/mobile kopyaları bu komutta kasıtlı atlandı. Ayrı `test:auth:local` komutunda gerçek yerel Auth zinciri 1/1 geçti.
- Gerçek GitHub sağlayıcısı smoke testi geçti: kullanıcı onaylı `user:email`, uzak Supabase callback → yerel profil, refresh, sign-out, korunan profile red ve yeniden giriş. Repository erişimi istenmedi. Uzak SMTP/e-posta teslimi ve Auth parola ayarı kontrolü açıktır; AC-01'in üretim e-posta kısmı tamamlanmadı. Adımlar `auth-checklist.md` içinde.

## CI

Faz 2'nin `a7f46a4` commit'ine ait [CI çalışmasında](https://github.com/burakkyildiz/DebugDuel/actions/runs/41446149331) quality geçti. Database job'ında pgTAP geçti; gerçek Auth E2E'si ikinci çıkıştan sonra `/profile` üzerinde kalıp ana sayfa beklentisinin süresini doldurdu. Bu nedenle önceki yerel başarı, o commit'in uzak CI başarısı sayılmaz.

Dar düzeltme: çıkış düğmesi hydration tamamlanana kadar devre dışıdır; başarılı logout yanıtından sonra aynı origin'deki ana sayfaya tam belge geçişi yapar. Eşzamanlı `router.replace` / `router.refresh` kaldırıldı. E2E artık iki çıkışta da POST 200 yanıtını, gerçek document navigation'ı, girişsiz menüyü ve profile yeniden erişimde login yönlendirmesini kontrol eder. Güncellenen gerçek yerel Auth zinciri geçti; lint ve 46 birim testi geçti. Düzeltme `998c828` ile push edildi; [CI 41452141699](https://github.com/burakkyildiz/DebugDuel/actions/runs/41452141699) **Success**: quality 1m 21s, database 4m 14s. Gerçek Auth E2E uzak runner üzerinde de geçti.

Workflow yalnızca varsayılan GitHub runner'larını kullanır; ücretsiz Actions kotası ve hesap harcama ayarları kontrol edilir, ücretli runner veya production secret kullanılmaz. Quality job lint/types/unit/build ve başlangıç E2E; database job Docker üstünde sıfırdan Supabase/migration/pgTAP ve gerçek yerel Auth E2E çalıştırır. Fork koduna üretim sırları verilmez.

## Sonraki fazlarda zorunlu

Şartnamenin bölüm 20'sindeki bütün testler geçerlidir. Faz 3’te 30 sorunun içerik yürütme denetimi eklendi; aşağıdaki Faz 3 kaydına bak. Henüz eksik: guest çerezi ve oturum izolasyonu; tek koltuk/tek aktif oda yarışları; ready/answer/idempotency yarışları; cron ve kullanıcı komutu çakışması; deadline sonrası red; üç turluk iki browser context akışı; özel Realtime üçüncü kişi reddi; XP ledger/kota/idempotent settlement; reconnect/forfeit ve altyapı abort; 45 saniyelik gerçek smoke maç.

GitHub OAuth gerçek hesapla doğrulandı; yerel e-posta/PKCE/recovery de geçti. Uzak/üretim e-posta teslimi ayrıca doğrulanır. Üretime yayın için bütün AC maddeleri ve iki farklı cihaz smoke kanıtı gerekir.

## Faz 3 — yerel DB ve içerik

`pnpm test:questions`: 30 soru, 81 davranış vakası; her hatalı sürüm için karşı örnek, her düzeltilmiş sürüm için tüm vakaların geçmesi; LF/satır/tek düzeltme/bölünmüş havuzlar/seed sapması denetimi. CI quality job'ına Python 3.12 ve bu komut eklendi.

`pnpm test:db`: 369 pgTAP testi. Yeni test dosyası gerçek anon/A/B/C bağlamlarında RLS/GRANT/EXECUTE ve katılımcı izolasyonu ile şema bütünlüğünü test eder. Fixture'lar ve test içi geçici rol grant'i transaction sonunda rollback edilir. Profil/Auth testleri korunur.

`pnpm test:db:clean`: ayrı rastgele project ID / 55322 portunda sıfırdan migration + seed + pgTAP; seed tekrarı ardından tekrar pgTAP. Sadece kendi oluşturduğu test konteyner/volume'ünü kaldırır. Geliştirme verisi korunur. Her iki tur başarılıdır.

48 birim testi (katalog import sınırı ve Data API şema kontrolü dahil), lint, typecheck, Webpack production build ve production build üzerinde 8 desktop/mobile foundation E2E; yerel security/performance advisor uyarısız. Bu fazda Auth E2E ayrıca yeniden koşulmadı; önceki Faz 2 kanıtı tarihsel olarak korunur. Motor yarışı, guest erişimi, Realtime ve Cron henüz test edilmedi. Ayrıntılar [Faz 3 raporunda](PHASE_3_REPORT.md).

## Faz 4 — Practice doğrulaması

`pnpm test:practice:local` gerçek yerel Supabase ve 3002 izole Next sunucusunu kullanır. Guest/hesaplı oynama, klavye/mobil, yenileme, iki guest izolasyonu, strict body/Origin, paralel start/answer retry, kaybolmuş HTTP cevabı, hesaplı onboarding öncesi erişim ve XP/istatistik izolasyonu test edilir. Gerçek 45 saniyelik timeout yalnızca desktop projesinde bir kez çalışır. Auth doğrulamasını üretimde atlayan kapı eklenmedi; hesaplı Practice testinin sentetik doğrulanmış hesabı yalnızca yerel admin fixture'ıdır ve gerçek parola girişi/JWT kullanır. Ayrı Auth e-posta E2E'sinin yerine geçmez.

56 birim testi, 420 pgTAP testi, lint/types/build; temiz ayrı DB kurulumunda migration/seed ve seed tekrarı başarılı. Hosted şema/anahtar ve fiziksel TTL temizliği sınırları [Faz 4 raporunda](PHASE_4_REPORT.md).

## Faz 5 — iki gerçek oturum / özel Realtime

`pnpm test:match:local` localhost-only Auth/DB/Realtime ile izole production build açar. İki browser context (ikincisi mobil), login/onboarding boyunca davet korunması, açık join, shared countdown, yanlış/doğru seçim, yenileme, paralel create/join/ready/answer, aynı receipt retry ve üçüncü kullanıcının HTTP/Realtime reddi test edilir. Public kanallar yerel tenant'ta kapalıdır; sahte yayın skor değiştirmez. WebSocket engellenmiş gerçek 45 saniyelik timeout polling/sync ile biter. Background heartbeat devam ederken Ready komutunun kaybolmaması da regresyon testidir. CI database job bu komutu çalıştırır; henüz push edilmediği için uzak başarı iddiası yoktur.

483 yerel DB testi (63 yeni), 63 birim testi. Yeni DB denetimleri aktör/izin/receipt/erken ifşa, gizli rakip seçimi, tek doğru kazanan, kesin DB zamanı/puan formülü, aktif koltukların açılması, XP/istatistiklerin değişmemesi ve server-only ağ limiti kapsamındadır. Temiz DB/seed tekrarı da aynı testleri geçirir. Son E2E kapanış sayıları ve ortam sınırları [Faz 5 raporunda](PHASE_5_REPORT.md).

Üç tur/Cron, istemciler kapalıyken ilerleme, otomatik reconnect/forfeit, XP settlement ve hosted iki hesap testi henüz bu kanıtların kapsamına girmez.

## Faz 6 — motor ve bağımsız Cron kanıtı

554 pgTAP (483 önceki +71 yeni), temiz migration/seed ve seed tekrarında geçti. Üç tur sırası/snapshot, geleceğin gizliliği, DB puan formülü, cross-round retry, deadline commit, 5/10 saniye health/gap, 30/15 saniye liveness, bozuk maç izolasyonu ve teknik cleanup sınanır. Fault-isolation fixture'ının tek SQLSTATE uyarısı beklenir. Test saati yalnız admin fixture verilerindedir; production request'ine saat/test modu eklenmedi.

`pnpm test:engine:local`: gerçek paralel DB oturumları; kilitli maçı SKIP LOCKED ile atlama, diğer due maçı ilerletme, Cron'un sonradan geri dönmesi; cevap lock beklerken deadline geçmesi ve geç cevabın hakkı/puanı tüketmeden tek timeout commit etmesi. Yalnız yerel fixture'lar kullanılır ve kaldırılır.

`pnpm test:match:local`: production build ile 4 desktop foundation +5 çok oturumlu motor testi. Gerçek üç tur (yanlış/doğru/iki yanlış/final toplam), WS engelli üç **gerçek 45 saniye** timeout, iki browser context tamamen kapatılıp katılımcı doğrudan SELECT ile Cron abort gözlemi, 7 saniye offline+refresh ve uzun kopmada forfeit. Service role'a oyun okuma izni verilmez. Public/üçüncü kişi WS ve HTTP denetimleri korunur. Sonuç 320 px screenshot'ı incelenir; uzun isimler tablo hücresinde sarılır.

67 unit, 81 soru davranış vakası; mevcut Practice/foundation production regression 19 geçti/1 bilinçli mobil duplicate timeout skip. Bu fazda Auth kodu değiştirilmedi; signup/e-posta/recovery zincirinin önceki kanıtı korunur, yeni hosted Auth smoke iddia edilmez. Yeni kod push edilmedi; CI job'a concurrency komutu eklenmesi uzak CI geçti anlamına gelmez. Nihai kanıt ve ortam sınırı [Faz 6 raporunda](PHASE_6_REPORT.md).

## Faz 8 — odaklı sağlamlaştırma

Güncel kanıt [PHASE_8_REPORT.md](PHASE_8_REPORT.md) içindedir. `pnpm test:load:local` yalnız localhost üzerinde izole production build, 20 maç/40 oyuncu/40 private kanal, üç tur ve tek settlement/ledger ölçümü yapar. Mevcut kullanıcı verisini silmez; kendi fixture'larını kaldırır. Ayrıca 80 HTTP leaderboard isteğinde 60 başarılı/20 adet Retry-After'lı 429 doğrular. Bu test CI database işine eklendi. Yerel başarısı hosted kapasite kanıtı değildir.

`test:engine:local` şimdi farklı maç kilitleri altında aynı profil çiftini kullanan altı eşzamanlı settlement trigger'ını da sınar: ters host sırasına rağmen beş ödül slotu, altı profil artışı ve 12 ledger. Yeni admission pgTAP testleri server-only EXECUTE, RLS action sınırı, 60/120 pencere ve doygun sayacı kapsar. Yeni unit testleri güvenilmeyen IP header'ı, hata/503, 429 ve güvenli request loglarını; foundation E2E nonce tekilliği, hydration ve skip-link odağını doğrular. Practice E2E Enter + Arrow ile gerçek satır seçer. Güncel toplam 75 unit ve 590 DB kontrolüdür.
