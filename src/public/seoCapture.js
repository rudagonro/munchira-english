// Solo se usa durante el prerender (sin navegador): guarda lo que la página declara en <Seo> para que
// scripts/prerender-public.mjs genere el HTML estático con exactamente el mismo título y descripción que la app.
export function captureSeo(seo) {
  if (typeof window === 'undefined') globalThis.__munchiraSeo = seo
}
