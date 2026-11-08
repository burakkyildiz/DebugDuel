# Ortak Auth IP kotası deneyi — 8 Kasım 2026

## Sonuç

**Aynı SSR giriş yolunun farklı kullanıcıları ortak Auth IP kotasında buluşturabildiği, ayrı geliştirme Vercel yayını üzerinde doğrulandı.** Bilgisayardaki kontrollü istekler kotayı tüketince mobil veri kullanan telefon da429 aldı. Kota geri alınınca telefon normal400 giriş yanıtına döndü. Üretimde varsayılan kota altında olay sıklığı veya tüm Vercel egress IP'lerinin tek kovayı paylaştığı ölçülmedi.

## Ortam ve sınır

- Geliştirme Supabase: `hvqklcqyjqjwwwcsioch`; üretim `nvpqjmwurmeupkbhozrn` değiştirilmedi.
- Ayrı ücretsiz Vercel proje: `debug-duel-auth-check-20261108`, `prj_V8px8G7zNsQ07OOaAfWHz8NSv5NI`, Node24/fra1. Deployment `dpl_5FaUbC7ZCpXjDJrBhBfop2c1RgXY`, source `ce54e9c5facaaad7ee681b1a46c133b13db35eb0` (uygulama kodu canlı7e05 ile aynı).
- Test URL: https://debug-duel-auth-check-20261108-burakkyildiz.vercel.app/login/email . Yalnız üç public environment alanı: test Site URL, geliştirme Supabase URL, mevcut geliştirme publishable key. Private/server/production key aktarılmadı. Ayrı Supabase projesi, ücretli branch/compute/plan açılmadı.
- Mevcut `src/lib/supabase/server.ts`, SSR Auth istemcisini publishable key ile kuruyor; son kullanıcı IP'sini Auth'a iletmiyor. Request Vercel sunucusundan Auth token endpoint'ine gidiyor. Proxy refresh yolu da aynı forwarding eksikliğine sahip.
- Gerçek kullanıcı hesabı/parolası kullanılmadı. Rastgele örnek adresler ve gerçek hesaba ait olmayan test girdileriyle yalnız başarısız password grant istekleri yapıldı; kayıt, e-posta gönderimi veya kalıcı Auth oturumu oluşturulmadı. Ham IP/JWT/parola/private payload saklanmadı.

## Gözlenen sıra

| Adım | Gözlem |
| --- | --- |
| Bilgisayar başlangıcı | Test yayını POST login400 / SIGN_IN_FAILED |
| Telefon başlangıcı | Kullanıcı Wi-Fi kapalı/mobil veri açık olduğunu ve normal “Check your details…” mesajını doğruladı |
| Geliştirme geçici ayarı | Yalnız auth.rate_limit.token_refresh150→1; sparse diff tek declared update,13 undeclared alan korunur; secrets sent[] |
| Bilgisayar kontrollü seri | En fazla40 isteklik seri ilk429'da duracak şekilde sınırlandı;30 normal400 ardından31. istekte429 / RATE_LIMITED |
| Bağımsız doğrudan kontrol | Aynı B sentetik girdileriyle bilgisayardan geliştirme Auth'una tek doğrudan istek400;429 yok |
| Telefon ortak kota kontrolü | Kullanıcı mobil veride aynı test girdisiyle bu kez “Too many requests…” gördüğünü doğruladı |
| Ayar geri alma | Geliştirme token kotası150'ye geri yazıldı; sparse diff readback declaredUpdates0/restored=true |
| Telefon son kontrol | Kullanıcı normal “Check your details…” mesajına döndüğünü doğruladı |
| Güvenlik zamanlayıcısı | Üç dakikalık tek seferlik geri alma süreci zaten150'ye dönüldüğünü ayrıca doğrulayıp sonlandı |

Telefonun HTTP durumu tarayıcı network panelinden bağımsız kaydedilmedi; kullanıcı UI metni doğrulamasıdır. Uygulama bu metni429 RATE_LIMITED için döndürür. Bilgisayar HTTP durumları doğrudan kaydedildi. İki cihazın farklı ağda olduğu kullanıcı beyanıdır; ham IP toplanmadı. Bu sınırlara rağmen başlangıç→kontrollü tükenme→ikinci ağ etkisi→doğrudan kontrol→geri alma zinciri, test ortamındaki ortak SSR kotasını destekler.

[Supabase resmî belgesi](https://supabase.com/docs/guides/auth/rate-limits#ip-address-forwarding), SSR/proxy isteklerinde son kullanıcı IP'si iletilmezse sunucu IP'sinin rate limit için kullanılabileceğini belirtir. Token bucket burst kapasitesi nedeniyle geçici düşük refill kotasında bile ilk30 deneme geçip31. istekte limit görülmesi çelişki değildir. Bu deney150 varsayılan ayarda yalnız31 istekten sonra kalıcı engel oluşacağını iddia etmez.

## Geri alma ve test yayınının kapatılması

Geliştirme Auth kotası geri alındı ve telefonun erişimi normale döndü. Test projesinde sonraki otomatik build'ler `commandForIgnoringBuildStep=exit 0`, Preview otomatik deploy kapalı. İlk SSO kapatma isteği otomatik incelemede bu özel kalıcı erişim ayarına açık onay olmadığı için reddedildi; farklı araçla aşılmadı. Kullanıcı ardından “Evet, yalnız test bağlantısını kapat” diyerek açık onay verdi. Yalnız bu projede ssoProtection.deploymentType=all kaydedildi ve anonim test URL302 ile Vercel oturum korumasına yönlendi. Asıl üretim projesinin ayarları/yayını değiştirilmedi; canonical hâlâ7e05ca2 / dpl_6m3Zm9yLPN5Hp3N7teQyZAEFckm8 READY.

Git dışı operasyon çıktıları `.local-backups/auth-ip-test/` içindedir: baseline/burst/control/restore/watchdog sonuçları ve yalnız public/limit ayarlı config'ler. Bunlar secret veya Auth dump değildir. Mevcut next-env.d.ts ve tsconfig.json kullanıcı değişiklikleri korunur. Bu inceleme için ürün kodu, migration, commit/push veya asıl uygulama deploy'u yapılmadı.

## Düzeltme yönü

Sonraki uygulama çalışmasında yalnız Auth çağrıları için güvenilir Vercel istemci IP'sini taşıyan dar bir sunucu adaptörü tasarlanmalı. Supabase tarafında IP forwarding açık olmalı; resmî belge bu mekanizma için yeni secret API key gerektiğini, publishable/legacy anahtarların desteklenmediğini belirtir. Secret browser'a veya genel oyun/DB istemcisine konulmaz; kullanıcı JWT'li SQL/RLS sınırı korunur. Gelen sıradan X-Forwarded-For başlığına güvenmek veya bütün kullanıcıları korumasız bırakmak çözüm değildir. Önce dev'de aynı iki ağ deneyiyle bağımsız kota doğrulanır, sonra ayrı yayın kapsamıyla üretim ele alınır.
