# Uygulama ilerlemesi

Ana plan ve çıkış koşulları: `DEBUG_DUEL_PROJECT_SPEC.md`, bölüm 22.

## Başlangıç durumu

- Şartname okundu; ürün sahibinin yeni proje, sıfır bütçe ve mevcut palet kararları kaydedildi.
- Repository başlangıçta yalnızca şartname içeriyordu. Mevcut staged şartname korundu.
- `AGENTS.md`, ignore kuralları, env şablonu, README, mimari/karar/test/yayın belgeleri oluşturuldu.
- Ayrı Supabase projesi oluşturuldu: `debug-duel` / Frankfurt.
- Organizasyon planı `free` olarak doğrulandı; ücretli kaynak eklenmedi.
- Next.js/React/Tailwind/TypeScript/Supabase/pnpm sürümleri doğrulanıp uyumlu tam sürümler kilitlendi.
- Ana sayfa ve mobil tema, giriş/kayıt/recovery ekranları, Auth API/callback handler'ları, profil/onboarding ve gerçek verili ilk sayfa leaderboard hazırlandı.
- Gerçek profil migration'ları geliştirme Supabase projesine uygulandı; tipler üretildi. 25 pgTAP testi gerçek rol/JWT bağlamlarında geçti; test verisi rollback edildi.
- 32 birim testi, lint, TypeScript ve Webpack üretim build'i geçti. Güvenlik advisor listesi boş.
- Chromium ile masaüstü/mobil başlangıç E2E'si: 8/8 geçti. Ana sayfa ekran görüntüleri incelendi; 320 px sayfa taşması testi geçti.
- `pnpm dev` yerelde `http://localhost:3000` için çalıştırıldı. Vercel yayını yapılmadı.
- 2 Kasım 2026: kullanıcı mevcut başlangıç çalışması için commit/push istedi. `AGENTS.md` uygulanan katmanlar, test kanıtları, sınırlar ve sonraki sırayla güncellendi. Yerel branch `main`; ilk kontrolde henüz commit veya GitHub remote'u yoktu. Push hedefi doğrulanmalıdır.
- Docker CLI var; daemon çalışmıyor. Yerel Supabase ve temiz yerel migration testleri için Docker'ın çalışması gerekir.

## Fazlar

| Faz | Durum |
| --- | --- |
| 0 — Hazırlık | Temel kurulum hazır; Vercel/üretim hedefi yayın fazında |
| 1 — Tasarım ve iskelet | Ana sayfa ve hesap ekranları hazır; oyun/lobi/sonuç ilgili dikey akışlarda eklenecek |
| 2 — Auth ve profil | Kod ve profil DB testleri hazır; gerçek OAuth/e-posta smoke testi bekliyor |
| 3 — DB ve soru bankası | Profil temeli hazır; oyun şeması ve 30 soru henüz yok |
| 4 — Practice | Bekliyor |
| 5 — Özel oda, tek tur | Bekliyor |
| 6 — Tam motor | Bekliyor |
| 7 — İlerleme | Bekliyor |
| 8 — Sağlamlaştırma | Bekliyor |
| 9 — Üretim | Bekliyor |

Henüz hiçbir AC maddesi tamamlandı olarak işaretlenmedi.

## Sıradaki uygulama adımları

1. Yerel Docker/Supabase ortamında temiz migration kurulumunu doğrula; uzak geliştirme Auth ayarlarını tamamlayıp gerçek e-posta ve GitHub hesabıyla smoke testi yap.
2. Şartnamenin özel soru/snapshot/practice şemasını ve iki havuzda toplam 30 özgün soruyu ekle; içerik testleri ve izin matrisini doğrula.
3. Sunucu secret key'i güvenli yerel/platform ayarından yapılandırıp guest/hesaplı Practice dikey akışını tamamla. Anahtar sohbetten istenmez.
4. Davetli tek turu iki tarayıcıyla kur; sonra üç tur, Cron, reconnect ve settlement/XP/leaderboard pagination fazlarına geç.
