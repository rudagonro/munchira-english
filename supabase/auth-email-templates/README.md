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
