# Mimari

## Şimdi

Next.js App Router ve Server Components sayfaları render eder. Küçük Client Components formları etkileşimi yönetir. Merkezi metin dosyası ve CSS tasarım token'ları bütün ekranlarda paylaşılır.

Supabase SSR browser/server istemcileri ayrıdır. `src/proxy.ts` cookie oturumunu yeniler; korunan sayfa ve mutasyonlar ayrıca Auth sunucusuyla `getUser()` doğrulaması yapar. Kişisel yanıtlar `private, no-store` kullanır. API mutasyonları same-origin JSON ve 4 KiB gövde sınırı uygular; bilinmeyen alanlar reddedilir.

Giriş veya doğrulama callback'i `ensure_profile` çağırır. Profil GET'i salt okur. Profili değiştirmek için `PATCH /api/me/profile` → doğrulanmış JWT ile `public.update_profile` → `private.update_profile` kullanılır. Public wrapper SECURITY INVOKER; yazıcı dedicated NOLOGIN rolüne ait SECURITY DEFINER'dır. Tablo/sütun izinleri XP güncellemesine izin vermez. Aktif/doğrulanmış hesap kontrolü Auth şemasının RLS sınırı nedeniyle ayrı, argümansız bir salt okunur adaptörde yapılır; istemci bu yardımcıyı çalıştıramaz.

`public.profiles` yalnızca tamamlanmış profilleri veya hesabın kendi eksik profilini gösterir. Profil alanları bu aşamada tamamıyla kamuya açık sözleşmededir; özel alan eklenirse ayrı private tablo gerekir. `auth.users` ve private limit kayıtları istemciye açılmaz.

## Faz 3 depolama sınırı

Yerel DB'de `public.matches`, `match_players`, `match_rounds` yalnızca host/guest tarafından okunur; doğrudan istemci DML yoktur. Alt tabloların RLS'si matches'e, matches ise yalnızca JWT'ye bakar. Private soru/snapshot/cevap/davet/receipt/settlement/ledger/health/Practice tabloları istemciye açılmaz. Ayrı NOLOGIN/NOINHERIT oyun rolünün profil/XP yazma veya Auth adaptörü erişimi yoktur; henüz kullanıcı gameplay RPC'si yoktur.

Soru sürümü ve snapshot içerikleri değişmezdir. Python içerik denetleyicisi yalnızca repository fixture'larını yerel/CI'da çalıştırır; uygulama bu katalog veya çalıştırıcıyı import etmez. Health kaydı gerçek scheduler kurulana kadar null tick taşır. Bu depolama sınırı ve 30 soru yerelde doğrulandı; hosted geliştirme projesine Faz 3 migration'ları henüz uygulanmadı. [Doğrulama raporu](PHASE_3_REPORT.md).

## Sonraki fazlar

Practice için server-only ayrıcalıklı istemci, HttpOnly guest çerezi ve özeti; düello için mevcut private tabloları kullanan atomik RPC motoru, tek settlement/XP ledger iş akışı, özel Realtime ve saniyelik Cron eklenecek. Oyun saatini Vercel process belleği veya tarayıcı belirlemeyecek.

Şartnamenin bölüm 5–12'si nihai sözleşmedir. Depolama ve izinler uygulanmıştır; bu katmanların oynanabilir iş akışları henüz uygulanmamıştır. Profil temelinin çalışması oyun motorunun kabul edildiği anlamına gelmez.
