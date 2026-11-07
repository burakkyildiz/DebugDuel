# Mimari ve ürün kararları

## 2026-11-02 — başlangıç

- Ana şartname: `DEBUG_DUEL_PROJECT_SPEC.md` v1.0. Bu belge şartnameyi daraltmaz.
- Kullanıcı bütçesi: 0. Ücretsiz servis sınırlarına uyulur; ücretli plan ve ek hizmet kurulmaz. Ücretsiz katman, belirli bir kapasite veya kesintisiz çalışma garantisi değildir.
- Supabase: diğer uygulamadan ayrı `debug-duel` projesi; `hvqklcqyjqjwwwcsioch`; `burakkyildiz's Org`; Frankfurt. Oluşturma aracı proje oluşturmayı ek maliyet onayı istemeden tamamladı; organizasyon planı ayrıca kontrol edilir.
- Referans görsel yok; şartnamenin koyu/mor paleti, terminal kod alanı, yerel fontlar ve İngilizce arayüz metinleri kullanılır.
- Next.js App Router + TypeScript strict + Tailwind; pnpm. Doğrulanmış Node 24 LTS ailesinden makinedeki 24.12.0 sabitlenir.
- Vercel yayın hedefidir; bu başlangıç aşaması production yayını veya Git push içermez.
- Ücretsiz yerel e-posta test sunucusu kullanılabilir. Üretim SMTP ve GitHub OAuth sağlayıcı ayarları henüz yapılmadı; gerçek dış sağlayıcı testi olmadan Auth kabul kriteri tamamlandı sayılmaz.
- Tarayıcı Python çalıştırmaz. Oyun motoru ve soru doğruluğu veritabanındadır; istemci yalnızca güvenli DTO alır.
- Build, bu çalışma ortamında Turbopack'in port açma kısıtına takılması nedeniyle Next.js'in desteklenen Webpack derleyicisiyle doğrulandı; `pnpm build` bunu kullanır.
- Supabase `auth.users` tablosu platforma aittir ve RLS'si istemci rolleri için policy içermez. Profil yazıcısı minimum tablo/sütun izinli NOLOGIN rolündedir. Doğrulanmış, aktif aktörü okumak için tek istisna `private.verified_actor_id()` adlı argümansız, salt okunur, sabit search_path'li ve postgres sahibi yardımcıdır. Bu fonksiyonu anon/authenticated çalıştıramaz; yalnızca profil yazıcısı çağırabilir. Auth tablosuna geniş istemci policy'si eklenmez. Bu platform sınırı sonraki güvenlik incelemelerinde ayrıca korunmalıdır.

## 2026-11-02 — Faz 3

- Kullanıcı Faz 3'ü açıkça başlattı; sonraki faz, commit/push ve production yayın yetkisi çıkarılmadı.
- Oyun depolaması ayrı NOLOGIN/NOINHERIT `debug_duel_game_engine` rolündedir; istemci üye değildir, profil/XP yazma izni ve Auth adaptörü erişimi yoktur. Kullanıcı motor RPC'leri ilgili dikey akışlarla eklenecek.
- Soru içerikleri private DB şemasında, güvenilir kaynak katalog ise yalnızca `supabase/questions` altında tutulur. Seed üretimi ve 81 Python davranış vakası yerel/CI aracıdır; uygulama runtime'ına bağlanmaz.
- Soru sürümü ve snapshot içeriği değişmezdir; cevap, snapshot, settlement ve ledger için oyun rolünde UPDATE/DELETE kapalıdır. Soruya yalnızca `is_active` sütununda UPDATE verilir.
- Seed tekrarında içerik sapmasını gizleyen DO NOTHING yerine aynı alanları karşılaştırmaya zorlayan upsert ve immutable-version trigger kullanılır; mevcut pasiflik korunur.
- Temiz kurulum testi mevcut DB'yi resetlemez; ayrı rastgele yerel proje/port oluşturur ve yalnızca kendi kaynaklarını kaldırır. Hosted geliştirme projesine bu fazda yazılmadı.
- Ayrıntılı test ve sınırlar: [Faz 3 raporu](PHASE_3_REPORT.md).

## Faz 4 — Practice sınırları

- Practice ayrı minimum izinli rol ile çalışır; hiçbir XP/maç/ledger yazması yoktur. Hesaplı wrapper mevcut doğrulanmış profil komutunu kullanır; korumalı Auth adaptörünün EXECUTE kapsamı değişmez.
- Guest bootstrap cookie'si ile start isteği ayrıdır: idempotent soru başlatılmadan cookie sahipliği kurulur. Ham capability DB'ye gitmez. Start ve cevap tekrarları DB'de korunur.
- Yerel deneme/test başlatıcısı 3002 kullanır; sunucu key'i yalnızca yerel Supabase status çıktısından child process ortamına geçer, diske/env dosyasına veya sohbete yazılmaz.
- Hosted proje bu fazda değiştirilmedi. Fiziksel teknik kayıt temizliği işletim fazının açık işidir; erişim DB'de 24 saat sonunda kapanır.

## 3 Kasım 2026 — Faz 5 tek tur ve Realtime köprüsü

Şartnamedeki Faz 5 kilometre taşı tek sabit sorudur; final üç turluk format değiştirilmedi. `engine_stage=5` kaydı ve görünür single-round preview etiketiyle XP/kalıcı istatistik yazmadan kapanır; kullanılmayan turlar kod/çözüm üretmeden kapanır. Cron ve üç turlu motor Faz 6, ledger/settlement Faz 7'de kalır.

Yeni komut sınırı mevcut minimum izinli profile-engine kimlik relay'ini kullanır; game-engine'e korumalı Auth adaptörü yetkisi verilmez. Yönetilen Realtime tablosunda dar game rolüyle gönderim izin hatası verdiği için yalnız `private.match_notify(uuid)` postgres-owned SECURITY DEFINER yapılır: sabit topic/event ve yalnız matchId/stateVersion/status, sabit search_path, yalnız game-engine EXECUTE. İstemci veya service role keyfi broadcast yaptıramaz. Realtime RLS/owner değiştirilmez; katılımcı SELECT, yalnız Presence INSERT alır. Oyun kararı bildirime güvenmez ve her HTTP/RPC yeniden katılımcılık denetler. Test kanıtı ve kalan ortam sınırları [Faz 5 raporunda](PHASE_5_REPORT.md).

Davet HTTP kabul sayacı ayrı server-only RPC'de false döndürerek commit edilir; ardından başarısız davetin transaction rollback'i ağ sayacını geri alamaz. Yalnız güvenilir Vercel proxy IP'si HMAC'lenir; diğer ortamlarda ortak ağ kovası kullanılır. Ham IP kaydedilmez.

## 3 Kasım 2026 — Faz 6 motoru ve scheduler

Yeni odalar stage 6 ile üç tur oynar; stage-5 geçmiş ve devam eden odaların tek tur sözleşmesi korunur. Sorular son ready transaction'ında easy/medium/hard olarak bir kez snapshot'lanır. Kod yalnız ortak başlangıçtan sonra, çözüm yalnız başlamış tur kapandığında DTO'ya girer. Sonuç ve geçmiş aynı dar filtreyi kullanır.

Saniyelik pg_cron ilerleticisi en fazla 100 due maçı SKIP LOCKED ile, 250 ms döngü bütçesinde ele alır. Cron ve kullanıcı komutları aynı geçiş/puan fonksiyonlarını kullanır. Deadline, bağlantı kontrolünden önce uzlaştırılır; son tur normal bitişi önceliklidir. Global tick boşluğu >10 saniye ise adil sonuç üretilemeyeceği için infrastructure abort uygulanır. Son tick >5 saniye eskiyken yeni başlangıç durur. Geç heartbeat önce eski eşiği değerlendirir; 30 saniyelik kaybı geri alamaz.

Post-advance business hatası commandError DTO'suyla commit edilir ve API bunu normal hata yanıtına çevirir; exception ile tamamlanmış timeout'u geri almak önlenir. Scheduler'a yalnız system entrypoint EXECUTE verilir; engine rolü miras alınmaz. Anon private schema USAGE health invoker'ı içindir, private tablo/fonksiyon genel erişimi veya Data API expose izni değildir. Public health yalnız iki liveness alanı döndürür.

Günlük teknik cleanup şifreli receipt'i siler ancak expired tombstone'u ve idempotency key'i tutar; böylece aynı eski komut yeni oda yaratmaz. Practice/rate teknik TTL ve yalnız uygulamanın Cron loglarında 7 günlük sınır uygulanır. Ayrıntılı kanıtlar [Faz 6 raporunda](PHASE_6_REPORT.md).

## 4 Kasım 2026 — tur kapanışının açıklanması ve okuma süresi

Kullanıcı ilk doğru cevabın turu bitirmesini korumayı seçti. Sonuç alanı ilk doğru cevabın kimden geldiğini ve neden diğer cevabın beklenmediğini açıklar; iki yanlış ve timeout da ayrı açıklanır. Tur arası okuma süresi 5 saniyeden 15 saniyeye çıkarıldı; ardından mevcut 3 saniyelik countdown gelir (toplam 18 saniye). Yeni migration yalnız yerelde; geçmiş migration dosyaları değiştirilmedi.

## 4 Kasım 2026 — katılım öncesi Ready korunur

Host odada tek başınayken Ready olabilir. Stage-6 join işlemi artık tüm ready_at değerlerini temizlemez; yeni guest zaten hazır değildir. match_advance'in eski heartbeat için readiness temizliği ve iki oyuncunun güncel heartbeat/Ready gereksinimi korunur. Guest bekleme odasından ayrılırsa host readiness sıfırlanması sürer. Legacy stage-5 akışı değişmez.

## 4 Kasım 2026 — çözümler maç sonunda incelenir

Kullanıcı isteğiyle düello arayüzündeki Explanation ve Previous rounds yalnız terminal maç durumunda gösterilir. Tur arası kazanan/neden/sonraki başlangıç sayacı ve 15+3 saniye zamanlama korunur. Doğru/yanlış satır vurgusu değişmez. Connection_lost metni oyuncunun bakış açısına göre bağlantısı onaylanmayan kullanıcıyı, en az 30 saniye eşiğini ve puandan bağımsız forfeit sonucunu açıklar. Heartbeat/Cron/puan kuralları değiştirilmedi.

## 7 Kasım 2026 — turuncu vurgu

Kullanıcı turuncu denemesini kabul etti ve push istedi. Koyu antrasit zemin korunarak marka, düğme, bağlantı, seçili satır ve favicon vurguları turuncuya taşındı. Ana düğmede beyaz yazı/#c2410c kontrastı 5.18:1; açık vurgu/#10131b kontrastı 11.01:1. Masaüstü ve dar mobil önizleme incelendi. Bu karar şartnamedeki mor vurgu tercihinin yerini alır. Kullanıcı aynı talimatla Faz 8 sağlamlaştırmayı başlattı; production yayını Faz 9 kapsamındadır.

## 7 Kasım 2026 — Faz 8 public okuma ve tarayıcı sınırı

Public leaderboard sayfası/API ortak 60/dakika HMAC ağ sayacını, health ayrı 120/dakika sayacını kullanır. Yeni minimum izinli admission rolü yalnız bu iki action'a RLS erişir; RPC service_role dışında kapalıdır. Vercel dışındaki güvenilmeyen IP başlıkları ortak kovaya düşer. DB erişim hatasında fail-closed 503, kota dolunca Retry-After'lı 429 verilir. Yeni migration önce hedefe uygulanmadan uygulama yayımlanmaz.

CSP nonce'ları private/no-store dinamik HTML ile taşınır. Production script-src unsafe-inline/eval almaz; React style attribute ihtiyacı için style-src unsafe-inline bırakılır. Yalnız yapılandırılmış Supabase HTTPS/WSS origin'i ve yerel dev HMR açılır. İstek logları body/URL/headers/raw error yerine sabit alan allowlist'i kullanır. Ayrıntı ve kalan dış doğrulamalar Faz 8 raporundadır.
