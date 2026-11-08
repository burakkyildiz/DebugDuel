# Auth IP forwarding düzeltmesi — 8 Kasım 2026

## Durum

Kullanıcı ücretsiz planda düzeltmeyi yapmayı istedi. Yerel uygulama, güvenlik testleri ve gerçek geliştirme iki-ağ doğrulaması başarılı. Üretim henüz değiştirilmedi; yeni commit/push yapılmadı. Önceki ortak kota deneyi [ayrı raporda](AUTH_IP_QUOTA_TEST_2026-11-08.md).

## Tasarım ve sınırlar

`src/lib/supabase/auth-forwarding.ts` server-only fetch adaptörü, `AUTH_IP_FORWARDING_ENABLED=true` olduğunda yalnız gerçek Vercel ortamında tek geçerli `x-vercel-forwarded-for` IP'sini kabul eder. Generic X-Forwarded-For, IP listesi, port/scope içeren adres, eksik/legacy/placeholder anahtar veya HTTPS olmayan/noncanonical upstream reddedilir. Feature varsayılan kapalıdır; diğer hostlara güvenilir-IP desteği varmış gibi davranılmaz.

Yalnız yapılandırılmış Supabase origin'inin exact Auth path+HTTP method allowlist'i için yeni `SUPABASE_AUTH_SECRET_KEY` ve Sb-Forwarded-For eklenir: token/login/refresh, signup, verify, recover, resend, user, logout, reauthenticate. Varsayılan public bearer bu unauthenticated Auth çağrılarında private key ile değiştirilir; user/logout/reauthenticate mevcut session JWT'sini zorunlu tutar ve korur. Redirect error ile private apikey'nin başka origin'e taşınması engellenir. Admin, SQL/RPC, Storage, Functions ve diğer origin/yöntemler yükseltilmez.

Genel SDK istemcisinin başlangıç key'i hâlâ publishable key'dir. SQL/RPC çağrıları aynı public apikey+kullanıcı JWT'sini taşır; IP/private Auth header'ı eklenmez. Auth'a özel ayrı env alanı, test ortamına genel SUPABASE_SECRET_KEY ekleyerek privileged guest/DB istemcisini kazara etkinleştirmeyi önler. Mevcut privileged client değiştirilmedi. Browser istemcisi bu modülü import etmez. Server client ve proxy aynı adaptörü request başına kurar; refresh ve callback yolları da kapsanır. Cookie/query/loglara ham IP veya Auth key eklenmez.

## Yerel kanıt

- Tüm suite:121 unit başarılı; gerçek SSR cookie entegrasyonu dahil Auth-forwarding odaklı29 test başarılı. Strict TypeScript ve hedefli ESLint geçti.
- Gerçek Supabase JS SDK ile login+refresh/getUser sonrası SQL isteğinin public key ve aynı kullanıcı JWT'sini kullandığı yakalandı. Gerçek SSR cookie adapter ile sonraki isteğin aynı kullanıcıyı taşıdığı; cookie'lerde Auth private key/IP olmadığı doğrulandı.
- İki eşzamanlı istemcinin IP'leri request closure'larında ayrıdır; ortak SDK headers mutasyona uğramaz. Fake/eksik platform IP, eksik/legacy credential, admin endpoint ve farklı origin/yöntemler sınandı.
- Gerçek yerel Auth E2E1/1 (9.6s):signup/confirmation/profile/refresh/logout/recovery geçti. Yerel testte forwarding kapalıdır; hosted forwarding başarısı sayılmaz.
- Ayrı .next-auth-forwarding-review production build başarılı. Kullanıcıya ait next-env.d.ts/tsconfig.json içerikleri korundu; geçici build çıktısı kaldırıldı. SQL/migration/üretilen DB tipi değişikliği yok.
- Source allowlist paketi84 dosya içerir; .env.local, .local-backups ve soru kataloğu pakete alınmaz. Test upload'ında iki kullanıcı preview dosyası yerine HEAD'deki sürümleri kullanılır. Main'e push gerektirmeyen yalnız dev test yayını için hazırlandı.

## Geliştirme için gerekli iki ayar

1. Kullanıcı test projesinde SUPABASE_AUTH_SECRET_KEY'yi Secret/Production alanına kendisi girer; yalnız geliştirme hvq... projesinin yeni sb_secret_ anahtarı. Değer sohbet/Git'e alınmaz. Anahtarları panelden kendisinin girme tercihi korunur.
2. Geliştirme Supabase Auth Rate Limits IP Address Forwarding switch'i açılıp Save edilir. Panel Free planda seçeneğin mevcut/başlangıçta kapalı olduğunu gösterdi. Mevcut token150/verify30/signup30 kotaları korunur; testte geçici değişiklik yapılırsa rollback watchdog ile150'ye dönülür.

Kullanıcı test projesini test için geçici dış erişime açıp sonrasında tekrar SSO korumasına kapatmayı açıkça onayladı. Bu izin aynı test kapsamında yeniden sorulmaz. Asıl production SSO/env değişikliği yapılmaz. Dev doğrulaması tamamlanmadan düzeltme canlıda çözüldü diye sunulmaz.

## Kaynaklar

- [Supabase Auth rate limits / IP forwarding](https://supabase.com/docs/guides/auth/rate-limits#ip-address-forwarding):new secret API key ve açık forwarding ayarı gerekir.
- [Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for):platformun source-IP başlığı, generic header üst proxy tarafından değiştirilebilir.
- Yerel Next16.4.4 proxy/route rehberleri:proxy Node runtime, request headers/cookies API'leri.

## Geliştirme hazırlığı — devam ediyor

- Kullanıcı dev Auth secret alanını Vercel test projesine kendisi kaydetti; yalnız isim/type/target metadata doğrulandı, değer okunmadı. AUTH_IP_FORWARDING_ENABLED=true yalnız test projesine eklendi.
- Kullanıcı dev Supabase forwarding seçeneğini açıp kaydetti; yeniden yüklenen panel switch=1, Save disabled, token150/verify30/signup30 gösterdi.
- Test source build dpl_EDWr7duBUb7U83brEXhAJwnH7qjB başarılı ve yalnız test canonical adresine promote edildi. SSO, kullanıcının açık izniyle geçici all_except_custom_domains; deney sonunda all geri getirilecek. Otomatik Git build ignore exit0 korundu.
- Bilgisayar ilk kontrolü: POST /api/auth/login, var olmayan sentetik hesap,400 SIGN_IN_FAILED. Telefon kontrolü ve kota ayrışması bekleniyor. Gerçek hesap/XP değişmedi; üretim uygulaması değiştirilmedi.

## Geliştirme doğrulama sonucu

- Mobil veri ilk kontrolü kullanıcı tarafından normal credential hatası olarak doğrulandı. Sparse CLI config push yalnız token_refresh150→1 değiştirdi; diğer özellik/secret gönderilmedi.180 saniyelik bağımsız watchdog önce başlatıldı.
- Bilgisayar burst:30 normal400,31. istekte429 RATE_LIMITED ve duruş. Bu sırada telefon aynı mobil ağda aynı sahte B hesabıyla **normal credential hatası** almaya devam etti. Eski ortak-kota deneyindeki telefon429 davranışı bu sürümde oluşmadı. Bu iki gözlenen ağın ayrışma kanıtıdır; tüm olası proxy/topoloji veya üretim yükü garantisi değildir.
- Kota testin hemen ardından150'ye döndürüldü ve resmî CLI sparse diff ile doğrulandı. Watchdog da alreadyRestored=true/quota150 ile tamamlandı.
- Yeni rastgele sentetik dev hesabıyla gerçek uygulama HTTP oturum zinciri:login200 (ensure_profile RPC dahil), cookie ile profile200, logout200, sonra history401. Parola/key/cookie yazdırılmadı. Auth API silme, profil foreign key kısıtı nedeniyle fixture'ı silemedi; yalnız exact sentetik UUID+e-posta guard'ı ve sıfır maç katılımı kontrolüyle profile_write_limits/profile/Auth sıralı transaction temizliği yapıldı. İlk connector onayı zaman aşımına uğradı, tekrarında işlem başarılı; remaining_fixture0. Gerçek hesap/XP değişmedi.
- Test projesi SSO tekrar all; anonim test/login HTTP302→vercel.com/sso-api. Otomatik build ignore exit0. Test anahtarı yalnız dev/test projesinde, asıl üretim değişmedi.
- Son değişiklik incelemesinde doğrulanmış yeni güvenlik bulgusu bulunmadı:kimlik JWT'si, DB/RPC public key, Auth endpoint allowlist, platform-IP güveni, redirect, request izolasyonu ve cookie secret ayrımı incelendi. Üretim ayarı ve canlı oturum doğrulaması henüz yapılmadı.
