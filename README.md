# Debug Duel

**Find the bug. Beat your rival.** İki arkadaşın aynı Python mantık hatasını bulmak için yarıştığı web uygulaması.

Ana kaynak: [proje şartnamesi](docs/DEBUG_DUEL_PROJECT_SPEC.md). Çalışma yönergeleri [AGENTS.md](AGENTS.md), durum kaydı [docs/progress.md](docs/progress.md).

## Mevcut durum

Başlangıç temeli hazır: Next.js iskeleti, koyu/mor responsive ana sayfa, giriş/kayıt/recovery ekranları ve Auth handler'ları, gerçek Supabase profil tablosu ve kontrollü profil güncelleme fonksiyonları. Leaderboard ilk 25 gerçek kaydı okur; henüz maç olmadığından doğal boş durum gösterir.

**Oyun henüz oynanabilir değildir.** Practice ve özel düello ekranları açık hazırlık durumu gösterir. 30 soruluk banka, Practice, üç turluk atomik motor, özel Realtime, Cron ve XP settlement sonraki fazlardır. Mevcut Auth kodu gerçek sağlayıcı smoke testleri tamamlanmadan üretime hazır sayılmaz.

## Gereksinimler

- Node.js `24.12.0` (`.nvmrc`), pnpm `11.25.0`.
- Yerel Supabase/DB testleri için çalışan Docker. Supabase CLI `2.122.0` geliştirme bağımlılığıdır.
- Dış servisler yalnızca ücretsiz planda kullanılabilir. Ücretli branch, compute, SMTP veya plan yükseltmesi yapılmaz.

## Çalıştırma

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
```

`.env.local` içine kendi ortamının değerlerini koy; var olan dosyayı bu komutla ezme. Secret'ları sohbet veya Git üzerinden paylaşma. Bu çalışma alanında oluşturulan `.env.local` zaten ayrı Debug Duel projesinin URL/publishable key değerlerini ve üç rastgele uygulama secret'ını içerir. Sunucu Supabase secret key'i henüz ekli değildir; Auth/profil için gerekli değildir, guest Practice fazında gerekli olacaktır.

```sh
pnpm dev
```

Uygulama: `http://localhost:3000`. Origin denetimi `NEXT_PUBLIC_SITE_URL` ile eşleşir; farklı hostname/port kullanırsan bu değişkeni de değiştir. Fontlar paketle yerel sunulur; Google Fonts isteği yapılmaz. Build ve dev bu ortamın Turbopack port kısıtı nedeniyle desteklenen Webpack modunu kullanır.

## Yerel Supabase

Docker'ı başlat, ardından:

```sh
pnpm exec supabase start
```

CLI çıktısındaki yerel API URL ve publishable key'i `.env.local` içine aktar; çıktıda sunucu anahtarları da bulunabileceğinden paylaşma. Yerel Studio `http://127.0.0.1:54323`, e-posta test kutusu `http://127.0.0.1:54324` adresindedir. E-posta doğrulaması açık, minimum parola 12 karakterdir. Başlangıçtaki migration'lar boş veritabanına uygulanır; mevcut yerel veriye migration uygulamak için kurulu CLI'nin `supabase migration up --help` çıktısını kontrol et.

`supabase db reset` **yerel veriyi siler**. Bu komut normal kurulum için gerekmez; temiz migration testi için yalnızca yerel test ortamında, silme etkisi bilinerek kullanılabilir. Uzak/üretim ortamında reset kullanılmaz.

GitHub OAuth yerel ayarlarında sağlayıcıyı ayrıca etkinleştir; OAuth client secret'ı frontend env'sine koyma. Gerçek sağlayıcı ayarları için [yayın rehberi](docs/deployment.md).

## Kontroller

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:db
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`test:db` çalışan yerel Supabase ister. E2E'den önce ayrı terminalde `pnpm dev` başlat; varsayılan test URL'si `http://localhost:3000`, gerekirse `PLAYWRIGHT_BASE_URL` kullan. Başlangıç E2E testleri sayfa akışları, erişim yönlendirmesi, Origin/gövde doğrulaması ve 320 px taşmayı kapsar; gerçek düello testi değildir. CI uygulamayı ayrıca başlatır. Mevcut test kanıtları ve kalan testler [test planında](docs/test-plan.md).

## Veri ve güvenlik

- İstemciler profil tablosunu doğrudan yazamaz. Profil komutları yalnızca doğrulanmış ve etkin hesabı değiştirir; XP/istatistikler bu fonksiyonlarla değişmez.
- Kullanıcı adı ASCII 3–20 karakterdir; büyük/küçük harf duyarsız benzersizdir.
- Özel yardımcılar Data API'ye açılmaz; profil motoru NOLOGIN rolüdür. Korumalı Supabase Auth tablosunu okuyan dar, argümansız adaptörün ayrıcalık gerekçesi [karar kaydında](docs/decisions.md).
- Şema tipleri Supabase projesinden üretildi; migration dosyalarının sürümleri uzaktaki gerçek migration kayıtlarıyla eşleştirildi.
- Manuel hesap silme talebi için proje sahibine başvurulur. Üretime açılmadan önce devre dışı bırakma, oturum sonlandırma, profil/gelecek maç geçmişi anonimleştirme prosedürü tamamlanmalıdır. FK'ler geçmişi cascade ile silmez.

## Dizinler

`src/app`: sayfalar/API; `src/components`: ortak bileşenler; `src/lib`: Auth, doğrulama, güvenlik ve kural yardımcıları; `src/content`: İngilizce metinler; `supabase`: migration ve DB testleri; `tests`: birim/E2E; `docs`: mimari, kararlar ve ilerleme.
