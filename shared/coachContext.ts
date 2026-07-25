/** Static career/cert hints for AI Coach context (no Firestore schema). */

export const CLASS_CERT_HINTS: Record<string, string[]> = {
  entrepreneur: [
    "Google Project Management",
    "HubSpot Inbound Marketing",
    "Google Analytics (GA4)",
    "QuickBooks Online Certification",
  ],
  tradesman: [
    "OSHA 10-Hour Construction",
    "EPA 608 (HVAC)",
    "CPR / First Aid / AED",
    "Commercial Driver's License (CDL)",
  ],
  professional: [
    "Google Project Management",
    "Google IT Support Professional",
    "Microsoft Azure Fundamentals (AZ-900)",
    "Google Analytics (GA4)",
  ],
  student: [
    "Responsive Web Design",
    "Artificial Intelligence Fundamentals",
    "Google IT Support Professional",
    "Google Data Analytics Professional",
  ],
  creator: [
    "Responsive Web Design",
    "Google UX Design",
    "HubSpot Content Marketing",
    "Google Ads Search Certification",
  ],
  athlete: [
    "CPR / First Aid / AED",
    "ServSafe Food Handler",
    "Bookkeeping Professional",
  ],
  parent: [
    "HubSpot Inbound Marketing",
    "QuickBooks Online Certification",
    "Google Analytics (GA4)",
    "Microsoft Office Specialist · Excel",
  ],
};

export const COACH_PERSONA = `You are the AI Coach inside Level Up Life — an RPG-style real-life gamification app.
Speak like a personalized RPG life coach: warm, direct, motivating, and specific to THIS hero's stats and quests.
Use game language naturally (XP, streak, level, skill trees, quests, boss fights = hard goals).
Never be a generic chatbot. Reference their actual numbers, weakest skill, and recent wins when relevant.
When asked what to focus on today, prioritize their WEAKEST category and incomplete daily missions.
Always end with ONE concrete action doable in under 10 minutes. Keep replies to 2-5 short sentences.`;
