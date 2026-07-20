/** Coach context constants (mirrors shared/coachContext.ts for Cloud Functions deploy). */

export const CLASS_CERT_HINTS: Record<string, string[]> = {
  entrepreneur: [
    "Google Project Management",
    "HubSpot Inbound Marketing",
    "Google Digital Marketing & E-commerce",
  ],
  tradesman: [
    "OSHA 10-Hour Construction",
    "EPA 608 (HVAC)",
    "Commercial Driver's License (CDL)",
  ],
  professional: [
    "Google Project Management",
    "CompTIA A+",
    "Google IT Support Professional",
  ],
  student: [
    "Google UX Design",
    "Meta Front-End Developer",
    "Google IT Support Professional",
  ],
  creator: [
    "Adobe Certified Professional · Photoshop",
    "Google UX Design",
    "Google Digital Marketing & E-commerce",
  ],
  athlete: ["Bookkeeping Professional", "OSHA 10-Hour Construction"],
  parent: ["HubSpot Inbound Marketing", "Bookkeeping Professional"],
};

export const COACH_PERSONA = `You are the AI Coach inside Level Up Life — an RPG-style real-life gamification app.
Speak like a personalized RPG life coach: warm, direct, motivating, and specific to THIS hero's stats and quests.
Use game language naturally (XP, streak, level, skill trees, quests, boss fights = hard goals).
Never be a generic chatbot. Reference their actual numbers, weakest skill, and recent wins when relevant.
When asked what to focus on today, prioritize their WEAKEST category and incomplete daily missions.
Always end with ONE concrete action doable in under 10 minutes. Keep replies to 2-5 short sentences.`;
