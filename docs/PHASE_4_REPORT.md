# Faz 4 — Practice

2 Kasım 2026. Kullanıcı Faz 3 sonrasında devam edilmesini istedi. Bu kapsam commit/push veya production yayınını içermez.

## Uygulama

- Guest ve doğrulanmış hesap için gerçek DB tabanlı Practice: rastgele yalnızca Practice havuzundan soru, 45 saniye, tek cevap, ardından açıklama ve düzeltilmiş kod.
- Guest cookie 32 byte rastgele kimlik + zaman + HMAC içerir; HttpOnly, SameSite=Lax, production Secure. DB'ye yalnızca HMAC özeti gider. GET cookie oluşturmaz. Bootstrap POST aynı-origin ve strict JSON denetler.
- Hesaplı RPC doğrulanmış JWT ile çalışır. Mevcut profil yazıcısının `ensure_profile` komutunu yeniden kullanır; ayrıcalıklı Auth adaptörünün sahibi, tanımı ve EXECUTE sınırı genişletilmedi. Onboarding gerekmez; doğrulanmış hesabın eksik profil temeli idempotent oluşturulabilir, XP/istatistik değişmez.
- Ayrı NOLOGIN/NOINHERIT Practice rolünün maç, profil veya ledger yazma yetkisi yoktur. Guest RPC yalnızca server-only ayrıcalıklı istemciye açık; service rolü iç komuta hesap UUID'si sağlayamaz.
- Cevap işlemi satırı kilitledikten sonra DB saatini alır. Aynı key/gövde aynı sonucu, farklı gövde conflict döndürür. Start retry yeni soru veya oturum üretmez. GET salt oturum okumasıdır; DB deadline sonrası çözüm gösterilir. Rate limit sayaçları DB'dedir.
- API strict gövde, boyut, Origin, UUID ve Idempotency-Key kontrol eder; no-store yanıt ve kapalı alan listesi kullanır. Cookie döndürme ile IP limiti aşılmaz. Vercel dışındaki doğrulanmamış proxy bilgisi yerine ortak muhafazakâr ağ kotası kullanılır.
- UI salt okunur Python renklendirmesi, native radio/klavye seçimi, sunucu saatine göre sayaç, sonuç odak yönetimi, query'deki oturum kimliğiyle yenileme, aynı key ile hata sonrası retry içerir. URL'deki UUID sahiplik kanıtı değildir.

## Ortam sınırı

İki yeni Practice migration'ı yalnızca yerelde uygulandı. Hosted proje hâlâ önceki profil migration'larındadır; hosted `.env.local` için sunucu secret key eksiktir. Anahtar sohbetten istenmedi/yazdırılmadı, `.env.local` değiştirilmedi. `pnpm practice:local` gerçek yerel Supabase ayarlarını yalnızca child process ortamına alıp 3002'de önizleme açar; uzak projeye yazmaz. Bu başlatıcı yeniden açıldığında guest imza anahtarı yenilenir, önceki guest çerezleri geçersiz olur. Üretimde sabit secret kullanılır.

Practice kayıtları 24 saatte erişime kapanır. Fiziksel süreli silme işi, diğer teknik kayıtların bakımıyla birlikte işletim fazında hâlâ gereklidir. Realtime, düello, XP settlement ve üretim teslimi bu fazın kapsamında değildir.

## Doğrulama

- 56 birim testi, lint, typecheck, Webpack production build geçti.
- 420 pgTAP testi geçti: guest/hesap sahipliği, kapalı RPC/rol sınırları, erken reveal, deadline, tekrar/conflict, rate limit, Practice havuzu ve XP/istatistik izolasyonu.
- Yerel güvenlik advisor: uyarı yok.
- Tarayıcı ve temiz kurulum testlerinin son sonucu aşağıdaki tamamlanma kaydında tutulur.

## Güvenlik incelemesi

Yeni RPC → DB ve browser → API → RPC yolları; çerez imzası/süre, kullanıcılar arası sahiplik, early reveal, strict body/Origin, minimum rol/EXECUTE, retry ve deadline sınırı incelendi. İncelenen kapsamda doğrulanmış açık güvenlik bulgusu kalmadı. Yerel test fixture'ları dışında gerçek kullanıcı verisine erişilmedi. Hosted ortam, fiziksel TTL temizliği ve henüz uygulanmayan düello motoru bu doğrulamanın dışındadır.

## Tamamlanma kaydı

- Gerçek yerel HTTP/DB üzerinde 11 Practice E2E testi geçti; mobilde aynı 45 saniyelik test bilinçli skip edildi (desktop gerçek 45 saniye geçti). Desktop ve mobile hesaplı/guest akışları, 20 paralel start/answer, response-loss retry, üçüncü kişi reddi ve 320 px taşma kontrolü başarılı.
- Ayrı temiz DB'de tüm migration'lar/seed sıfırdan uygulandı; 420 test geçti. Seed tekrarından sonra aynı 420 test yeniden geçti; geçici ortam kaldırıldı.
- Desktop sonuç ekranı görsel olarak incelendi. İzole Next çıktı dizini ESLint kapsamı dışında tutuldu; üretim build çıktısı uygulama kaynak denetimine karışmaz.
- Yerel Faz 4 çıkış akışı doğrulandı. Yeni geliştirme/commit/push/deploy kendiliğinden başlatılmaz.

Ek foundation kontrolü: 3002 dev sunucusunda 6 paralel worker ile ilk koşu gezinme/ERR_ABORTED hataları verdi (4/8); tek worker ile tekrarında 8/8 geçti. Paralel dev gezinme kararsızlığı üretim regresyonu olarak doğrulanmadı; güncel production build başarılı olsa da bu oturumda yeni production sunucusu üstünde foundation E2E yeniden koşulmadı.

## Kullanıcı geri bildirimi — sonuç görünürlüğü

Doğru/yanlış/timeout için ikon ve açık metinli ayrı sonuç kartı eklendi. Seçilen ve doğru satır birlikte gösterilir; Next Question kartın içindedir. Açıklama ve düzeltilmiş kod başlangıçta kapalı native details/summary bölümündedir. Sonuçta odak ve kaydırma bu karta gider; devam etmek açıklamayı okumaya bağlı değildir.

Yerel önizlemede ortak Practice ağ kotası 20'ye ulaştı; oyuncu başına en yüksek sayaç 15'ti. Yalnızca yerel DB'de bu saate ait Practice başlatma sayaçları temizlendi. Rate-limit mesajına saatlik 20 yeni soru sınırı eklendi; Retry-After süresince tekrar/next eylemleri kapatılır, süre sonunda açılır. Üretim DB/kota kuralları değiştirilmedi.

Kullanıcının sonraki isteğiyle tek kod bloğunda cevap incelemesi uygulandı: doğru satır yeşil, hatalı seçilen satır kırmızı; satır etiketleri renge ek anlam taşır. Aktif soruda doğru satır işaretlenmez; yalnızca server çözümü geldikten sonra görünür. Açılır açıklama artık yalnızca metin içerir; ikinci düzeltilmiş kod bloğu kaldırıldı. Mobil doğru/yanlış senaryolarında tek blok, satır sınıfları, görünür Next ve açıklama aç/kapa doğrulandı; lint/typecheck geçti.

## Push öncesi kontrol

- Kullanıcı güncel UI değişiklikleri sonrası push öncesi kontrollerin tamamlanmasını istedi; henüz commit/push yapılmadı.
- Test başlatıcısı 3003 / `.next-practice-test` üzerinde izole production build kullanacak şekilde düzeltildi. 3002 kullanıcı önizlemesi çalışmaya devam eder; test anahtarı ve kotası ayrıdır. Önceki paralel dev gezinme belirsizliği yerine güncel üretim derlemesiyle browser → API → DB doğrulaması yapılır.
- 56 birim testi, 420 DB testi, lint/typecheck geçti. Commit adayı dosyalarda yerel secret değerleri için tarama eşleşme vermedi; değerler loglanmadı.
- Hosted migration geçmişi tekrar salt okunur kontrol edildi: yalnızca ilk üç profil migration'ı var. `SUPABASE_SECRET_KEY` yapılandırılmış değil. Uzak uygulama için 4 bekleyen migration (iki Faz 3 + iki Faz 4), seed, server secret ve gerçek guest/account smoke gerekir. Bunlar Git push tarafından otomatik yapılmaz.

Son production koşusu: 19 E2E başarılı (11 Practice + 8 foundation), 1 bilinçli mobil duplicate-timeout skip. Yeni doğru/yanlış satır gösterimi, açıklama/Next düzeni ve rate-limit UI güncel derlemeye dahildir. Next'in geçici test dizini tip yolları ayıklanmıştır.

## 3 Kasım 2026 — uzak geliştirme uygulaması

Kullanıcı sunucu key'ini .env.local'e ekledi; değer yazdırılmadan doğru proje ve başarılı sunucu kimlik doğrulaması kontrol edildi. Kullanıcının devam talimatıyla dört bekleyen migration ve 30 soruluk seed yalnızca `hvqklcqyjqjwwwcsioch` geliştirme projesine uygulandı. Önceki hosted eksik kayıtları bu tarihten önceki durumu anlatır.

CLI PAT yapılandırılmadığından Supabase connector kullanıldı. Connector aşağıdaki uzak sürümleri atadı; SQL içerikleri repository migration'larıyla aynıdır:

| Repository | Uzak sürüm |
| --- | --- |
| 20261102133621_game_schema | 20261102205846 |
| 20261102134054_game_integrity | 20261102205850 |
| 20261102142125_practice_engine | 20261102205858 |
| 20261102151328_practice_guest_boundary | 20261102205901 |

Uzak metadata'daki bu dört sürümü yerel sürümlerle eşleştiren UPDATE otomatik onay incelemesi tarafından reddedildi; metadata yeniden yazma ayrıca yetkilendirilmemiş ve gelecekte migration takibini bozma riski gerekçe gösterildi. İşlem uygulanmadı. Yerel dosyalar yeniden adlandırılmadı; bu fark giderilmeden CLI db push yapılmamalı.

Doğrulama: uzak havuz/zorluk dağılımı 6 × 5; HTTP guest create/hidden-solution/ownership/early-reveal/answer/retry başarılı. Hesaplı akış uzak DB'de sentetik doğrulanmış kullanıcı/rol bağlamında başarılı; fixture ve sonuçları transaction sonunda rollback edildi, XP/istatistik değişmedi. Bu kontrol gerçek uzak OAuth tarayıcı testinin yerine geçmez. pgTAP uzakta kurulu olmadığı için 420 test uzak ortamda yeniden çalıştırılmış sayılmaz.

Uzak security advisor şema uyarısı vermedi; Auth leaked-password-protection kapalı uyarısı var, ücretli özellik açılmadı. Performance advisor iki bileşik FK için indeks bilgilendirmesi ve yeni henüz kullanılmamış indeksler raporladı; motor fazında sorgu yüküyle değerlendirilir.

Uzak veri tabanına bağlı ayrı uygulama önizlemesi 3004 portundadır; normal 3002 yerel önizlemesi korunur. Commit/push veya production yayın yapılmadı.

## 3 Kasım — migration repair hazırlığı

Kullanıcı güvenli düzeltme akışına açık onay verdi. `.local-backups/migration-repair-20261103` altında gitignore'a alınmış uzak migration geçmişi ve public/private tablo/sütun/kısıt/indeks/policy/fonksiyon/ACL tanımlarının salt okunur snapshot'ı kaydedildi; kullanıcı satırları dışa aktarılmadı. Bu kayıt tam veri yedeği değildir. Dört uzak SQL kaydı repository dosyalarıyla (yorum/boşluk/statement ayırıcıları normalize edilerek) eşleşti.

Resmî CLI login başlatıldı; tarayıcıda kullanıcı doğrulaması bekleniyor. Secret API key CLI erişim token'ı değildir. Repair henüz uygulanmadı. Giriş sonrası plan: önce repository sürümlerini applied olarak kaydet; sonra connector sürümlerini yalnızca history'den reverted olarak kaldır; migration list ve db push --dry-run ile bekleyen SQL olmadığını kontrol et; şema snapshot'ının değişmediğini doğrula ve Practice smoke'u tekrarla. CLI repair DDL çalıştırmaz; hiçbir reset veya migration SQL tekrar uygulaması yapılmaz.

## 3 Kasım — resmî repair tamamlandı

Kullanıcı güvenli repair planına açık onay verdi ve CLI girişini kendisi tamamladı. Resmî `supabase migration repair` ile önce dört repository sürümü applied olarak kaydedildi; sonra dört connector sürümü reverted olarak yalnızca history'den kaldırıldı. Migration SQL'i tekrar çalıştırılmadı, reset veya kullanıcı verisi silme yapılmadı.

`migration list` yedi yerel/uzak sürümün birebir eşleştiğini doğruladı. Gitignore'daki işlem öncesi/sonrası snapshot'lar karşılaştırıldı: tablo/sütun/kısıt/indeks/policy/fonksiyon tanımı/owner/ACL/RLS değişmedi. Uzak HTTP guest Practice smoke (create, gizli çözüm, sahiplik, early reveal, answer, retry) tekrar geçti. Önceki onay bekleme kayıtları tarihsel durumdur.

Son dry-run başarılı: `upToDate=true`, `migrations=[]`, `seeds=[]`, `roles=[]`. Hiçbir SQL uygulanmadı. İlk paralel CLI kontrolündeki uzun bağlantı beklemesi kesilip komut tek başına tekrarlandı ve başarıyla tamamlandı. Güvenli repair çıkış kontrolleri tamamlandı; commit/push yapılmadı.

## 3 Kasım — yerel GitHub giriş hatası

Kullanıcı 3002 yerel önizlemede GitHub girişinde provider-not-enabled ham JSON hatası gördü. Salt okunur ayarlar yerel Supabase'de GitHub=false, hosted projede true gösterdi. GitHub RPC başlatmadan önce provider settings kontrolü eklendi; kapalı/erişilemeyen sağlayıcıda OAuth URL'sine yönlendirmek yerine giriş kartında açıklayıcı hata gösterilir. Local OAuth credential eklenmedi ve hosted sağlayıcı ayarı değiştirilmedi.

60 birim testi geçti. Gerçek tarayıcıda 3002 girişinin sayfada okunur uyarıyla kaldığı, 3000 uzak proje kullanan OAuth isteğinin başarılı URL ürettiği doğrulandı. Gerçek GitHub login/consent bu kontrolde kullanıcı adına tamamlanmadı. 3000 normal uzak proje önizlemesi yeniden açıldı; GitHub için 3002 yerine 3000 kullanılmalı. Bu takip düzeltmesi henüz commit/push edilmedi.

Kullanıcının devam onayıyla GitHub provider guard takip düzeltmesi commit/push için hazırlandı: 60 birim testi, lint/typecheck ve Webpack production build geçti. Local sağlayıcı kapalıyken giriş kartında kalma ve remote OAuth URL'si kontrolü başarılı. Faz 5'e başlanmadı.
