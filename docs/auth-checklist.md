# Faz 2 — Auth ve profil doğrulaması

## Tamamlanan yerel akış

2 Kasım 2026'da Docker Desktop başlatıldı. Yeni yerel Supabase veritabanına üç migration ve seed sıfırdan uygulandı; 25 pgTAP testi geçti. Mevcut test profilleri varken de fixture kapsamlı sorgularla aynı 25 test tekrar geçti.

`pnpm test:auth:local`, çalışan yerel Supabase'den yalnızca yerel bağlantı ayarlarını alır, cloud URL'lerini reddeder ve 3001 portunda ayrı build diziniyle Next.js başlatır. `.env.local` değişmez; mevcut 3000 portundaki uygulama korunur. Test boyunca prod Auth bypass'ı veya admin doğrulama hilesi yoktur. Gerçek yerel Auth ve Mailpit üzerinden şunlar geçti:

1. E-posta/parola kaydı ve doğrulama e-postasının yerel test kutusuna ulaşması.
2. Aynı tarayıcıda e-postanın gerçek doğrulama bağlantısı ve PKCE callback'i.
3. Kullanıcı adı/görünen ad kaydı; yenilemede profil ve oturumun korunması.
4. Çıkış sonrası korunan profile erişimde girişe yönlendirme; yeniden parola ile giriş.
5. Recovery e-postası, gerçek bağlantıyla reset ekranı ve yeni parola kaydı.
6. Eski parolanın reddi ve yeni parolayla giriş.

Test yalnızca sentetik `dd-auth-*` hesapları oluşturur. Bu kullanıcılar ve e-postalar yerel Docker verisinde kalır; uzak projeye veya gerçek alıcılara gönderilmez. Trace/video/screenshot bu Auth testinde kapalıdır. Test sunucusu sonunda kapanır; Next.js'in test dizini için değiştirdiği tip yapılandırmaları, arada kullanıcı düzenlemesi yoksa geri yüklenir.

## Bu fazda düzeltilenler

- E-posta sağlayıcısının geçici hatası artık sahte başarılı onay üretmez; genel 503 döner. 429 yanıtında `Retry-After` bulunur. Hesap varlığına ilişkin yanıtlar nötr kalır.
- Kayıt onay ekranında doğrulama e-postasını tekrar gönderme eklendi.
- Güvenli `next` yolu login → signup → callback/resend boyunca korunur. Ham davet token'ı veya dış hedef taşınmaz.
- Parola ve kullanıcı adı alanlarında erişilebilir etiket ile yardım metni ayrıldı.
- Yerel callback allowlist'i kodun kullandığı URL encoding'i ve izole test origin'ini kapsar.

## Dış ortamda açık kalanlar

Son kontrolde geliştirme projesinde e-posta açık, otomatik e-posta doğrulama kapalı, **GitHub sağlayıcısı açık**. Gerçek GitHub OAuth testi geçti; uzak SMTP/e-posta teslimi testi henüz yapılmadı. AC-01'in üretim e-posta kısmı açıktır.

GitHub kurulumu ve doğrulama kaydı:

**İlerleme:** Kullanıcının açık onayıyla 2 Kasım 2026'da [Debug Duel OAuth uygulaması](https://github.com/settings/applications/3985598) oluşturuldu. Callback aşağıdaki Supabase adresidir; wildcard ve Device Flow kapalıdır. Ürün sahibi secret oluşturma/girme ve sağlayıcıyı etkinleştirme işlemini tamamladı. Gerçek girişte yalnızca e-posta adreslerini salt okunur görme (`user:email`) istendi; kullanıcı bu erişimi ayrıca onayladı. Supabase → `/profile` dönüşü, refresh, logout sonrası korunan sayfa reddi ve mevcut yetkiyle tekrar giriş doğrulandı. Kullanıcının profil adı/adı doldurulmadı; tercih kendisine bırakıldı.

1. Mevcut [GitHub OAuth uygulamasını](https://github.com/settings/applications/3985598) kullan; ikinci uygulama oluşturma. Homepage: `http://localhost:3000`; Authorization callback: `https://hvqklcqyjqjwwwcsioch.supabase.co/auth/v1/callback`.
2. [Debug Duel Auth sağlayıcıları](https://supabase.com/dashboard/project/hvqklcqyjqjwwwcsioch/auth/providers) ekranında GitHub'ı etkinleştir; Client ID ve Client Secret'ı doğrudan bu panelde gir. Secret sohbetten veya repository'den geçirilmez. Repository erişim kapsamı istenmez.
3. [URL Configuration](https://supabase.com/dashboard/project/hvqklcqyjqjwwwcsioch/auth/url-configuration) ekranında Site URL `http://localhost:3000`; uygulamanın kullandığı kesin callback hedeflerini ekle:

```text
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=%2Fprofile
http://localhost:3000/auth/callback?next=%2Fplay
http://localhost:3000/auth/callback?next=%2Finvite
http://localhost:3000/auth/callback?next=/reset-password
http://localhost:3000/auth/confirm
```

4. Uzak Auth parola minimumunu 12 ve e-posta doğrulamasını açık tut. `supabase/config.toml` uzak ayarları otomatik değiştirmez.
5. GitHub butonuyla gerçek hesaptan giriş, yenileme ve çıkışı dene. Uzak e-posta doğrulama/recovery'yi izin verilen gerçek test adresiyle tamamla. Ücretsiz SMTP limitleri ve alıcı kısıtları nedeniyle halka açık e-posta gönderimini test etmeden hazır ilan etme; ücretli SMTP veya plan ekleme.

Resmî kaynaklar: [GitHub Auth](https://supabase.com/docs/guides/auth/social-sign-in/auth-github), [e-posta/parola](https://supabase.com/docs/guides/auth/passwords), [resend](https://supabase.com/docs/reference/javascript/auth-resend).


## Faz 8 gerçek uzak kontrol — 7 Kasım 2026

Email/GitHub etkin, Confirm email açık. Minimum parola uzunluğu panelde 12 olarak kaydedildi ve yeniden açılan panelde doğrulandı. Custom SMTP yok; mevcut ücretsiz varsayılan göndericiyle kullanıcının test e-postası gerçekten ulaştı ve hesap doğrulandı. Kullanıcı maili farklı tarayıcı/profilde açtığı için PKCE otomatik oturum dönüşü başarısız oldu; bu, doğrulamanın yapılmadığı anlamına gelmez. Parola ile giriş ve recovery kullanıcı adımları henüz sonuçlanmadı; parolalar/bağlantılar sohbete veya repo'ya alınmaz.

URL Configuration panelinin redirect listesi boş bulundu. Yukarıdaki altı kesin localhost URL'si forma girildi; Save otomatik incelemede ayrıca açık onay gerektiği için reddedildi. Somut liste/ekran görüntüsüyle kullanıcıya onay soruldu; kayıt henüz yapılmadı. Onay geldikten sonra kaydet, yeniden panelden ve gerçek recovery dönüşünden doğrula. Varsayılan Auth login 30 istek/5dk ve diğer korumalar değiştirilmedi. Public SMTP teslim garantisi ve üretim URL/SMTP/OAuth yapılandırması Faz 9'un ayrı kontrolleridir.
