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
