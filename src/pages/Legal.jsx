import { Link } from 'react-router-dom'
import './legal-terms.css'

const CONTACT = 'english@munchira.com'
const UPDATED = '24 de noviembre de 2026'

function Page({ title, children }) {
  return (
    <div className="legal">
      <Link className="legal-back" to="/">← Volver al inicio</Link>
      <h1>{title}</h1>
      <p className="legal-meta">Munchira English · Última actualización: {UPDATED}</p>
      {children}
      <h2>Contacto</h2>
      <p>
        Para cualquier consulta sobre este documento o para ejercer tus derechos escribe a{' '}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </div>
  )
}

export function Privacy() {
  return (
    <Page title="Política de privacidad">
      <p>
        En Munchira English (“Munchira”, “nosotros”) tratamos tus datos solo para que puedas aprender inglés y
        para que tu docente, si tienes uno asignado, pueda acompañar tu progreso. Esta política explica
        qué datos recogemos, para qué, con quién los compartimos y qué derechos tienes.
      </p>

      <p>
        <strong>Responsable:</strong> Munchira English es responsable de tus datos, es decir, decide cómo se
        recogen y se usan. <strong>Base legal:</strong> tratamos los datos de tu cuenta porque son necesarios
        para darte el servicio que aceptas en los <Link to="/terminos">Términos de uso</Link>.
      </p>

      <h2>1. Datos que recogemos</h2>
      <ul>
        <li><strong>Cuenta:</strong> nombre, correo electrónico y contraseña. La contraseña se guarda cifrada y nunca la vemos. Si entras con Google recibimos tu nombre y correo.</li>
        <li><strong>Aprendizaje:</strong> resultados del diagnóstico, nivel asignado, módulos y lecciones completados, notas de los quizzes, vocabulario repasado y fechas de repaso.</li>
        <li><strong>Uso del audio:</strong> un contador diario de peticiones y caracteres para evitar abusos. No guardamos tu voz: la app no usa tu micrófono.</li>
        <li><strong>Datos técnicos:</strong> registros básicos de acceso (por ejemplo dirección IP y tipo de navegador) que generan de forma automática los servicios de hosting y autenticación, con fines de seguridad.</li>
      </ul>
      <p>No pedimos datos de pago, documentos de identidad ni datos sensibles, y no te pedimos que los escribas.</p>

      <h2>2. Para qué usamos tus datos</h2>
      <ul>
        <li>Crear y mantener tu cuenta e iniciar tu sesión.</li>
        <li>Calcular tu nivel, guardar tu progreso y programar tus repasos.</li>
        <li>Mostrar tu avance a tu docente asignado o a la administración de Munchira.</li>
        <li>Proteger el servicio frente a abusos y mejorar los contenidos con estadísticas agregadas.</li>
      </ul>
      <p>No vendemos tus datos ni los usamos para publicidad ni para perfilarte con fines comerciales.</p>

      <h2>3. Quién puede ver tus datos</h2>
      <ul>
        <li><strong>Tú</strong>, siempre.</li>
        <li><strong>Tu docente</strong>, solo si te ha sido asignado: ve tu nivel, notas, vocabulario y actividad reciente.</li>
        <li><strong>Administración de Munchira</strong>, para dar soporte y gestionar el servicio.</li>
        <li><strong>Otros estudiantes: no.</strong> Las reglas de la base de datos impiden que un estudiante lea datos de otro.</li>
      </ul>

      <h2>4. Proveedores que procesan datos por nosotros</h2>
      <table>
        <thead>
          <tr><th>Proveedor</th><th>Para qué</th><th>Qué recibe</th></tr>
        </thead>
        <tbody>
          <tr><td>Supabase</td><td>Base de datos, autenticación y almacenamiento</td><td>Cuenta y progreso de aprendizaje</td></tr>
          <tr><td>Vercel</td><td>Alojamiento de la aplicación web</td><td>Datos técnicos de la conexión</td></tr>
          <tr><td>Google</td><td>Inicio de sesión opcional con Google</td><td>Tu identidad de Google al iniciar sesión</td></tr>
          <tr><td>ElevenLabs</td><td>Generar el audio de las lecciones</td><td>Solo el texto del curso que se lee en voz alta; ningún dato personal</td></tr>
        </tbody>
      </table>
      <p>
        Algunos de estos proveedores pueden tratar datos fuera de tu país. Los usamos porque aplican medidas
        de seguridad reconocidas. Si el audio del servidor no está disponible, tu navegador puede leer el
        texto con su propia voz del sistema; en ese caso el texto no sale de tu dispositivo.
      </p>

      <h2>5. Cuánto tiempo guardamos los datos</h2>
      <p>
        Mientras tu cuenta esté activa. Si pides eliminarla, borramos tu cuenta y tu progreso. Algunos
        registros técnicos de seguridad pueden conservarse un tiempo limitado en los proveedores.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes pedir acceso, rectificación, eliminación, limitación u oposición al tratamiento de tus datos, y
        recibir una copia de ellos. Escríbenos y respondemos en un plazo razonable. Si crees que tus
        derechos no se respetan, también puedes acudir a la autoridad de protección de datos de tu país.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Usamos conexiones cifradas, contraseñas cifradas, reglas de acceso por fila en la base de datos y
        calificación de los quizzes en el servidor. Ningún sistema es infalible: si detectamos una brecha
        que te afecte, te lo comunicaremos.
      </p>

      <h2>8. Menores de edad</h2>
      <p>
        Munchira está pensado para personas de 14 años o más. Si eres menor de edad, usa la aplicación con
        permiso y supervisión de tu madre, padre o tutor. Si sabemos que una persona menor de 14 años
        creó una cuenta sin autorización, la eliminaremos.
      </p>

      <h2>9. Cookies y almacenamiento local</h2>
      <p>
        Usamos solo almacenamiento esencial en tu navegador para mantener tu sesión iniciada. No usamos
        cookies de publicidad ni de seguimiento de terceros.
      </p>

      <h2>10. Cambios</h2>
      <p>
        Si cambiamos esta política de forma importante, actualizaremos la fecha de arriba y, si es
        necesario, te lo avisaremos dentro de la aplicación.
      </p>
    </Page>
  )
}

export function Terms() {
  return (
    <Page title="Términos de uso">
      <p className="terms-lead">
        Estos términos explican las reglas para usar Munchira English. Al crear una cuenta o usar el
        Servicio los aceptas; si no estás de acuerdo, por favor no lo uses.
      </p>

      <aside className="terms-summary" aria-label="Resumen">
        <h2>En pocas palabras</h2>
        <ul>
          <li>Munchira te ayuda a aprender inglés paso a paso; no es una certificación oficial.</li>
          <li>Necesitas tener 14 años o más y dar datos verdaderos.</li>
          <li>Tu cuenta es personal y los contenidos son solo para tu estudio.</li>
          <li>Hoy el Servicio es gratuito; nunca te cobraremos sin tu aceptación.</li>
        </ul>
        <p className="terms-summary-note">Este resumen no sustituye el texto completo.</p>
      </aside>

      <nav className="terms-toc" aria-label="Contenido">
        <h2>Contenido</h2>
        <ol>
          <li><a href="#que-es">Qué es Munchira English</a></li>
          <li><a href="#definiciones">Definiciones</a></li>
          <li><a href="#cuenta">Tu cuenta</a></li>
          <li><a href="#aprendizaje">Cómo funciona el aprendizaje</a></li>
          <li><a href="#precio">Precio y pagos</a></li>
          <li><a href="#uso">Uso aceptable</a></li>
          <li><a href="#propiedad">Contenidos y propiedad intelectual</a></li>
          <li><a href="#audio">Audio generado</a></li>
          <li><a href="#disponibilidad">Disponibilidad y cambios del Servicio</a></li>
          <li><a href="#cierre">Suspensión y cierre de la cuenta</a></li>
          <li><a href="#responsabilidad">Limitación de responsabilidad</a></li>
          <li><a href="#datos">Datos personales y cookies</a></li>
          <li><a href="#cambios">Cambios en estos términos</a></li>
        </ol>
      </nav>

      <section id="que-es" className="terms-section">
        <h2>1. Qué es Munchira English</h2>
        <p>Munchira English es una plataforma en línea para aprender inglés por niveles, del A1 al C2 del Marco Común Europeo de Referencia. Incluye un diagnóstico de nivel, módulos con lecciones, ejercicios, cuestionarios, audio y repaso de vocabulario.</p>
        <p>El diagnóstico y los resultados son <strong>orientativos</strong>. Munchira <strong>no emite certificaciones oficiales</strong> y no sustituye exámenes como Cambridge, IELTS o TOEFL.</p>
      </section>

      <section id="definiciones" className="terms-section">
        <h2>2. Definiciones</h2>
        <ul>
          <li><strong>“Munchira”, “nosotros”:</strong> el equipo responsable de Munchira English.</li>
          <li><strong>“Servicio”:</strong> el sitio munchira.com, la aplicación y todos sus contenidos.</li>
          <li><strong>“Estudiante”, “tú”:</strong> la persona que crea una cuenta o usa el Servicio.</li>
          <li><strong>“Docente”:</strong> la persona autorizada por Munchira para acompañar el progreso de estudiantes asignados.</li>
          <li><strong>“Contenidos”:</strong> lecciones, ejercicios, cuestionarios, audios, textos, imágenes, diseño y marca.</li>
        </ul>
      </section>

      <section id="cuenta" className="terms-section">
        <h2>3. Tu cuenta</h2>
        <ul>
          <li>Para crear una cuenta debes tener <strong>14 años o más</strong>. Te pedimos tu fecha de nacimiento para comprobarlo. Si eres menor de edad, necesitas el permiso de tu madre, padre o tutor.</li>
          <li>Debes dar datos verdaderos (nombres, apellidos y correo) y mantenerlos actualizados.</li>
          <li>Tu cuenta es personal: no la compartas, vendas ni cedas. Guarda tu contraseña en secreto.</li>
          <li>Eres responsable de la actividad que ocurra en tu cuenta. Si crees que alguien la usó sin permiso, escríbenos de inmediato.</li>
          <li>Puedes entrar con correo y contraseña o con Google; en ambos casos se aplican estos términos.</li>
        </ul>
      </section>

      <section id="aprendizaje" className="terms-section">
        <h2>4. Cómo funciona el aprendizaje</h2>
        <ul>
          <li>Tu nivel inicial se asigna con el diagnóstico y puede cambiar según tu avance.</li>
          <li>Un módulo se considera <strong>completado</strong> cuando obtienes al menos <strong>70%</strong> en su cuestionario. Puedes repetirlo; si ya lo aprobaste, un intento posterior con menor nota no te quita el aprobado.</li>
          <li>Algunos módulos se abren a medida que completas los anteriores.</li>
          <li>Los niveles y contenidos se publican y amplían por etapas.</li>
        </ul>
      </section>

      <section id="precio" className="terms-section">
        <h2>5. Precio y pagos</h2>
        <p>Actualmente Munchira <strong>no cobra</strong> por el uso del Servicio y no te pedimos datos de pago. Si en el futuro ofrecemos planes de pago o suscripciones, publicaremos antes sus precios y condiciones, y nunca te cobraremos sin que lo aceptes de forma expresa.</p>
      </section>

      <section id="uso" className="terms-section">
        <h2>6. Uso aceptable</h2>
        <p>Al usar Munchira te comprometes a no:</p>
        <ul>
          <li>Acceder o intentar acceder a cuentas o datos de otras personas, ni saltarte las protecciones del Servicio.</li>
          <li>Usar bots, scripts o peticiones automáticas para extraer contenidos o generar audio de forma masiva.</li>
          <li>Copiar, revender o redistribuir los Contenidos sin permiso por escrito.</li>
          <li>Publicar o enviar material ilegal, ofensivo, discriminatorio o que vulnere derechos de terceros.</li>
          <li>Suplantar a otra persona o dar información falsa para crear una cuenta.</li>
        </ul>
      </section>

      <section id="propiedad" className="terms-section">
        <h2>7. Contenidos y propiedad intelectual</h2>
        <p>Los Contenidos y la marca Munchira English pertenecen a sus titulares y están protegidos por la ley. Te damos una licencia <strong>personal, no exclusiva e intransferible</strong> para usarlos con fines de estudio mientras tu cuenta esté activa. Esta licencia no te permite usarlos con fines comerciales.</p>
      </section>

      <section id="audio" className="terms-section">
        <h2>8. Audio generado</h2>
        <p>El audio de las lecciones se produce con voces sintéticas y puede tener pequeños errores de pronunciación o entonación. Hay un límite diario de audio por persona para mantener el Servicio disponible para todos. La aplicación no usa tu micrófono ni graba tu voz.</p>
      </section>

      <section id="disponibilidad" className="terms-section">
        <h2>9. Disponibilidad y cambios del Servicio</h2>
        <p>Trabajamos para que Munchira funcione siempre, pero puede haber interrupciones por mantenimiento o fallos de proveedores. Podemos modificar, añadir o retirar contenidos y funciones para mejorar el Servicio.</p>
      </section>

      <section id="cierre" className="terms-section">
        <h2>10. Suspensión y cierre de la cuenta</h2>
        <p>Puedes dejar de usar Munchira y pedir que eliminemos tu cuenta en cualquier momento escribiendo a nuestro correo de contacto. Podemos suspender o cerrar cuentas que incumplan estos términos o pongan en riesgo la seguridad del Servicio o de otras personas.</p>
      </section>

      <section id="responsabilidad" className="terms-section">
        <h2>11. Limitación de responsabilidad</h2>
        <p>Munchira se ofrece “tal cual”, con fines educativos. No garantizamos un resultado concreto de aprendizaje ni que el Servicio esté libre de errores. En la medida permitida por la ley, no respondemos por daños indirectos derivados del uso o la imposibilidad de uso del Servicio. Nada de esto limita los derechos que la ley te reconoce como consumidor.</p>
      </section>

      <section id="datos" className="terms-section">
        <h2>12. Datos personales y cookies</h2>
        <p>Cómo tratamos tus datos se explica en la <Link to="/privacidad">Política de privacidad</Link>. Solo usamos almacenamiento necesario para que el Servicio funcione; no usamos cookies de publicidad ni de seguimiento.</p>
      </section>

      <section id="cambios" className="terms-section">
        <h2>13. Cambios en estos términos</h2>
        <p>Podemos actualizar estos términos. Cambiaremos la fecha de “Última actualización” y, si el cambio es importante, te avisaremos dentro de la aplicación. Si sigues usando Munchira después del aviso, entendemos que aceptas la nueva versión.</p>
      </section>
    </Page>
  )
}
