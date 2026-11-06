# Faz 6 devir notu — 6 Kasım 2026

Kullanıcı iki yerel hesapla düelloyu denedi, 0–0 beraberlik ekranını gördü ve akışı onayladı. Faz 6 değişikliklerinin GitHub `main` dalına gönderilmesini ve başka bir oturumda **Faz 6’dan devam edilmesini** istedi.

Önce kökteki `AGENTS.md`, ardından [Faz 6 raporu](PHASE_6_REPORT.md) ve [proje şartnamesini](DEBUG_DUEL_PROJECT_SPEC.md) oku. Bu devir dosyasını taşıyan commit Faz 6 teslimidir. Commit kimliğini `git log -1 -- docs/PHASE_6_HANDOFF.md` ile bul. Güncel push ve CI durumunu Git ve GitHub Actions üzerinden kontrol et.

## Tamamlanan ve doğrulanan akış

- Özel davet odasında iki hesap, ortak üç soru ve tur başına en fazla 45 saniye. İlk doğru cevap turu bitirir. Tur sonucunu okumak için 15 saniye ve ardından 3 saniye geri sayım vardır.
- Hostun canlı bağlantıyla katılım öncesi verdiği Ready korunur. İki taraf hazır olunca maç başlar.
- Finalde toplam puan, kazanan veya beraberlik, bağlantı kaybı nedeni ve tamamlanan soruların çözümleri görünür. Cron tarayıcılar kapansa da maçı ilerletir. XP ve kalıcı istatistik Faz 7 kapsamındadır.
- 559 DB testi temiz kurulumda ve seed tekrarından sonra geçti. Lint, TypeScript, 67 birim testi ve 81 soru vakası da geçti. Temel Faz 6 sürümünde 9 motor/foundation E2E ve 19 Practice/foundation regresyonu geçti. Son arayüz değişiklikleri iki odaklı gerçek tarayıcı testiyle doğrulandı. Ayrıntılar Faz 6 raporunda.

## Sonraki oturum

1. Faz 6 commit’inin GitHub Actions `quality` ve `database` sonuçlarına bak. Kırmızı kontrol varsa önce onu incele.
2. Yerel tekrar denemesi için Docker ve yerel Supabase açıkken `pnpm match:local` çalıştır. [Düello](http://localhost:3006/play) ve [yerel posta kutusu](http://127.0.0.1:54324/) ile iki ayrı tarayıcı oturumunda **yeni** oda aç. Yerel GitHub giriş sağlayıcısı kapalıdır.
3. Hosted geliştirme projesi `debug-duel` (`hvqklcqyjqjwwwcsioch`) 13 migration ile Faz 5 düzeyindedir. Faz 6’nın altı migration’ı yerelde uygulanmış durumda. Kullanıcı uzak DB uygulamasını ayrıca isterse önce ücretsiz ortamda Cron desteğini ve migration planını doğrula. Ardından health ve iki hesaplı düelloyu hosted ortamda sınamak Faz 6’nın kalan işidir.
4. Production yayını ve Faz 7 için ayrı kullanıcı talimatı bekle. Bütçe sıfır. Yerel Auth kullanıcıları ve secret değerleri Git'e girmez.
