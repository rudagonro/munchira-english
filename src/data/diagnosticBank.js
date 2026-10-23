// Bancos de preguntas del examen diagnóstico CEFR, portados del prototipo
// Diagnostico_StepByStep.html validado previamente. 8 preguntas por nivel en
// Gram/Vocab para soportar selección SIN REEMPLAZO (ver bug histórico:
// con solo 4 preguntas por nivel, oscilar entre niveles repetía preguntas
// y el usuario ya conocía la respuesta — invalidaba la medición).

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export const LEVEL_NAMES = {
  A1: 'Principiante',
  A2: 'Básico',
  B1: 'Intermedio',
  B2: 'Intermedio-Alto',
  C1: 'Avanzado',
  C2: 'Maestría',
}

export const bankGV = {
  A1: [
    { q: "She ___ a teacher.", opts: ["is", "are", "am", "be"], correct: 0 },
    { q: "I have two ___.", opts: ["dog", "dogs", "doges", "dogss"], correct: 1 },
    { q: "___ you like coffee?", opts: ["Does", "Do", "Is", "Are"], correct: 1 },
    { q: "This is my ___ (mother's brother).", opts: ["uncle", "aunt", "cousin", "nephew"], correct: 0 },
    { q: "They ___ from Colombia.", opts: ["is", "am", "are", "be"], correct: 2 },
    { q: "What time ___ it?", opts: ["is", "are", "does", "do"], correct: 0 },
    { q: "I ___ a car. I walk to work.", opts: ["have", "haven't", "has", "don't have"], correct: 3 },
    { q: "___ is your name?", opts: ["What", "Who", "Where", "When"], correct: 0 },
  ],
  A2: [
    { q: "Yesterday I ___ to the market.", opts: ["go", "went", "gone", "goes"], correct: 1 },
    { q: "There ___ a lot of people at the party.", opts: ["was", "were", "is", "be"], correct: 1 },
    { q: "He is taller ___ his brother.", opts: ["that", "then", "than", "as"], correct: 2 },
    { q: "I ___ my homework before dinner.", opts: ["finish", "finished", "finishing", "finishes"], correct: 1 },
    { q: "She ___ TV when the phone rang.", opts: ["watch", "watches", "was watching", "watched"], correct: 2 },
    { q: "We are going ___ visit my grandmother.", opts: ["to", "for", "at", "on"], correct: 0 },
    { q: "This is the ___ book I've ever read.", opts: ["good", "better", "best", "goodest"], correct: 2 },
    { q: "He doesn't have ___ money.", opts: ["some", "any", "much money's", "a"], correct: 1 },
  ],
  B1: [
    { q: "If I ___ more time, I would travel more.", opts: ["have", "had", "will have", "has"], correct: 1 },
    { q: "She has been working here ___ 2019.", opts: ["for", "since", "during", "at"], correct: 1 },
    { q: "The report ___ by the manager yesterday.", opts: ["was reviewed", "reviewed", "is reviewing", "reviews"], correct: 0 },
    { q: "I'm not used to ___ up so early.", opts: ["get", "getting", "got", "gets"], correct: 1 },
    { q: "You ___ see a doctor about that cough.", opts: ["should", "would", "must to", "can to"], correct: 0 },
    { q: "By next year, I ___ here for a decade.", opts: ["will work", "will have worked", "work", "worked"], correct: 1 },
    { q: "He apologized ___ being late.", opts: ["for", "of", "about", "to"], correct: 0 },
    { q: "The meeting was postponed ___ the storm.", opts: ["because", "due to", "although", "despite that"], correct: 1 },
  ],
  B2: [
    { q: "Had I known about the meeting, I ___ attended.", opts: ["would", "would have", "will have", "had"], correct: 1 },
    { q: "The proposal needs to be looked ___ before Friday.", opts: ["at", "into", "for", "on"], correct: 1 },
    { q: "By the time we arrived, the show ___.", opts: ["had already started", "already started", "has already started", "was already starting"], correct: 0 },
    { q: "His argument was completely ___ — full of contradictions.", opts: ["coherent", "incoherent", "cohesive", "credible"], correct: 1 },
    { q: "She insisted ___ paying for dinner.", opts: ["on", "for", "to", "in"], correct: 0 },
    { q: "Not only ___ late, but he also forgot the documents.", opts: ["he was", "was he", "he is", "is he"], correct: 1 },
    { q: "The new policy ___ widespread criticism.", opts: ["has drawn", "has draw", "draws to", "is drawing to"], correct: 0 },
    { q: "It's about time you ___ responsibility for your actions.", opts: ["take", "took", "will take", "taking"], correct: 1 },
  ],
  C1: [
    { q: "Scarcely ___ the announcement made when the room erupted.", opts: ["had", "was", "did", "has"], correct: 0 },
    { q: "The committee's decision was met with ___ disapproval from staff.", opts: ["overwhelming", "overwhelmed", "overwhelm", "overwhelmingly"], correct: 0 },
    { q: "It's high time the company ___ its policies on remote work.", opts: ["reviews", "reviewed", "will review", "review"], correct: 1 },
    { q: "Her speech was so ___ that even critics were moved.", opts: ["compelling", "compelled", "compel", "compellingly"], correct: 0 },
    { q: "___ the risks, the board approved the merger.", opts: ["Despite of", "In spite", "Notwithstanding", "Although"], correct: 2 },
    { q: "He's the kind of person who would ___ rather than admit fault.", opts: ["lie", "lying", "lied", "to lie"], correct: 0 },
    { q: "The findings, ___ surprising, were not entirely unexpected.", opts: ["while", "despite", "because", "unless"], correct: 0 },
    { q: "Rarely ___ such enthusiasm in a quarterly review.", opts: ["we have seen", "have we seen", "we saw", "did we saw"], correct: 1 },
  ],
  C2: [
    { q: "Were it not ___ his intervention, the deal would have collapsed.", opts: ["for", "by", "with", "of"], correct: 0 },
    { q: "The nuances of the negotiation were lost on those ___ with diplomatic protocol.", opts: ["unacquainted", "unacquaint", "acquainted", "acquaint"], correct: 0 },
    { q: "He spoke with such ___ that no one dared interrupt.", opts: ["gravitas", "gravity", "graveness", "grave"], correct: 0 },
    { q: "The findings ___ the prevailing assumptions in the field.", opts: ["upend", "upends", "upended only", "to upend"], correct: 0 },
    { q: "Such was the furor ___ the ruling that an appeal was inevitable.", opts: ["surrounding", "surrounded", "that surrounds", "surrounds"], correct: 0 },
    { q: "Her remarks, ___ as they were, left no room for ambiguity.", opts: ["measured", "measuring", "measure", "to measure"], correct: 0 },
    { q: "The board's reluctance to act stemmed from a fear of setting an ___ precedent.", opts: ["untoward", "untowards", "untoward's", "toward"], correct: 0 },
    { q: "So ___ was his critique that the author withdrew the paper.", opts: ["scathing", "scathe", "scathed", "scathingly"], correct: 0 },
  ],
}

export const bankReading = {
  A2: {
    passage: "Maria works in a small bakery in the city center. She starts work at 6 AM and finishes at 2 PM. Every morning she makes bread, cakes, and coffee for the customers. She likes her job because she meets many people every day.",
    questions: [
      { q: "What time does Maria start work?", opts: ["6 AM", "2 PM", "8 AM", "Noon"], correct: 0 },
      { q: "Why does Maria like her job?", opts: ["She earns a lot", "She meets many people", "She works alone", "She works at night"], correct: 1 },
    ],
  },
  B1: {
    passage: "Remote work has changed how companies think about office space. While some businesses have reduced their physical offices, others argue that in-person collaboration remains essential for creativity. A recent survey found that most employees prefer a hybrid model, splitting their time between home and the office.",
    questions: [
      { q: "According to the survey, what do most employees prefer?", opts: ["Working fully remote", "Working fully in-office", "A hybrid model", "No preference"], correct: 2 },
      { q: "What argument do some businesses make for in-person work?", opts: ["It saves money", "It improves creativity", "It reduces commute time", "It's required by law"], correct: 1 },
    ],
  },
  B2: {
    passage: "The proliferation of generative AI tools has prompted a reassessment of intellectual property frameworks worldwide. Critics argue that current legislation, drafted long before such technologies existed, is ill-equipped to address questions of authorship and ownership. Proponents of reform suggest that incremental amendments will not suffice; a fundamentally new legal paradigm is required.",
    questions: [
      { q: "What is the main criticism mentioned in the passage?", opts: ["AI tools are too expensive", "Current laws predate AI and are inadequate", "AI has no creative value", "Reform is unnecessary"], correct: 1 },
      { q: "What do reform proponents suggest?", opts: ["Minor adjustments are enough", "A completely new legal framework is needed", "The law should stay the same", "AI should be banned"], correct: 1 },
    ],
  },
  C1: {
    passage: "Notwithstanding the considerable advances in renewable energy technology, the transition away from fossil fuels remains fraught with geopolitical complexity. Nations heavily reliant on oil exports face not merely economic restructuring but a recalibration of their entire diplomatic leverage, a process unlikely to unfold without significant friction.",
    questions: [
      { q: "What does the passage suggest about oil-exporting nations?", opts: ["They will easily adapt", "They face economic and diplomatic challenges", "They have no incentive to change", "They are unaffected by the transition"], correct: 1 },
      { q: "The word 'fraught' most closely means:", opts: ["Simple", "Filled with difficulty", "Cheap", "Predictable"], correct: 1 },
    ],
  },
}

export const bankListening = {
  A2: {
    transcript: "Hi, my name is Tom. I live in a small apartment near the park. Every weekend I go shopping with my sister.",
    questions: [
      { q: "Where does Tom live?", opts: ["Near the park", "In a hotel", "In the city center", "On a farm"], correct: 0 },
      { q: "Who does Tom go shopping with?", opts: ["His friend", "His sister", "His mother", "Alone"], correct: 1 },
    ],
  },
  B1: {
    transcript: "Good morning, passengers. Due to scheduled maintenance, the 9:15 train to Manchester has been delayed by twenty minutes. We apologize for any inconvenience caused.",
    questions: [
      { q: "Why is the train delayed?", opts: ["Bad weather", "Scheduled maintenance", "Staff shortage", "Technical failure"], correct: 1 },
      { q: "How long is the delay?", opts: ["Ten minutes", "Twenty minutes", "One hour", "It's cancelled"], correct: 1 },
    ],
  },
  B2: {
    transcript: "What's fascinating about the study is that participants who multitasked reported feeling more productive, even though objective measurements showed a significant drop in actual output quality.",
    questions: [
      { q: "What did participants report feeling?", opts: ["Less productive", "More productive", "Confused", "Tired"], correct: 1 },
      { q: "What did objective measurements show?", opts: ["Higher quality output", "No change", "A drop in output quality", "Increased speed"], correct: 2 },
    ],
  },
}

export const bankWriting = {
  A2: "Write about your daily routine. What do you do every morning, afternoon, and evening? (minimum 50 words)",
  B1: "Describe a memorable trip you took. Where did you go, who did you go with, and what made it special? (minimum 50 words)",
  B2: "Some people believe technology has made communication worse, not better. Do you agree or disagree? Explain your opinion with reasons. (minimum 50 words)",
  C1: "Discuss the extent to which globalization has affected local cultures. Support your view with specific examples. (minimum 60 words)",
}

export function levelIdx(lvl) {
  return LEVELS.indexOf(lvl)
}

export function clampIdx(i) {
  return Math.max(0, Math.min(LEVELS.length - 1, i))
}

// Encuentra el nivel disponible en un banco más cercano al nivel objetivo,
// para bancos (reading/listening/writing) que no cubren los 6 niveles CEFR.
export function closestAvailableLevel(targetLevel, availableLevels) {
  if (availableLevels.includes(targetLevel)) return targetLevel
  const targetIdx = levelIdx(targetLevel)
  return availableLevels.reduce((best, l) =>
    Math.abs(levelIdx(l) - targetIdx) < Math.abs(levelIdx(best) - targetIdx) ? l : best,
    availableLevels[0]
  )
}
