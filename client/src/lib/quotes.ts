// Shared mindset quotes — used by the Mindset Hub and the Dashboard widget.
export type Quote = { text: string; author: string };

export const QUOTES: Quote[] = [
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
  { text: "You don't rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "The obstacle is the way.", author: "Marcus Aurelius" },
  { text: "What you do every day matters more than what you do once in a while.", author: "Gretchen Rubin" },
  { text: "Suffering is the refusal to accept what is.", author: "Eckhart Tolle" },
  { text: "Hard choices, easy life. Easy choices, hard life.", author: "Jerzy Gregorek" },
  { text: "Comparison is the thief of joy.", author: "Theodore Roosevelt" },
  { text: "If it's not a hell yes, it's a no.", author: "Derek Sivers" },
  { text: "Between stimulus and response there is a space. In that space is our power.", author: "Viktor Frankl" },
  { text: "Be hard to kill. Be easy to love.", author: "Anonymous" },
  { text: "You become what you give your attention to.", author: "Epictetus" },
  { text: "The cave you fear to enter holds the treasure you seek.", author: "Joseph Campbell" },
  { text: "Action is the antidote to despair.", author: "Joan Baez" },
  { text: "Do what is hard now, life becomes easy. Do what is easy now, life becomes hard.", author: "Les Brown" },
  { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "Show me a man who can play it cool and I'll show you a man who is yet to live.", author: "Anonymous" },
  { text: "The way out is through.", author: "Robert Frost" },
  { text: "You can't go back and change the beginning, but you can start where you are and change the ending.", author: "C.S. Lewis" },
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
];

// Pick a quote that rotates daily — same one for the whole day across the app.
export function quoteForToday(): Quote {
  const day = Math.floor(Date.now() / 86_400_000); // days since epoch
  return QUOTES[day % QUOTES.length];
}
