# Uygulama ilerlemesi

Ana plan ve çıkış koşulları: `DEBUG_DUEL_PROJECT_SPEC.md`, bölüm 22.

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
| 3 — DB ve soru bankası | Profil temeli hazır; oyun şeması ve 30 soru henüz yok |
| 4 — Practice | Bekliyor |
| 5 — Özel oda, tek tur | Bekliyor |
| 6 — Tam motor | Bekliyor |
| 7 — İlerleme | Bekliyor |
| 8 — Sağlamlaştırma | Bekliyor |
| 9 — Üretim | Bekliyor |

Henüz hiçbir AC maddesi tamamlandı olarak işaretlenmedi.

## Sıradaki uygulama adımları

**Beklemede:** Kullanıcı kullanım kotasını bekliyor. Mevcut Faz 2 commit/push işleminden sonra geliştirme durur. Faz 3 yalnızca kullanıcının açık “Faz 3'e geçelim” talebiyle başlatılır.

1. Faz 2 geliştirme akışları doğrulandı. Yayın öncesi `docs/auth-checklist.md` üzerinden uzak e-posta teslimi/recovery ve parola ayarı kontrolünü tamamla; bu eksik AC-01 için açık kalır.
2. Şartnamenin özel soru/snapshot/practice şemasını ve iki havuzda toplam 30 özgün soruyu ekle; içerik testleri ve izin matrisini doğrula.
3. Sunucu secret key'i güvenli yerel/platform ayarından yapılandırıp guest/hesaplı Practice dikey akışını tamamla. Anahtar sohbetten istenmez.
4. Davetli tek turu iki tarayıcıyla kur; sonra üç tur, Cron, reconnect ve settlement/XP/leaderboard pagination fazlarına geç.
