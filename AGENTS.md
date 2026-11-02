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

## Çalışma düzeni

- Mevcut kullanıcı değişikliklerini koru. İstenmedikçe commit, push, yeni branch veya production yayın yapma. Kullanıcı 2 Kasım 2026'da mevcut başlangıç çalışmasını commit/push etmek için açık yetki verdi; bu yetki production yayını kapsamaz.
- Şartnamenin Faz 0–9 sırasıyla ilerle. Faz tamamlandı iddiasını ilgili çalışan akış ve test kanıtıyla destekle.
- Sürümleri resmi belgeler ve paket kayıt servisiyle doğrula, tam sürüm ve pnpm lockfile kullan. Paket yüklemek bir özelliğin tamamlandığı anlamına gelmez.
- Herhangi bir harici bağımlılık eksikse bağlantı gerektirmeyen işleri sürdür; eksikliği mock başarıyla gizleme.

## Güncel durum — 2 Kasım 2026

- Başlangıç iskeleti ve koyu/mor responsive ana sayfa hazır. Login, signup, recovery, callback, profil/onboarding ve gerçek verili ilk 25 kayıt leaderboard kodu mevcut.
- Supabase geliştirme projesine üç profil migration'ı uygulandı; `src/types/database.generated.ts` gerçek şemadan üretildi. Migration dosyalarının sürümleri hosted geçmişle eşleşir.
- Son doğrulama: 32 birim testi, 25 gerçek PostgreSQL/pgTAP testi ve 8 masaüstü/mobil başlangıç E2E testi geçti; lint, typecheck ve Webpack production build başarılı. DB testleri transaction sonunda rollback edildi.
- **Oyun henüz oynanabilir değil:** Practice ve özel düello hazırlık durumu gösterir. Oyun şeması, 30 soru, guest Practice, davet/ready, üç turluk motor, Realtime, Cron, XP settlement ve leaderboard pagination henüz uygulanmadı.
- Auth handler'larının varlığı AC-01'i tamamlamaz: gerçek GitHub OAuth ve e-posta doğrulama/recovery smoke testi, uzak provider/callback/parola ayarları bekliyor.
- Yerel Docker daemon önceki kontrolde kapalıydı; yerel DB testi `ECONNREFUSED 127.0.0.1:54322` verdi. Yeni çalışmada durumu yeniden kontrol et. Hosted rol testleri, temiz yerel migration kurulumunun yerini tutmaz.
- `.env.local` Git dışında tutulur. URL/publishable key ve üç uygulama secret'ı yerelde hazırlandı; Supabase sunucu secret key'i henüz ekli değil. Secret değerlerini yazdırma veya sohbetten isteme.
- Vercel projesi/yayını ve canlı iki cihaz smoke testi yok. Hiçbir AC maddesi henüz tam tamamlandı olarak işaretlenmedi.

## Sonraki çalışma sırası

1. Docker ile temiz yerel migration kurulumunu ve Auth sağlayıcı ayarlarını doğrula; gerçek test hesaplarıyla giriş/doğrulama/recovery smoke testini tamamla.
2. Özel soru/snapshot/Practice şemasını ve ayrı havuzlarda 15 duel + 15 Practice sorusunu ekle; her havuzda 5 kolay, 5 orta, 5 zor soru ve içerik/izin testleri olsun.
3. Güvenli server-only anahtar ve guest çereziyle gerçek Practice dikey akışını tamamla; XP/kalıcı istatistik oluşturma.
4. Davetli tek turu iki izole tarayıcıyla kur; ardından üç tur, saniyelik Cron, reconnect/forfeit ve tek settlement/XP ledger'a ilerle.

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
- Profil yazıcısı `debug_duel_profile_engine` adlı minimum izinli NOLOGIN rolündedir. Supabase'in korumalı Auth tablosunu okuyan tek dar istisna `private.verified_actor_id()` fonksiyonudur: argümansız, salt okunur, postgres sahibi, sabit search_path; anon/authenticated EXECUTE izni yoktur. Gerekçe `docs/decisions.md` içinde kayıtlıdır; bu sınırı genişletme.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
