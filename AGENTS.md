# Debug Duel — çalışma yönergeleri

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
- **Yeni oturum başlangıcı:** `docs/PHASE_3_HANDOFF.md` devir notunu oku. Son doğrulanmış kod/CI, ortam sınırları ve Faz 3'ün somut işleri oradadır. Bu devir isteği Faz 3'ü bu oturumda başlatma talimatı değildir.

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
