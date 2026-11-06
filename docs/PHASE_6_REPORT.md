# Faz 6 — üç turlu oyun motoru

3 Kasım 2026. Kullanıcı “tamam faz 6 y baslayalim” talimatını verdi. Başlangıç `2c3e69a`; Faz 5'in [CI 41586890382](https://github.com/burakkyildiz/DebugDuel/actions/runs/41586890382) quality/database işleri başarılıydı. Faz 6 için commit/push veya hosted migration uygulanmadı; production yayın yok.

## Çalışan kapsam

- Yeni odalar `engine_stage=6`: bir kolay, bir orta, bir zor soru. İçerik son hazır işleminde bir kez seçilip private snapshot'a alınır; aynı slug maçta tekrar etmez. Önceden oluşturulmuş stage-5 odalar kendi tek tur sözleşmesiyle korunur.
- İlk başlangıç DB zamanı +3 saniye. Her tur 45.000 ms; kapanan turun ardından 5 saniye açıklama +3 saniye geri sayım. Üçüncü tur sonunda toplam puan kazananı, eşitlik beraberliği belirler. Son tur galibi otomatik maç galibi değildir.
- Kod ortak başlangıçtan önce, çözüm/rakip seçimi tur kapanmadan gösterilmez. Sonuç/histori DTO'su da aynı filtreyi uygular; başlamadan match_ended ile kapanmış gelecek sorular sonradan açılmaz.
- Cevap ve geçiş maç→tur kilidi altında, kabul zamanı kilit sonrasında `clock_timestamp()`. Önceki tur cevabı sonraki tur/finalde tekrarlandığında yeni kayıt/puan oluşmaz. Süre sonunda reddedilen cevap, gerçekleşmiş timeout'u rollback etmez; dar commandError sonucu HTTP hata koduna çevrilir.
- UI: Round 1/3, zorluk, toplam skorlar, açıklama penceresi ve geri sayım, üç tur sonuç tablosu, önceki açılmış tur incelemeleri. Yanlış seçim kırmızı/doğru satır yeşil kalır. Yeni turda seçim temizlenir; aynı turdaki gönderilmiş cevap yenilemede korunur. Yeni oda kimliği React state'ini sıfırlar; yerel sayaç ilk render sonrası document performans saatine bağlanır.
- Davet tüketildiğinde/maç kapandığında sekme storage kopyası temizlenir. Storage kullanılamaması başarılı oda oluşturmayı hata gibi göstermez; davet yenilenerek paylaşılabilir.

## Gerçek scheduler ve bağlantı kuralları

`pg_cron` 1.6.4 yerelde mevcut ve preload edilmiş olarak doğrulandı. `debug-duel-advance-matches` her **1 second** çalışır; HTTP/Vercel/tarayıcı interval'i motorun kaynağı değildir. Tick en fazla 100 due maç alır, `FOR UPDATE SKIP LOCKED` kullanır, döngü bütçesi 250 ms'dir. Bir bozuk maçın hatası o maça izole edilir; yalnız maç UUID'si/SQLSTATE loglanır. Sağlık sayacı ham hata/çözüm saklamaz.

- 5 saniyeden eski sağlık: yeni oda/son hazır ile başlangıç durdurulur.
- Tick arası 10 saniyeden büyük boşluk: etkilenen devam eden stage-6 maçlar infrastructure_interruption ile abort; geriye dönük galibiyet verilmez. İyileşen tick ve abort'lar birlikte commit edilir.
- Kimlikli heartbeat 5 saniyede bir, DB zamanıyla yazılır. Önce geçen eşikler değerlendirilir; geç heartbeat kaybı geri alamaz. Presence karar kaynağı değildir.
- Tek taraf ≥30 saniye yok ve rakibi son 15 saniyede aktif: connection_lost forfeit. İki taraf ≥30 saniye yok: both_disconnected abort. Kısa kopmada saat/hak sıfırlanmaz.
- Normal deadline, özellikle üçüncü turun normal bitişi, bağlantı kaybı kontrolünden önce ele alınır. Global altyapı kesintisi güvenli abort önceliğine sahiptir.
- next_transition_at, oyun geçişi ile bağlantı eşiğinin en erken zamanına yeniden hesaplanır. Beklemedeki eski ready bayrağı temizlenir.

`GET /api/health` yalnız ready ve lastSuccessfulTickAt döndürür; sağlıklı 200, bağımlılık/tick sorunu 503. Salt okuma ilerletici çağırmaz. Anon schema USAGE yalnız invoker wrapper'ın health yardımcısını çözümlemesi için verilmiştir; private Data API expose edilmez, tablo SELECT/DML verilmez, diğer fonksiyonların EXECUTE revokeları korunur.

Scheduler `postgres` çağırıcısına yalnız advance/cleanup/health EXECUTE verilir. NOLOGIN game rolünün yetkileri scheduler'a miras verilmez (USAGE=false; mevcut admin-only üyelik INHERIT/SET sağlamaz). Auth adaptörü sınırı korunur; game motoruna Auth okuma/aktör atlatma yetkisi eklenmedi.

## Bakım ve kayıt süresi

`debug-duel-maintenance` her gün UTC 00:00: expired şifreli receipt payload'ını temizler, idempotency için sensitive_response_expired tombstone'unu korur; 24 saatini dolduran Practice ve eski rate counter kayıtlarını siler. Maç geçmişini veya ledger'ı silmez. Yalnız Debug Duel'in iki job'ına ait 7 günden eski Cron çalışma kayıtlarını temizler; end_time eksik crash kayıtları da start_time üzerinden kapsanır. Bu görevlerin zamanlaması testle, teknik veri temizleme fonksiyonu transaction fixture'larıyla doğrulandı; yedi gerçek gün beklenmiş sayılmaz.

## Doğrulama

- **554 pgTAP**: önceki 483 +71 yeni motor/izin/üç tur/sağlık/cleanup kontrolü. Ayrı temiz PostgreSQL'de sıfırdan migration/seed ve seed tekrarında aynı 554 geçti. Geliştirici verisi resetlenmedi.
- **67 unit**: önceki kapsam + eksik üç tur DTO'su, erken kod/çözüm ifşası ve puan/tur sınırları. 30 soru/81 Python davranış vakası ve seed eşleşmesi geçti.
- **Gerçek paralel DB oturumları**: biri match satırını kilitlerken tick diğer due maçı ilerletti; gerçek Cron kilit kalkınca ilk maça döndü. Ayrı answer işlemi lock beklerken deadline geçti; kilit sonrası saat cevap kaydetmedi, tek timeout commit edildi. Fixture'lar yalnız yerelde oluşturulup kaldırıldı.
- **Production build / 9 E2E**: 4 desktop foundation +5 çok oturumlu motor senaryosu. Login/onboarding/davet sonrası üç gerçek tur; eşzamanlı create/join/ready/answer, üçüncü kişinin HTTP/Realtime reddi ve sahte yayınla skor değişmemesi; WebSocket engellenmiş üç gerçek 45 saniyelik timeout (0–0 draw); iki browser context kapatıldıktan sonra yalnız katılımcı doğrudan SELECT ile Cron abort gözlemi; 7 saniyelik offline/reload ve sonrasında 30 saniyelik forfeit.
- Kapalı tarayıcı testinin ilk gözlemcisinde service_role SELECT reddi görüldü; gözlemci gerçek katılımcı JWT'sine düzeltildi. Oyun tablolarına service role SELECT izni eklenmedi. Son tam suite 9/9 geçti. Son sayaç/keyed-reset düzeltmesi ardından üç turluk ilk senaryo ayrıca geçti.
- Lint/typecheck ve Webpack production build başarılı. Yerel security/performance advisor WARN/ERROR bildirmedi. Hata izolasyonu testi beklenen tek SQLSTATE uyarısını üretir; gizli değer içermez. 320 px sonuç ekranı screenshot'ı incelendi; kod kendi yatay kaydırma alanında, sayfa taşması yok.

## Ortam ve sonraki sınır

Dört yeni CLI migration'ı yalnız yerel DB'ye uygulandı: three_round_engine, scheduler_execute_boundary, public_health_schema_boundary, cron_history_retention. Hosted geliştirme projesi Faz 5'in 13 migration'ında kalır; bu fazın dört dosyası, Cron ve yeni health RPC oraya henüz uygulanmadı. Yerel 3006 health endpoint gerçek tick ile 200/ready=true döndü. Ücretli kaynak veya yeni servis yok.

`pnpm match:local` 3006; gerçek yerel e-posta hesapları aynı şekilde kullanılabilir. Artık yeni oluşturulan odalar üç turdur. Önizleme/test runner'ı sunucu yanında gerçek health'in hazır olmasını bekler. `pnpm test:match:local --grep ...` odaklı test destekler; `pnpm test:engine:local` gerçek DB yarışlarıdır. CI database job'a concurrency komutu eklendi; yeni kod push edilmediği için Faz 6 uzak CI başarısı iddia edilmez.

**XP, settlement, kalıcı profil istatistikleri, history sayfalaması ve leaderboard ilerlemesi Faz 7'dir.** Bu faz bunlara yazma izni vermez. Hosted gerçek iki hesaplı smoke, uzak e-posta teslimi, production Cron ve canlı iki cihaz testi bekler. Faz 7 kullanıcı istemeden başlamaz. Yerel test kanıtı üretim kapasite garantisi veya bütün AC-01–AC-22'nin kapanışı değildir.

## Son kapanış kontrolleri

Son sayaç/oda-reset düzeltmesi ve mobil tablo hücrelerinin satır sarması sonrası production build ile üç turluk davet/login/onboarding senaryosu tekrar geçti; güncel 320 px screenshot incelendi. Uzun kullanıcı adları kendi hücrelerinde sarılır. `test:practice:local` 19 passed/1 bilinçli mobile duplicate timeout skip ile tamamlandı. Son lint/typecheck ve diff whitespace kontrolü başarılıdır. Faz 6 için yeni hosted işlem, Git commit/push veya production yayın yapılmadı.

## Sonuç ekranı iyileştirmesi — 4 Kasım 2026

Kullanıcının geri bildirimiyle final sonucu kodun üstüne taşındı. Büyük You won!/You lost/Draw başlığı, sonuç simgesi, kazanan kullanıcı adı, toplam skor ve oyuncu kartlarında Winner/Defeat/Draw etiketleri gösterilir. İptal/abort galibiyet gibi gösterilmez; karar yine DB status/winnerId alanlarından gelir. Production build üzerinde iki hesaplı üç tur E2E geçti; 320 px screenshot incelendi, taşma kontrolü geçti. Lint/typecheck başarılı. Hosted/commit/push yapılmadı.

## Tur kapanışı ve okuma aralığı — 4 Kasım 2026

Kullanıcı mevcut ilk doğru cevap kuralını korumayı açıkça seçti. Tek yanlış cevap rakibi bekler; ilk doğru cevap, iki yanlış veya deadline turu kapatır. Arayüz artık kapanış nedenini sonuç başlığının altında açıklar. Yeni `20261104053009_round_result_reading_window` migration'ı sonuç gösterimini 15 saniyeye çıkardı; ardından 3 saniyelik countdown gelir. Yeni yerel toplam 18 migration; hosted hâlâ 13. Önceden kapanmış tur için planlanmış başlangıçlar yeniden yazılmaz; sonraki tur kapanışları yeni süreyi kullanır.

554 DB testi (18 saniyelik DB zaman farkı dahil), lint/typecheck, production build üzerinde gerçek iki hesaplı üç tur E2E 1/1 geçti (47.5 saniye). Sonuç/puan/cevap hakları ve Auth/izin sınırları korunur. Uzak uygulama, commit/push yapılmadı.

## Katılım öncesi Ready düzeltmesi — 4 Kasım 2026

Stage-6 join içindeki koşulsuz ready_at temizliği aktif hostu gereksiz ikinci Ready işlemine zorluyordu. Yeni `20261104053441_preserve_waiting_host_ready` migration'ı yalnız bu temizliği kaldırır. Yeni guest hazır değildir; 15 saniyelik eski heartbeat temizliği ve son Ready'deki iki güncel katılımcı denetimi korunur. Guest ayrılırsa readiness temizliği ve legacy stage-5 davranışı değişmez. Migration geçici engine üyeliğini işlem sonunda geri alır, fonksiyon owner/ACL ve Auth adaptörü genişlemez. Yerel migration sayısı 19; hosted 13.

559 DB testi (5 yeni readiness kontrolü), lint/typecheck, production build üzerinde host önce Ready → konuk login/onboarding/join → host tekrar Ready olmadan konuk Ready → üç tur E2E geçti (50.5 saniye). Uzak uygulama veya commit/push yapılmadı.

## Çözüm incelemesi ve kopma açıklaması — 4 Kasım 2026

Explanation ve Previous rounds arayüzde yalnız terminal maç durumunda görünür. Tur sonucu, doğru/yanlış satır vurgusu ve 15+3 saniye tur arası zamanlaması korunur. Connection_lost açıklaması oyuncunun bakış açısına göre bağlantısı en az 30 saniye doğrulanmayan oyuncuyu ve skor yerine forfeit ile sonuçlandığını belirtir; kaybeden tarafta yeniden katılmanın maçı başlatmayacağı açıklanır. Motor/izin/DTO ifşa kuralları değişmez.

Lint/typecheck, production build ve 2/2 odaklı E2E geçti: üç tur boyunca Explanation/Previous rounds yokluğu ve finalde görünmeleri; kısa kopmadan dönüş, ardından kapalı rakibin gerçek 30 saniye forfeit'i ve kullanıcı adı içeren açıklama. Commit/push veya hosted işlem yapılmadı.

## Devir — 6 Kasım 2026

Kullanıcı iki hesapla yerel düelloyu onayladı ve bu teslimin GitHub’a gönderilmesini istedi. Push öncesi 559 DB testi temiz kurulumda ve seed tekrarında geçti. Lint, TypeScript, 67 birim testi ve 81 soru vakası başarılı. Yeni oturumda [devir notundan](PHASE_6_HANDOFF.md) Faz 6’ya devam et.

## Uzak geliştirme uygulaması — 6 Kasım 2026

- Kullanıcının açık talimatıyla Free plandaki `debug-duel` projesine (`hvqklcqyjqjwwwcsioch`) resmî CLI ile altı migration uygulandı. Ön kontrolde aktif maç yoktu. CLI yalnız bu altı dosyayı planladı ve Vault adımı atlandı. Yerel ve uzak geçmiş 19 sürümde eşleşti. Uygulama sonrası dry-run bekleyen migration, seed veya rol göstermedi.
- PostgreSQL 17.11 üzerinde `pg_cron` 1.6.4 etkin. İlerletici 1 saniyede bir ve bakım işi UTC 00.00’da zamanlanmış. 15 saniyelik gözlemde 15 başarılı tick kaydedildi. Uzak veritabanına bağlı geçici yerel Next.js sunucusunda `GET /api/health` 200 ve `ready: true` döndü. Anon, authenticated ve service_role ilerletici EXECUTE sahibi değil. Scheduler ayrıcalığı doğrudan EXECUTE ile sınırlı. Anon rolünün private tablolarda SELECT/DML erişimi yok.
- Geçici iki tarayıcı oturumunda gerçek Supabase Auth, davet, profil tamamlama, private Realtime, üç tur ve final doğrulandı. İlk deneme Ready kontrolünün beş saniyelik test penceresinde zaman aşımına uğradı. Yerel teste özgü heartbeat bekletmesi çıkarılarak ikinci deneme geçti. İki denemenin dört sentetik Auth hesabı ve ilişkili oyun kayıtları temizlendi. Gözlem gerçek e-posta teslimini kapsamıyor.
- [CI koşusunda](https://github.com/burakkyildiz/DebugDuel/actions/runs/42212008808) `quality` ve 559 pgTAP testi geçti. Chromium kurulumu tamamlandı. GitHub, 20 dakikalık iş sınırında `test:match:local` adımını iptal etti. `database` sınırı 30 dakikaya çıkarıldı.
