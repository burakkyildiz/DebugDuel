# Faz 3 — yeni oturuma devir

> **Güncelleme:** Kullanıcı 2 Kasım 2026’da Faz 3’ü başlattı; aşağısı başlangıçtaki devir kaydıdır. Güncel sonuç ve sınırlar: [Faz 3 raporu](PHASE_3_REPORT.md).

**Kayıt tarihi:** 2 Kasım 2026. Bu belge bağlam devridir; ana şartnamenin yerine geçmez.

## Kullanıcının son talimatı

Faz 3 başka bir oturumda sürdürülecek. Bu oturum yalnızca gerekli hafıza/devir kayıtlarını hazırlar. Yeni oturumda kullanıcı Faz 3'ü başlattığında yalnızca bu fazın kapsamıyla ilerle; sonraki fazları otomatik başlatma. Bütçe **0**; ücretli servis/plan/branch/compute ve satın alma yok. İstenmedikçe commit, push veya production deploy yapma.

## Önce oku

1. Kökteki `AGENTS.md`.
2. `docs/DEBUG_DUEL_PROJECT_SPEC.md` dosyasının tamamı. Faz 3 için özellikle bölüm 8–10 (şema/yetki/motor sınırı), 17 (soru bankası), 20 (testler), 22 (fazlar), 23 (yerel kurulum).
3. `docs/progress.md`, `docs/decisions.md`, `docs/test-plan.md` ve `docs/auth-checklist.md`.

## Doğrulanmış başlangıç noktası

- Workspace: `/Users/burakyildiz/Desktop/DebugDuel`.
- Repo: `https://github.com/burakkyildiz/DebugDuel`; branch `main`.
- Son push edilen kod: **`998c828` — çıkış düzeltmesi**.
- [Bu commit'in CI kaydı](https://github.com/burakkyildiz/DebugDuel/actions/runs/41452141699): **Success**. `quality` ve `database` işleri geçti. Önceki `a7f46a4` çalışmasındaki Auth çıkış hatası giderildi; aynı hatayı hâlâ açık sanma.
- Son kod doğrulaması: 46 birim testi, 25 gerçek yerel pgTAP testi, 8 desktop/mobile foundation E2E testi, ayrı gerçek yerel Auth zinciri, lint/types/build. Uzak CI'da da quality/database başarılı.
- Bu devir belgesi ve beraberindeki belge güncellemeleri yerelde hazırlanmıştır; kullanıcı ayrıca istemediği için bu hafıza kaydı için commit/push yapılmaz. Yeni oturum önce `git status` kontrol etsin, yerel değişiklikleri korusun.

## Şu an çalışanlar

- Next.js App Router + strict TypeScript + Tailwind; koyu/mor responsive landing ve hesap ekranları.
- Supabase SSR; GitHub OAuth gerçek hesapla test edildi: callback, refresh, çıkış, korunan profile red ve yeniden giriş.
- Yerel gerçek Supabase Auth/Mailpit ile e-posta kaydı, doğrulama, profil kaydı, logout/login ve parola recovery geçti. Eski parola reddi ve yeni parola kabulü doğrulandı.
- Kullanıcı adına case-insensitive unique kontrolü; profil komutları yalnızca aktörün profil alanlarını değiştirir. Client'ın XP/istatistik yazma yetkisi yok.
- Leaderboard yalnızca ilk 25 gerçek kaydı okuyor; pagination henüz yok. Oynanmış maç olmadığı için doğal boş durum normal.
- Auth çıkışında `router.replace()` + `router.refresh()` yarışına dönme: `SignOutButton` hydration öncesi disabled; başarılı logout'tan sonra aynı origin ana sayfaya tam belge geçişi yapar. E2E, POST 200 + document navigation + girişsiz menü + protected-route reddini kontrol eder.

## Mevcut veri ve servisler

- Supabase **geliştirme** projesi: `debug-duel`, ref `hvqklcqyjqjwwwcsioch`, Frankfurt (`eu-central-1`), `burakkyildiz's Org`, doğrulanmış Free plan. Başka projelere dokunma.
- Mevcut migration'lar: `20261102111107_profiles_foundation`, `20261102111705_profile_engine_auth_access`, `20261102111927_verified_actor_boundary`. Yerel ve hosted ortama uygulandı; şema tipleri üretildi.
- `public.profiles` ve private profil yazma limitleri var. Diğer oyun tabloları ve 30 soru **henüz yok**; `supabase/seed.sql` yalnızca açıklama içeriyor.
- Profil yazıcısı minimum izinli `debug_duel_profile_engine` NOLOGIN rolünde. Supabase Auth şemasındaki RLS nedeniyle argümansız salt okunur `private.verified_actor_id()` postgres sahibi dar adaptördür; anon/authenticated EXECUTE yoktur. Bu izin sınırını genişletme.
- `.env.local` gitignore'da: hosted URL/publishable key ve üç uygulama secret'ı yerelde hazırlandı. Supabase sunucu secret key'i henüz ekli değil; kullanıcıdan sohbet içinde secret isteme veya değerleri yazdırma. Yeni oturumda yalnızca gerekli değişken adlarını kontrol et.
- GitHub OAuth App: `https://github.com/settings/applications/3985598`; callback `https://hvqklcqyjqjwwwcsioch.supabase.co/auth/v1/callback`. Sağlayıcı etkin, scope yalnızca `user:email`; repository erişimi yok. Client secret kullanıcı tarafından doğrudan Supabase'e girildi; koda veya belgelere taşınmadı.
- Son bilinen yerel önizleme: `pnpm start`, `http://localhost:3000`. Docker ve gerekli yerel Supabase servisleri açıktı; yeni oturumda hâlâ çalıştıklarını varsayma, kontrol et. Yerel Realtime/Cron tam kurulumu henüz doğrulanmadı.

## Faz 3'ün işi

**Hedef:** Şartnameye uygun şema + RLS/GRANT + özel motor sınırları + 30 doğrulanmış soru + üretilen tipler ve gerçek DB testleri.

1. Mevcut şemayı/izinleri incele; CLI komutlarını `--help` ile doğrula. Yeni migration dosyasını `supabase migration new ...` ile oluştur; timestamp uydurma, eski uygulanmış migration'ları yeniden yazma. Reset yerel veriyi siler; normal iş akışında gereksiz reset yapma.
2. Bölüm 8'deki eksik match/player/round ve private question/snapshot/answer/invite/receipt/ledger/settlement/health/practice tablolarını, kısıtları, indeksleri ve izinleri tutarlı biçimde ekle. Client'lara doğrudan oyun yazma izni verme; karşılıklı RLS recursion oluşturma.
3. **30 özgün Python sorusu:** 15 `duel` + 15 `practice`; her havuzda 5 kolay, 5 orta, 5 zor. Havuzlar arasında aynı içeriği kopyalama. Her soru tek açık mantık hatası ve tek doğru satır, kısa görev/beklenen davranış, açıklama ve düzeltilmiş kod içersin; çoğunlukla 5–18 satır olsun.
4. LF/satır sayısı, 1 tabanlı doğru satır, slug/version benzersizliği, havuz/zorluk dağılımı ve açıklamaları test et. Yalnızca repository'deki güvenilir fixture Python kodu yerel/CI'da içerik denetimi için çalıştırılabilir; uygulama API'sine kullanıcı kodu yürütme ekleme.
5. Gerçek anon/A/B/C rol/JWT bağlamlarında private tablo ve fonksiyon erişimlerini, katılımcı okumasını, doğrudan DML reddini ve bütünlük kısıtlarını test et. Gelecek tur kodu/çözümü public tablolara veya client bundle'a girmesin. Şema tiplerini yeniden üret ve ilgili belgeleri güncelle.
6. Fazı ancak temiz migration/seed uygulaması, gerçek yetki testleri ve 30 soru denetimi geçtiğinde tamamlandı say. Sonuçları ve kalan dış bağımlılıkları raporla.

## Faz 3'ten sonra / henüz yapılmayanlar

- Faz 4: gerçek guest/hesaplı Practice; server-only ayrıcalıklı istemci, HttpOnly guest çerezi ve özeti, soru/cevap/çözüm akışı. Şu an Practice ekranı açıkça hazırlık durumu gösteriyor.
- Faz 5+: davetli oda, ready, özel Realtime ve tek tur; ardından üç turluk 45 saniyelik engine, 1 saniyelik Cron, reconnect/forfeit, tek settlement/XP ledger/kota, history ve leaderboard pagination.
- Uzak/üretim e-posta teslimi ve recovery, uzak parola minimumu kontrolü, CSP, işletim/anonimleştirme prosedürleri, gerçek iki cihaz canlı smoke ve Vercel yayını açık. GitHub'ın çalışması veya yerel SMTP testi, bu teslimlerin tamamlandığı anlamına gelmez. Tüm AC maddeleri tamamlandı değildir.

## Yararlı komutlar

```sh
git status --short
pnpm install --frozen-lockfile
docker info
pnpm exec supabase start
pnpm lint
pnpm typecheck
pnpm test
pnpm test:db
pnpm build
pnpm start
# Ayrı terminalde, açık localhost:3000 sunucusuna karşı:
pnpm test:e2e
# Çalışan yerel Supabase + Chromium ile kendi 3001 sunucusunu açar:
pnpm test:auth:local
```

Node `24.12.0`, pnpm `11.25.0`; dependency sürümleri kilitli. Dev/build bu ortamın Turbopack process/port kısıtı nedeniyle desteklenen `--webpack` modunu kullanır. `test:auth:local` cloud URL'yi reddeder, `.env.local` değiştirmez, `.next-auth-local` dizinini kullanır; Next'in ürettiği tip ayarlarını kullanıcı arada değiştirmediyse geri yükler. Normal `test:e2e` içindeki iki yerel Auth kopyasının skip olması bilinçlidir; gerçek zincir ayrı komut/CI database job'ında koşar.
