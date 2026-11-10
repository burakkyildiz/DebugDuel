# Debug Duel — çalışma yönergeleri

## Aktif düzeltme — Turnstile sunucu doğrulaması

- Cloudflare uyarısı üzerine production uygulama login API'sine tek sahte token/sahte kimlik isteği CAPTCHA_FAILED yerine SIGN_IN_FAILED döndürdü: privileged Auth IP forwarding CAPTCHA middleware'ini atlayabiliyor. Önceki geçerli token + hatalı credential sonucu Siteverify kanıtı değildi; doğrudan public Auth token yokken reddi de uygulama yolunun korunduğunu kanıtlamıyordu. Production uygulama yolu şu an sahte tokenları kabul edebiliyor; doğrudan public Auth CAPTCHA etkindir. E-posta kotası tüketimi riski vardır.
- Yerelde Cloudflare Siteverify sunucu denetimi (geçersiz/tekrar/kesinti/hostname fail-closed) geliştiriliyor. Production TURNSTILE_SECRET_KEY server-only env gereklidir, kullanıcı Cloudflare production widget secretını Vercel'e kendisi Secret/production olarak girmeli. Mevcut live sürüm değişmeden kalır. Önce test/CI, sonra yeni env ile deployment; invalid tokenın production app API'de CAPTCHA_FAILED dönmesi ve gerçek tokenın normal giriş hatasına ulaşması birlikte doğrulanmalı. Test widget uyarısı ayrıdır; dev CAPTCHA kapalıdır.

## Güncel çalışma — 10 Kasım 2026 güvenlik ve kapasite incelemesi

- Kullanıcı açıkları, eşzamanlı kapasiteyi, kayıt/kurtarma kotalarını inceleyip düzeltmemizi istedi; ücretsiz Cloudflare Turnstile ve test sonrası CI ile yayın adımlarının sürdürülmesini onayladı. Ayrıntılı kanıt ve sınırlamalar `docs/SECURITY_CAPACITY_REVIEW_2026-11-10.md` içinde.
- Production ortak Auth e-posta kotası 30/saat, aynı kullanıcı tekrar aralığı 60 saniye; Free Realtime 200 bağlantı ve 100 mesaj/saniye. Bunlar kapasite garantisi değildir. Ücretli özellik açma.
- Geliştirme için ayrı test widget kuruldu. Supabase geliştirmede CAPTCHA geçici etkinleştirildi: eksik/geçersiz token 400/captcha_failed, kullanıcı gerçek widget ile doğrulama sonrası sahte giriş hatası gördü. Testten sonra yalnız geliştirme CAPTCHA enabled=false geri alındı. Test widget secret panel erişilebilirlik çıktısında göründükten sonra kullanıcı 10 Kasım yaklaşık 16.09 TRT’de Cloudflare panelinden secretı yenilediğini doğruladı. Cloudflare'ın iki saatlik geçiş süresi uygulanıyorsa eski anahtar yaklaşık 18.09 TRT’ye dek geçerli olabilir; bağımsız doğrulama yok. Geliştirme CAPTCHA kapalıdır; yeniden etkinleştirmeden önce kullanıcı yeni test secretını panele kendisi girmelidir. Production widget secretı kullanıcıda ve sohbete alınmamalı.
- Auth kodu 7a65b72 CI 42813603354 başarılı ve production dpl_HqaHGHwACRuNamvGJqXk8jcXQNMT canlıda. İlk canlı denemede Cloudflare 110200 hostname eksikliğinden geri dönüş yapıldı; kullanıcı production widget hostname ekledi, gerçek widget başarılı dedi, aynı build tekrar yayınlandı. Kullanıcı production Turnstile secretını Supabase paneline kendisi girdi. CLI diff enabled=true/provider=turnstile doğruladı; doğrudan eksik token isteği 400 captcha_failed. Health 200/ready; kullanıcı gerçek Cloudflare doğrulaması ardından sahte credential ile nötr giriş hatasını görerek production token eşleşmesini doğruladı; gerçek e-posta hesabıyla ve yeni kayıt ile ayrıca denenmedi. Son Vercel error/fatal taraması boş. `tsconfig.json` ve `next-env.d.ts` mevcut kullanıcı preview değişikliklerini koru, teslim commit'ine alma. Production CAPTCHA uygulama ve site key doğrulanmadan etkinleştirilmez.

## Devir — 9 Kasım 2026

- Kullanıcı yerel profil ve Practice değişikliklerinin canlıya alınmasını, yerel sunucunun kapatılmasını ve devir kayıtlarının güncellenmesini istedi. Bu bölüm eski faz notlarından önceliklidir; aşağıdaki eski bekleme bilgileri tarihseldir.
- `e3fb1af` GitHub `main` ve Vercel production ana adresinde doğrulandı. `dpl_HmRJiMamRvBii2Fh3PwqQWHugevF` READY (`fra1`), `debug-duel-two.vercel.app` ana adrese HTTP 307 ile yönleniyor, `/api/health` HTTP 200 ve `ready: true`. [CI 42593718311](https://github.com/burakkyildiz/DebugDuel/actions/runs/42593718311) quality ve database işleri, Auth/Practice/düello/yük testleri dahil, başarılı.
- Yayın sonrası misafir tarayıcı testinde Practice başlatma, 45 saniyelik sürenin yenilemede korunması, doğru yanıt ve sonucun yenilemede görünmesi geçti. Oturumsuz `/profile` tarayıcıyı girişe yönlendirdi, `PATCH /api/me/profile` HTTP 401 döndü. Kullanıcı mevcut hesabında profil kilidini ve hesaplı Practice akışını doğruladı. Vercel'in son 30 dakikalık taramasında error/fatal kaydı yoktu.
- 12.44 TRT’deki son üretim kontrolünde aynı dağıtım READY durumundaydı, `/api/health` HTTP 200 ve `ready: true` döndü, önceki 30 dakikada error/fatal kaydı görülmedi.
- Supabase Authentication → Users ekranındaki `Display name`, GitHub OAuth girişinde alınan GitHub profil `Name` alanından gelir. Supabase bu bilgiyi Auth metadata’sında `name` ve `full_name` olarak tutar. Debug Duel profil başlığı ve profil kilidi uygulamanın ayrı `public.profiles.username` ve `avatar_seed` alanlarını kullanır. [Supabase GitHub sağlayıcı kodu](https://github.com/supabase/auth/blob/master/internal/api/provider/github.go#L76-L93)
- Yerel uygulama sunucuları 3000 ve 3010 kapatıldı. Yerel Supabase/Docker servisleri kapatılmadı. `tsconfig.json` önceden var olan yerel değişiklik olarak korundu.
- Production Supabase `nvpqjmwurmeupkbhozrn` üzerinde `20261109085250_lock_profile_identity` ve `20261109091005_expand_practice_questions` migration'ları CLI ile uygulandı. Yayın sonrası geçmişte 25 migration ve etkin havuzlarda zorluk başına 10 Practice ve 5 düello sorusu salt okunur olarak doğrulandı.
- Practice 30, düello 15 soru; aynı düelloda soru tekrarlanmaz, farklı maçlarda tekrar mümkündür. Kullanıcı adı ve avatar ilk profil kaydından sonra kilitlidir; mevcut profiller mevcut seçimleriyle kilitlenir. Beş avatar rengi ve profil düzeni bu yayına dahildir.
- 9 Kasım kontrolü: 45 soru/114 vaka, lint (yedek dosyasında bir uyarı), typecheck, 121 unit, 605 DB testi ve production build başarılı. `next-env.d.ts` ve `tsconfig.json` önceden var olan yerel preview değişiklikleridir; koru.
- Gelecek için fikirler: seçilebilir tur sayısı ve Python dışında diller, oyuncular arasında sınırlı emoji tepkileri. Bunlar uygulanmış değildir. Sıfır bütçe geçerli; `debugduel.net` satın alınmadı.

## Yayın öncesi kayıt — Practice soru havuzu

- Kullanıcı Practice havuzunu en az 30 soruya çıkarmak istedi. 15 yeni özgün soru eklendi; Practice 30 (10 kolay/10 orta/10 zor), düello 15 (her zorluktan 5). `20261109091005_expand_practice_questions.sql` yerelde ve geliştirme hvqklcqyjqjwwwcsioch ortamında uygulandı; production henüz uygulanmadı, commit/push yapılmadı.
- 45 soru/114 davranış vakası, 121 unit, 605 DB, temiz ayrı DB kurulum/seed tekrarı başarılı. Aynı düellonun turlarında soru tekrarlanmaz; farklı düellolarda ve Practice denemelerinde tekrar mümkündür. Önceki profil kilidi ve görsel değişiklikler de yereldedir.

## Yayın öncesi kayıt — Tek seferlik profil seçimi

- Kullanıcı username ve avatarın ilk profil kaydından sonra değişmemesini istedi. İlk kayıt formunda açık onay gerekir, tamamlanmış profil salt okunur; API 409 PROFILE_LOCKED döndürür. DB yazıcısı satır kilidiyle ilk kaydı atomik yapar ve aynı seçimle tekrarı zararsız kabul eder. Mevcut tamamlanmış hesaplar mevcut değerleriyle kilitlenir.
- `20261109085250_lock_profile_identity.sql` yerel ve yalnız geliştirme hvqklcqyjqjwwwcsioch ortamında uygulandı; production henüz uygulanmadı. GitHub push/yayın yapılmadı. Yerel 605 DB,121 unit, gerçek Auth E2E ve iki paralel ilk seçimde 1 başarı/1 PROFILE_LOCKED geçti. Kullanıcının önceki beş avatar rengi değişikliği de henüz yerelde; production'a geçiş ayrı talimat bekler.

## Güncel çalışma — Profil sadeleştirme ve avatarlar

- Kullanıcı username ve display name yerine tek username, mavi/sarı/yeşil/kırmızı/turuncu/mor/beyaz/siyah avatar istedi. Profil formu yalnız username gösterir; kaydederken display_name uyumlu olarak username değerine eşitlenir. Mevcut hesap verileri topluca değiştirilmedi. Sekiz avatar, eski dört seed ile uyumlu CSS ve erişilebilir renk isimleriyle gösterilir.
- `20261108201629_neon_profile_avatars.sql` yerelde ve yalnız geliştirme `hvqklcqyjqjwwwcsioch` ortamında uygulandı; CLI dry-run yalnız bu migration'ı gösterdi, seed/rol/Vault yok. Kullanıcı isteğiyle production migration uygulandı ve 3d86069 uygulama build’i dpl_29Qqyk6rob1642zPthum1B3i13Cd ana adrese alındı. CI 42519743406 quality/database başarılı; yerel 604 DB, 121 unit ve gerçek Auth/profil E2E geçti. Production avatar kısıtı sekiz seçeneği doğruladı; health ready, runtime hata taraması temiz.

## Güncel çalışma — Auth IP düzeltmesi canlıda, 8 Kasım 2026

- Kullanıcı ücretsiz düzeltmeyi, tüm güvenlik işlerini bitirmeyi ve açık “Evet, push et ve canlıya uygula” yanıtıyla commit/push+başarılı CI sonrası üretim ayarı/yayını onayladı. Teslim uygulama commit'i dfc33405435f134ab4333745f3856a0c40068907. CI42480035067 quality/database tamamen success:121 unit, DB/engine/Auth/Practice/match/load ve foundation E2E. Yeni SQL/migration yok.
- server-only Auth adaptörü yalnız gerçek Vercel trusted IP+Auth'a özel SUPABASE_AUTH_SECRET_KEY ile user Auth allowlist'ine key/IP ekler; SQL/RPC public key+user JWT korunur. Admin/diğer origin/redirect yükseltilmez, privileged client/browser değişmedi. Varsayılan flag false, sadece dev test ve ana Production ortamında true; Preview'a üretim credential eklenmedi. Sır değerlerini okuma/yazdırma.
- Geliştirme kontrollü150→1 kotada bilgisayar31. istekte429 aldı, telefon mobil veride normal credential400 kaldı. Kota150'ye CLI diff+watchdog ile doğrulanmış döndü. Gerçek sentetik dev login200/profile200/logout200/sonra401 geçti; exact UUID/e-posta ve sıfır maç guard'lı fixture transaction temizliği remaining0. Test SSO all, anonymous302→VercelSSO; future build ignore exit0. Gerçek hesap/XP değişmedi.
- Kullanıcı üretim Auth key'ini panelden kendisi Secret/yalnız Production kaydetti. Üretim Supabase forwarding onayla açık kaydedildi/reload switch1; kotalar150/30/30 korundu. Exact dfc3340 Git kaynağından yeni env ile dpl_G7XXZMjgWBWe6AhDAdUD2JJsCWmy READY/fra1 build'i ana adrese promote edildi; canonical deployment/commit doğrulandı.
- Ana HTTPS home/login/Practice200, health200/ready=true, guest history401; private/no-store/nosniff/nonce CSP korundu. Son runtime errors1h temiz. Kullanıcı telefonda mevcut hesapla çıkış/yeniden giriş/profil ve aynı XP sonucunu doğruladı. Üretimde kota tüketimi/sentetik hesap/migration/veri temizliği yapılmadı.
- docs/AUTH_IP_FORWARDING_REPORT.md son kanıt/sınır/rollback kaynağı. Üretim security advisor yalnız önceden bilinen leaked-password-protection WARN; resmî Pro+ özelliği sıfır bütçe nedeniyle açılmadı. Yeni DDL/RLS bulgusu yok; tamamen güvenli/sıfır risk iddiası yok. Mevcut next-env.d.ts/tsconfig.json kullanıcı preview değişikliklerini koru; commit/upload'a alma. Arayüz kullanıcı isteğiyle en sona bırakıldı, yeni faz/özellik kendiliğinden başlatılmaz.

## Güncel çalışma — Auth ortak IP deneyi, 8 Kasım 2026

- Kullanıcı ayrı test ortamında iki ağlı kontrollü deneyi istedi. Ayrı ücretsiz Vercel `debug-duel-auth-check-20261108` / `prj_V8px8G7zNsQ07OOaAfWHz8NSv5NI`, dev Supabase hvq..., yalnız3 public env, private/prod secret yok. Sourcece54/deploymentdpl_5FaUbC7ZCpXjDJrBhBfop2c1RgXY, Node24/fra1; asıl üretim değiştirilmedi.
- Dev token kotası150→1 geçici değişti;31. bilgisayar isteği429 aldı, telefon mobil veride de kota hatası gördü; aynı B girdisiyle doğrudan dev Auth kontrolü400 kaldı. Kota150'ye döndü/sparse diff update0 ve kullanıcı telefonda normal giriş hatasına döndüğünü doğruladı; üç dakikalık watchdog alreadyRestored150 diye sonlandı. Gerçek hesap/parola veya e-posta gönderimi yok. Üretimde varsayılan kotada olay sıklığı ölçülmedi, ancak ortak SSR kota davranışı dev'de doğrulandı. Kanıt docs/AUTH_IP_QUOTA_TEST_2026-11-08.md.
- Test projesinde future build ignore exit0/Preview disabled ayarlı. İlk ssoProtection.deploymentType=all isteği auto-review tarafından ayrıca açık onay istediği için reddedildi; kullanıcı “Evet, yalnız test bağlantısını kapat” dedikten sonra yalnız test projesine uygulandı. Anonim test URL302 ile Vercel oturum korumasına yönlenir; kapanış tamamlandı. Asıl production SSO/env değiştirilmez. Ürün düzeltmesi henüz yetkilendirilmiş/uygulanmış değildir; sırları genel oyun SSR client'ına taşıma. Bu deney belgeleri henüz commit/push edilmedi; mevcut iki preview dosyasını koru.

## Güncel çalışma — güvenlik düzeltmeleri canlıda, 8 Kasım 2026

- Kullanıcı iki bulguyu düzeltmeyi, ardından “Evet, push et ve canlıya uygula” yanıtıyla commit/push, başarılı CI sonrası geliştirme+üretim migration ve Vercel yayınına açık onay verdi. Teslim tamamlandı; güncel kanıt `docs/SECURITY_REVIEW_2026-11-08.md`. Önceki Faz9 kapanışı37fb sürümünün tarihsel kanıtıdır.
- Canlı uygulama `7e05ca2182f02381a0e5f119834c420b0fe5eba4`, CI `42461139758` tüm quality/database/Auth/Practice/match/load adımlarında success. Vercel `dpl_6m3Zm9yLPN5Hp3N7teQyZAEFckm8` READY/Production/fra1, canonical https://debug-duel-burakkyildiz.vercel.app sorgusu aynı SHA'yı doğruladı. Son HTTP health ready/200, home/login/Practice200, guest history401; runtime error taraması temiz.
- 22. migration `20261108075236_persist_failed_match_join_admission.sql` resmî CLI ile önce geliştirme, sonra üretime uygulandı. Her ikisi22/fixtrue; son dry-run upToDate=true, migrations/seeds/roles boş. Yalnız unknown-invite join exception yerine commandError döner; hesap sayacı korunur/11. istek engellenir. Güncel host-ready, imza/owner/ACL/search_path ve atomik oyun yazımları korunur; veri/XP temizliği yapılmaz.
- Login429/over_request_rate_limit →429 + Retry-After60,5xx/transport →503; credential hatası nötr400. Yeni10 unit/9 DB regresyon eski kodda bulguları yakaladı. Nihai92 unit/599 DB/temiz kurulum+seed tekrarı599+599/gerçek Auth E2E/engine concurrency/build başarılı; yerel security advisor boş. Lint0 hata, Git dışı eski backup scriptinde1 önceden var olan warning.
- Uzak geliştirme ve üretimde9/9 rollback testi geçti. CLI'nin geçici rolü için yalnız test harness'inde başlangıç/reset admin rolü açık postgres olarak seçildi; kalıcı yetki verilmedi. Son fixture Auth/profil0 ve client internal EXECUTE/XP UPDATE=false. Auth şifreleri, sırlar veya gerçek kullanıcı dump'ı alınmadı.
- Uzak advisor'ın tek WARN'ı leaked-password protection disabled; resmî belgede Pro+ özelliği. Sıfır bütçe korunur, plan yükseltme. Ortak Auth IP kotasının Vercel etkisi henüz ölçülmedi; güvenliği gevşeterek/production istek bombardımanıyla test etme. Bu iki sınıra tüm güvenlik tamamlandı iddiası ekleme.
- Temiz DB runner Auth template content_path için templates dizinini de kopyalar. Geçici DB/build çıktısı kaldırıldı; mevcut geliştirici DB ve next-env.d.ts/tsconfig.json preview değişiklikleri korunur. İki dosya teslim commit'ine eklenmez. Rollback gerekirse22. DB migration'ını silme; token_hash uyumlu37fb önceki uygulama noktasıdır,99cf code-only sürümüne tek başına dönme.

## Güncel çalışma — Faz 9 kapanışı, 8 Kasım 2026

- Ücretsiz pilot yayın kapsamı tamamlandı. Güncel kaynak `docs/PHASE_9_REPORT.md`; eski fazların bekleme kayıtları tarihseldir. Canlı: https://debug-duel-burakkyildiz.vercel.app . Uygulama kodu `37fb0d30da2986833c1910417d3faaecf0100bc4`, deployment `dpl_xftmNGCcc7JMgSABXpbozLu3g8Qu`; CI 42454840514 quality/database/Auth/Practice/match/load tümü başarılı.
- Kullanıcı ayrı ücretsiz üretim, ilk build/promotion ve e-posta düzeltmesinin commit/push/CI sonrası production yayını ile iki şablon değişimini açıkça onayladı. Teslim belgelerinin push'u bu kapsamda. Kendiliğinden yeni özellik/faz veya ücretli kaynak açma.
- Üretim `debug-duel-prod` / `nvpqjmwurmeupkbhozrn`, Frankfurt; geliştirme `hvqklcqyjqjwwwcsioch` ayrı kalır. 21 migration/30 soru resmî CLI ile uygulandı; üretimde 590 rollback DB testi geçti. Cron saniyelik advance/günlük maintenance aktif, health ready. Public Realtime gerçek WebSocket denemesinde reddedildi.
- Vercel `burakkyildiz` / `team_krqOd5IVMM0LyPh0MIcE6Fco`, proje `prj_d67hDYIsOi8QR7swowQObAMJ33AP`; Hobby, Node24, fra1. Yedi env yalnız Production; kullanıcı private anahtarları kendisi girdi. Decrypt etme/sohbete yazma. Preview otomatik deploy ve otomatik domain ataması kapalı; Preview'a production erişimi verme. Yeni yayınlar test/CI ve kapsam yetkisiyle ele alınır.
- Üretim GitHub OAuth App `4002079`, yalnız user:email; kullanıcı consent verdi. Güncel sürümde profil refresh, logout, oturumsuz private maçın login'e yönlenmesi ve GitHub tekrar girişinin aynı tamamlanmış maça dönüşü geçti. Profil @burakgithub: 20 XP/1 maç korundu.
- Gmail gönderen hesabı `debug.duell@gmail.com`, SMTP smtp.gmail.com:465. Kullanıcı 2FA/app password oluşturma/girme/kaydetme işlemlerini kendisi yaptı; parola okunmadı. Gerçek kayıt e-postası ulaştı ve hesap doğrulandı. İlk signup'ın otomatik oturum dönüşü hata verdi; farklı browser kesinleşmedi. Düzeltme OAuth PKCE'yi koruyup tek kullanımlık token_hash email/signup/recovery doğrulaması ekler. İki hosted subject/body kod yayınından sonra panel Save/reload ile doğrulandı.
- Kullanıcı son yeni production recovery e-postası → yeni parola → yeni parolayla giriş testini “tamam basarili” diye doğruladı. Son sign-in 2026-11-08 06:59:00 UTC; @burak hesabının 70 XP/1 maç ve ledger70 değeri korundu. recovery_sent_at null; bu alan veya parola hash'i bağımsız kurtarma kanıtı sayılmadı. Gerçek yeni signup otomatik oturumu düzeltme sonrası üçüncü hesapla yeniden denenmedi; verifier-cookie olmadan signup/recovery yerel gerçek Auth E2E'de geçti.
- Bilgisayar GitHub + telefon email ile gerçek üç tur smoke kullanıcıca onaylandı: ilk tur 45000ms timeout, sonraki iki tur doğru cevap; 284–0, 1 settlement/2 ledger, 70/20 XP ve profil eşleşmesi, iki hesapta1maç. Bu motor kanıtı ilk 99cf build'indedir; yeni fix motor kodunu değiştirmez. Gerçek hesap/XP temizliği uygulanmadı; ayrı ertelenmiş karardır, veriyi silme.
- Canlı guest Practice doğru cevap/reload, HTTP/CSP/cache, private history reddi ve runtime hata taraması geçti. Üretimde ayrı üçüncü hesapla katılımcılık denemesi yapılmadı; RLS için 590 production rollback testi ve yerel/CI kapsamı vardır. Vercel üzerinde 40 oyuncu kapasitesi/SLA ve Gmail yüksek hacimli teslim garantisi yok. Preview-dev entegrasyonu ileride ayrı doğrulanır; şu an kapalıdır.
- Auth yedeği kullanıcı kararıyla hariçtir; uygulama-only restore kanıtını Auth restore olarak sunma. Git dışı `.local-backups` ve secret'ları koru. Token_hash şablonlarından sonra eski code-only 99cf sürümüne tek başına rollback yapma; `docs/deployment.md` uyum sırasını izle. Mevcut `next-env.d.ts` ve `tsconfig.json` yerel preview değişikliklerini koru, teslim commit'ine ekleme.

## Güncel çalışma — Faz 8 kapanışı, 8 Kasım 2026

- Kullanıcı turuncu arayüzü kabul edip push ve sonraki fazı açıkça istedi. Turuncu vurgu `4807787` ile uzak main'e gönderildi; Faz 8 başladı. Production/Faz 9 bu yetkiye dahil değildir.
- Faz 8 yerel sağlamlaştırma: kalıcı public okuma admission, CSP nonce, güvenli komut ölçümleri ve klavye/ekran okuyucu düzeltmeleri. Güncel kanıt ve kalan çıkış kapıları `docs/PHASE_8_REPORT.md` içinde tutulur.
- Kullanıcı Faz 8'i bitirme talimatıyla uzak uygulama ve commit/push dahil kalan teslim işlerini yetkilendirdi. `20261107105016_public_read_admission.sql` resmî CLI ile uzak geliştirmeye uygulandı (21 sürüm). Auth minimum parola 12 olarak kaydedildi, e-posta doğrulama açık. Nihai teslim/CI ve diğer kontrollerin son kaynağı Faz 8 raporudur. Önceden var olan next-env.d.ts ve tsconfig.json preview değişikliklerini koru.
- Faz 8 kodu `4f6b175`, taşınabilir load raporu düzeltmesi `5e7032d` main'de. [CI 42370343800](https://github.com/burakkyildiz/DebugDuel/actions/runs/42370343800) başarılı; önceki 4f6 CI yalnız rapor yazma yolunda Linux ENOENT ile kapandı.
- Kullanıcı gerçek uygulama yedeğine açık onay verdi, Auth verisini özellikle hariç tuttu. `.local-backups/phase8-20261107` Git dışında ve korumalıdır. Uygulama yedeği ayrı yerel DB'ye yüklenip 590 testle doğrulandı; Auth geri yükleme kanıtı değildir. Mevcut ortamlara restore/reset yapılmaz.
- Faz 8 geliştirme kapsamı kapandı. Gerçek e-posta doğrulaması, altı localhost callback'in 6/6 kaydı ve e-posta girişi doğrulandı. Kullanıcı 8 Kasım'da reset password işlemini ve yeni parolayla yeniden girişi açıkça doğruladı; son sign-in metadata'sı 2026-11-08 04:58:54 UTC. recovery_sent_at null olduğu için recovery kanıtı manuel kullanıcı doğrulamasıdır; metadata ile bağımsız ispat edildiği iddia edilmez. Parola/token alınmadı. Auth yedeği alma. Faz 9/production yalnız yeni kullanıcı talimatıyla başlar.
- Uzak Free yükün son yavaş hazırlık koşusu geçti: 20 maç/40 hesap/40 private kanal, üç tur, 20 settlement/40 ledger. Command p95 3614ms; leaderboard 80 burst p95 13820ms, 60 kabul/20 limit. Önceki 429/401 denemeleri ayrı başarısız kanıttır; Vercel kapasitesi veya SLA iddiası yok. Sentetik test temizliği yalnız ilgili dd-phase8load/probe UUID'leriyle sınırlandırılır; gerçek iki hesap/XP'nin yayın öncesi temizliği kararı ayrı kalır. Ücretli kaynak açma.

## Güncel çalışma — Faz 7, 6 Kasım 2026

- Kullanıcı “tamam faz7 ye baslayabiliriz” diyerek Faz 7’yi başlattı. Yerel kapsam ve doğrulamalar `docs/PHASE_7_REPORT.md` içinde. Faz 6 teslimi `4b55d8b` ve [başarılı CI](https://github.com/burakkyildiz/DebugDuel/actions/runs/42214847641) ile GitHub `main` dalında.
- Faz 7 commit’i `2df6df4` uzak `main` dalında. [CI](https://github.com/burakkyildiz/DebugDuel/actions/runs/42223200800) başarılı. Kullanıcı onayıyla Faz 7 migration’ı uzak geliştirme projesine uygulandı. Yerel ve uzak geçmişte 20 sürüm eşleşiyor. Production yayın ve Faz 8 ayrı kullanıcı talimatıyla yürütülür. Yerel test hesabı ve XP temizliği yayın öncesine ertelendi.
- Üç turluk maçlar kapanırken XP ledger, oyuncu XP’si ve profil istatistikleri aynı transaction’da yazılır. Kota UTC günü başına sırasız hesap çiftinin ilk beş sonuçlanmış maçı içindir. Eski tamamlanmış maçlara geriye dönük ödül yazılmaz. Geçmiş katılımcıya özel ve cursor sayfalı, liderlik tablosu tamamlanan maçlardan gelen gerçek XP’ye göre sıralanır.

## Güncel çalışma — Faz 6, 6 Kasım 2026

- Kullanıcı açıkça “tamam faz 6 y baslayalim” dedi; Faz 6 başladı ve yerel üç turluk motor akışı tamamlandı. Yeni oturumda önce `docs/PHASE_6_HANDOFF.md` ve `docs/PHASE_6_REPORT.md` dosyalarını oku. Aşağıdaki Faz 5 bekleme/kapsam notları tarihseldir.
- Kullanıcı 6 Kasım 2026’da Faz 6’yı iki yerel hesapla onayladı ve uzak geliştirme migration’larına açık yetki verdi. Teslim commit’i `c77d142` uzak `main` dalında. Güncel CI sonucunu GitHub Actions’tan doğrula. Production yayın ve Faz 7 için ayrı kullanıcı talimatı gerekir.
- Altı Faz 6 migration’ı Free plandaki `debug-duel` geliştirme projesine uygulandı. Yerel ve uzak 19 sürüm eşleşiyor. Uzak `pg_cron` 1.6.4 gerçek saniyelik tick üretiyor. `GET /api/health` 200 ve `ready: true` döndü. Uzak DB’ye bağlı iki tarayıcı oturumunda üç turluk düello geçti.
- UI güncellemesi (4 Kasım): Explanation/Previous rounds yalnız maç sonunda; tur arası sonuç ve 15+3 saniye korunur. Connection_lost mesajı oyuncu bakış açısına göre en az 30 saniye heartbeat yokluğunu ve puandan bağımsız forfeit sonucunu açıklar.
- Yeni odalar stage 6: easy/medium/hard üç soru, 3 saniye ilk countdown, 15+3 saniye ara (4 Kasım kullanıcı kararı), 45 saniye/tur, DB toplam puan sonucu. Stage-5 odalar eski tek tur sözleşmesiyle korunur. XP/profile stats/ledger yazılmaz; Faz 7 kullanıcı talimatını bekler.
- Son yerel paket 559 DB testi içerir. Önceki 554 DB testi temiz kurulum ve seed tekrarında da geçti. Ayrıca 67 unit, 30 soru/81 vaka, gerçek paralel DB kilit yarışları, production build üzerinde 9 motor/foundation E2E ve 19 Practice/foundation regression geçti (1 duplicate mobile timeout skip). Yeni iki-browsers-closed testi gerçek Cron'u doğrudan katılımcı SELECT ile gözler; service role'a oyun tablo SELECT yetkisi eklenmedi.
- Health >5 saniye eskiyse yeni başlangıç durur; tick boşluğu >10 saniye aktif maçlara infrastructure abort; tek ≥30 saniye kopma/son 15 saniye canlı rakip forfeit, iki ≥30 saniye kopma abort. Heartbeat önce geçmiş eşiği değerlendirir. Deadline/normal son tur kapanışı bağlantı değerlendirmesinden önce gelir.
- `pnpm test:engine:local` gerçek Docker/Postgres paralel oturumlarıyla SKIP LOCKED ve kilit sonrası deadline testi yapar ve kendi yerel fixture’larını temizler. `pnpm test:match:local --grep ...` odaklı E2E destekler. `pnpm match:local` 3006’da yerel e-posta hesaplarıyla çalışır ve GitHub girişi kapalıdır.
- Public health private yardımcı çözümlemesi için anon'a schema USAGE verildi; private Data API expose veya tablo SELECT/DML verilmedi, diğer EXECUTE revokeları korunur. Scheduler'a yalnız advance/cleanup/health EXECUTE; engine rolü INHERIT/SET edilmez. Auth adaptör sınırı genişletilmedi.

## Son yetki ve uzak ortam — 3 Kasım 2026

- Kullanıcı “tamam tum islemleri yapalim OK” diyerek Faz 5 uzak DB uygulaması ve commit/push için açık onay verdi. Aşağıdaki yalnız yerel/push bekliyor notları bu onaydan öncedir. Production yayın ve Faz 6 başlatılmadı.
- Altı Faz 5 migration'ı resmî CLI ile hosted `debug-duel` projesine uygulandı; 13 repository/uzak sürüm birebir eşleşti. Realtime yalnız private kanallara izin verir (`private_only=true`), gerçek public WebSocket red doğrulandı. Ücretli kaynak/limit artışı yok.
- Uzak BEGIN/ROLLBACK içinde 63/63 düello DB testi geçti; sentetik Auth fixture'ları ve pgTAP extension'ı kalmadı. Gerçek iki hesaplı browser/Auth/Realtime E2E kanıtı yereldedir; uzak eşdeğeri henüz yok. Güncel kanıtlar `docs/PHASE_5_REPORT.md` son bölümünde.
- Kod GitHub main'e commit/push için hazırlanmıştır; commit/push ve CI durumunun en son kaynağı git geçmişi ve GitHub Actions'tır. Yeni faz yalnız kullanıcı isterse başlar. Gerçek e-posta teslimi, üç tur/Cron ve XP mevcut teslimle tamamlandı sayılmaz.

## Güncel çalışma — Faz 5, 3 Kasım 2026

- Kullanıcı açıkça “selam faz 5 e gecebiliriz” dedi; önceki Faz 5 bekleme kararını kaldırdı. Başlangıç HEAD `ba836e8`; Faz 4 `15e7e3d`, provider guard `ba836e8` push edilmiştir. Faz 5 commit/push/production yayını ayrıca istenmedi.
- Faz 5 yerel özel oda/tek tur dikey akışı geliştirildi. Güncel kapsam, testler ve ortam sınırları için önce `docs/PHASE_5_REPORT.md` oku; aşağıdaki Faz 2–4 notları tarihseldir.
- Altı yeni migration yalnız yerelde; hosted gelişim projesi Faz 4'ün yedi migration'ında kalır. Önceki migration repair farkı resmî CLI ile giderildi. Hosted yeni migration/Realtime private-only ayarı uygulanmadı.
- Yerel komutlar: `pnpm match:local` → 3006, `pnpm test:match:local` → izole production build 3005. Gerçek yerel Auth/PostgREST/Realtime gerekir. Yerel GitHub kapalı; e-posta doğrulama yerel posta kutusundan yapılır.
- Tek sabit soru ve maç puanı vardır; XP/kalıcı istatistik yoktur. Üç tur, saniyelik Cron ve otomatik reconnect/forfeit Faz 6; settlement/XP Faz 7. Kullanıcı istemeden yeni faza geçme.
- Game-engine korumalı Auth adaptörüne erişmez. Yeni dar postgres-owned `private.match_notify(uuid)` köprüsü yalnız sabit topic/event/metadata gönderir, yalnız game-engine EXECUTE sahibidir; gerekçe/testler rapor ve decisions içindedir.

## Kaynak ve ürün

- Uygulamaya başlamadan `docs/DEBUG_DUEL_PROJECT_SPEC.md` dosyasının tamamını oku. Ürün kuralları, veri modeli, API sözleşmeleri ve AC-01–AC-22 için ana kaynak bu belgedir.
- Debug Duel: iki hesaplı oyuncunun aynı Python mantık hatasını bulduğu, 3 × 45 saniyelik davetli düello. Misafirler yalnızca Practice oynar.
- Stack: Next.js App Router, strict TypeScript, Tailwind, Supabase Auth/Postgres/özel Realtime, pnpm ve Vercel. Kullanıcı kodu çalıştırılmaz.
- Kullanıcıyla Türkçe iletişim kur; ilk arayüz metinleri İngilizce ve `src/content/copy.en.ts` içinde olsun.

## Kullanıcının onayladığı kararlar — 2 Kasım 2026

- Debug Duel, diğer uygulamalardan ayrı Supabase projesidir: `debug-duel`, ref `hvqklcqyjqjwwwcsioch`, Frankfurt (`eu-central-1`), `burakkyildiz's Org`.
- **Bütçe sıfır:** ücretli plan, ücretli servis, ücretli branch/compute, satın alma ve ücretli eklenti kullanma. Ücretsiz kapasite yetmezse bunu açıkla; plan yükseltme.
- Görsel referans yoktur. Şartnamedeki koyu antrasit/mor terminal estetiğini uygula; sahte oyuncu sayısı veya sahte sıralama gösterme.
- `docs/decisions.md` kararları, `docs/progress.md` ise doğrulanmış ilerleme ve kalan işleri kaydeder.
- **Yeni oturum başlangıcı:** Güncel devir için `docs/PHASE_6_HANDOFF.md` dosyasını oku. `docs/PHASE_3_HANDOFF.md` tarihsel kayıttır.

## Faz 4 teslim/push yetkisi — 3 Kasım 2026

- Kullanıcı Faz 4 için açık commit/push yetkisi verdi. Önceki commit/push yapılmadı notları teslim öncesi tarihseldir. Production yayın ve Faz 5 otomatik başlangıcı kapsam dışıdır.
- Faz 4 güncel kanıtı: 56 birim, 420 pgTAP, production build üzerinde 19 E2E başarılı; 1 mobil duplicate-timeout skip. Uzak guest HTTP/tarayıcı ve rollback'li hesap DB smoke geçti. Yedi hosted/repository migration sürümü eşleşiyor; dry-run up to date.

## Migration geçmişi düzeltmesi tamamlandı — 3 Kasım 2026

- Kullanıcının açık güvenli repair onayı ve kendi CLI girişi sonrası resmî `migration repair` tamamlandı. Yedi yerel/uzak sürüm eşleşiyor. Önceki metadata reddi/onay bekleme kayıtları tarihseldir; doğrudan SQL UPDATE kullanılmadı.
- Son `db push --dry-run --skip-vault` başarılı: upToDate=true; migrations/seeds/roles boş.
- Önce/sonra şema snapshot karşılaştırması tablo, sütun, kısıt, indeks, RLS, policy, fonksiyon/owner/ACL değişmediğini doğruladı. Uzak HTTP guest smoke tekrar geçti. Snapshot'lar `.local-backups/migration-repair-20261103` altında Git dışındadır.

## Uzak geliştirme güncellemesi — 3 Kasım 2026

- Kullanıcı sunucu key'ini ekledi ve uzak kurulumun devamını istedi. Dört yeni migration + seed hosted geliştirme projesine uygulandı; secret yazdırılmadı. Guest HTTP ve rollback'li hesaplı DB smoke geçti.
- **Önemli:** Connector migration sürümlerini yeniden üretti. Repository/hosted sürüm eşlemesi ve izin sınırı `docs/PHASE_4_REPORT.md` son bölümündedir. Metadata eşleştirmesi otomatik onay incelemesinde reddedildi; işlem uygulanmadı. Kullanıcı açık onayı olmadan bu işlemi tekrar deneme veya dolaylı düzeltme yapma. Fark giderilmeden CLI db push kullanma.
- Aşağıdaki hosted migration/key eksikliği kayıtları tarihseldir. Production deploy veya yeni commit/push yapılmadı.

## Faz 4 güncel kayıt — 2 Kasım 2026

- Kullanıcının “tamam devam edebiliriz” ve sonraki devam talimatları Faz 4'ü başlattı. Yerel Practice DB/API/UI uygulandı; en güncel doğrulama ve kalan sınırlar `docs/PHASE_4_REPORT.md` içindedir. Aşağıdaki Faz 3 bekleme bilgileri tarihseldir.
- Son push edilen kod `52ffeca` (Faz 3). Faz 4 için commit/push yetkisi çıkarılmadı. Hosted proje hâlâ yalnızca ilk üç profil migration'ını taşır; yerel yeni Practice migration'ları remote'a uygulanmadı.
- `pnpm practice:local`: gerçek yerel Supabase ile 3002 önizlemesi. `pnpm test:practice:local`: izole sunucuda gerçek HTTP/DB/tarayıcı testleri. Sunucu anahtarı yalnızca child process ortamına alınır; .env.local değişmez.

## Faz 3 sonrası güncel kayıt — 2 Kasım 2026

- Kullanıcı Faz 3 tesliminden sonra bu değişikliklerin commit/push edilmesini ve yerel önizlemenin açılmasını açıkça istedi. Bu yetki production yayını veya Faz 4 geliştirmesini kapsamaz. Aşağıdaki commit/push yapılmadı kayıtları bu yetkiden önceki teslim anını anlatır.

- Kullanıcı bu oturumda açıkça **“Faz 3’e geçelim”** dedi; önceki Faz 3 bekleme kararı sona erdi. Faz 3 yerel kapsamı tamamlandı. Sonuç ve sonraki oturum sınırları için `docs/PHASE_3_REPORT.md` oku; `docs/PHASE_3_HANDOFF.md` önceki başlangıç kaydıdır.
- Yeni iki migration yerelde uygulandı: `20261102133621_game_schema`, `20261102134054_game_integrity`. Public matches/players/rounds ve 10 private oyun tablosu, RLS/GRANT, immutable sürüm/snapshot ve bütünlük kısıtları var. Hosted geliştirme projesine bu iki migration/seed henüz uygulanmadı; ilk üç profil migration'ı orada son durumdur.
- 30 özgün soru: 15 duel + 15 Practice, her havuzda 5 kolay/orta/zor. Kaynak `supabase/questions/catalog.json`; uygulamaya import edilmez. `pnpm test:questions` 81 davranış vakasını ve seed/katalog eşleşmesini doğrular.
- Doğrulama: 369 gerçek DB testi, ayrı temiz yerel DB'de sıfırdan migration/seed ve seed tekrarı; 48 birim testi; lint/types/build; production build üzerinde 8 desktop/mobile E2E geçti. Ayrı yerel Auth E2E bu fazda yeniden koşulmadı; önceki Faz 2 kanıtı korunur. Yerel security/performance advisor uyarısız.
- `debug_duel_game_engine` ayrı NOLOGIN/NOINHERIT rolüdür; istemci üyeliği, BYPASSRLS, profil/XP yazma ve mevcut Auth adaptörünü çağırma izni yoktur. Yeni gameplay RPC/API açılmadı. Health tick null; Realtime/Cron/cleanup ve oynanabilir Practice sonraki fazlarda.
- **Sonraki çalışma Faz 4'tür; kullanıcı istemeden başlatma.** Commit/push/production yayın yapılmadı. Önceki aşağıdaki durum maddeleri, açıkça güncellenmeyen yerlerde Faz 2 tarihsel başlangıç bilgisidir.

## Çalışma düzeni

- **Bekleme kararı — 2 Kasım 2026:** Kullanıcı Faz 2 değişikliklerinin commit/push edilmesini istedi ve kullanım kotasını beklemek için sonraki geliştirmeyi durdurdu. **Faz 3'e yalnızca kullanıcı açıkça “Faz 3'e geçelim” dediğinde başla.** Push sonrasında kendiliğinden yeni faz, otomasyon veya ek geliştirme başlatma.
- **Faz 2 düzeltmesi tamamlandı:** Kullanıcının onayladığı çıkış düzeltmesi `998c828` ile push edildi; uzak CI'da quality/database başarıyla geçti. Kullanıcı şimdi yalnızca başka oturum için hafıza/devir kayıtlarının hazırlanmasını istedi. Faz 3 yeni oturumda açıkça başlatılana kadar geliştirme bekler.
- Mevcut kullanıcı değişikliklerini koru. İstenmedikçe commit, push, yeni branch veya production yayın yapma. Kullanıcı 2 Kasım 2026'da mevcut başlangıç çalışmasını commit/push etmek için açık yetki verdi; bu yetki production yayını kapsamaz.
- Şartnamenin Faz 0–9 sırasıyla ilerle. Faz tamamlandı iddiasını ilgili çalışan akış ve test kanıtıyla destekle.
- Sürümleri resmi belgeler ve paket kayıt servisiyle doğrula, tam sürüm ve pnpm lockfile kullan. Paket yüklemek bir özelliğin tamamlandığı anlamına gelmez.
- Herhangi bir harici bağımlılık eksikse bağlantı gerektirmeyen işleri sürdür; eksikliği mock başarıyla gizleme.

## Güncel durum — 2 Kasım 2026

- GitHub hedefi: `https://github.com/burakkyildiz/DebugDuel.git`; ana branch `main`. İlk başlangıç commit'i `302c8cf`. Mevcut kullanıcı isteği bu başlangıç çalışmasının push edilmesini kapsar; sonraki commit/push işlemlerinde oturumdaki yetki kapsamını kontrol et.
- Son push edilen kod `998c828`; [CI 41452141699](https://github.com/burakkyildiz/DebugDuel/actions/runs/41452141699) quality ve database işlerinde **Success**. Önceki `a7f46a4` Auth logout hatası kapandı. Devir kayıtları ayrıca istenmedikçe commit/push edilmez.
- Başlangıç iskeleti ve koyu/mor responsive ana sayfa hazır. Login, signup, recovery, callback, profil/onboarding ve gerçek verili ilk 25 kayıt leaderboard kodu mevcut.
- Supabase geliştirme projesine üç profil migration'ı uygulandı; `src/types/database.generated.ts` gerçek şemadan üretildi. Migration dosyalarının sürümleri hosted geçmişle eşleşir.
- Son doğrulama: 46 birim testi, temiz yerel PostgreSQL'de 25 pgTAP testi, production build üzerinde 8 desktop/mobile foundation E2E testi ve ayrı komutla 1 gerçek yerel e-posta/PKCE/profil/recovery E2E zinciri geçti; lint, typecheck ve Webpack production build başarılı. DB test fixture'ları transaction sonunda rollback edilir; Auth E2E'sinin sentetik hesapları yalnızca yerelde kalır.
- **Oyun henüz oynanabilir değil:** Practice ve özel düello hazırlık durumu gösterir. Oyun şeması, 30 soru, guest Practice, davet/ready, üç turluk motor, Realtime, Cron, XP settlement ve leaderboard pagination henüz uygulanmadı.
- Yerel e-posta doğrulama/recovery ve uzak Supabase üzerinden gerçek GitHub OAuth geçti. GitHub sağlayıcısı etkin; kullanıcı onayıyla yalnızca `user:email` kapsamı verildi. Yenileme, çıkış, korunan profile red ve tekrar giriş doğrulandı. Üretim/uzak e-posta teslimi testi henüz yok; AC-01 bütünüyle tamamlandı sayılmaz. Ayrıntılar `docs/auth-checklist.md` içinde.
- Docker bu fazda başlatıldı. Yerel Supabase temiz kurulumunda üç migration başarıyla uygulandı; DB testleri geçti. Auth fazı için yalnızca gerekli yerel servisler açık; tam Realtime/Cron test ortamı henüz doğrulanmadı.
- `.env.local` Git dışında tutulur. URL/publishable key ve üç uygulama secret'ı yerelde hazırlandı; Supabase sunucu secret key'i henüz ekli değil. Secret değerlerini yazdırma veya sohbetten isteme.
- Vercel projesi/yayını ve canlı iki cihaz smoke testi yok. Hiçbir AC maddesi henüz tam tamamlandı olarak işaretlenmedi.

## Sonraki çalışma sırası

1. Faz 3 yerelde tamamlandı; `docs/PHASE_3_REPORT.md` kanıtlarını ve hosted ortam farkını incele. Yeni kullanıcı talimatıyla Faz 4’e geç.
2. Faz 4: güvenli server-only anahtar ve guest çereziyle gerçek Practice dikey akışını tamamla; XP/kalıcı istatistik oluşturma.
3. Davetli tek turu iki izole tarayıcıyla kur; ardından üç tur, saniyelik Cron, reconnect/forfeit ve tek settlement/XP ledger'a ilerle.
4. Yayın öncesi uzak e-posta teslimi/recovery ve Auth panel parola ayarlarını doğrula. Yerel e-posta zinciri ve gerçek GitHub sağlayıcısı test edildi; ücretsiz SMTP limitleri nedeniyle halka açık teslim garantisi verilmez.

## Güven sınırları

- Oyun kararları, saat, cevap, puan, XP ve settlement PostgreSQL motorundadır. Realtime yalnızca yeniden okuma bildirimi sağlar.
- Gizli çözümler, gelecek sorular, davet özetleri ve ledger `private` şemadadır. Browser bundle veya aktif soru DTO'suna çözüm ekleme.
- Hesaplı komutlar doğrulanmış kullanıcı JWT'si ve `auth.uid()` ile çalışır. Sunucuda doğrulanmamış `getSession()` kimlik kanıtı değildir.
- Private maç/sonuç/geçmiş her istekte katılımcılık denetler. RLS, GRANT, fonksiyon EXECUTE ve güvenli search_path birlikte ele alınır.
- Guest Practice yalnızca sunucu üzerinden HttpOnly çerez ve saklanan kimlik özetiyle yetkilendirilir. Service/secret key yalnızca server-only modülde kullanılabilir.
- Cookie mutasyonlarında Origin, strict gövde, boyut ve içerik türü kontrolü; komutlarda idempotency uygula.
- Secret'ları sohbetten isteme, yazdırma veya commit etme. `.env.local` ve platform secret ayarlarını kullan.

## Doğrulama

- Kalite komutları: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:db`, `pnpm test:e2e`, `pnpm build`.
- İş kuralları için anlamlı sınır testleri; RLS ve yarış koşulları için gerçek PostgreSQL; düello için iki izole tarayıcı oturumu gerekir.
- DB/E2E araçları veya dış ayarlar yoksa testi geçilmiş sayma; eksik önkoşulu ve çalıştırılmayan komutu kaydet.
- Şema değişikliklerini Supabase CLI migration akışıyla dosyala; migration, izinler, üretilen tipler ve ilgili testleri birlikte güncelle.
- Auth, veri mutasyonu ve kullanıcı akışlarını teslimden önce güvenlik/iş kuralı açısından gözden geçir.
- `pnpm dev` ve `pnpm build` bu ortamın Turbopack process/port kısıtı nedeniyle desteklenen `--webpack` modunu kullanır. E2E'den önce ayrı terminalde sunucuyu aç; varsayılan uygulama/test origin'i `http://localhost:3000`.
- `pnpm test:auth:local` yalnızca yerel Supabase'i kabul eder ve 3001 portunda `.next-auth-local` diziniyle ayrı sunucu açar. `.env.local` değişmez. Normal `test:e2e`, yerel Auth testini atlar; bu ayrı komutla veya CI database job'ında çalışır.
- Profil yazıcısı `debug_duel_profile_engine` adlı minimum izinli NOLOGIN rolündedir. Supabase'in korumalı Auth tablosunu okuyan tek dar istisna `private.verified_actor_id()` fonksiyonudur: argümansız, salt okunur, postgres sahibi, sabit search_path; anon/authenticated EXECUTE izni yoktur. Gerekçe `docs/decisions.md` içinde kayıtlıdır; bu sınırı genişletme.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

- Kullanıcı production GitHub girişi ve profilin açıldığını doğruladı.
