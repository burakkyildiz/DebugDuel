# Faz 3 — DB ve soru bankası

2 Kasım 2026. Kullanıcının açık “Faz 3’e geçelim” talimatıyla başlatıldı. Önceki devir belgesi tarihsel başlangıç kaydıdır; bu belge o kayıttan sonraki değişiklikleri açıklar.

## Teslim edilen kapsam

- `20261102133621_game_schema`: üç public maç tablosu; private soru, snapshot, cevap, settlement, ledger, davet, receipt, hız limiti, sağlık ve Practice tabloları. FK'ler geçmişi cascade ile silmez. RLS bütün yeni tablolarda açıktır.
- `20261102134054_game_integrity`: append-only cevap/ödül/snapshot kanıtı; değişmez soru sürümleri; karşılıklı koltuk tutarlılığı; sonuç/neden bileşimleri; tam süre; cevap doğruluk/puan/zaman kanıtları; Practice sahipliği ve teknik saklama sınırı.
- `debug_duel_game_engine`: NOLOGIN, NOINHERIT, superuser/BYPASSRLS olmayan ayrı rol. İstemci rolleri üye değildir. Public maç tablosu okumaları host/guest ile sınırlıdır; policy grafiği çocuk → matches → JWT şeklinde tek yönlüdür. İstemcide doğrudan DML veya private tablo okuması yoktur. Profil/XP yazma veya mevcut ayrıcalıklı Auth adaptörünü çağırma izni verilmedi.
- Bu fazdaki yeni trigger yardımcıları invoker'dır ve sabit boş search_path kullanır. Yeni gameplay RPC/HTTP endpoint'i açılmadı. Eski profil yazıcısı ve argümansız Auth adaptörü değiştirilmedi.
- `supabase/questions/catalog.json`: 15 duel + 15 Practice, her havuzda 5 easy / 5 medium / 5 hard. Her içerik 5–18 LF satırı, tek değiştirilen doğru satır, görev/beklenen davranış, açıklama, düzeltilmiş kod ve en az iki davranış vakası içerir. Havuzlar arası aynı kod/çözüm yoktur.
- `scripts/check-questions.py`: yalnızca güvenilir repository fixture'larını izole, süre sınırlandırılmış Python süreçlerinde çalıştırır. Hatalı kodun en az bir vakada bozulmasını ve düzeltilmiş kodun bütün vakaları geçmesini zorunlu kılar. Uygulama Python çalıştırmaz. Seed ile katalog arasındaki sapmayı reddeder.
- Seed tekrarlanabilir; var olan slug/version farklı içerikle sessizce ezilemez veya atlanamaz: aynı içerik upsert'i kabul edilir, değişmiş içerik version-immutability trigger'ı ile reddedilir. Pasifleştirilmiş soru yeniden etkinleştirilmez.
- Public TypeScript tipleri gerçek yerel şemadan üretildi. Katalog/seed uygulama kaynaklarına import edilmez ve private şema yerel Data API'ye açık değildir.

## Doğrulama

- 30 soru, 81 davranış vakası; düzeltilmiş sürümlerin tamamı geçti, her hatalı sürüm için karşı örnek var.
- 369 pgTAP testi: önceki 25 profil testi + 344 oyun şeması testi. Gerçek anon, A, B, C rol/JWT bağlamları; private tablo/fonksiyon izinleri, A/B katılımcı okuması, C izolasyonu, doğrudan DML reddi, koltuk/aktif oda/snapshot/süre/satır/cevap bütünlüğü, append-only kayıtlar ve Practice sahipliği.
- `pnpm test:db:clean`: farklı rastgele project ID ve 55322 portuyla yalnızca geçici yerel Postgres; migration/seed sıfırdan kuruldu, testler geçti; seed tekrarlandı ve testler yeniden geçti. Yalnızca bu testin konteyneri/volume'ü kaldırılır. Normal geliştirme DB'si resetlenmez. CI database job'ı ayrıca temiz başlangıç kullanır.
- 48 birim testi, lint, typecheck ve Webpack production build başarılı. Production build üzerinde 8 desktop/mobile foundation E2E geçti; genel komuttaki iki yerel Auth kopyası bilinçli olarak skip edildi. Ayrı `test:auth:local` bu fazda yeniden koşulmadı.
- Yerel security ve performance advisor: uyarı yok. Üretim `.next/static` içinde soru kodu/slug/çözüm taramasında eşleşme yok.

## Güvenlik incelemesi

`code-review-security` yönergeleriyle yeni migration/seed/fixture araçları ve mevcut profil sınırı incelendi. İncelenen kapsamda doğrulanmış açık bulgu kalmadı. Gerçek rol testleri, kapalı EXECUTE izinleri, private veri izolasyonu, immutable kanıtlar, sabit search_path, FK silme davranışı ve ayrı test ortamının hedef sınırı kontrol edildi. Bu sonuç tüm ürünün güvenli olduğu iddiası değildir; henüz mevcut olmayan kullanıcı motoru, guest HTTP sahiplik doğrulaması, Realtime ve Cron yarışları ilgili fazlarda doğrulanacaktır.

## Sınırlar ve sıradaki faz

Bu fazın iki migration'ı ve seed **yalnızca yerelde** uygulandı; hosted geliştirme projesi hâlâ önceki üç profil migration'ındadır. Yeni migration dosyaları, tiplerin yerel kaynaklı olduğunu bilerek hosted uygulama öncesi incelemeye hazırdır. Uzak şema test edilmiş gibi sunulmaz.

Oyun hâlâ oynanabilir değildir. Faz 4'te server-only istemci, guest çerezi/özeti, doğrulanmış hesaplı Practice RPC'leri, DTO ve tam kullanıcı akışı gerekir. Şema kısıtları oyun motorunun yerine geçmez: komut yetkilendirmesi, kilit sırası, idempotent yanıtlar, snapshot seçiminin transaction kilidi, yarışlar ve zaman ilerleticisi ilgili fazlarda uygulanır/test edilir. Realtime/Cron servisi bu fazda açılmadı; health tick bilinçli olarak null'dır. Cleanup işleri de sonraki motor/işletim fazındadır.

Bu oturumda ücretli kaynak, commit, push veya production yayın yoktur. Uzak e-posta/recovery ve parola ayarı gibi önceki açık dış önkoşullar sürer. Faz 4 otomatik başlatılmaz.

Resmî tasarım kaynakları: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Database functions](https://supabase.com/docs/guides/database/functions), [Supabase changelog](https://supabase.com/changelog). Kurulu CLI komutları `--help` ile kontrol edildi; yeni bağımlılık veya sürüm yükseltmesi eklenmedi.
