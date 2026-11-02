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
