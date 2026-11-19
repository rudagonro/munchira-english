# Logo NIVelo para TikTok

Concepto: tres barras que suben = **nivel** (A1 → C2). La barra ámbar es la meta. La palabra **NIV**elo usa la misma tipografía de la app (Inter ExtraBold, tracking −0,04 em): "NIV" en morado/lila y "elo" en tinta/blanco.

| Archivo | Uso |
| --- | --- |
| `perfil-1080.png` | Foto de perfil. TikTok la recorta en círculo; el arte ya queda dentro. |
| `marca-de-agua-1080x1920.png` | Capa transparente. Súbela a CapCut como sticker/overlay sobre todo el video. |
| `intro-1080x1920.mp4` | Intro de 1,8 s para empezar el video (sin audio). |
| `cierre-animado-1080x1920.mp4` | Cierre de 3,2 s con llamada a la acción. |
| `cierre-1080x1920.png` | Cierre estático (portada o último cuadro). |
| `logo-*.svg` | Vectores: ícono, palabra (clara, oscura, blanca) y lockup. Texto convertido a trazos: no necesitan la fuente. |
| `vista-previa.png` | Tablero con zonas seguras, paleta y tamaños. |

## Zonas seguras (1080×1920)
- Arriba, ~170 px: pestañas y estado de TikTok. No poner nada.
- Derecha, ~140 px (desde la mitad): botones de like, comentarios y compartir.
- Abajo, ~480 px: usuario, texto del video y música.
- La marca de agua va arriba a la izquierda, bajo las pestañas.

## Reglas
- Fondo oscuro o video: versión `dark` (NIV lila + elo blanco). Fondo claro: versión `light`.
- Mínimo 24 px de ancho para el ícono; la marca de agua nunca a más de 92 % de opacidad ni a menos de 80 %.
- No estirar, no girar, no cambiar el color de la barra ámbar.

## Video de bienvenida (`video-bienvenida/`)
- `bienvenida-v1-limpio.mp4`: el clip de Gemini sin el logo inventado (recortado), a 1080×1920, 30 fps y audio a −14 LUFS aprox. Úsalo si vas a montar tú en CapCut.
- `bienvenida-v1-completo.mp4`: lo anterior + marca de agua NIVelo arriba a la izquierda + cierre animado con llamada a la acción.
- Limitaciones: Gemini grabó subtítulos en inglés dentro del video y no se pueden quitar sin dañar la imagen. Para una versión sin ellos, hay que volver a generar el clip pidiendo "sin subtítulos".
- Recuerda etiquetar el video como contenido generado por IA al publicarlo en TikTok.
