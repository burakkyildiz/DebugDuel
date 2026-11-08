# Ücretsiz kurulum ve yayın hazırlığı

## Güncel üretim hazırlığı — 8 Kasım 2026

Faz 8 kapandı, Faz 9 başladı. Önceki eksik/yetki bekleme bölümleri tarihsel; güncel durum [Faz 9 raporunda](PHASE_9_REPORT.md). Üretim `debug-duel-prod` / `nvpqjmwurmeupkbhozrn`, geliştirme eski projede kalır. Yeni üretime 21 migration/30 soru uygulandı; DB doğrulamaları rollback içinde geçti. Vercel projesi `prj_d67hDYIsOi8QR7swowQObAMJ33AP`, Hobby, Node 24.x, Frankfurt; HTTPS hedefi `https://debug-duel-burakkyildiz.vercel.app`. `99cf58b` / `dpl_8PGPpMsptDQ1aq1y3mtSkzdu3t9x` READY ve kullanıcı onayıyla bu adreste canlı. Yedi production değişkeni kullanıcıca kaydedildi; preview'a üretim DB erişimi verilmez. Auth Site URL/6 kesin HTTPS callback ve private-only Realtime kaydedildi. Gerçek GitHub callback ve guest Practice geçti; SMTP/email, onboarding/refresh/logout ve iki cihaz tam maç smoke açık; AC-21 tamamlanmadı.

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

## Güncel Faz 6 scheduler runbook — yalnız yerel uygulandı

Önceki eksik özellik listeleri tarihsel başlangıçtır. Faz 5 hosted migration/Realtime private-only kurulumu tamamdır. Faz 6 dört yeni migration ile yerelde üç tur/Cron/health/bakım akışını doğruladı; hosted uygulama ve production yayın ayrıca bekler. Uzak SMTP/gerçek iki hesaplı smoke, XP/settlement, CSP/yük ve production işletim kontrolleri kapanmış sayılmaz.

Kurulum sırası: proje kimliğini ve migration geçmişini doğrula → dört migration'ı dry-run incele → yetkilendirilen ortamda resmî CLI ile uygula → job/health/erişim kontrolleri → gerçek iki oturumlu smoke. Reset, history metadata UPDATE, toplu config push veya ücretli kaynak gerekmez. Kullanıcı ayrıca istemeden hosted Faz 6 uygulaması veya push yapma.

Admin SQL denetimleri:

```sql
select jobname,schedule,active from cron.job
where jobname in ('debug-duel-advance-matches','debug-duel-maintenance');
select last_successful_tick_at,last_gap_at,last_error_at,failed_matches
from private.engine_health where id;
select status,count(*) from cron.job_run_details
where jobid=(select jobid from cron.job where jobname='debug-duel-advance-matches')
  and start_time>clock_timestamp()-interval '5 minutes' group by status;
```

Advance `1 second`, maintenance UTC `0 0 * * *`; uygulama GET `/api/health` 200/ready=true ve son tick güncel olmalı. Health yalnız liveness alanları döndürür. Public rol scheduler EXECUTE alamaz; managed cron/realtime sahiplik/RLS'si değiştirilmez. Scheduler postgres rolünün explicit fonksiyon izinlerini koru.

Cron'u durdurmak oyun saatini durdurmaz: >5 saniye yeni oda/başlangıç engeli, >10 saniye aktif maçlarda infrastructure abort beklenir. Planlı bakımda yeni başlangıçları kapatıp aktif maçları güvenli bitir; kayıp pencere için geriye dönük forfeit/galibiyet hesaplama. Job'ı tekrar etkinleştirince health ve abort nedenlerini denetle. Salt uygulama rollback'i DB migration'larını geri almaz; stage-5 uyumluluk yolu ve normal terminal idempotency korunur.

Bakım yalnız expired teknik kayıtları ve Debug Duel'in iki job'ının yedi günden eski çalışma kayıtlarını siler; maç/ledger geçmişi silinmez. Ciphertext temizlense de receipt expired tombstone'u kalır. Sırları, SQL hata detail'larını veya ham davet URL'lerini loga basma. Ayrıntılar [Faz 6 raporunda](PHASE_6_REPORT.md).

## Güncel Faz 8 — 7 Kasım 2026

Yukarıdaki Faz 4–6 eksik listeleri tarihsel kayıttır. Uzak geliştirme ortamı Faz 7'nin 20 migration'ındadır. Yeni Faz 8 migration'ı `20261107105016_public_read_admission.sql` yalnız yerelde uygulanmıştır. Production yoktur. Yeni uygulama health/leaderboard okumaları bu migration'a bağımlıdır: yetkilendirilmiş ortamda önce migration, ardından uygulama yayını gerekir. Eski uygulama bu eklemeyle uyumludur. Uzak ortamın migration'ını bu rapor uygulanmış saymaz.

Kalıcı ağ sayaçları: leaderboard sayfası ve API aynı HMAC kovasında 60/dakika; health ayrı 120/dakika. Vercel dışı hostlar güvenilmeyen forwarding header yerine ortak kova kullanır. Başka proxy'ye geçilirse güvenilir IP adaptörü ayrıca tasarlanıp doğrulanmalıdır. Public Data API'nin mevcut profil okuma yetkisi bu HTTP sınırına dahil değildir; bu sınır DDoS koruması veya Supabase doğrudan erişim kotası olarak sunulmaz. Anon profil erişimi ürünün public leaderboard sözleşmesidir; private maç ve çözüm yetkisi açılmaz.

CSP her istekte nonce üretir, script çalışmasını bu nonce'a bağlar; Supabase HTTPS/WSS bağlantıları yalnız yapılandırılmış origin'e açıktır. React style attribute'ları için `style-src 'unsafe-inline'` korunur; production script politikasında `unsafe-inline`/`unsafe-eval` yoktur. HTML yanıtları private/no-store; nonce'lu HTML ortak cache'e konulmaz. Yerel fontlar kullanılır. Vercel preview toolbar/script eklenirse politika gevşetilmeden önce gerekliliği ayrıca değerlendirilir.

### Gözlem ve olay inceleme

Uygulama komutları stdout'a JSON `api_request` olayları yazar: sunucunun ürettiği requestId, sabit operation, status, doğrulanmış hata kodu, durationMs. Response `X-Request-ID` hata gövdesindeki ID ile aynıdır. Body, query, davet URL'si, cookie, JWT, parola ve ham IP loglanmaz. Next development request logu token'lı invite yolunu dışlar. Platform erişim loglarının URL saklama davranışı yayın öncesi ayrıca denetlenir; uygulama filtresi platform logunu değiştirmez.

İnceleme sırası: health 200/ready → private engine_health / cron.job_run_details → gecikmiş maç sayısı → abort/forfeit dağılımı → settlement tutarlılığı. Admin sorgularını kullanıcı DTO'suna veya public health'e ekleme:

```sql
select count(*) as due_matches from public.matches
where status in ('waiting','countdown','playing','between_rounds')
  and next_transition_at < clock_timestamp()-interval '2 seconds';
select ended_reason,count(*) from public.matches
where finished_at>clock_timestamp()-interval '1 day' group by ended_reason;
select s.match_id from private.match_settlements s
left join private.xp_ledger l on l.match_id=s.match_id
group by s.match_id having count(l.user_id)<>2;
select l.user_id from private.xp_ledger l join public.match_players p
  on p.match_id=l.match_id and p.user_id=l.user_id
where p.xp_earned<>l.amount;
```

429, bozuk input veya dependency kesintisi gerçek sonuç/XP'yi geri almaz. Health 503 ise önce Cron ve DB erişimi onarılır; tick kaybında engine'in infrastructure abort kuralı korunur. Dışarıya hata ayrıntısı, çözüm veya SQL logu açılmaz.

### Rollback ve yedekten dönüş kapısı

Uygulama hatasında son doğrulanmış deployment'a dön; yeni admission migration'ını ve ledger'ı silme. DB hatasında yeni başlangıçları bakım penceresinde durdur, aktif maçları güvenli kapat, snapshot ve migration listesini koru. İzin genişleten veya sonuçları silen acil SQL uygulama. Düzeltmeyi ileri migration ile dosyala, önce ayrı yerel/staging hedefte doğrula.

Free planın otomatik backup/PITR sağladığı varsayılmaz. Yayın öncesinde platformun güncel ücretsiz yedek seçeneklerini doğrula, resmî CLI ile güvenli konuma roles/schema/data dump al; sırları ve Auth verisini Git dışında erişimi kısıtlı sakla. Geri yüklemeyi mevcut geliştirme/production üzerine yapma: ayrı boş yerel/staging hedefte belgelenen sırayla roles → schema → data yükle, migration geçmişi/ACL/RLS/ledger ve health'i karşılaştır, sonra gerçek Auth/iki oturum smoke'u çalıştır. Storage nesneleri, platform Auth sağlayıcı ayarları ve secret'lar SQL dump ile otomatik geri gelmez. Temiz migration+seed testi bir veri yedeğini geri yükleme testi değildir. Hosted staging geri yükleme tatbikatı henüz yapılmadı; üretim kapısı açık kalır.

### Faz 8 geri yükleme tatbikatından doğrulanan ayrıntılar

7 Kasım 2026: kullanıcı uygulama verisi yedeğini korumalı Git dışı klasöre almayı onayladı; Auth verisini özellikle hariç tuttu. Uzak `public/private` şeması, özel NOLOGIN roller ve uygulama verisi ayrı rastgele yerel Supabase DB'ye yüklendi. Bu ortamda 590 DB testi geçti ve geçici DB kaldırıldı. Bu kanıt Auth hesaplarının/parola özetlerinin, platform SMTP/OAuth secret'larının veya Storage nesnelerinin geri yüklenmesini kapsamaz. Auth olmadan production hesap kurtarma doğrulanmış sayılmaz; gerekirse ileride ayrı açık yetkiyle planlanır.

Kaynak ile aynı rol oluşturucusunu koru: uygulama NOLOGIN rollerini `postgres` oluşturur; yönetilen role/parameter ayarları yerel `supabase_admin` ile ayrı uygulanır. Aksi halde rol ADMIN seçeneği ve test/işletim yetkileri değişebilir. Dump'taki yönetilen GRANT ON PARAMETER komutlarını normal postgres altında zorlamaya çalışma.

Hedefin varsayılan tablo ve fonksiyon izinleri kaynakla aynı olmayabilir. Şema yüklemeden önce, **dump'ı oluşturacak rolün** public tablo ve fonksiyon default GRANT'larını anon/authenticated/service_role için kaldır; global varsayılan PUBLIC function EXECUTE'ı da kaldır. Sonra dump'ın açık ACL/GRANT'larını uygula. Yalnız tablo default'larını kaldırmak server-only RPC'leri istemciye açabilir. Geri yükleme sonrası `has_function_privilege`, RLS ve tam DB paketiyle doğrula. Bu hazırlık yalnız yeni boş hedefe uygulanır; mevcut geliştirme/production üzerinde çalışma.

Realtime `match_broadcast_read`/`match_presence_write` politikaları ve iki Cron işi, public/private dump dışında kalan platform yapılandırmasıdır; tekrar kurup gerçek izin testleriyle doğrula. Cron advance 1 saniye, maintenance UTC günlük; history retention SQL'i repository'den alınır. Auth hariç tatbikatta sadece ayrı DB'de FK'leri tamamlayan, parolası olmayan sentetik placeholder kimlikler kullanıldı. Bunlar gerçek hesap yedeği veya giriş kanıtı değildir. Test pgTAP uzantısı yalnız geçici doğrulama hedefinde kuruldu.

Ayrı boş-hedef kurulumuna ek olarak dolu sentetik round-trip de geçti: yalnız restore test DB'sinde 16 maç/11 cevap/20 ledger oluşturulup public/private data dump alındı, yine yalnız bu geçici hedef temizlenerek veri geri yüklendi. Profil/maç/ledger fingerprint eşitliği doğrulandı. Böylece uzak ortamda o anda maç/ledger sıfır olmasının test boşluğu da sentetik veriyle sınandı. Auth verisi hiçbir dump'a dahil edilmedi.
