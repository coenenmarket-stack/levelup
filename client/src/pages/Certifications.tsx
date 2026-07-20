import { GraduationCap, ExternalLink, Clock, DollarSign, Award } from "lucide-react";
import { useState } from "react";

type Cert = {
  id: string;
  name: string;
  provider: string;
  category: "Tech" | "Business" | "Trades" | "Finance" | "Creative";
  cost: "Free" | "$" | "$$" | "$$$";
  time: string;
  payoff: string;
  url: string;
};

const CERTS: Cert[] = [
  // Tech
  {
    id: "google-it-support",
    name: "Google IT Support Professional",
    provider: "Coursera / Google",
    category: "Tech",
    cost: "$",
    time: "3-6 months",
    payoff: "Entry-level IT jobs · $50-70k",
    url: "https://www.coursera.org/professional-certificates/google-it-support",
  },
  {
    id: "comptia-a-plus",
    name: "CompTIA A+",
    provider: "CompTIA",
    category: "Tech",
    cost: "$$",
    time: "2-4 months",
    payoff: "Help desk · $45-65k",
    url: "https://www.comptia.org/certifications/a",
  },
  {
    id: "aws-cloud-practitioner",
    name: "AWS Cloud Practitioner",
    provider: "Amazon",
    category: "Tech",
    cost: "$",
    time: "1-2 months",
    payoff: "Cloud entry · $60-80k",
    url: "https://aws.amazon.com/certification/certified-cloud-practitioner/",
  },
  {
    id: "meta-front-end",
    name: "Meta Front-End Developer",
    provider: "Coursera / Meta",
    category: "Tech",
    cost: "$",
    time: "4-7 months",
    payoff: "Junior dev · $60-85k",
    url: "https://www.coursera.org/professional-certificates/meta-front-end-developer",
  },

  // Business
  {
    id: "google-project-mgmt",
    name: "Google Project Management",
    provider: "Coursera / Google",
    category: "Business",
    cost: "$",
    time: "3-6 months",
    payoff: "PM coordinator · $55-75k",
    url: "https://www.coursera.org/professional-certificates/google-project-management",
  },
  {
    id: "google-digital-marketing",
    name: "Google Digital Marketing & E-commerce",
    provider: "Coursera / Google",
    category: "Business",
    cost: "$",
    time: "3-6 months",
    payoff: "Marketing roles · $45-65k",
    url: "https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce",
  },
  {
    id: "hubspot-inbound",
    name: "HubSpot Inbound Marketing",
    provider: "HubSpot Academy",
    category: "Business",
    cost: "Free",
    time: "1 week",
    payoff: "Resume booster",
    url: "https://academy.hubspot.com/courses/inbound-certification",
  },

  // Trades
  {
    id: "osha-10",
    name: "OSHA 10-Hour Construction",
    provider: "OSHA",
    category: "Trades",
    cost: "$",
    time: "10 hours",
    payoff: "Required for most job sites",
    url: "https://www.osha.gov/training/outreach",
  },
  {
    id: "cdl",
    name: "Commercial Driver's License (CDL)",
    provider: "Local DMV / Truck schools",
    category: "Trades",
    cost: "$$$",
    time: "3-7 weeks",
    payoff: "Trucking · $50-90k",
    url: "https://www.fmcsa.dot.gov/registration/commercial-drivers-license",
  },
  {
    id: "epa-608",
    name: "EPA 608 (HVAC)",
    provider: "EPA",
    category: "Trades",
    cost: "$",
    time: "1-2 weeks",
    payoff: "HVAC apprentice · $40-60k",
    url: "https://www.epa.gov/section608",
  },

  // Finance
  {
    id: "bookkeeping-cert",
    name: "Bookkeeping Professional",
    provider: "Intuit / Coursera",
    category: "Finance",
    cost: "$",
    time: "2-4 months",
    payoff: "Bookkeeper · $40-55k",
    url: "https://www.coursera.org/professional-certificates/intuit-bookkeeping",
  },
  {
    id: "series-65",
    name: "Series 65 (Investment Advisor)",
    provider: "NASAA / FINRA",
    category: "Finance",
    cost: "$",
    time: "2-3 months",
    payoff: "Financial advisor · $60-100k+",
    url: "https://www.finra.org/registration-exams-ce/qualification-exams/series65",
  },

  // Creative
  {
    id: "adobe-acp-photoshop",
    name: "Adobe Certified Professional · Photoshop",
    provider: "Adobe",
    category: "Creative",
    cost: "$",
    time: "1-2 months",
    payoff: "Design freelance · $25-60/hr",
    url: "https://learning.adobe.com/certification.html",
  },
  {
    id: "google-ux-design",
    name: "Google UX Design",
    provider: "Coursera / Google",
    category: "Creative",
    cost: "$",
    time: "4-6 months",
    payoff: "Junior UX · $55-80k",
    url: "https://www.coursera.org/professional-certificates/google-ux-design",
  },
];

const CATEGORIES = ["All", "Tech", "Business", "Trades", "Finance", "Creative"] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

const COST_COLORS: Record<Cert["cost"], string> = {
  Free: "text-primary",
  $: "text-primary",
  $$: "text-accent",
  $$$: "text-destructive",
};

export default function CertificationsPage() {
  const [filter, setFilter] = useState<CategoryFilter>("All");

  const visible = filter === "All" ? CERTS : CERTS.filter((c) => c.category === filter);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" strokeWidth={2.4} />
          <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">Certifications</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Real credentials that get you hired. Curated, not random.
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2" data-testid="filter-chips">
        {CATEGORIES.map((cat) => {
          const active = filter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              data-testid={`chip-${cat.toLowerCase()}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-card-border hover-elevate"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {visible.map((c) => (
          <a
            key={c.id}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`cert-${c.id}`}
            className="block surface rounded-2xl p-4 hover-elevate"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold leading-tight">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.provider}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {c.time}
                  </span>
                  <span className={`flex items-center gap-0.5 font-semibold ${COST_COLORS[c.cost]}`}>
                    <DollarSign className="w-3 h-3" />
                    {c.cost === "Free" ? "Free" : c.cost}
                  </span>
                  <span className="text-foreground">{c.payoff}</span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      <p className="text-[11px] text-center text-muted-foreground px-4 pt-2">
        Costs and salaries are estimates from public sources and vary by region. Always check the provider before enrolling.
      </p>
    </div>
  );
}
