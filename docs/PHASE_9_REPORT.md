# Faz 9 — üretim yayını

## Kapanış — 8 Kasım 2026

Faz 9 ücretsiz pilot yayın kapsamı tamamlandı. [Canlı uygulama](https://debug-duel-burakkyildiz.vercel.app) ayrı üretim veritabanını kullanır. Kullanıcı gerçek iki cihaz maçını ve son yeni parola ile giriş testini başarılı olarak doğruladı. Ücretli kaynak açılmadı; gerçek hesaplar ve XP korunur.

| Alan | Doğrulanan sonuç |
| --- | --- |
| Uygulama kodu | `37fb0d30da2986833c1910417d3faaecf0100bc4` |
| Canlı deployment | `dpl_xftmNGCcc7JMgSABXpbozLu3g8Qu`, READY, Production, fra1 |
| CI | [42454840514](https://github.com/burakkyildiz/DebugDuel/actions/runs/42454840514), quality/database başarılı; Auth, Practice, match ve load adımları geçti |
| Supabase üretim | `debug-duel-prod`, `nvpqjmwurmeupkbhozrn`, Frankfurt, ücretsiz |
| Veritabanı | 21 migration, 30 soru; üretimde 590 rollback DB testi; aktif saniyelik Cron ve günlük bakım |
| Vercel | Hobby Active, Node24, frozen-lockfile, Next.js/webpack; 7 env yalnız Production |
| Gerçek Auth | GitHub consent/callback/profil/refresh/logout/tekrar giriş; e-posta teslimi/doğrulama/parola girişi; yeni recovery ve yeni parola ile giriş |
| Gerçek oyun | Misafir Practice doğru cevap/reload; iki fiziksel cihaz ve iki farklı hesapla üç tur, timeout, sonuç/XP/ledger |

## Ortamlar ve yetki

Geliştirme `debug-duel` / `hvqklcqyjqjwwwcsioch` olarak ayrı kalır. Kullanıcı aynı organizasyonda ücretsiz üretim projesini açıkça onayladı; cost sorgusu aylık0 USD döndürdü. Resmî CLI2.122.0 ile dry-run sonrası 21 migration ve soru seed'i yeni boş üretime uygulandı. Geliştirme dump'ı veya Auth verisi taşınmadı. 590 test rollback içinde geçti; test Auth fixture'ları ve pgTAP kalmadı.

Vercel takım `team_krqOd5IVMM0LyPh0MIcE6Fco`, proje `prj_d67hDYIsOi8QR7swowQObAMJ33AP`. Kullanıcı GitHub entegrasyonuna yalnız DebugDuel deposunu verdi. Preview otomatik deploy kapalı; production DB/secret Preview'a verilmedi. Preview-dev entegrasyonu yapılmadı; bu kapalı ortamın ilerideki işi olarak kalır. Otomatik domain ataması kapalı tutulur; test edilmiş build açık kapsam yetkisiyle promote edilir.

Kullanıcı dört private secret'ı doğrudan panelden kendisi girdi. decrypt=false metadata ile dört sensitive alan, iki public encrypted Config ve site URL plain Config doğrulandı; yedisi yalnız Production. Private değerler açılmadı, sohbete/Git'e yazılmadı. Git dışı `.local-backups/phase9-config/vercel-production.env` 0600; Supabase server key içermez.

İlk build/promotion ve sonraki düzeltme commit/push/CI/production/iki şablon için açık kullanıcı onayları alındı. Önceki otomatik inceleme redleri izin yerine kullanılmadı: private anahtarlar kullanıcıca girildi; korumalı deployment için 23 saatlik paylaşım URL'si oluşturulmadı, mevcut yetkili tarayıcı oturumu kullanıldı.

## Auth ve e-posta düzeltmesi

Üretimde minimum parola12, e-posta doğrulama açık, Site URL canonical HTTPS ve altı kesin callback adresi kayıtlıdır; wildcard yok. Ayrı production GitHub OAuth App4002079 kullanıcıca oluşturuldu, credential'lar doğrudan Supabase'e girildi. Enabled switch kullanıcı onayıyla kaydedildi. Kullanıcı yalnız user:email salt okunur consent verdi; geliştirme App3985598 korunur.

Gönderen `debug.duell@gmail.com`, SMTP smtp.gmail.com:465, sender name Debug Duel. Kullanıcı 2FA açık hesapta uygulama parolasını kendisi oluşturup doğrudan Supabase'e kaydetti. Panel custom SMTP açık/stored password hidden olarak doğrulandı; parola okunmadı. Kayıt e-postası gerçek gelen kutusuna ulaştı ve hesap doğrulandı.

İlk telefon signup'ında hesap doğrulandığı halde otomatik oturum dönüşü generic link error verdi (confirmation_sent06:13:30 UTC, email_confirmed06:14:21 UTC, ilk kontrol last_sign_in null). Kullanıcı yalnız telefonda açtığını söyledi; farklı tarayıcı kesin kök neden olarak ispatlanmadı. Kullanıcı ardından parolasıyla giriş yapıp profilini tamamladı.

`37fb0d3` callback düzeltmesi mevcut OAuth code/PKCE yolunu korur; email/signup/recovery için tek kullanımlık token_hash doğrulaması ekler. Tek proof, type/uzunluk, güvenli next, profil kurulumu ve recovery yetki sınırları denetlenir; signup proof reset-password next'iyle recovery marker kazanamaz. Dev loglarında Auth credential URL'leri dışlanır. İki HTML şablonu token_hash/type kullanır.

82 unit, strict TypeScript ve production build geçti. Gerçek yerel Auth E2E (1/1,9.7s) signup/recovery öncesi cookie'leri silerek verifier olmadan doğrulama, profil, refresh, logout, eski parola reddi ve yeni parola girişini sınadı. Hedefli ESLint geçti; tam yerel lint0 hata, yalnız Git dışı eski restore scriptinde unused-import uyarısı verdi. CI temiz geçti. Odaklı güvenlik incelemesinde proof/type/redirect/recovery/profile/OAuth/logging kapsamında doğrulanmış yeni bulgu yok; tüm güvenlik risklerinin yokluğu iddia edilmez.

CI tamamlandıktan sonra aktif maç0 iken onaylanan37fb deployment promote edildi; canonical deployment sorgusu aynı SHA'yı, health200/ready sonucunu doğruladı. Ardından Confirm sign up ve Reset password subject/body panelden kaydedildi ve yeniden açıldı: repository HTML, token_hash/type ve disabled Save görüldü. CLI2.122 diff yalnız subject gösterdiği için body yayını CLI üzerinden varsayılmadı. SMTP credential'ı değişmedi.

Kullanıcı en yeni production recovery e-postası → yeni parola kaydı → yeni parolayla giriş zincirini **“tamam basarili”** diye doğruladı. Salt okunur kontrol confirmed=true, son giriş **2026-11-08 06:59:00 UTC**, profil70 XP/1 maç ve ledger70 değerlerinin korunduğunu gösterdi. `recovery_sent_at` null; bu alan veya parola hash'i bağımsız recovery kanıtı sayılmadı. Kurtarma başarısı kullanıcı doğrulaması, yeni sign-in metadata'sı ve yerel gerçek Auth regresyonuyla desteklenir. Parola/token alınmadı. Düzeltme sonrası üretimde yeni üçüncü hesap signup otomatik oturumu ayrıca tekrarlanmadı.

Son37fb canlı Chrome kontrolü: @burakgithub profil refresh →20 XP/1 maç korundu; geçmişte tamamlanan maç görüldü; logout → gerçek private maç URL'si login'e yönlendi ve içerik açılmadı; GitHub tekrar giriş → aynı tamamlanmış maça doğru dönüş; profil yeniden20 XP/1 maç. Oturum açık bırakıldı. Bu, kullanıcı şifresinin agent tarafından girildiği bir test değildir.

## İki fiziksel cihaz ve settlement kanıtı

Kullanıcı bilgisayar GitHub ve telefon e-posta hesabıyla giriş/profil kaydını tamamladı. Kontrol2 confirmed hesap/2 profil/2 onboarding gösterdi. Daveti kendi cihazları arasında aktardı, üç tur oynadı ve **“tamam gayet iyi calisiyor simdilik”** dedi. Davet linki alınmadı.

Maç `9ad20d9a-a672-468e-b819-2063b095150e`: finished/completed, üç resolved tur, **1 settlement/2 ledger**. İlk tur45000ms planlı süre sonunda timeout (resolved_after45245ms); sonraki turlar correct_answer (7861ms/5909ms). @burak284 puan/win/70 XP; @burakgithub0 puan/loss/20 XP. Ledger amount, player XP ve profile XP eşleşti; her hesap matches_played1. Health ready ve Cron tick günceldi. Bu motor smoke'u ilk99cf58b deployment'ında yapıldı; yeni e-posta düzeltmesi oyun motorunu değiştirmez. Gerçek hesap/XP/maç temizliği yapılmadı.

Canlı guest Practice: oluşturma → doğru cevap → reload sonrası aynı sonuç. Practice'in profil/maç/ledger oluşturmadığı ilk boş üretimde doğrulandı. Health/leaderboard/home/Practice200, guest history401; private/no-store, CSP nonce, nosniff görüldü. İki HTML nonce'u farklıydı. Sekiz public JS paketinde sb_secret deseni ve üç uygulama sırrı eşleşmesi0; bu dar tarama her sızıntının yokluğu garantisi değildir.

Private-only Realtime ayarı panelde kaydedildi; gerçek public WebSocket CHANNEL_ERROR/denied verdi. Üretimde ayrı üçüncü gerçek hesapla katılımcılık denemesi yapılmadı; bu sınır için590 production rollback DB testi ile yerel/CI katılımcılık testleri vardır. Son runtime hata taraması sonuçsuz/temiz; tüm olası runtime sorunlarının yokluğu iddia edilmez.

## İşletim sınırları ve sonraki işler

- AC-21 iki fiziksel cihaz smoke'u geçti; Faz9 ücretsiz pilot yayını kapanır. Gmail kişisel SMTP kotaları/deliverability sınırları vardır; toplu gönderim veya SLA garantisi yoktur.
- CI20 maç/40 oyuncu yük kanıtı ile Faz8 hosted Supabase Free yük kanıtı, Vercel üzerinde40 oyuncu kapasitesi testi değildir. Vercel gerçek40 oyuncu testi yapılmadı.
- Auth yedeği kullanıcı kararıyla kapsam dışıdır; Faz8 uygulama-only restore590 test kanıtını Auth restore diye sunma. Hosted tam Auth restore tatbikatı yapılmadı; ileride ayrı açık yetki gerekir.
- Preview şu an kapalıdır; dev'e bağlanan Preview gerekirse ayrıca doğrulanır. Gerçek hesap/XP temizliği ertelenmiş ayrı kullanıcı kararıdır; otomatik uygulanmaz.
- Rollback sırasında yeni token_hash şablonlarıyla eski code-only99cf sürümünü eşleştirme. Uyumlu37fb sürümünü koru veya önce eski şablonları geri getirip doğrula; ayrıntı [deployment runbook](deployment.md). DB/ledger silinmez.
- Kapanış belgeleri kod CI'sını değiştirmez. `next-env.d.ts` ve `tsconfig.json` önceden var olan yerel preview değişiklikleri teslim kapsamına eklenmez.
