# Güvenlik ve kullanıcı etkisi incelemesi — 8 Kasım 2026

## Güncel düzeltme durumu — canlıda tamamlandı

Kullanıcının düzeltme ve ardından açık push/yayın onayıyla iki doğrulanmış bulgu giderildi. `7e05ca2` canlıda; [CI42461139758](https://github.com/burakkyildiz/DebugDuel/actions/runs/42461139758) tüm quality/database/Auth/Practice/match/load adımlarında başarılı. Aşağıdaki ilk inceleme bulguları düzeltme öncesi kanıttır; yayın sonucu son bölümde kayıtlıdır.

- `20261108075236_persist_failed_match_join_admission.sql`: missing invitation sonucu kontrollü commandError döner;10 geçersiz davet denemesi sayacı korunur,11. istek ve tekrarları RATE_LIMITED alır. Güncel host-ready davranışı, imza, owner/ACL/search_path ve atomik oyun yazımları korunur. Tablolar/veriler/XP değişmez; yalnız fonksiyon gövdesi değiştiğinden generated public API tiplerinde değişiklik yok.
- Login provider429/over_request_rate_limit →429 RATE_LIMITED + Retry-After60;5xx ve transport hatası →503 AUTH_UNAVAILABLE; credential/kimlik hataları nötr400 SIGN_IN_FAILED olarak kalır.
- Kalıcı regresyonlar önce eski sürümde başarısız oldu (Auth5/10 ve yeni DB4/9); düzeltme sonrası hepsi geçti. Yeni DB testleri authenticated rol/JWT ile doğrudan RPC, hesap bağımsızlığı ve başarısız join sonrası maç/üyelik/receipt yazılmamasını sınar.
- Sonuç:92 unit,599 yerel pgTAP,599 temiz migration/seed kurulumu ve599 seed tekrarı; gerçek yerel Auth E2E1/1 (signup/confirmation/profile/refresh/logout/recovery), gerçek paralel engine/deadline/settlement yarışları ve ayrı production build başarılı. Lint0 hata; yalnız Git dışı eski restore scriptinin önceden var olan unused-import uyarısı var. Security advisor warn/error sonucu boş.
- Temiz-kurulum aracı config'te referans verilen Auth şablonlarını geçici projeye kopyalamıyordu; templates dizini de kopyalanarak temiz kurulum doğrulandı. Geçici test DB kaldırıldı; mevcut DB korunur.
- Son güvenlik incelemesi: mevcut actor gate/RLS/EXECUTE sınırları, commandError HTTP eşlemesi, kota transaction'ı, kimlik hatası gizliliği ve geçerli giriş incelendi; bu düzeltme kapsamında doğrulanmış yeni bulgu yok. Yerel metadata owner=debug_duel_game_engine, security_definer=true, search_path boş, anon/authenticated internal EXECUTE=false, relay EXECUTE=true, client XP UPDATE=false gösterdi.
- Ortak SSR Auth IP kotası ilk bakım sırasında doğrulanmamıştı; sonraki kontrollü geliştirme deneyi aşağıda kayıtlıdır. Yerel testler gerçek Vercel egress dağılımını kanıtlamaz; bu ihtimal giderildi veya üretimde ölçüldü diye sunulmaz. Sırf bunu denemek için canlıda rate-limit oluşturulmadı; oyun JWT client'ına secret key eklenmedi.
- Önceden var olan next-env.d.ts ve tsconfig.json preview değişiklikleri korundu. Geçici build çıktısı kaldırıldı. Yerel, geliştirme ve üretim22 migration sürümündedir; iki hosted son dry-run upToDate=true, migrations/seeds/roles boş.

## Kapsam ve yöntem

İncelenen HEAD `13a9c5d8d12141e37c1dcb85309660d643da667f`; canlı uygulama kodu37fb0d3 ile aynıdır (son commit belge değişikliği). Auth login/signup/recovery/callback, cookie/redirect/CSRF/gövde doğrulama, Supabase SSR/privileged client ayrımı, Practice guest sahipliği, özel maç RPC/DTO/RLS/Realtime, üç tur/settlement/XP, public admission, CSP/loglama ve CI yapılandırması incelendi. Kullanıcıdan gelen skill gereği yalnız inceleme/rapor yapıldı; ürün kodu veya platform ayarı değiştirilmedi.

Kontroller:

- `pnpm test`:82/82 geçti.
- `pnpm test:db`:yerel gerçek PostgreSQL üzerinde590/590 geçti. Motor hata yolunu sınayan testin beklenen warning'i test başarısızlığı değildir.
- Yerel sentetik hesapla doğrudan public RPC üzerinden12 geçersiz join denemesi; tüm veri transaction sonunda ROLLBACK edildi.
- Geçici izole Vitest testiyle provider429 ve503 hatalarının gerçek login handler'ındaki karşılığı doğrulandı (2/2); geçici dosya kaldırıldı.
- `pnpm audit --prod --json`:0 bilinen advisory (115 dependency/optional kayıt). Audit veritabanında kayıt olmaması açık olmadığı garantisi değildir.
- Canlıya yük/istismar testi yapılmadı; gerçek hesap/veri/credential okunmadı veya değiştirilmedi. Bu inceleme sırasında browser E2E ve gerçek paralel yarış paketleri yeniden koşulmadı; mevcut test kaynakları incelendi.

## Doğrulanmış bulgular

### [Orta] Geçersiz doğrudan join RPC çağrıları hesap hız sınırını tüketmiyor — güven yüksek

Konum: `supabase/migrations/20261103084859_three_round_engine.sql:399` (limit), aynı dosya415 (exception). Çağrı yüzeyi `public.match_command`, authenticated EXECUTE: `20261103042203_match_single_round.sql:240`. Sayaç yardımcısı `20261102142125_practice_engine.sql:22`.

**Kanıt / kök neden:** match_command, hesap için match_join sayacını artırdıktan sonra bulunamayan davette ROOM_UNAVAILABLE exception'ı yükseltiyor. PostgreSQL aynı statement içindeki sayaç yazımını da geri alıyor. HTTP join handler'ındaki ayrı, kalıcı network admission bunu telafi ediyor; fakat authenticated rolün doğrudan public.match_command çağrısı o HTTP katmanından geçmiyor.

**Tekrar üretim:** Yalnız yerel veritabanında rastgele, doğrulanmış ve profili tamamlanmış sentetik bir hesap oluşturuldu. Authenticated rol ve o hesabın JWT claim bağlamında bulunmayan, biçimsel olarak geçerli davet özetiyle12 join çağrısı yapıldı; her çağrı ayrı exception bloğunda yakalandı. Sonuç12 ROOM_UNAVAILABLE,0 RATE_LIMITED, persisted match_join counter0. Sınır10/dakika olmasına rağmen11. ve12. deneme de davet sorgusuna ulaştı. Dış transaction ROLLBACK edildi.

**Etki:** Doğrulanmış bir hesap geçersiz davet denemeleriyle DB/RPC kapasitesini amaçlanan hesap sınırı olmadan tüketebilir. Ücretsiz kapasitede diğer oyuncuların gecikmesi/erişim kesintisi riski doğurur. Bu bulgu davet tahmininin pratik olduğu, odaya yetkisiz girildiği veya veri sızdığı anlamına gelmez;32-byte rastgele davet ve katılımcılık denetimleri korunuyor.

**En küçük güvenli düzeltme:** Hesap admission sayacı güncellendikten sonraki beklenen join reddini exception yerine kontrollü commandError sonucu olarak döndür; böylece sayaç transaction ile commit olur. Limiter'ın kendi reddi de diğer yazımları/sayaçları istenmeden geri almamalı; aynı modeldeki hata yollarını gözden geçir. Oyun mutasyonlarının atomik rollback garantisini koru. Sadece HTTP route'una limit eklemek doğrudan RPC yolunu düzeltmez.

**Regresyon:** Gerçek authenticated rol/JWT ile ayrı çağrılarda10 geçersiz join denemesi sayacı artırmalı;11. ve sonraki deneme RATE_LIMITED dönmeli. Her denemeden sonra kalıcı sayacı ve maç/üyelik yazımı olmadığını doğrula. Başka hesap bucket'ı bağımsız kalmalı. Mevcut matches.test.sql:19 yalnız admission yardımcısının EXECUTE iznini denetliyor; ana RPC'nin onu atlayamadığını kanıtlamıyor.

### [Düşük] Login provider hata türleri kayboluyor — güven yüksek

Konum: `src/app/api/auth/[action]/route.ts:38`.

**Kanıt / kök neden:** signInWithPassword sonucu error içeriyorsa status/code ayrımı yapılmadan400 SIGN_IN_FAILED ve “Check your details and try again” döndürülüyor. E-posta gönderme yollarındaki429/503 ayrımı login'de yok.

**Tekrar üretim:** Gerçek POST handler izole provider mock'uyla çağrıldı; provider429/over_request_rate_limit ve503/unexpected_failure için ikisinde de HTTP400 SIGN_IN_FAILED, Retry-After yok sonucu doğrulandı. Canlı Auth'a başarısız giriş bombardımanı yapılmadı.

**Etki:** Doğru parola giren kullanıcı limit/servis kesintisinde hesap bilgilerini yanlış sanabilir, gereksiz parola kurtarma başlatabilir veya tekrar tekrar deneyerek engeli uzatabilir. Auth yetki atlatma değildir.

**Düzeltme ve regresyon:** Gerçek invalid_credentials hatasını genel400 olarak koru;429 için RATE_LIMITED/Retry-After ve provider5xx için AUTH_UNAVAILABLE/503 kullan. Üç hata sınıfını ayrı route testleriyle doğrula; UI nötr hata metinleri hesap varlığını sızdırmamalı.

## Sonraki doğrulama — ortak SSR Auth kotası

İlk incelemede doğrulanmamış olan ortak IP kotası davranışı,8 Kasım'da ayrı geliştirme Vercel yayını ve mobil veri kullanan ikinci cihazla kontrollü olarak doğrulandı. Bilgisayar kotayı tüketince telefon429 mesajı aldı; doğrudan geliştirme Auth kontrolü400 kaldı; kota150'ye geri alınınca telefon normal400 mesajına döndü. Üretim ayarları değiştirilmedi. Üretimde varsayılan ayar altında olay sıklığı/tüm egress dağılımı henüz ölçülmedi. [Deney, geri alma ve sınırlar](AUTH_IP_QUOTA_TEST_2026-11-08.md). Davranış için ürün kodu düzeltmesi henüz uygulanmadı; Auth'a özel trusted-IP adapter ve ayrı dev doğrulaması gerekir.

## Olumlu kontroller ve sınırlar

- Mutasyonlarda canonical Origin, JSON içerik türü, streaming4096-byte sınırı ve strict şemalar var.
- Server kimliği getUser ve verified_actor_id üzerinden denetleniyor; oyun kararlarında istemcinin getSession sonucu kimlik kanıtı sayılmıyor.
- Private maç DTO'su katılımcı denetliyor; public tablo RLS'si aynı sınırı koruyor. Çözümler yalnız çözülen/başlamış turda, gelecek soru içerikleri zaman kapısıyla açılıyor. Realtime oyun kararını yazmıyor.
- XP settlement trigger'ı ayrı NOLOGIN rolü, UUID sıralı profil kilitleri, settlement/ledger unique kısıtları ve aynı transaction ile çalışıyor. Normal istemcinin XP UPDATE hakkı yok.
- Guest token HMAC, sealed capability/cursor AES-GCM ve amaç bağlamı kullanıyor. Privileged client server-only ve cookie'li hesap client'ından ayrı.
- Safe redirect allowlist, token type/proof kontrolleri, nonce CSP ve dar telemetri alanları incelendi; bu kapsamda doğrulanmış kritik/yüksek bulgu bulunmadı.
- Bu bir tam penetration test, formal proof, tüm paket kaynaklarının denetimi veya production platform ayarlarının yeniden sertifikasyonu değildir. Gmail gönderim kapasitesi, production üçüncü hesap Realtime denemesi,40 oyuncu Vercel yükü ve Auth restore önceki raporlardaki sınırlarıyla kalır.

İlk inceleme sonucu:1 orta ve1 düşük doğrulanmış bulgu. İlk inceleme sırasında kod/DB/config düzeltmesi, commit, push veya deploy yapılmadı; sonraki onaylı düzeltme/yayın sonucu aşağıdadır. Mevcut kullanıcı next-env.d.ts/tsconfig.json değişiklikleri korundu.


## Yayın sonucu — 8 Kasım 2026

- Uygulama commit'i `7e05ca2182f02381a0e5f119834c420b0fe5eba4` main'de. [CI42461139758](https://github.com/burakkyildiz/DebugDuel/actions/runs/42461139758) quality ve database dahil success; Auth, Practice, maç ve20 maç/40 oyuncu load adımları geçti.
- CI başarılı olduktan sonra resmî CLI2.122.0 ile önce geliştirme `hvqklcqyjqjwwwcsioch`, sonra üretim `nvpqjmwurmeupkbhozrn` güncellendi. Yalnız `20261108075236` uygulandı; seed, rol veya Vault push edilmedi. Her iki ortam22 sürüm, fixApplied/joinFixPresent=true; son dry-run upToDate=true. Ön kontrollerde aktif maç0 ve health ready idi; sonrasında da Cron sağlıklı.
- Her hosted ortamda aynı9 assertion transaction/ROLLBACK içinde geçti. İlk CLI test hedefi için --linked gerekti; ilk asıl test koşusu geçici CLI rolünün extensions GRANT yetki bağlamında durdu ve rollback edildi. Testin yalnız başlangıç/reset idari rol bağlamı açık postgres olarak sarıldı, assertion/iş mantığı değiştirilmedi; ardından geliştirme9/9 ve üretim9/9 başarılı. Geçici harness `/private/tmp/debug-duel-hosted-join-admission.test.sql`, sır veya gerçek kullanıcı verisi içermez. Son salt okunur kontrol fixture Auth/profil sayısı0, internal authenticated EXECUTE=false ve client XP UPDATE=false gösterdi. Kalıcı izin genişletilmedi.
- `dpl_6m3Zm9yLPN5Hp3N7teQyZAEFckm8`, `debug-duel-78ufch244-burakkyildiz.vercel.app`, READY/Production/fra1; build yaklaşık53 saniye. Aynı test edilmiş build ana adrese promote edildi; canonical deployment sorgusu7e05ca2 SHA'sını doğruladı. Yeniden uygulama build'i yapılmadı.
- Kimliksiz HTTPS smoke: `/`, `/login/email`, `/practice`200; `/api/health`200/ready=true; `/api/me/history`401. Yanıtlar private/no-store, HTML nonce CSP ve nosniff korundu. Python'un yerel CA paketi eksik olduğundan ilk HTTP denemesi sertifika doğrulamada durdu; TLS doğrulaması kapatılmadan sistem curl ile kontroller geçti.
- Son Vercel1 saat runtime error taraması sonuçsuz/temiz. Bu sınırlı gözlem, tüm gelecekteki hataların veya açıkların yokluğu garantisi değildir. Yeni canlı gerçek iki cihaz maçı/kullanıcı parola kurtarması bu küçük bakımda tekrarlanmadı; gerçek Auth/oyun regresyonları CI'da geçti, önceki manuel pilot kanıtı Faz9 raporundadır.
- Bu yayın SMTP/OAuth credential'larını veya e-posta şablonlarını değiştirmez. Uygulama rollback'inde token_hash uyumlu37fb sürümü kullanılabilir;22. DB migration'ı/XP ledger silinmez. Eski99cf code-only sürümüne yeni token_hash şablonlarıyla tek başına dönülmez.

## Kalan platform sınırları

Uzak development ve production security advisor taraması `auth_leaked_password_protection` WARN bildirdi; DDL/RLS bulgusu yok. Bu, önceki yerel advisor'ın boş sonucundan farklı platform Auth kontrolüdür. [Resmî belge](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) bu özelliği Pro ve üstüyle sınırlıyor. Kullanıcının sıfır bütçe kararıyla plan yükseltilmedi; bu kontrol açık olmadığı için tüm parola tehditlerinin önlendiği iddia edilmez. İlk bakım bu konuyu gidermedi; sonraki ayrı geliştirme deneyi ortak kota davranışını doğruladı. Üretimde varsayılan kotada olay sıklığı ölçülmedi; düzeltme henüz uygulanmadı.

## Auth ortak kota düzeltmesi — sonraki yayın

Önceki “henüz uygulanmadı” kayıtları tarihsel durumdur. Düzeltme dfc3340 ile main’e gönderildi; CI42480035067 quality/database ve tüm Auth/oyun/yük kontrolleri başarılı. Geliştirmede gerçek iki ağ testinde bilgisayar429 alırken telefon normal credential hatası aldı; kota150’ye döndü, test yayını SSO all ile kapandı, sentetik Auth/profil fixture temizlendi. Üretim forwarding ayarı ve yalnız Production Auth secret/flag hazırlandı; dpl_G7XXZMjgWBWe6AhDAdUD2JJsCWmy ana adreste. HTTP health/anon erişim/başlık kontrolleri geçti. Kullanıcı canlıda çıkış/yeniden giriş, profil ve değişmeyen XP kontrolünü başarılı olarak doğruladı; son1 saat runtime error taraması temiz. [Tasarım, kanıt, sınırlar ve rollback](AUTH_IP_FORWARDING_REPORT.md). Ücretli leaked-password kontrolü uyarısı mevcut platform sınırıdır; yeni DDL/RLS bulgusu yok.
