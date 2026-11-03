# Faz 5 — özel oda ve tek tur dikey akış

3 Kasım 2026. Kullanıcı “selam faz 5 e gecebiliriz” diyerek geliştirmeyi başlattı. Başlangıç commit'i `ba836e8`; bu faz için commit/push/production yayın yapılmadı.

## Teslim edilen kapsam

- Tamamlanmış profilli iki hesap: oda oluşturma, tek kullanımlık 15 dakikalık davet, açık Join Match işlemi, davet döndürme, ready/unready, ortak 3 saniye geri sayım.
- Tek sabit duel sorusu (`sum-readings`, v1), ortak DB saatine bağlı 45 saniye, tek cevap hakkı ve ilk kabul edilen doğru cevaba atomik 100–150 maç puanı. İki yanlış veya timeout beraberliktir. Açık ayrılma maçı kapatır; waiting misafiri ayrıldığında host daveti yenileyebilir.
- Tek tur **ara kilometre taşıdır**. Şema üç tur kaydını korur; kullanılmayan 2/3 `match_ended` ile kapanır ve soru snapshot'ı üretmez. UI `single_round_preview` kapsamını açıklar. XP, ledger ve kalıcı profil istatistikleri yazılmaz.
- Özel `match:<uuid>` Realtime kanalında Broadcast/Presence, monoton stateVersion ile yeniden okuma, JWT yenileme, sayfa yenileme ve bağlantı kesilince polling/sync. Realtime oyun kararı taşımaz.
- Sonuç aynı kod bloğunda yeşil doğru satır ve kırmızı yanlış seçim; açıklama açılır bölümde. Mobil 320 px sayfa taşması denetlendi.

## Güven sınırları

Hesap komutları kullanıcının doğrulanmış JWT'siyle çalışır. Mevcut profile-engine relay, argümansız `verified_actor_id()` adaptörünü kullanır; game-engine bu adaptöre/Auth tablolarına erişemez. Game-engine ayrıca signed request claim ile aktör eşleşmesini kontrol eder. İç fonksiyonlar istemciye açık değildir; public RPC kuralları DB kilidi altında uygular.

Davet CSPRNG 32 byte; DB davet tablosunda yalnızca SHA-256 özeti, receipt'te AES-256-GCM şifreli yanıt bulunur. Receipt aktör/işlem/key AAD'sine bağlıdır, süresi daveti aşmaz. Raw davet yolu proxy'de HttpOnly/SameSite=Lax cookie'ye alınır ve temiz `/invite` yoluna 303 döner. OAuth/onboarding dönüşüne token taşınmaz; GET join yapmaz. Uygulama logları raw davet yolunu atlar; Referrer-Policy no-referrer. Hostun oluşturma yanıtı kendi sekmesinin sessionStorage alanında tutulur; başka kullanıcı kimliğine ait oda için okunmaz.

Soru ortak başlangıçtan önce çıkmaz; rakip seçimi ve çözüm tur kapanana kadar gizlidir. Başlamadan forfeit ile kapanmış soru, planlanan başlangıç saati sonradan geçse bile açılmaz. DTO strict ve izinli alanlarla üretilir.

`private.match_notify(uuid)` dar postgres-owned SECURITY DEFINER köprüsüdür: yönetilen Realtime tablosuna sınırlı rol ile `realtime.send` çağrısı izin hatası verdiği için kullanılır. Sabit search_path, sabit event/topic biçimi ve yalnız matchId/stateVersion/status payload'ı vardır; keyfi payload/topic argümanı yoktur. Public/anon/authenticated/service_role EXECUTE yok, yalnız game-engine çağırır. Auth istisnasını genişletmez; yönetilen realtime tablosunun owner/RLS/GRANT'ı değiştirilmez. Policy yalnız katılımcıya Broadcast/Presence SELECT ve Presence INSERT verir; browser Broadcast INSERT vermez.

HTTP mutasyonları same-origin Origin, JSON, 4 KiB gövde, strict Zod ve UUID idempotency key denetler. DB hesap komut limitleri vardır. Davet HTTP girişi ayrıca ayrı commit edilen, yalnız service key'in çağırdığı 10/dakika ağ kabul sınırını kullanır; geçersiz davet sonrasında rollback ile sayaç kaybolmaz. Ham IP yerine HMAC, Vercel'in güvenilir proxy başlığı; yerelde/doğrulanmamış platformda ortak muhafazakâr ağ kovası kullanılır. Bu ağ sınırı HTTP katmanındadır; doğrudan izinli RPC için DB hesap sınırı geçerlidir.

## Doğrulama

- 63 birim testi: önceki kapsam + authenticated encryption/AAD/tamper/anahtar ve strict düello komutları.
- 483 gerçek PostgreSQL testi: 420 önceki + 63 düello/izin/receipt/snapshot/puan/ağ limiti testi. Ayrı temiz yerel DB'de sıfırdan migration/seed ve seed tekrarı geçti; geliştirici verisi resetlenmedi.
- Production build üzerinde iki ayrı tarayıcı ve gerçek yerel Auth/DB/Realtime: davet → login → onboarding → join → ready → cevap/sonuç, paralel create/join/ready/doğru cevap, kaybolan yanıt retry, üçüncü kişi HTTP/özel kanal red, public kanal red ve sahte yayınla skor değişmemesi.
- WebSocket engellenmişken gerçek 45 saniye timeout, polling/sync ile iki tarafta beraberlik. Sentetik fixture'lar yalnız yereldedir. Testlerde Auth trace/video kapalı; çözüm ekranı dışında invitation ekranı screenshot'a alınmaz.
- Lint, typecheck ve son regression test sonuçları aşağıdaki kapanış kaydındadır.

## Ortam ve sonraki faz

Altı yeni migration yalnız yerel geliştirme DB'sine uygulandı (`20261103042203`–`20261103050000`). Public şema tipleri yerelden üretildi. Hosted geliştirme projesi Faz 4'ün yedi migration'ında kalır; hosted migration/Realtime private-only ayarı ve iki gerçek uzak hesap testi bu fazda uygulanmadı. Ücretli kaynak kullanılmadı.

`pnpm match:local`: yerel önizleme 3006. `pnpm test:match:local`: izole production build/test 3005. Yerel Realtime tenant public erişimi kapatılır; hosted ayarı değiştirilmez. CI database işine düello testi eklendi; yeni kod push edilmediği için uzak CI sonucu yoktur.

Faz 6: üç turluk soru seçimi/snapshot, 5 saniye sonuç + 3 saniye geri sayım, saniyelik Cron/health, reconnect/grace ve otomatik forfeit/abort. Şimdiki ilerleme DB zamanı ile komut/heartbeat/sync sırasında yapılır; bütün istemciler kapalıyken kendiliğinden ilerleyen motor değildir. XP/settlement Faz 7'dir. Teknik TTL fiziksel cleanup, hosted e-posta teslimi ve production kontrolleri açık kalır. Hiçbir yeni AC maddesi bütünüyle kapatılmış sayılmaz.

## Kapanış kanıtı

Son kodda lint/typecheck, 63 birim ve 30 soru/81 davranış vakası geçti. `test:match:local` production build + **7/7** test (4 desktop foundation + 3 gerçek çok oturumlu düello senaryosu; mobil ikinci oyuncu ve 320 px denetimi dahil) geçti. Heartbeat tutulurken Ready işlemi gerçekleşti. Testin route temizliğinde ilk denemede görülen `Route is already handled` hatası `unrouteAll({behavior:'wait'})` ile düzeltildi; son tekrar başarılı. Runner hata çıktısında cookie/authorization, JWT, raw invite yolu ve server key'i maskeler.

`test:practice:local` production build üzerinde **19 geçti / 1 bilinçli mobil timeout kopyası skip**. `test:auth:local` gerçek yerel signup/confirmation/profile/refresh/logout/recovery zincirinde **1/1** geçti. `test:db:clean` yeni altı migration'ı sıfırdan uyguladı; hem ilk kurulum hem seed tekrarında **483/483** geçti, geçici proje kaldırıldı. Mobil sonuç screenshot'ı görsel olarak incelendi; kod kendi yatay kaydırma alanında, sayfa taşması yok.

İlgili Auth→relay→DB→Realtime→refetch ve retry/eşzamanlı cevap yolları güvenlik/iş kuralı açısından gözden geçirildi. Erken biten countdown sorusunun sonradan açılması, dar rolün Auth şeması kullanımı, yönetilen Realtime gönderim izni ve background heartbeat'in açık komutu düşürmesi bu çalışma içinde düzeltildi. İncelenen son yerel kapsamda açık doğrulanmış bulgu kalmadı; bu kayıt hosted/production veya sonraki Cron/settlement fazlarının güvenlik kanıtı değildir.

## Yerel manuel önizleme — takip

Kullanıcının yerelde deneme isteğiyle `pnpm match:local` 3006'da açıldı; giriş sayfası tarayıcıda doğrulandı. Yerel Auth redirect allowlist'ine yalnız 3006 callback için profile/play/invite/reset yolları eklendi. Yerel Supabase veriler korunarak yeniden başlatıldı; hosted ayarlar değişmedi. Sentetik hesapla 3006 HTTP signup → yerel Mailpit → gerçek PKCE callback → authenticated cookie smoke geçti. Parola/token çıktıya verilmedi. Yerel posta kutusu http://localhost:54324; onay bağlantısı kayıt yapılan aynı tarayıcı oturumunda açılmalıdır. Yerel GitHub yapılandırılmadığından manuel testte e-posta hesapları kullanılır.

## Uzak uygulama ve push yetkisi — 3 Kasım 2026

Kullanıcı “tamam tum islemleri yapalim OK” diyerek Faz 5'in uzak geliştirme DB'sine uygulanmasına ve GitHub commit/push işlemlerine onay verdi. Production yayın veya Faz 6 geliştirmesi bu işlemde yapılmadı. Önceki yalnız yerel / push yapılmadı notları bu onay öncesinin tarihsel kaydıdır.

- Hedef `debug-duel` / `hvqklcqyjqjwwwcsioch`, Frankfurt, organizasyon Free planı yeniden doğrulandı.
- Resmî CLI `db push --dry-run --skip-vault` yalnız altı Faz 5 migration'ını gösterdi. Aynı altı dosya `db push --skip-vault --yes` ile repository sürümleri korunarak uygulandı; seed/rol/Vault toplu push yapılmadı. Uzak ve yerel migration geçmişi **13/13** eşleşti.
- Resmî Management API'de mevcut CLI oturumu yalnız bu proje için kullanıldı; token yazdırılmadı veya kaydedilmedi. `private_only=true` PATCH sonrası tekrar okundu; diğer Realtime alanlarının değişmediği doğrulandı. Gerçek publishable-key WebSocket bağlantısında public kanal `CHANNEL_ERROR` / private-only gerekçesiyle reddedildi. Bu ayar Free kapsamındadır; limit/plan değişmedi.
- `matches.test.sql` uzak geliştirme DB'sinde BEGIN/ROLLBACK ile **63/63** geçti. Test sonunda üç sentetik Auth fixture'ının ve geçici pgTAP extension'ının kalmadığı salt okunur sorguyla doğrulandı. Bu, uzak gerçek iki kullanıcının Auth→browser→Realtime E2E testi yerine geçmez; gerçek iki oturumlu testler ve kullanıcının manuel denemesi yereldedir.
- Security advisor yeni şema/izin uyarısı vermedi; önceki leaked-password-protection uyarısı devam ediyor. Performance advisor yalnız 19 unused-index INFO bildirdi; yeni oyun iş yükü oluşmadan koruyucu indeksler silinmedi.
- Push öncesi lint, typecheck ve 63 birim testi yeniden geçti; önceki production build/483 DB/çoklu oturum E2E kanıtları korunur. GitHub main başlangıcı `ba836e8` ile eşleşti. Push sonrası uzak CI ayrıca izlenecek; bu kayıt henüz uzak CI başarısı iddiası değildir.

Hosted şema ve private-only ayarı hazırdır. Uzak gerçek e-posta teslimi/SMTP, uzak iki hesaplı tarayıcı düellosu, üretim yayını ve Faz 6/7 işleri açık kalır. Yerel 3006 hesapları hosted projeye kopyalanmadı; kullanıcılar iki ortamda ayrıdır. `.local-backups/phase5-remote-config` yalnız yerel yapılandırma/smoke kanıtıdır, tam DB veri yedeği değildir ve Git'e girmez.
