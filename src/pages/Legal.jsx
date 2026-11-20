import { Link } from 'react-router-dom'

const CONTACT = 'nivelo.english@gmail.com'
const UPDATED = '20 de noviembre de 2026'

function Page({ title, children }) {
  return (
    <div className="legal">
      <Link className="legal-back" to="/login">← Volver</Link>
      <h1>{title}</h1>
      <p className="legal-meta">NIVelo English · Última actualización: {UPDATED}</p>
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
        En NIVelo English (“NIVelo”, “nosotros”) tratamos tus datos solo para que puedas aprender inglés y
        para que tu docente, si tienes uno asignado, pueda acompañar tu progreso. Esta política explica
        qué datos recogemos, para qué, con quién los compartimos y qué derechos tienes.
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
        <li>Mostrar tu avance a tu docente asignado o a la administración de NIVelo.</li>
        <li>Proteger el servicio frente a abusos y mejorar los contenidos con estadísticas agregadas.</li>
      </ul>
      <p>No vendemos tus datos ni los usamos para publicidad ni para perfilarte con fines comerciales.</p>

      <h2>3. Quién puede ver tus datos</h2>
      <ul>
        <li><strong>Tú</strong>, siempre.</li>
        <li><strong>Tu docente</strong>, solo si te ha sido asignado: ve tu nivel, notas, vocabulario y actividad reciente.</li>
        <li><strong>Administración de NIVelo</strong>, para dar soporte y gestionar el servicio.</li>
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
        NIVelo está pensado para personas de 14 años o más. Si eres menor de edad, usa la aplicación con
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
      <p>
        Al crear una cuenta o usar NIVelo English aceptas estos términos. Si no estás de acuerdo, no uses el
        servicio.
      </p>

      <h2>1. Qué es NIVelo English</h2>
      <p>
        Una plataforma para aprender inglés por niveles (A1 a C2 del Marco Común Europeo) con diagnóstico,
        módulos, quizzes, audio y repaso de vocabulario. El diagnóstico y los resultados son
        orientativos: <strong>no son una certificación oficial</strong> ni sustituyen exámenes como
        Cambridge, IELTS o TOEFL.
      </p>

      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Debes dar datos verdaderos y mantener tu contraseña en secreto.</li>
        <li>Eres responsable de la actividad que ocurra en tu cuenta.</li>
        <li>Solo puedes tener una cuenta personal; no la compartas ni la vendas.</li>
        <li>Debes tener 14 años o más; los menores de edad necesitan permiso de su madre, padre o tutor.</li>
      </ul>

      <h2>3. Uso aceptable</h2>
      <p>No está permitido:</p>
      <ul>
        <li>Intentar acceder a cuentas o datos de otras personas, o saltarte las protecciones del servicio.</li>
        <li>Usar bots, scripts o peticiones automáticas para extraer contenido o generar audio de forma masiva.</li>
        <li>Copiar, revender o redistribuir los contenidos del curso sin permiso por escrito.</li>
        <li>Subir o enviar contenido ilegal, ofensivo o que vulnere derechos de terceros.</li>
      </ul>

      <h2>4. Contenidos y propiedad intelectual</h2>
      <p>
        Las lecciones, ejercicios, quizzes, audios, diseño y marca de NIVelo English son de sus titulares.
        Te damos una licencia personal, no exclusiva e intransferible para usarlos con fines de estudio
        mientras tu cuenta esté activa.
      </p>

      <h2>5. Audio generado</h2>
      <p>
        El audio de las lecciones se genera con voces sintéticas. Puede tener errores leves de
        pronunciación o entonación. Existe un límite diario de audio por usuario para mantener el servicio
        disponible para todas las personas.
      </p>

      <h2>6. Disponibilidad y cambios</h2>
      <p>
        Hacemos lo posible por que el servicio funcione siempre, pero puede haber interrupciones por
        mantenimiento o por fallos de terceros. Podemos modificar, añadir o retirar contenidos y funciones.
        Los ciclos cuyo contenido aún no está completo se publican por etapas.
      </p>

      <h2>7. Suspensión y cierre de la cuenta</h2>
      <p>
        Puedes dejar de usar NIVelo y pedir la eliminación de tu cuenta cuando quieras. Podemos suspender
        o cerrar cuentas que incumplan estos términos o pongan en riesgo la seguridad del servicio.
      </p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        NIVelo se ofrece “tal cual”, con fines educativos. No garantizamos un resultado concreto de
        aprendizaje ni que el servicio esté libre de errores. En la medida permitida por la ley, no
        respondemos por daños indirectos derivados del uso o la imposibilidad de uso del servicio. Esto no
        limita los derechos que la ley te reconoce como consumidor.
      </p>

      <h2>9. Datos personales</h2>
      <p>
        El tratamiento de tus datos se describe en la <Link to="/privacidad">Política de privacidad</Link>.
      </p>

      <h2>10. Cambios en los términos</h2>
      <p>
        Podemos actualizar estos términos. Si el cambio es importante, lo avisaremos en la aplicación. Si
        sigues usando NIVelo después, entendemos que aceptas la versión actualizada.
      </p>
    </Page>
  )
}
