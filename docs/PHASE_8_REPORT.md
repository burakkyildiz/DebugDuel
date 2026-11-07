# Faz 8 — yerel sağlamlaştırma

## Güncel durum — 7 Kasım 2026

Kod teslimi `5e7032d` main'de; [CI](https://github.com/burakkyildiz/DebugDuel/actions/runs/42370343800) başarılı. Hosted 21 migration eşleşir. 20 maç/40 hesap/40 private kanal uzak Free ölçümü ve uygulama yedeğinin 590 testli ayrı restore'u geçti; sentetik dolu round-trip profil/maç/ledger fingerprint'i eşleşti. Kaynak son kontrolünde sentetik hesap/maç/ledger kalmadı ve health ready=true.

**Açık kullanıcı adımları:** altı kesin localhost callback URL'sini kaydetmek için otomatik incelemenin istediği açık onay, ardından aynı tarayıcıda gerçek e-posta/parola giriş ve recovery sonucu. URL listesi hazırlanmış fakat Save reddedildiği için kaydedilmemiştir. Kullanıcının Auth yedeğini hariç tutma kararı korunur. Bu adımlar bitmeden Faz 8'in tüm çıkış koşulları tamamlandı sayılmaz. Vercel/production/Faz 9 başlamadı. Aşağıdaki ilk bölüm tarihsel yerel teslimdir; son uzak kanıtlar belgenin devamındadır.


7 Kasım 2026. Kullanıcı turuncu arayüzü kabul ederek push ve sonraki faza geçiş istedi. Başlangıç `4807787`; turuncu teslim uzak main'de ve [CI başarılı](https://github.com/burakkyildiz/DebugDuel/actions/runs/42365570641) (quality 1m31s, database 12m54s). Aşağıdaki Faz 8 değişiklikleri henüz commit/push edilmedi; uzak geliştirme veya production değişmedi.

## Uygulanan düzeltmeler

- Public leaderboard API ve sunucu sayfası birlikte 60/dakika ağ kotası kullanır. Health ayrı 120/dakika ile sınırlıdır. Dağıtık PostgreSQL upsert sayacı doygunlaşır; red cevabı counter'ı rollback etmez. HMAC özeti sunucuda üretilir; Vercel dışında kullanıcı forwarding header'ları yok sayılır. 429/Retry-After, unavailable/503 ve no-store yanıtları sınanır. Yeni NOLOGIN admission rolü yalnız ilgili sayaç eylemlerine RLS erişimine sahiptir; profil/maç/Auth yetkisi yoktur. RPC yalnız service_role içindir. Mevcut günlük bakım 24 saatlik sayaç TTL'sini uygular.
- `20261107105016_public_read_admission.sql` resmî CLI ile yalnız yerel DB'ye uygulandı; gerçek şemadan tipler üretildi. Uzak geliştirme 20 migration'da, yerel 21'de. Yeni uygulamanın uzak health/leaderboard'u için bu migration önce uygulanmalıdır.
- Proxy request/response CSP nonce üretir. Dinamik HTML ve private/no-store cache başlığı nonce tekrarını önler. Production script politikası nonce/strict-dynamic kullanır; Supabase HTTPS ve özel WSS origin'i açıkça sınırlandırılır. Auth refresh sırasında cookie/header korunur. React style attribute'ları için style-src unsafe-inline kalır; script-src unsafe-inline/eval production'da açılmaz. Dev HMR için eval ve yerel WS tanımlıdır.
- Komutlar ve public okumalar yalnız sabit operation, status, hata kodu, süre ve sunucunun requestId'sini JSON olarak loglar. Response X-Request-ID ile hata gövdesi aynı ID'yi taşır. Request body/URL/cookie/JWT/IP veya raw provider hatası loga eklenmez. Platform erişim logları ayrı yayın kontrolüdür.
- Radyo satırları Arrow/Space yanında Enter ile de seçilir. Tur arası canlı duyuru yalnız değişen tur sonucunu kapsar; her saniye azalan süre live region dışında kalır. Aktif turdaki son 10 saniye sabit metinle bir kez duyurulur. Mevcut sonuç odağı, skip link, odak halkası, reduced motion, semantik radyo ve 320px yerleşim korundu. Bu odaklı kontroller bütün WCAG kriterlerinin bağımsız denetimi değildir.
- İşletim/rollback ve yedekten dönüşün kalan doğrulama kapıları `deployment.md` içinde güncellendi.

## Doğrulama

| Kontrol | Kanıt |
| --- | --- |
| Lint / strict TypeScript / unit | 75 birim testi; HTTP 429/503, güvenilir header/HMAC, nonce ve log gizliliği dahil |
| PostgreSQL | 590 pgTAP; yeni 17 admission/ACL/RLS sınaması |
| Temiz kurulum | Ayrı geçici DB'de 21 migration+seed; 590 test, seed tekrarı sonrası yine 590; geçici DB kaldırıldı |
| Advisors | Yerel security/performance WARN/ERROR yok |
| Gerçek yarışlar | SKIP LOCKED ve Cron tekrar ziyareti; kilit beklerken son deadline; tek settlement/iki ledger ve retry |
| Kota/profil yarışı | Altı ayrı DB oturumunda aynı hesap çifti, ters host sırası; 6 settlement / 5 ödüle uygun / 12 ledger; altı profil artışı eksiksiz |
| Düello E2E | Production build üzerinde 9 geçti; iki oturum üç tur, paralel komutlar, üçüncü hesap HTTP/Realtime reddi, üç gerçek 45s timeout, iki browser kapalı Cron, kısa reconnect ve 30s forfeit |
| Practice/foundation | Production build desktop/mobile 21 geçti; yinelenen mobil timeout kasıtlı 1 skip; Enter/Arrow, nonce farklılığı, hydration, skip link, guest izolasyonu ve kayıp HTTP retry |
| Auth | Gerçek yerel e-posta/PKCE/profil/refresh/logout/recovery zinciri 1 geçti |
| Soru içeriği | 30 soru / 81 davranış vakası, seed eşleşmesi |

Kota yarışı inactive admin fixture'larıyla doğrudan gerçek settlement trigger'ını izole eder; aynı kişinin altı aktif maça katılabildiği iddiası değildir. Tek aktif koltuk kısıtı ayrı DB/E2E testlerinde korunur. Yenilenen root build ve son kalite sonucu aşağıda kaydedilir.

## Yerel yük ölçümü

`pnpm test:load:local`, localhost şartı ve izole production build ile 20 maç / 40 doğrulanmış test oyuncusu / 40 özel Realtime aboneliği çalıştırır. Cevaplar HTTP üzerinden gönderilir; üç normal turu gerçek Cron ilerletir. 20 settlement, 40 ledger, toplam 1400 XP doğrulanır. Test yalnız kendi hesap/oda/ledger/sayaç verisini finally bloğunda kaldırır. İki kullanıcının mevcut hesapları/XP'si temizlenmez.

İlk tam ölçüm: 43 saniye aktif oyun; 480 command p95 232ms, 880 state p95 54ms. HTTP kota sınaması eklenmiş son ölçüm: 44 saniye; 480 command p50/p95/max 73/113/190ms, 900 state 45/57/82ms, 80 leaderboard 60/98/100ms. Aynı anda 80 HTTP leaderboard isteğinde **60 başarılı / 20 adet 429**, Retry-After=60. Yerel ölçüm dosyası `/private/tmp/debug-duel-phase8-load.json` (kişisel veri/secret içermez).

Oda create/join hazırlığı doğrulanmış kullanıcı RPC'siyle yapılır; ortak localhost ağının 10 HTTP join/dakika sınırını aşan sahte IP başlığı veya production bypass eklenmez. Active ready/heartbeat/state/answer yolu HTTP'dir. Realtime abonelikleri gerçektir; 40 tarayıcı render yükü ölçülmez. Bu kısa yerel ölçüm, Frankfurt Free projesinde veya Vercel'de kapasite/SLA garantisi değildir. CI database job'ına aynı sınırlı yük komutu eklendi; bu Faz 8 kodu push edilmediği için yeni CI başarısı iddia edilmez.

## AC kanıt haritası ve kalan kapılar

| Koşul | Güncel kanıt / sınır |
| --- | --- |
| AC-01 | Yerel e-posta zinciri ve önceki gerçek GitHub OAuth geçti; hosted e-posta teslimi/recovery ve parola/provider ayarları yayın öncesi açık |
| AC-02–03 | Profil kimliği/benzersizlik ve guest Practice DB/E2E; misafir XP oluşturmaz |
| AC-04–10 | Katılım/başlangıç/soru gizliliği/süre/puan/otorite gerçek DB ve çok oturumlu E2E |
| AC-11–14 | Ledger/kota/istatistik, Cron/deadline ve reconnect/forfeit; yeni profil/kota yarışı dahil |
| AC-15–17 | Katılımcı history ve gerçek leaderboard cursor; üçüncü kişi HTTP/RLS/Realtime reddi |
| AC-18 | 30 soru / 81 davranış vakası |
| AC-19 | Kabul edilen turuncu palet; odak/radyo/Enter/Arrow, mobil ve nonce tarayıcı testleri; bağımsız tam WCAG denetimi yapılmadı |
| AC-20 | Temiz ayrı yerel kurulum, seed tekrarı ve kalite kanıtları; mevcut checkout'ta bağımlılık yükseltilmedi |
| AC-22 | Uygulama log allowlist, private health/cron/ledger runbook, cleanup ve uygulama rollback prosedürü; hosted veri yedeğini geri yükleme tatbikatı ve platform log ayıklaması açık |
| AC-21 / Faz 9 | Production Vercel/Supabase/SMTP/OAuth ve iki fiziksel cihaz canlı smoke yapılmadı; yeni kullanıcı talimatı gerekir |

Faz 8'in yerel uygulama/ölçüm paketi hazırdır. Yukarıdaki hosted Auth, platform log/backup-restore ve seçilen ücretsiz planda yük doğrulaması kapanmadan bütün fazın çıkış koşullarının sağlandığı veya üretime hazır olduğu söylenmez. Hosted Phase 8 migration, commit/push ve Faz 9 ayrı sonraki adımlardır. Kullanıcı test hesabı/XP temizliğini yayından önceye erteledi; uygulanmadı.

Son kalite kaydı: `pnpm build` Webpack üretim derlemesi geçti; HTML rotaları dinamik, favicon statiktir. Lint/typecheck ve 75 unit son kodla geçti. Auth/Practice ve yük testleri ayrı üretim build'lerinde çalıştı. Yeni Faz 8 kodu için henüz uzak CI çalışması yoktur.


## Uzak geliştirme devamı — 7 Kasım 2026

Kullanıcı Faz 8'i bitirme talimatı vererek kalan geliştirme migration'ı, doğrulama ve teslim işlemlerini yetkilendirdi. Aktif maç sayısı sıfırken resmî CLI dry-run yalnız Faz 8 admission migration'ını gösterdi; şema yedeği Git dışına alındı ve migration uygulandı. Health ready=true. Hosted Auth panelinde Confirm email açık, GitHub ve Email etkin; minimum parola uzunluğu 12 olarak kaydedilip yeniden açılan panelde doğrulandı. Custom SMTP kapalı, varsayılan ücretsiz gönderici kullanılıyor. Leaked password protection Pro gerektirdiği için açılmadı; ücretli kaynak yok.

Son lint/typecheck ve 75 unit geçti. Uzak testler, e-posta teslimi, yedekten dönüş ve CI kanıtları sonuçlandıkça aşağıya kaydedilir. Önceki “uygulanmadı/yetki bekler” kayıtları bu devamdan öncedir.

Uzak devam kanıtları: CLI migration dry-run upToDate=true, 21 sürüm. Uzak rollback içinde 17 admission testi/0 hata; geçici pgTAP kalmadı. Uzak DB'ye bağlı yerel HTTP health 200/ready, leaderboard 200, misafir history 401. Auth panel minimum parola 12; Confirm email açık. Kullanıcı e-posta doğrulaması gerçek gelen kutusunda tamamlandı; hesabın confirmed bilgisi DB'de doğrulandı. Bağlantı başka tarayıcıda açıldığı için PKCE oturum dönüşü başarısız oldu; normal e-posta giriş/kurtarma ayrıca kontrol ediliyor.

`4f6b175` push edildi. [CI 42368233930](https://github.com/burakkyildiz/DebugDuel/actions/runs/42368233930) quality, DB, concurrency, Auth, Practice, match ve load assertions adımlarını geçti; load raporu Mac'e özgü `/private/tmp` yoluna yazılırken Linux ENOENT verdi. `5e7032d` düzeltmesi Node os.tmpdir/path.join kullanır; yeniden CI başladı. Bu ilk koşu bütünüyle başarılı sayılmaz.

Uygulama verisinin gerçek uzak yedeğiyle ayrı yerel geri yükleme yapıldı: 1 profil, 30 soru ve mevcut oyun/ledger satırları korundu; 590 DB testi geçti. Kullanıcı Auth verisini hariç tuttu; FK için yalnız hedefte parolasız sentetik kimlikler kullanıldı. Auth geri yükleme, production restore veya gerçek hesabın yeniden giriş yapabildiği iddia edilmez. NOLOGIN rol oluşturucusu, default function ACL ve managed Cron/Realtime yapılandırması için tatbikatta bulunan gereksinimler deployment runbook'una eklendi. Geçici DB kaldırıldı.

Uzak Free iki hesaplı test geçti: gerçek üç tur, 2 private kanal, 1 settlement/2 ledger; 80 HTTP leaderboard isteği 60 kabul/20 limit. Command p95 851ms, state p95 704ms, leaderboard p95 5160ms. Test fixture'ları tamamen kaldırıldı. 40 hesaplı ilk hazırlık koşusu Auth 30/5dk hız sınırına takıldı; ikinci koşu ready/heartbeat HTTP 401 ile durdu. Bu iki koşu kapasite başarısı değildir. Temizlik sonrası source baseline 1 profil/0 maç/0 ledger ve 0 sentetik load/probe hesabı olarak doğrulandı; kullanıcının yeni e-posta test hesabı korunur. Son sınırlı 40 hesap koşusu, istek sınırı gevşetilmeden yavaş hazırlıkla sürüyor.

Son 24 saatlik Supabase log özniteliklerinde aggregate JWT/secret-key desen taraması kaynakların hepsinde 0 eşleşme döndürdü; ham log payload'ı veya secret değerleri dışa çıkarılmadı. Bu dar desen kontrolü tüm gizlilik sızıntılarının yokluğu garantisi değildir. Vercel kurulmadığından Vercel platform erişim logu testi Faz 9'dadır. Supabase'in ücretli leaked-password kontrolü Free planda açılmadı.

[CI 42370343800](https://github.com/burakkyildiz/DebugDuel/actions/runs/42370343800), `5e7032d` kodunda quality/database ve 20 maç/40 oyunculuk load adımı dahil başarılıdır. Tam uygulama verisi restore'u 590 test geçti. Ek olarak yalnız geçici DB'de sentetik dolu oyun verisi oluşturuldu; 16 maç, 11 cevap ve 20 ledger satırı data dump ile geri yüklendi. Profil/maç/ledger fingerprint'leri birebir eşleşti. Geçici ortam kaldırıldı; Auth verisi yedek dışında kaldı.

E-posta dönüşü için kullanıcı başka tarayıcı/profil kullandığını doğruladı. Bu nedenle doğrulama başarılı olsa bile PKCE cookie'si olmayan tarayıcıda otomatik oturum açılamaz; bu durumdaki giriş/recovery testinin aynı tarayıcıda tamamlanması gerekiyor. Uzak panelde redirect listesi boş bulundu. Altı kesin localhost callback adresi formda hazırlandı; Save işlemi otomatik incelemede reddedildiğinden kullanıcıya somut liste ve ekran görüntüsüyle ayrı açık onay soruldu. Onay gelmeden kaydedilmez. Önceki Auth dump reddinden sonra kullanıcı açıkça Auth verisini hariç tutmayı seçti; bu kapsam korunur.

### Son uzak yük sonucu

Yavaş hesap hazırlığıyla son Free geliştirme koşusu geçti: 20 maç, 40 doğrulanmış sentetik hesap, 40 private Realtime aboneliği, üç tur, 20 settlement ve 40 ledger; oyuncu başına 35 ve toplam 1400 XP. Aktif ölçüm 73 saniye. 680 command p50/p95/max 1631/3614/4459ms; 440 state 883/2382/4566ms. 80 paralel leaderboard HTTP okuması 60 başarılı/20 Retry-After=60 içeren 429; p50/p95/max 12696/13820/13881ms. Burada web uygulaması yerel production build, DB/Auth/Realtime uzak Frankfurt Free projesidir; Vercel ağı/Function kapasitesi veya 40 render edilen tarayıcı ölçülmez. Leaderboard burst gecikmesi belirgindir; test bir SLA iddiası değildir. Oyun kuralları, sayfalar ve ledger tutarlılığı başarısı ayrı doğrulandı. Test yalnız kendi fixture UUID'lerini e-posta prefix denetimiyle temizledi; mevcut gerçek hesap/XP temizliği yapılmadı.

Önceki 429 hazırlık ve 401 koşuları raporda korunur; 401 nedeni bu son koşuda yeniden üretilemedi, üretim hatasının kök nedeni çözülmüş gibi sunulmaz. Tek sentetik hesapta 40 doğrudan Auth okuması 200, 40 uygulama active isteği beklenen onboarding 409 döndü. Mevcut proje JWT ömrü yalnız sentetik token süre alanından 3600s olarak kontrol edildi; token/parola değeri kaydedilmedi. Auth limitleri değiştirilmedi. Bu sınırlı başarı önceki kesintilerin görülmediği veya ücretsiz kapasitenin garantilendiği anlamına gelmez.
