# Faz 9 — üretim yayını

## Durum — 8 Kasım 2026

Kullanıcı Faz 8 kapanışından sonra devam ederek Faz 9'u başlattı. Sıfır bütçe korunur; ücretli plan, branch, compute, SMTP veya domain alınmaz. İlk build kullanıcı onayıyla ana HTTPS adresinde canlı; AC-21 ve Faz 9 henüz kapanmadı.

## Hedefler ve gerçekleşen işlemler

- Geliştirme: `debug-duel`, `hvqklcqyjqjwwwcsioch`; mevcut hesap/veriler burada kalır.
- Kullanıcı organizasyon seçimini ve ücretsiz ayrı üretim projesini açıkça onayladı. Cost API aylık 0 USD döndürdü; `burakkyildiz's Org` (`noxxfwiswizjlslpfxbs`) içinde Frankfurt `debug-duel-prod` (`nvpqjmwurmeupkbhozrn`) oluşturuldu.
- Resmî CLI 2.122.0 ile önce dry-run incelendi, ardından 21 migration ve yalnız soru seed'i yeni boş hedefe uygulandı. Geliştirme dump'ı veya Auth verisi taşınmadı.
- Salt okunur doğrulama: 21 migration, 30 soru; 0 hesap, 0 profil, 0 maç, 0 ledger. Cron advance `1 second`, maintenance `0 0 * * *`, ikisi de aktif; engine tick son 5 saniye içinde. Security advisor uyarısız.
- Vercel hedef takım `burakkyildiz` / `team_krqOd5IVMM0LyPh0MIcE6Fco`; Debug Duel projesi başlangıç sorgusunda yoktu. Next.js/Frankfurt ve GitHub bağlantısıyla proje oluşturma isteği, GitHub entegrasyonu kurulu olmadığı için 400 ile reddedildi. Başarılı proje/deployment iddiası yok. Kullanıcıdan yalnız `burakkyildiz/DebugDuel` repository'sine GitHub App erişimi kurması istendi; henüz Deploy'a basmaması belirtildi.

- Üretim Auth minimum parola uzunluğu yalnız bu alanı bildiren ayrı Git dışı config ile 6→12 yükseltildi. E-posta doğrulama zaten açık; diğer ayarlar korunur. Son salt okunur config diff: declared update=0, 9 undeclared remote alan değişmedi.

## Güncel kalan yayın kapıları

1. Gerçek üretim GitHub consent → callback → profil/onboarding → refresh/logout kontrolü. Consent kullanıcı adımı sürüyor.
2. Halka açık e-posta için ücretsiz custom SMTP ve gerçek HTTPS kayıt/doğrulama/recovery testi. Varsayılan ekip alıcılarıyla çalışan SMTP genel teslim kanıtı değildir.
3. İki fiziksel cihaz, iki farklı gerçek hesapla üç turluk maç; private Realtime, sonuç/XP/ledger ve Cron kontrolü. Üçüncü kişinin private erişim reddi canlıda ayrıca doğrulanacak.
4. Son runtime/platform logları ve deployment/migration/env/rollback kaydı. Auth restore kapsam dışı kalır.
5. Preview yapılandırması yalnız geliştirmeye bağlanarak ayrı doğrulanacak; şu an preview otomatik deploy kapalı ve production değişkenleri yalnız Production'dadır.

Tamamlanan hazırlık: ayrı ücretsiz üretim DB'si (21 migration/30 soru), 590 rollback DB testi, Auth minimum 12/doğrulama/HTTPS kesin callback'ler, private-only Realtime ve gerçek public kanal reddi, 7 production değişkeni, Vercel Hobby/Node 24/fra1 READY build ve onaylı promotion. Canlı misafir Practice doğru cevap/reload, public health/leaderboard ve misafir history reddi geçti. Geliştirme test hesabı/XP temizliği bu kurulumda uygulanmadı.

Faz 8'in başarılı CI ve testleri `5e7032d` kodundadır; bu belge onları canlı Vercel testleri olarak sunmaz. İlk Supabase sağlık sorgusu yanlış fonksiyon adı nedeniyle çalışmadı; düzeltilen doğrudan engine tick/Cron ve tablo sayımı sorgusu başarılıdır.

## Son doğrulama ve kullanıcı adımları

- GitHub entegrasyonu kullanıcı tarafından yalnız ilgili repository için kurulduktan sonra Vercel projesi oluşturuldu: `prj_d67hDYIsOi8QR7swowQObAMJ33AP`. Node varsayılanı 26.x geldi; 24.x olarak düzeltildi. Next.js, `pnpm build`, frozen-lockfile install, Frankfurt bölgesi; preview otomatik deploy başlangıçta kapalı. Canlı deployment henüz yok.
- Hesap panelinde Hobby Plan / Active ve kart eklenmemiş olduğu görüldü. Ücretli plan/özellik açılmadı. Ücretsiz `debug-duel-burakkyildiz.vercel.app` adresi projeye eklendi, verified=true. Bu adresin ayrılması uygulamanın yayınlandığı anlamına gelmez.
- Üretimde 25 profil + 344 şema + 51 Practice + 63 maç + 90 motor testi rollback içinde geçti. Admission no_plan/finish sonucu 1..17 ve başarısızlık teşhisi yok; toplam 590. Sonrasında 0 hesap/profil/maç/ledger ve pgTAP kurulu değil; health ready=true.
- Auth Site URL HTTPS üretim adresi ve altı kesin callback kaydedildi. Wildcard yok. Realtime panelinde public erişim kapatılıp kaydedildi; enabled=true, allow_public=false. Free limitler korunur.
- Vercel'e anahtar aktarımı otomatik incelemede hassas aktarım için açık izin gerektiğinden reddedildi. Kullanıcı “Anahtarları ben panelden ekleyeceğim” dedi; bu tercih korunur, agent yeniden sır aktarımı yapmaz. Vercel'e yalnız `NEXT_PUBLIC_SITE_URL` kaydedildi. Diğer değişkenlerin kaydı kullanıcı tamamlandı bildirimi ve decrypt=false metadata ile kontrol edilecek.
- Kullanıcının elle girmesi için 3 public config ve 3 yeni bağımsız 32-byte uygulama sırrı korumalı, Git dışı `.local-backups/phase9-config/vercel-production.env` dosyasında hazırlandı (0600). Bu dosyada Supabase server key yok. Kullanıcı yeni üretim `sb_secret_…` anahtarını doğrudan Supabase panelinden Vercel'e yalnız Production Secret olarak ekleyecek. Değerler sohbet/Git'e yazılmadı. Preview'a üretim erişimi verilmez.

Üretim GitHub OAuth/SMTP ve gerçek HTTPS Auth/Practice/düello testleri hâlâ açık. Faz 9 tamamlanmış sayılmaz. Phase 9 belge değişiklikleri henüz commit/push edilmedi; önceki next-env.d.ts/tsconfig.json yerel değişiklikleri korunur.


## Ortam değişkenleri tamamlandı; build onayı bekleniyor

Kullanıcı 7 değişkenin panelde kaydını ekran görüntüsüyle gösterdi. `decrypt=false` metadata kontrolü: SUPABASE_SECRET_KEY/GUEST_SESSION_SECRET/RATE_LIMIT_HASH_SECRET/COMMAND_RECEIPT_ENCRYPTION_KEY sensitive; NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY encrypted Config; NEXT_PUBLIC_SITE_URL plain Config. Yedi alanın tamamı yalnız production hedeflidir. Gizli değerler açılmadı/değiştirilmedi.

`autoAssignCustomDomains=false` olarak kaydedildi. `99cf58b735d0eda637a3733ae9c2b42803a2fff4` commit'i, Production hedefi, Node 24.x ve fra1 ile ilk build isteği auto-review tarafından önceki “henüz Deploy'a basma” yönlendirmesi kısıt sayıldığı için reddedildi. Bu yönlendirme assistant kaynaklıydı; kullanıcıya somut build hedefiyle ayrı onay soruldu. Build henüz başlamadı; reddi başka yoldan aşma.


## İlk build başladı

Kullanıcı ayrı soruda “Evet, ilk production build’ini başlat” diyerek önceki bekleme kısıtını kaldırdı. Aynı commit/ortam isteği kabul edildi: `dpl_8PGPpMsptDQ1aq1y3mtSkzdu3t9x`, `debug-duel-4heckvj5l-burakkyildiz.vercel.app`, Production, fra1. Durum BUILDING. API alias adaylarında canonical HTTPS adresi de dönüyor; autoAssignCustomDomains=false kaydı tek başına bu Vercel alt alanının yönlenmediğinin kanıtı değildir. Hazır olduğunda gerçek HTTP/alias kontrolü yapılacak.

Üretim GitHub OAuth için mevcut uygulama listesinde yalnız geliştirme Debug Duel görüldü. Ayrı “Debug Duel Production” formu üretim homepage ve `https://nvpqjmwurmeupkbhozrn.supabase.co/auth/v1/callback` ile hazırlandı; wildcard/Device Flow kapalı. Kullanıcıya Register, Client ID/secret oluşturma ve doğrudan üretim Supabase GitHub paneline giriş adımı bırakıldı; credential değerleri alınmadı. Supabase varsayılan SMTP yalnız proje ekibi alıcıları/2 e-posta-saat limitlidir; halka açık e-posta girişi için custom SMTP hâlâ açık kapıdır.


## READY build ve korumalı tarayıcı kontrolleri

İlk deployment READY oldu; build logu “Build Completed … [1m]”, derleme/TypeScript başarılı. Canonical adres GET health/leaderboard/home henüz Vercel 404 döndürdü; READY sonrasında alias listesinde canonical yok. Bu nedenle otomatik yönlendirmeme davranışı gözlendi; henüz public uygulama yayını iddia edilmez.

Korumalı URL'yi okuyan MCP aracı 23 saatlik paylaşım bağlantısı oluşturabileceği için auto-review tarafından reddedildi; paylaşım bağlantısı oluşturulmadı. Daha düşük erişimli alternatif olarak kullanıcının mevcut Vercel tarayıcı oturumu kullanıldı. Staged URL health ready=true ve güncel tick; ana sayfa, gerçek boş leaderboard ve Practice başlangıç arayüzü görüldü. Bunlar aktif Practice/maç smoke başarısı değildir. Uygulamanın mutation Origin'i canonical origin ile sınırlı olduğundan staged host üzerinde bu sınır gevşetilmedi.

Kullanıcı üretim GitHub hazır bildirdi. Public Auth settings kontrolü github=false döndürdü; panelde Client ID/Secret kayıtlı ama GitHub enabled kapalı bulundu. Sırlar açılmadı. CLI sparse diff, client_id zorunlu olduğundan config load aşamasında durdu; uzak değişiklik yapılmadı ve geçici enabled satırı kaldırıldı. Tarayıcıdan yalnız enabled açıp kaydetmek için kullanıcıya işlem anında açık onay soruldu. Production OAuth App: `4002079`; önceki development App korunur.


## Ana adres promotion ve canlı Practice geçti

İlk promote isteği auto-review tarafından build iznini canlı trafik değişimi için yeterli saymayarak reddedildi. Kullanıcı ayrı soruda “Evet, bu build’i ana adreste canlıya al” dedi. Aynı deployment promote edildi; `https://debug-duel-burakkyildiz.vercel.app` üzerinde health 200/ready=true, leaderboard 200, home ve Practice 200, misafir history 401 doğrulandı. Private/no-store, CSP nonce, script-src unsafe-inline/eval yok ve nosniff görüldü. Yeniden build yapılmadı.

Kullanıcı GitHub enabled açıp Save için işlem anında açık onay verdi; bu tek switch açılıp kaydedildi. Yeniden açılan panel enabled=1/Save disabled ve başarı bildirimi gösterdi. Kimlik bilgileri değişmedi, e-postasız giriş kapalı kaldı.

Gerçek Chrome misafir Practice zinciri canonical HTTPS üzerinde geçti: guest cookie → oluşturma → “Transpose a matrix” → 8. satır → doğru sunucu sonucu → reload sonrası aynı sonuç. Session `92add69c-fc34-4d51-8562-682bcd4cc6cd` DB'de var; son kontrol 0 profil/0 maç/0 ledger ile Practice'in XP oluşturmadığını doğruladı. Bu geçici gerçek smoke oturumu normal TTL ile temizlenir; kaynakta toplu temizlik yapılmadı.

Gerçek GitHub giriş denemesi yeni üretim uygulamasının `user:email` salt okunur e-posta izin ekranına ulaştı. Doğru üretim Supabase callback ve canonical redirect görüldü. Yeni uygulama yetkisini kullanıcıya onaylatmak için canlı sekme bırakıldı; henüz callback/oturum başarısı iddia edilmez.


## GitHub canlı callback ve public paket taraması

Kullanıcı yeni prod OAuth consent'ini onayladı ve “giriş döndü” dedi. Chrome canonical `/profile` sayfasında authenticated navbar ve onboarding formu görüldü. Salt okunur DB aggregate: 1 Auth hesap / 1 github identity / 1 doğrulanmış hesap / güncel sign-in / 1 profil / onboarding 0 / ledger 0. Kullanıcının adı ve avatar tercihi doldurulmadı; profil kaydı kullanıcıya bırakıldı.

İki public HTML yanıtında CSP nonce farklı; 8 aynı-origin istemci JS paketi indirildi. sb_secret_ deseni veya yerelde üretilmiş üç production uygulama sırrıyla eşleşme 0; değerler/loglar yazdırılmadı. Bu dar tarama her türlü sızıntının yokluğu garantisi değildir.

Kullanıcı mevcut alan adı veya SMTP hesabı olmadığını bildirdi. Ücretli kaynak açılmayacak. Genel e-posta teslimi ve iki cihazlı gerçek maç testi açık; Gmail gibi ücretsiz düşük hacimli SMTP seçeneği kullanıcı kararıyla değerlendirilecek.


## SMTP hazırlığı — mevcut Gmail kararı

Kullanıcı yeni Gmail hesabı gerekip gerekmediğini sordu; zorunlu olmadığı açıklandı ve mevcut Gmail ile devam etmeyi istedi. Gönderen olarak kullanılacak adres ve iki adımlı doğrulama durumu kullanıcıdan soruldu; yanıt bekleniyor. Önceki test adresi otomatik olarak yeni gönderen kabul edilmez.

Üretim SMTP formu kaydetmeden hazırlandı: sender name Debug Duel, host smtp.gmail.com, varsayılan port 465. Enable custom SMTP formda açık, ancak Save yapılmadı; username/sender email/password boş. Supabase Gmail için kişisel/transactional gönderim ayrımı nedeniyle deliverability uyarısı gösteriyor. Gmail seçeneği düşük hacimli pilot olarak anlatıldı; genel yüksek hacim/teslim garantisi değildir. Google 2FA/app password gereksinimi ve günlük gönderim limitleri resmî kaynaklardan kontrol edildi. Yeni credential oluşturma, girme ve Save kullanıcıya bırakılacak; secret alınmayacak.


SMTP gönderen onayı: kullanıcı `debug.duell@gmail.com` adresini verdi ve iki adımlı doğrulamanın açık olduğunu doğruladı. Yalnız sender email ve username alanları bu adresle dolduruldu; host smtp.gmail.com / port465 / sender name Debug Duel hazır. Secret alanı boş bırakıldı, Save yapılmadı. Kullanıcıdan Google'da “Debug Duel SMTP” app password oluşturup doğrudan Supabase Password alanına girerek Save changes adımını kendisinin tamamlaması istendi. “SMTP kaydedildi” sonucu beklenir; gerçek SMTP teslim başarısı henüz yok.


## SMTP kaydı tamamlandı; gerçek alıcı testi bekleniyor

Kullanıcı “SMTP kaydedildi” dedi. Mevcut panelde custom SMTP açık, host smtp.gmail.com, port465, sender name Debug Duel ve password için “Stored password is hidden. Enter a new password to replace it.” metni görüldü. Parola okunmadı/açılmadı. Bu, ayar kaydı kanıtıdır; SMTP teslimi henüz test sonucu değildir.

Salt okunur ön kontrol: production'da 1 mevcut GitHub hesap, onboarding0; eski izinli test adresi burkkyildizz@gmail.com henüz production'da yok. Kullanıcıdan telefon tarayıcısında canonical signup ile bu adrese ikinci gerçek hesabı oluşturması, mail doğrulamasını aynı tarayıcıda açması ve profilini kaydetmesi istendi. Böylece custom SMTP teslimi ve iki cihazlı maçın ikinci hesabı hazırlanacak; mevcut Github oturumu korunur.


## E-posta callback sorunu ve yerel düzeltme

Kullanıcı telefonda doğrulama bağlantısı sonrasında “That sign-in link is invalid or has expired” hatası gördü. DB hesabın doğrulandığını, confirmation_sent_at 06:13:30 UTC / email_confirmed_at 06:14:21 UTC / last_sign_in_at null olduğunu gösterdi. SMTP teslimi ve e-posta doğrulaması gerçekleşti; oturum dönüşü geçmedi. Kullanıcı yalnız “telefonda açtım” dedi; hangi uygulama/tarayıcı olduğu netleşmedi. Dolayısıyla farklı tarayıcı kök nedeni kesin ispatlanmış sayılmaz. E-posta UI içindeki PKCE browser-state bağımlılığı gerçek bir kırılganlıktır.

Yerelde `/auth/callback` mevcut OAuth code yoluna ek olarak tek kullanımlık email/signup/recovery token_hash doğrulaması kabul eder. Karışık proof/geçersiz type/uzun proof reddedilir; güvenli next allowlist korunur. Signup tokenı next=reset-password ile recovery marker kazanamaz; gerçek recovery tokenı reset sayfasına yönlenir. Confirmation/recovery şablonları `.RedirectTo` (sunucunun oluşturduğu kesin callback+safe next) üzerine token_hash/type ekler; davet dönüşü korunur. Mevcut `/auth/confirm` ve eski OAuth/PKCE yolu korunur. Dev request logging iki Auth credential URL'sini de dışlar.

82 unit ve strict TypeScript geçti. Production build başarılı. Lint 0 hata, yalnız Git dışındaki eski restore scriptinde unused-import uyarısı var. Gerçek yerel Auth E2E 1/1 geçti (9.7s): signup ve forgot sonrasında cookies temizlenerek verifier olmadan confirmation/recovery, profil, refresh, logout, eski parola reddi ve yeni parola girişi doğrulandı. Yeni testlerin ilk TypeScript array inference hatası düzeltildi. Docker CUA açılışında native UI timeout oldu, CLI motorun 28.5.1 olduğunu doğruladı. Yalnız yerel debug-duel servisleri veri hacimleri korunarak yeniden başlatıldı; reset/--no-backup veya hosted veri değişikliği yok.

Bu düzeltme henüz commit/push/deploy edilmedi ve production e-posta şablonları değişmedi. Yayın sırası: test edilmiş kod/CI → production build/promote → iki şablonun sparse resmî config diff/push/readback → yeni gerçek recovery testi. Eski canlı code-only callback yeni token_hash mailini okuyamadığından şablonlar koddan önce değiştirilmez. Kullanıcıya somut bu düzeltmenin commit/push ve aynı production hedefinde uygulanması için onay soruluyor.


Kullanıcı düzeltmenin commit/push, başarılı CI sonrası production build/promote ve iki e-posta şablonu değişimini açıkça onayladı. Otomatik domain ataması staging için tekrar kapatıldı. Son production build ve değişen dosyalarda hedefli ESLint geçti. Odaklı güvenlik incelemesinde token tipi/tek proof/uzunluk/safe redirect/profile setup/recovery yetkisi ve eski OAuth yolu gözden geçirildi; incelenen kapsamda doğrulanmış yeni güvenlik bulgusu yok. Gerçek farklı-cookie signup/recovery E2E bu sınırları destekler; üretim eşdeğeri yayın sonrasında doğrulanacak. Build'in yenilediği next-env.d.ts önceden var olan preview referanslarına geri getirildi, tsconfig.json kullanıcı değişiklikleri korunur; ikisi commit'e dahil edilmez.
