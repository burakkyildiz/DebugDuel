# Ücretsiz kurulum ve yayın hazırlığı

Bu dosya runbook başlangıcıdır; henüz deployment yapılmadı. Bütçe 0: ücretli plan, ücretli branch, ek compute, SMTP veya alan adı satın alınmaz. Servislerin ücretsiz kotaları aşılırsa ölçek veya özellik açılışı durdurulur; otomatik ücretli geçiş yapılmaz.

## Supabase hedefi

- Organizasyon: `burakkyildiz's Org`; araçla doğrulanan plan `free`.
- Proje: `debug-duel`, ref `hvqklcqyjqjwwwcsioch`, Frankfurt.
- Panel: https://supabase.com/dashboard/project/hvqklcqyjqjwwwcsioch
- Bu proje geliştirme içindir. Vercel preview doğrudan gelecekteki production veritabanına yazmamalı.

## Auth için kalan dış ayarlar

1. Site URL'yi geliştirme için `http://localhost:3000` yap. Callback allowlist'e yalnızca kullanılan kesin uygulama callback URL'lerini ekle; wildcard production adres kullanma.
2. E-posta doğrulamasını açık tut, minimum parolayı 12 karakter yap. `supabase/config.toml` yalnızca yerel ayarları yönetir; uzak ayarları otomatik değiştirmez.
3. GitHub OAuth App oluşturulurken callback **Supabase** adresidir: `https://hvqklcqyjqjwwwcsioch.supabase.co/auth/v1/callback`. GitHub client secret'ı Supabase provider ayarında tutulur. Uygulamanın `/auth/callback` yolu PKCE code exchange içindir.
4. Uygulama OAuth dönüşünde yalnızca allowlist içindeki iç yolları kabul eder. Yeni bir dönüş yolu eklenirse Supabase allowlist'iyle birlikte doğrula.
5. Varsayılan ücretsiz e-posta sağlayıcısının gönderim/alıcı limitlerini kontrol et. Yeni Free projeler varsayılan SMTP ile e-posta şablonlarını özelleştiremez; mevcut kod code/callback ve token_hash doğrulama yollarını içerir. Ücretsiz bir SMTP seçeneği uygun değilse halka açık e-posta girişini hazır ilan etme. Yerelde gelen kutusu üzerinden test ücretsizdir.
6. GitHub ve e-posta giriş/çıkış/recovery akışlarını gerçek test hesaplarıyla tamamla. Üretimde bypass veya sahte hesap ekleme.

Kaynaklar: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [GitHub Auth](https://supabase.com/docs/guides/auth/social-sign-in/auth-github), [Free e-posta şablon kısıtı](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

## Yayına çıkmadan önce

Henüz tamamlanmadı: özel Realtime/public kanal ayarları, 1 saniyelik Cron ve sağlık kontrolü, rate-limit temizleme görevleri, 30 onaylı soru, tam oyun/XP engine'i, CSP, anonimleştirme prosedürü, gerçek iki cihaz smoke testi ve yük doğrulaması.

Vercel projesi henüz oluşturulmadı. Yayın aşamasında ücretsiz planın kullanım şartlarını doğrula; doğru repo/root ve Node `24.x` seç; build `pnpm build`, install `pnpm install --frozen-lockfile`. Secret'ları yalnızca platform ayarlarında sakla. `SUPABASE_SECRET_KEY` hiçbir zaman `NEXT_PUBLIC_` adı taşımaz. Şu an root env'de bu anahtar bulunmaz.

Yerel migration dosyaları CLI ile üretildi, uygulanan hosted migration sürümleriyle eşleştirildi. Yeni ortam migration'ları baştan sırasıyla çalıştırır. Mevcut cloud projesine aynı değişiklikleri ikinci kez uygulama; önce migration geçmişini karşılaştır.

## Geri dönüş

Yayından önce son iyi deployment, env ve migration sürümlerini kaydet. Uygulama rollback'i DB'yi geri almaz. Geriye uyumlu schema genişletmesi kullan; sonuç/XP kayıtlarını silerek geri dönüş yapma. Motor hatası halinde yeni maçları durdurup mevcut maçların güvenli kapanış yolunu koru. Gerçek staging geri yükleme testi tamamlanmadan prosedürü doğrulanmış sayma.
