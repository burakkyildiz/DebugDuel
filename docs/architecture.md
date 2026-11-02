# Mimari

## Şimdi

Next.js App Router ve Server Components sayfaları render eder. Küçük Client Components formları etkileşimi yönetir. Merkezi metin dosyası ve CSS tasarım token'ları bütün ekranlarda paylaşılır.

Supabase SSR browser/server istemcileri ayrıdır. `src/proxy.ts` cookie oturumunu yeniler; korunan sayfa ve mutasyonlar ayrıca Auth sunucusuyla `getUser()` doğrulaması yapar. Kişisel yanıtlar `private, no-store` kullanır. API mutasyonları same-origin JSON ve 4 KiB gövde sınırı uygular; bilinmeyen alanlar reddedilir.

Giriş veya doğrulama callback'i `ensure_profile` çağırır. Profil GET'i salt okur. Profili değiştirmek için `PATCH /api/me/profile` → doğrulanmış JWT ile `public.update_profile` → `private.update_profile` kullanılır. Public wrapper SECURITY INVOKER; yazıcı dedicated NOLOGIN rolüne ait SECURITY DEFINER'dır. Tablo/sütun izinleri XP güncellemesine izin vermez. Aktif/doğrulanmış hesap kontrolü Auth şemasının RLS sınırı nedeniyle ayrı, argümansız bir salt okunur adaptörde yapılır; istemci bu yardımcıyı çalıştıramaz.

`public.profiles` yalnızca tamamlanmış profilleri veya hesabın kendi eksik profilini gösterir. Profil alanları bu aşamada tamamıyla kamuya açık sözleşmededir; özel alan eklenirse ayrı private tablo gerekir. `auth.users` ve private limit kayıtları istemciye açılmaz.

## Sonraki fazlar

Practice için server-only ayrıcalıklı istemci, HttpOnly guest çerezi ve özeti; düello için private soru/snapshot tabloları, atomik RPC motoru, tek settlement/XP ledger, özel Realtime ve saniyelik Cron eklenecek. Oyun saatini Vercel process belleği veya tarayıcı belirlemeyecek.

Şartnamenin bölüm 5–12'si nihai sözleşmedir. Henüz bu katmanlar uygulanmış değildir. Profil temelinin çalışması oyun motorunun kabul edildiği anlamına gelmez.
