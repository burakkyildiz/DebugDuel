# Faz 8 — yerel sağlamlaştırma

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
