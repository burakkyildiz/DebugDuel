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

Başlangıç kodu GitHub'a push edildi; uzak CI sonucu bu fazda okunmadı ve başarılı varsayılmaz. Kullanıcı güncel Faz 2 değişikliklerinin de commit/push edilmesini istedi. Workflow yalnızca varsayılan GitHub runner'larını kullanır; ücretsiz Actions kotası ve hesap harcama ayarları kontrol edilir, ücretli runner veya production secret kullanılmaz. Quality job lint/types/unit/build ve başlangıç E2E; database job Docker üstünde sıfırdan Supabase/migration/pgTAP ve gerçek yerel Auth E2E çalıştıracak şekilde güncellendi. Fork koduna üretim sırları verilmez.

## Sonraki fazlarda zorunlu

Şartnamenin bölüm 20'sindeki bütün testler geçerlidir. Henüz eksik: 30 sorunun içerik yürütme denetimi; guest çerezi ve oturum izolasyonu; tek koltuk/tek aktif oda yarışları; ready/answer/idempotency yarışları; cron ve kullanıcı komutu çakışması; deadline sonrası red; üç turluk iki browser context akışı; özel Realtime üçüncü kişi reddi; XP ledger/kota/idempotent settlement; reconnect/forfeit ve altyapı abort; 45 saniyelik gerçek smoke maç.

GitHub OAuth gerçek hesapla doğrulandı; yerel e-posta/PKCE/recovery de geçti. Uzak/üretim e-posta teslimi ayrıca doğrulanır. Üretime yayın için bütün AC maddeleri ve iki farklı cihaz smoke kanıtı gerekir.
