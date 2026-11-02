# Test planı ve kanıtlar

## 2 Kasım 2026 — başlangıç kapsamı

- Birim: puan deadline/sınır örnekleri, XP sonucu/kota/cevapsız durumlar, iç yönlendirme allowlist'i ve strict Auth/profil girişleri. **32 test geçti.** TypeScript hesaplayıcıları yalnızca sözleşme önizlemesidir; PostgreSQL oyun motoru henüz yoktur.
- Veritabanı: yeni geliştirme Supabase projesinde, transaction içinde sentetik Auth kullanıcılarıyla anon/authenticated ve A/B/doğrulanmamış C bağlamları. **25 pgTAP testi geçti.** RLS, doğrudan yazma/XP reddi, motor rolü izolasyonu, case-insensitive kullanıcı adı, aktif/verified hesap, yasaklı/silinmiş hesap eski JWT reddi, dar Auth adaptörünün çalıştırılamaması ve RPC hız sınırı doğrulandı. Test sonunda rollback yapıldı; test kullanıcıları/profilleri kalıcı bırakılmadı.
- Lint ve TypeScript kontrolü geçti. Üretim build'i desteklenen Webpack modu ile geçti; Turbopack bu çalışma ortamında process/port iznine takıldı.
- Supabase güvenlik advisor: son kontrolde bulgu listesi boştu. Bu sonuç bütün uygulamanın güvenli olduğu iddiası değildir.
- Başlangıç tarayıcı testleri: ana sayfa/giriş navigasyonu, korunan profil yönlendirmesi, bozuk callback, strict API/Origin ve 320 px taşma. Chromium kurulup test bağlamı/seçicileri düzeltildikten sonra masaüstü ve mobil projelerde **8 test geçti**. Ana sayfanın masaüstü/mobil ekran görüntüleri görsel olarak incelendi; yatay sayfa taşması yok.

## Yerel test önkoşulları

`pnpm test:db` Docker ve yerel Supabase gerektirir. Bu makinede Docker daemon çalışmadığı için yerel temiz migration/DB tekrar kurulumu henüz doğrulanmadı. CLI'nin `supabase test db` çalıştırması `ECONNREFUSED 127.0.0.1:54322` ile sonuçlandı; bulut geliştirme DB'sindeki gerçek rol testleri bunun yerine tam temiz kurulum kanıtı sayılmaz.

`pnpm test:e2e` için `pnpm exec playwright install chromium` ve açık uygulama sunucusu gerekir. Snapshot/trace dosyaları gitignore altındadır. Testler gerçek OAuth sağlayıcısını taklit ederek AC-01'i geçti saymaz.

## CI

Workflow yalnızca varsayılan GitHub runner'larıyla çalışacak şekilde hazırlandı; henüz push veya CI çalıştırması yapılmadı. Ücretsiz Actions kotası ve hesap harcama ayarları yayın öncesi kontrol edilir; ücretli runner veya production secret kullanılmaz. Quality job lint/types/unit/build ve başlangıç E2E; database job Docker üstünde sıfırdan Supabase/migration/pgTAP çalıştırır. Fork koduna üretim sırları verilmez.

## Sonraki fazlarda zorunlu

Şartnamenin bölüm 20'sindeki bütün testler geçerlidir. Henüz eksik: 30 sorunun içerik yürütme denetimi; guest çerezi ve oturum izolasyonu; tek koltuk/tek aktif oda yarışları; ready/answer/idempotency yarışları; cron ve kullanıcı komutu çakışması; deadline sonrası red; üç turluk iki browser context akışı; özel Realtime üçüncü kişi reddi; XP ledger/kota/idempotent settlement; reconnect/forfeit ve altyapı abort; 45 saniyelik gerçek smoke maç.

GitHub OAuth ve e-posta doğrulama/recovery dış sağlayıcı ayarları tamamlanınca gerçek hesaplarla ayrıca doğrulanır. Üretime yayın için bütün AC maddeleri ve iki farklı cihaz smoke kanıtı gerekir.
