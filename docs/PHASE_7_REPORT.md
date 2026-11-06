# Faz 7 — ilerleme ve maç geçmişi

6 Kasım 2026. Kullanıcı Faz 7’ye başlama talimatı verdi. Başlangıç `4b55d8b`. [Faz 6 GitHub Actions koşusu](https://github.com/burakkyildiz/DebugDuel/actions/runs/42214847641) başarılı.

## Yerel kapsam

- `20261106123743_match_progression.sql`, üç turluk bir maçın `finished` geçişinde tek settlement ve oyuncu başına tek ledger kaydı oluşturur. Sonuç, kazanılan XP, maç sonundaki toplam, profil istatistikleri ve ledger aynı transaction’da kesinleşir. Maç puanı ayrı kalır.
- Sıralı profil satırı kilitleri aynı hesap çiftinin UTC günü kotasını ve profil toplamlarını serileştirir. Kotadan sonraki maçlarda istatistikler işlenir ve XP sıfırdır. Forfeit ödülü için kalan oyuncunun kapanmış bir turda geçerli cevabı gerekir. Practice, abort, iptal ve eski tek turluk önizleme ödül oluşturmaz.
- Settlement için ayrı NOLOGIN rolü kullanılır. Rolün Auth şemasına erişimi yoktur. İstemci bu işlevi çağıramaz. Oyuncular yalnız kendi ödül özetini mevcut katılımcı durum yanıtında görür. Faz 7’den önce kapanmış maçlar geçmişteki özgün sonuçlarıyla görünür. Geçiş sırasında açık olan üç turluk maç, sonradan normal biçimde kapanırsa yeni ödül kurallarını kullanır.
- `/history` ve `/api/me/history` katılımcı RLS kurallarını kullanır. `/leaderboard` ve `/api/leaderboard` kararlı XP, galibiyet, oluşturulma zamanı ve UUID sırası kullanır. API varsayılanı 25, üst sınırı 50’dir. Cursor’lar doğrulanan, şifreli belirteçlerdir. Liderlik tablosu yanıtı hesap UUID’lerini içermez. Sayfalar arasında XP değişebilir.
- Profil kazanma oranını, ana sayfa giriş yapmış oyuncunun XP ve W/L özetini gösterir. Sonuç ekranında Play again yeni bir oda oluşturur ve davet bağlantısını açar.

## Doğrulama ve ortam

- 573 pgTAP testi mevcut ve temiz yerel DB’de geçti. Seed tekrarından sonra 573 test yeniden geçti. Paralel PostgreSQL oturumları SKIP LOCKED, kilit sonrası deadline ve tek settlement davranışını doğruladı.
- Lint, TypeScript, 67 birim testi ve 30 soru için 81 davranış vakası geçti.
- Yerel Supabase güvenlik ve performans danışmanları WARN veya ERROR bildirmedi. Production build üzerinde 9 düello ve foundation tarayıcı testi geçti. İki gerçek hesapla beraberlik XP’si, profil, geçmiş, sayfalama ve yeni davet akışı doğrulandı. Misafir geçmiş isteği 401 döndü. Public liderlik tablosu misafire iki sayfa döndürdü ve bozuk cursor ile 50 üzerindeki sayfa boyutunu 400 ile reddetti. Sonuç ekranı 320 px genişlikte kontrol edildi.
- Yerel önizleme için Docker ve Supabase açıkken `pnpm match:local` çalıştır. [Düello](http://localhost:3006/play) üzerinden iki yerel hesapla yeni bir oda aç. Uzak geliştirme veritabanına bağlı varsayılan uygulama Faz 7 geçmiş RPC’si için yeni migration gerektirir.
- Yerelde 20 migration, uzak geliştirme ortamında 19 migration vardır. Faz 7 tesliminin commit ve CI durumu GitHub `main` ve Actions üzerinden takip edilir. Uzak migration, production yayın ve Faz 8 ayrı kullanıcı talimatıyla yürütülür. Yerel test hesabı ve XP temizliği yayın öncesine ertelendi.
