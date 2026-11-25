# Plantillas de correo de Supabase Auth (Munchira English)

Textos en español para los correos de acceso. **Aplicadas en producción el 21 de noviembre de 2026** con SMTP propio (Resend). Antes estaban bloqueadas:
Supabase bloquea el cambio de plantillas en el plan gratuito mientras se use su correo por
defecto (error `entitlement_required`, 21 de noviembre de 2026). Ese correo por defecto además
solo envía 2 correos por hora, así que antes de abrir el registro a más gente hace falta un SMTP propio.

## Cómo aplicarlas
1. Configurar SMTP propio (por ejemplo Resend, remitente `english@munchira.com`) en
   Supabase → Authentication → Emails → SMTP Settings.
2. Aplicar cada plantilla y su asunto (`subjects.json`) con la Management API
   (`PATCH /v1/projects/<ref>/config/auth`, campos `mailer_templates_<nombre>_content` y
   `mailer_subjects_<nombre>`), o pegarlas en Authentication → Emails → Templates.
3. Mantener las variables de Supabase tal cual: `{{ .ConfirmationURL }}`, `{{ .NewEmail }}`, `{{ .Token }}`.

Los registros MX, SPF y DKIM de `munchira.com` que ya existen (reenvío de `english@munchira.com`)
no deben modificarse; los del servicio de envío van aparte.

## Confirmación de cuenta con código (24 de noviembre de 2026)
La plantilla `confirmation.html` envía el código de 6 dígitos (`{{ .Token }}`) y no un enlace, porque la pantalla «Confirma tu correo» de /register usa `verifyOtp`. En Supabase deben coincidir: longitud del código 6 (`mailer_otp_length`) y caducidad 600 s (`mailer_otp_exp`, 10 minutos, que también afecta a la caducidad del enlace de recuperación). Tras cambiar una plantilla, Supabase tarda unos minutos en servir la nueva: comprobarlo con un envío de prueba antes de darla por buena. `recovery`, `magic_link`, `invite` y `email_change` siguen con enlace; la app no usa magic link ni reautenticación.
