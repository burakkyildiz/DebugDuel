# Uygulama ilerlemesi

Ana plan ve çıkış koşulları: `DEBUG_DUEL_PROJECT_SPEC.md`, bölüm 22.

## Güncel kayıt — Faz 7, 6 Kasım 2026

Faz 7 maç kapanışında tek XP ve istatistik işlemini, özel maç geçmişini ve sayfalı XP liderlik tablosunu içeriyor. `2df6df4` GitHub `main` dalında ve CI başarılı. Uzak geliştirme projesine Faz 7 migration’ı uygulandı. Yerel ve uzak 20 sürüm eşleşiyor. [Faz 7 raporu](PHASE_7_REPORT.md)

## Güncel kayıt — Faz 6, 6 Kasım 2026

Yerel üç turluk düello motoru, Cron, yeniden bağlanma ve forfeit akışı tamamlandı. Kullanıcı iki hesapla yerelde oynadı ve sonucu onayladı. Açık talimatıyla altı migration Free plandaki Supabase geliştirme projesine uygulandı. Yerel ve uzak 19 sürüm eşleşiyor. Saniyelik Cron, health ve uzak geliştirme DB’ye bağlı iki hesaplı üç tur doğrulandı. Faz 7 ve production yayın için kullanıcı talimatı beklenir. [Devir notu](PHASE_6_HANDOFF.md)

## Güncel kayıt — 3 Kasım 2026, Faz 5

Kullanıcının açık Faz 5 talimatıyla özel oda/tek tur dikey akış geliştirildi. [Faz 5 raporu](PHASE_5_REPORT.md) güncel kaynak; aşağıdaki önceki faz notları tarihseldir. Tek sabit soru, ortak countdown/45 saniye, atomik DB puanı, özel Realtime ve polling, davetin login/onboarding dönüşünde korunması çalışır. Üç tur/Cron Faz 6; XP/ledger Faz 7. Hosted Faz 5 değişiklikleri, commit/push ve production yayın yapılmadı.

## Başlangıç durumu

- Şartname okundu; ürün sahibinin yeni proje, sıfır bütçe ve mevcut palet kararları kaydedildi.
- Repository başlangıçta yalnızca şartname içeriyordu. Mevcut staged şartname korundu.
- `AGENTS.md`, ignore kuralları, env şablonu, README, mimari/karar/test/yayın belgeleri oluşturuldu.
- Ayrı Supabase projesi oluşturuldu: `debug-duel` / Frankfurt.
- Organizasyon planı `free` olarak doğrulandı; ücretli kaynak eklenmedi.
- Next.js/React/Tailwind/TypeScript/Supabase/pnpm sürümleri doğrulanıp uyumlu tam sürümler kilitlendi.
- Ana sayfa ve mobil tema, giriş/kayıt/recovery ekranları, Auth API/callback handler'ları, profil/onboarding ve gerçek verili ilk sayfa leaderboard hazırlandı.
- Gerçek profil migration'ları geliştirme Supabase projesine uygulandı; tipler üretildi. 25 pgTAP testi gerçek rol/JWT bağlamlarında geçti; test verisi rollback edildi.
- 32 birim testi, lint, TypeScript ve Webpack üretim build'i geçti. Güvenlik advisor listesi boş.
- Chromium ile masaüstü/mobil başlangıç E2E'si: 8/8 geçti. Ana sayfa ekran görüntüleri incelendi; 320 px sayfa taşması testi geçti.
- `pnpm dev` yerelde `http://localhost:3000` için çalıştırıldı. Vercel yayını yapılmadı.
- 2 Kasım 2026: kullanıcı mevcut başlangıç çalışması için commit/push istedi. `AGENTS.md` uygulanan katmanlar, test kanıtları, sınırlar ve sonraki sırayla güncellendi. İlk commit `302c8cf`, branch `main`. Kullanıcının verdiği GitHub hedefi `https://github.com/burakkyildiz/DebugDuel.git`; push öncesi uzak depo erişimi ve boş olduğu doğrulandı.
- Faz 2 ilerlemesi: Docker Desktop başlatıldı, yerel Supabase temiz kurulumunda üç migration uygulandı ve yerel 25 pgTAP testi geçti. Auth testlerinin oluşturduğu yerel veriler varken de DB testleri tekrar geçti.
- Gerçek yerel e-posta/PKCE/profil/yenileme/çıkış/parola recovery E2E zinciri `pnpm test:auth:local` ile geçti. Yeni regresyonlarla toplam 46 birim testi geçti; lint, typecheck ve build başarılı.
- Son genel desktop/mobile E2E'si derlenmiş üretim build'i üzerinde 8/8 geçti. Yerel Auth testi ayrı komutta 1/1 geçti; genel komuttaki iki yerel Auth kopyasının atlanması bilinçlidir. Yerel 3000 önizlemesi son kontrolde `pnpm start` ile production build'ini sunuyor.
- Uzak Auth ayarlarında e-posta açık ve doğrulama zorunlu. Ürün sahibi GitHub secret/sağlayıcı kurulumunu tamamladı; kamuya açık ayarlardan GitHub'ın etkin olduğu doğrulandı. Ücretli servis eklenmedi. Kullanıcı 2 Kasım 2026'da bu Faz 2 değişikliklerinin commit/push edilmesini istedi.
- Kullanıcı onayıyla oluşturulan OAuth uygulaması: `https://github.com/settings/applications/3985598`. Gerçek GitHub girişinde yalnızca `user:email` kapsamı istendi ve kullanıcı onayladı. Uzak Supabase callback → yerel `/profile`, yenileme, çıkış, korunan profile red ve tekrar giriş geçti. Kullanıcı adı/görünen ad kullanıcıya bırakıldı.

## Fazlar

| Faz | Durum |
| --- | --- |
| 0 — Hazırlık | Temel kurulum hazır; Vercel/üretim hedefi yayın fazında |
| 1 — Tasarım ve iskelet | Ana sayfa ve hesap ekranları hazır; oyun/lobi/sonuç ilgili dikey akışlarda eklenecek |
| 2 — Auth ve profil | Geliştirme akışları doğrulandı: yerel e-posta/profil/recovery, temiz DB ve gerçek GitHub OAuth; uzak/üretim e-posta teslimi ayrıca bekliyor |
| 3 — DB ve soru bankası | Yerelde tamamlandı: 13 oyun tablosu, RLS/GRANT, 30 soru, 81 içerik vakası, 369 DB testi ve temiz kurulum; hosted uygulama yapılmadı |
| 4 — Practice | Yerel akış uygulandı; doğrulama kaydı docs/PHASE_4_REPORT.md |
| 5 — Özel oda, tek tur | Yerel dikey akış tamamlandı; iki gerçek oturum/özel Realtime ve yarış testleri; hosted uygulama bekliyor |
| 6 — Tam motor | Yerel üç tur/Cron/kopma akışı ve gerçek yarış/E2E kanıtları tamamlandı; hosted uygulama bekler |
| 7 — İlerleme | Bekliyor |
| 8 — Sağlamlaştırma | Bekliyor |
| 9 — Üretim | Bekliyor |

AC-18 içerik koşulu yerelde doğrulandı (30 soru / 81 davranış vakası). Diğer AC maddeleri, özellikle oynanabilir akışlar ve yayın, tam tamamlandı değildir.

## Sıradaki uygulama adımları

**Güncel:** Kullanıcı 2 Kasım 2026’da “Faz 3’e geçelim” dedi. Faz 3 yerel şema/soru/test kapsamı tamamlandı; [rapor](PHASE_3_REPORT.md). Faz 4 için yeni talimat beklenir. Aşağıdaki devir bilgisi önceki oturumun tarihsel kaydıdır.

**Faz 2 düzeltmesi tamamlandı:** `a7f46a4` için uzak CI'da ikinci logout yönlendirmesi başarısız olmuştu. Kullanıcı onaylı düzeltme `998c828` ile push edildi. Çıkışta tam belge geçişi ve hydration öncesi tıklama koruması eklendi; daha güçlü gerçek yerel Auth testi, lint ve 46 birim testi geçti. [Uzak CI](https://github.com/burakkyildiz/DebugDuel/actions/runs/41452141699) quality ve database işlerinde başarılıdır.

**Oturum devri:** Kullanıcı Faz 3'ü başka oturumda sürdürmek istedi. `docs/PHASE_3_HANDOFF.md` hazırlandı ve `AGENTS.md` üzerinden bağlandı. Bu oturumda Faz 3 başlamadı; yeni oturum notu okuyup kullanıcı Faz 3'ü başlattığında ilerler. Hafıza kayıtları için ayrıca commit/push yapılmadı.

1. Faz 2 geliştirme akışları doğrulandı. Yayın öncesi `docs/auth-checklist.md` üzerinden uzak e-posta teslimi/recovery ve parola ayarı kontrolünü tamamla; bu eksik AC-01 için açık kalır.
2. Şartnamenin özel soru/snapshot/practice şemasını ve iki havuzda toplam 30 özgün soruyu ekle; içerik testleri ve izin matrisini doğrula.
3. Sunucu secret key'i güvenli yerel/platform ayarından yapılandırıp guest/hesaplı Practice dikey akışını tamamla. Anahtar sohbetten istenmez.
4. Davetli tek turu iki tarayıcıyla kur; sonra üç tur, Cron, reconnect ve settlement/XP/leaderboard pagination fazlarına geç.

## Faz 3 doğrulama kaydı

- İki yeni CLI migration'ı mevcut yerel DB'ye reset olmadan uygulandı; 13 oyun tablosu ve ayrı minimum izinli rol eklendi.
- İki ayrı havuzda 30 soru; 81 davranış vakası, tek satır düzeltme ve seed/katalog eşleşmesi geçti.
- 369 gerçek DB testi (344 yeni + 25 profil), 48 birim testi, lint, typecheck, production build ve 8 desktop/mobile foundation E2E geçti. Temiz ayrı DB kurulumunda migration/seed ve seed tekrarı da aynı testlerle geçti.
- Yerel security/performance advisor uyarı vermedi. Browser bundle'da soru/çözüm içeriği bulunmadı.
- Yeni migration/seed yalnızca yerelde; hosted projenin son uygulanmış migration'ı değişmedi. Secret eklenmedi; ücretli kaynak, commit, push, deploy yok.
- Practice ve düello hâlâ hazırlık ekranındadır. Realtime/Cron/settlement/guest endpoint'leri sonraki fazlarda; bu testler gerçek maç testleri sayılmaz.

- Faz 3 tesliminden sonra kullanıcı değişikliklerin commit/push edilmesini ve yerel önizlemenin açılmasını istedi. Yerel `http://localhost:3000` HTTP 200 ile doğrulandı; production deploy ve Faz 4 bu isteğin kapsamında değildir.

## Faz 4

Kullanıcının devam talimatıyla guest/hesaplı Practice DB/API/UI akışı eklendi. 420 DB testi, 56 birim testi, lint/types/build geçti. Hosted şema/secret eksikliği sürer; .env.local değiştirilmedi. Ayrıntılar [Faz 4 raporu](PHASE_4_REPORT.md). Yeni commit/push veya production yayın yapılmadı.

Faz 4 tamamlanma doğrulaması: gerçek yerel 11 Practice E2E geçti (mobil duplicate timeout skip); temiz migration/seed ve seed tekrarında 420 DB testi geçti. Yerel oynanabilir önizleme `http://localhost:3002/practice`; remote ortam tamamlanmış sayılmaz.

Push öncesi son kontrol: production build üzerinde 19 E2E (11 Practice + 8 foundation) geçti, mobil duplicate timeout skip. 56 birim / 420 DB testi başarılı; test runner 3003'te izole production build kullanır ve 3002 önizlemesini etkilemez. Hosted şema ve server secret önkoşulları hâlâ açık; commit/push yapılmadı.

3 Kasım: kullanıcı key'i ekledi; dört migration ve seed uzak geliştirme projesine uygulandı. Uzak guest HTTP ve rollback'li hesaplı DB smoke geçti. Connector'ın atadığı sürümlerle repository sürümleri farklı; metadata eşleştirme otomatik incelemede reddedildi, kullanıcı onayı bekler. Tam eşleme PHASE_4_REPORT.md içindedir. Bu fark giderilmeden CLI db push çalıştırma.

3 Kasım repair sonucu: kullanıcı CLI girişi ve açık onayıyla resmî migration repair tamamlandı; 7 yerel/uzak sürüm birebir eşleşti. Schema snapshot karşılaştırması değişiklik göstermedi, uzak HTTP Practice smoke tekrar geçti. Önceki sürüm farkı giderildi.

Repair sonrası `db push --dry-run --skip-vault`: remote up to date, bekleyen migration/seed/role listeleri boş. Şema ve kullanıcı verisine yeniden migration uygulanmadı; Git commit/push henüz yapılmadı.

3 Kasım: Kullanıcı Faz 4 tamamlanması sonrası commit/push için açık yetki verdi. Son değişiklikler, yerel/uzak test kanıtları ve başarılı migration repair kaydı birlikte GitHub main'e gönderilmek üzere hazırlandı; production yayın kapsam dışıdır.

Faz 5 kapanışı (3 Kasım): 63 birim, 483 DB (temiz kurulum + seed tekrarında da 483), 30 soru/81 davranış vakası, lint/typecheck ve production build başarılı. İki izole oturumlu düello testleri 3/3 + desktop foundation 4/4; mevcut Practice/foundation regression 19 geçti/1 bilinçli skip; gerçek yerel Auth zinciri 1/1 geçti. Başlangıç `ba836e8`; yeni commit/push yok. Yerel tek tur kilometre taşı tamamlandı, hosted uygulama ayrı bekler. Faz 6 kullanıcı talimatı olmadan başlatılmaz.

Faz 5 uzak uygulama (3 Kasım): Kullanıcı tüm işlemlere açık onay verdi. Altı migration resmî CLI ile `debug-duel` geliştirme projesine uygulandı; geçmiş 13/13 eşleşti. Management API ile yalnız Realtime private_only=true yapıldı ve public WebSocket red doğrulandı. Uzak rollback kapsamındaki 63 düello DB testi geçti; sentetik hesap/pgTAP kalmadı. Advisor yeni şema uyarısı yok; eski Auth parola koruması uyarısı ve unused-index INFO kayıtları sürer. Lint/typecheck/63 unit yeniden geçti. Değişiklikler GitHub main'e commit/push için hazırlandı; uzak CI sonucu push sonrasında ayrıca izlenecek. Üretim yayını ve yeni faz yok.
