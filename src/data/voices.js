// Personajes de voz de los diálogos. Los alias son los mismos que acepta la función
// tts-generate (supabase/functions/tts-generate/tts.ts) y el validador de contenido.
// `pitch` solo se usa con la voz del dispositivo cuando no hay audio en línea.
export const VOICE_INFO = {
  nova: { label: 'Mujer', emoji: '👩', color: '#7C3AED', pitch: 1.1 },
  onyx: { label: 'Hombre', emoji: '👨', color: '#2563EB', pitch: 0.8 },
  woman_uk: { label: 'Mujer (UK)', emoji: '👩‍🦰', color: '#DB2777', pitch: 1.0 },
  man_uk: { label: 'Hombre (UK)', emoji: '🧔', color: '#0D9488', pitch: 0.85 },
  young_woman: { label: 'Chica', emoji: '👧', color: '#EA580C', pitch: 1.25 },
  young_man: { label: 'Chico', emoji: '👦', color: '#16A34A', pitch: 1.05 },
  woman_us2: { label: 'Mujer', emoji: '👩‍💼', color: '#9333EA', pitch: 1.0 },
  man_us2: { label: 'Hombre', emoji: '👨‍💼', color: '#1D4ED8', pitch: 0.9 },
  senior_woman: { label: 'Mujer mayor', emoji: '👵', color: '#BE185D', pitch: 0.95 },
  senior_man: { label: 'Hombre mayor', emoji: '👴', color: '#475569', pitch: 0.7 },
}

export function voiceInfo(alias) {
  return VOICE_INFO[alias] ?? VOICE_INFO.nova
}
