export type CertCategory = "Tech" | "Business" | "Trades" | "Finance" | "Creative" | "Health";
export type CertCost = "Free" | "$" | "$$" | "$$$";

export type Certification = {
  id: string;
  name: string;
  provider: string;
  category: CertCategory;
  cost: CertCost;
  time: string;
  payoff: string;
  url: string;
  overview: string;
  whoItsFor: string;
  prerequisites: string;
  howToStart: string[];
  relatedSkills: Array<"health" | "wealth" | "career" | "family" | "mindset">;
};

/** Cost bands are rough guides — always verify current fees on the provider site. */
export const CERT_COST_DISCLAIMER =
  "Free = no fee to earn the credential. $ ≈ under ~$100 or Coursera Career Cert (~$39–49/mo). $$ ≈ exam or course fees in the low hundreds. $$$ ≈ multi-hundred to multi-thousand programs (e.g. CDL school). Costs and salary ranges are estimates and vary by region — always check the provider before enrolling.";

export const CERT_CATEGORIES: CertCategory[] = [
  "Tech",
  "Business",
  "Trades",
  "Finance",
  "Creative",
  "Health",
];

export const CERTIFICATIONS: Certification[] = [
  // ── Tech ──────────────────────────────────────────────
  {
    id: "freecodecamp-responsive-web",
    name: "Responsive Web Design",
    provider: "freeCodeCamp",
    category: "Tech",
    cost: "Free",
    time: "300 hours",
    payoff: "Portfolio projects · junior web path",
    url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/",
    overview:
      "A project-based curriculum covering HTML and CSS, including flexbox, grid, and accessible responsive layouts. You build five certification projects that can go straight into a portfolio. Completely free with a verifiable freeCodeCamp certificate.",
    whoItsFor:
      "Beginners who want a structured, no-cost path into web development and a shareable portfolio.",
    prerequisites: "Basic computer skills",
    howToStart: [
      "Create a free freeCodeCamp account",
      "Open the Responsive Web Design certification curriculum",
      "Complete the lessons and five required projects",
      "Claim your certificate and add projects to a portfolio or GitHub",
    ],
    relatedSkills: ["career", "mindset"],
  },
  {
    id: "freecodecamp-js",
    name: "JavaScript Algorithms & Data Structures",
    provider: "freeCodeCamp",
    category: "Tech",
    cost: "Free",
    time: "300 hours",
    payoff: "Coding interview prep · resume projects",
    url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/",
    overview:
      "Teaches modern JavaScript through interactive challenges, including functions, objects, ES6 features, and classic algorithm practice. Ends with required projects that demonstrate problem-solving skill. A common next step after HTML/CSS for aspiring developers.",
    whoItsFor:
      "Learners building toward junior developer roles, coding bootcamps, or interview prep.",
    prerequisites: "Basic HTML/CSS or equivalent comfort with coding concepts",
    howToStart: [
      "Sign in to freeCodeCamp",
      "Start the JavaScript Algorithms and Data Structures curriculum",
      "Work through challenges at a steady pace (aim for daily practice)",
      "Finish the certification projects and publish them on GitHub",
    ],
    relatedSkills: ["career", "mindset"],
  },
  {
    id: "ibm-ai-fundamentals",
    name: "Artificial Intelligence Fundamentals",
    provider: "IBM SkillsBuild",
    category: "Tech",
    cost: "Free",
    time: "~10 hours",
    payoff: "AI literacy badge · career pivot signal",
    url: "https://skillsbuild.org/",
    overview:
      "An introductory IBM SkillsBuild badge covering core AI concepts, practical use cases, and responsible AI basics. Designed as literacy training rather than a deep engineering credential. Useful for signaling AI awareness on a resume or LinkedIn.",
    whoItsFor:
      "Career changers, students, and professionals who need credible AI literacy without a long program.",
    prerequisites: "None",
    howToStart: [
      "Create a free IBM SkillsBuild account",
      "Search for Artificial Intelligence Fundamentals",
      "Complete the learning modules and assessment",
      "Download or share your digital badge",
    ],
    relatedSkills: ["career", "mindset"],
  },
  {
    id: "aws-cloud-essentials-badge",
    name: "AWS Cloud Essentials",
    provider: "AWS Skill Builder",
    category: "Tech",
    cost: "Free",
    time: "6-12 hours",
    payoff: "Cloud basics badge · path to CCP exam",
    url: "https://skillbuilder.aws/",
    overview:
      "Free foundational training on AWS Skill Builder covering cloud concepts, core AWS services, and basic architecture vocabulary. Ideal as a warm-up before paying for the AWS Certified Cloud Practitioner exam. Earns a digital badge for completing the learning plan.",
    whoItsFor:
      "Anyone exploring cloud careers or needing AWS vocabulary for IT, support, or product roles.",
    prerequisites: "Basic computer skills",
    howToStart: [
      "Create a free AWS Skill Builder account",
      "Enroll in the Cloud Essentials learning plan",
      "Complete the modules and knowledge checks",
      "Claim the badge, then decide whether to pursue the CCP exam",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "google-it-support",
    name: "Google IT Support Professional",
    provider: "Coursera / Google",
    category: "Tech",
    cost: "$",
    time: "3-6 months",
    payoff: "Entry-level IT jobs · $50-70k",
    url: "https://www.coursera.org/professional-certificates/google-it-support",
    overview:
      "Google’s career certificate covering troubleshooting, customer support, networking, operating systems, system administration, and security basics. Widely recognized by employers hiring help desk and IT support roles. Includes hands-on labs via Coursera.",
    whoItsFor:
      "Career switchers targeting help desk, desktop support, or junior IT roles without a CS degree.",
    prerequisites: "Basic computer skills",
    howToStart: [
      "Enroll in the Google IT Support Professional Certificate on Coursera",
      "Complete courses in order (use the free trial or monthly subscription)",
      "Finish graded assignments and the final capstone-style work",
      "Add the certificate to LinkedIn and apply to IT support openings",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "google-cybersecurity",
    name: "Google Cybersecurity Professional",
    provider: "Coursera / Google",
    category: "Tech",
    cost: "$",
    time: "3-6 months",
    payoff: "SOC / security analyst entry · $55-80k",
    url: "https://www.coursera.org/professional-certificates/google-cybersecurity",
    overview:
      "An entry-level cybersecurity certificate covering security frameworks, network security, Linux and SQL basics, detection tools, and incident response concepts. Built for people breaking into SOC analyst or junior security roles. Complements later CompTIA Security+ study.",
    whoItsFor:
      "Beginners aiming for junior cybersecurity or SOC analyst pathways.",
    prerequisites: "Basic computer skills; IT fundamentals helpful but not required",
    howToStart: [
      "Enroll on Coursera in the Google Cybersecurity Professional Certificate",
      "Work through each course and hands-on labs",
      "Practice with the included tools and scenarios",
      "Share the credential and target entry-level security job postings",
    ],
    relatedSkills: ["career", "wealth", "mindset"],
  },
  {
    id: "google-data-analytics",
    name: "Google Data Analytics Professional",
    provider: "Coursera / Google",
    category: "Tech",
    cost: "$",
    time: "3-6 months",
    payoff: "Junior analyst · $50-75k",
    url: "https://www.coursera.org/professional-certificates/google-data-analytics",
    overview:
      "Teaches the data analytics process with spreadsheets, SQL, R, and Tableau-style visualization concepts. Emphasizes cleaning, analyzing, and presenting data for business decisions. A popular entry point into junior analyst roles.",
    whoItsFor:
      "People pivoting into analytics, operations, or business intelligence entry roles.",
    prerequisites: "Basic computer skills; comfort with spreadsheets helps",
    howToStart: [
      "Enroll in the Google Data Analytics Professional Certificate on Coursera",
      "Complete each course and case-study style projects",
      "Build a small portfolio of cleaned datasets and dashboards",
      "List the certificate on your resume and apply to junior analyst roles",
    ],
    relatedSkills: ["career", "wealth"],
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
    overview:
      "AWS’s foundational certification validating cloud fluency across AWS services, billing, security, and architecture basics. Exam-based (CLF-C02) and widely requested on cloud-adjacent job posts. Often the first paid AWS credential on a resume.",
    whoItsFor:
      "IT support, sales engineers, PMs, and aspiring cloud practitioners who need an official AWS badge.",
    prerequisites: "Cloud basics recommended (AWS Cloud Essentials or equivalent)",
    howToStart: [
      "Study free AWS Skill Builder Cloud Practitioner materials",
      "Review the official exam guide and sample questions",
      "Schedule the CLF-C02 exam through Pearson VUE or online proctoring",
      "Pass the exam and share your Credly badge",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "azure-fundamentals",
    name: "Microsoft Azure Fundamentals (AZ-900)",
    provider: "Microsoft Learn",
    category: "Tech",
    cost: "$",
    time: "2-4 weeks",
    payoff: "Cloud literacy · enterprise IT path",
    url: "https://learn.microsoft.com/credentials/certifications/azure-fundamentals/",
    overview:
      "Microsoft’s entry Azure certification covering cloud concepts, Azure services, security, privacy, compliance, and pricing. Short study path with free Microsoft Learn modules. Common requirement or plus for enterprise IT environments.",
    whoItsFor:
      "IT beginners and professionals working in Microsoft-heavy organizations.",
    prerequisites: "Basic computer skills",
    howToStart: [
      "Complete the free AZ-900 learning path on Microsoft Learn",
      "Take Microsoft’s practice assessment",
      "Schedule and pass the AZ-900 exam",
      "Add the credential to Microsoft Learn / LinkedIn",
    ],
    relatedSkills: ["career"],
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
    overview:
      "Meta’s professional certificate covering HTML, CSS, JavaScript, React, version control, and UI principles. Includes portfolio projects and a final capstone. Aimed at junior front-end developer readiness.",
    whoItsFor:
      "Aspiring front-end developers who want a structured React-oriented path from Meta.",
    prerequisites: "Basic computer skills; prior HTML/CSS helpful",
    howToStart: [
      "Enroll in the Meta Front-End Developer Professional Certificate on Coursera",
      "Complete courses sequentially, focusing on React projects",
      "Publish portfolio work on GitHub and a personal site",
      "Use the certificate when applying to junior front-end roles",
    ],
    relatedSkills: ["career", "wealth", "mindset"],
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
    overview:
      "Industry-standard entry IT certification covering hardware, operating systems, networking, troubleshooting, and security fundamentals. Requires passing two exams (Core 1 and Core 2). Frequently listed on help desk and desktop support job descriptions.",
    whoItsFor:
      "People entering IT support who want a vendor-neutral credential employers recognize.",
    prerequisites: "Basic computer skills; hands-on practice strongly recommended",
    howToStart: [
      "Review the current A+ exam objectives on CompTIA’s site",
      "Study via CompTIA CertMaster, books, or reputable courses",
      "Practice with labs or a home PC teardown/build kit",
      "Schedule Core 1 and Core 2 exams and pass both",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "comptia-network-plus",
    name: "CompTIA Network+",
    provider: "CompTIA",
    category: "Tech",
    cost: "$$",
    time: "2-4 months",
    payoff: "Network tech / junior admin path · often $55-75k",
    url: "https://www.comptia.org/certifications/network",
    overview:
      "Vendor-neutral networking certification covering protocols, infrastructure, operations, security, and troubleshooting. Builds directly on A+ knowledge for support and junior network roles. One exam; widely recognized across employers.",
    whoItsFor:
      "IT support professionals ready to specialize in networking after A+ or equivalent experience.",
    prerequisites: "CompTIA A+ or equivalent networking fundamentals recommended",
    howToStart: [
      "Download the Network+ exam objectives from CompTIA",
      "Study with a structured course and packet-tracer / lab practice",
      "Take practice exams until consistently scoring above the cut score",
      "Schedule and pass the Network+ exam",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "comptia-security-plus",
    name: "CompTIA Security+",
    provider: "CompTIA",
    category: "Tech",
    cost: "$$",
    time: "2-4 months",
    payoff: "Security ops entry · often $60-85k",
    url: "https://www.comptia.org/certifications/security",
    overview:
      "Baseline cybersecurity certification covering threats, architecture, operations, governance, and incident response. Meets DoD 8570/8140 baseline requirements for many federal contractor roles. One of the most requested entry security credentials.",
    whoItsFor:
      "IT professionals moving into cybersecurity, compliance, or SOC analyst tracks.",
    prerequisites: "Network+ or networking experience recommended",
    howToStart: [
      "Review Security+ exam objectives on CompTIA.org",
      "Study with a reputable course and hands-on labs",
      "Drill practice questions and performance-based scenarios",
      "Schedule and pass the Security+ exam",
    ],
    relatedSkills: ["career", "wealth", "mindset"],
  },
  {
    id: "cisco-ccna",
    name: "Cisco Certified Network Associate (CCNA)",
    provider: "Cisco",
    category: "Tech",
    cost: "$$",
    time: "3-6 months",
    payoff: "Network engineer entry · often $65-90k",
    url: "https://www.cisco.com/site/us/en/learn/training-certifications/certifications/enterprise/ccna/index.html",
    overview:
      "Cisco’s associate-level networking certification covering IP connectivity, security fundamentals, automation basics, and network access. Exam 200-301 is a common hiring signal for network technician and junior engineer roles. Deeper than Network+ for Cisco-centric environments.",
    whoItsFor:
      "Aspiring network engineers and admins targeting Cisco-heavy shops.",
    prerequisites: "Networking fundamentals (Network+ or equivalent experience)",
    howToStart: [
      "Study the official CCNA exam topics on Cisco’s site",
      "Practice in Cisco Packet Tracer or real lab gear",
      "Use Cisco Networking Academy or authorized training if needed",
      "Schedule exam 200-301 and earn the CCNA",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "google-cloud-digital-leader",
    name: "Google Cloud Digital Leader",
    provider: "Google Cloud",
    category: "Tech",
    cost: "$",
    time: "2-6 weeks",
    payoff: "GCP literacy · cloud business roles",
    url: "https://cloud.google.com/learn/certification/cloud-digital-leader",
    overview:
      "Foundational Google Cloud certification focused on cloud concepts, Google Cloud products, and digital transformation use cases. Less technical than Associate Cloud Engineer; strong for business, sales, and product roles. Exam-based with official Google prep materials.",
    whoItsFor:
      "Non-engineers and early cloud learners who need credible Google Cloud fluency.",
    prerequisites: "Basic computer skills",
    howToStart: [
      "Complete Google’s free Digital Leader learning path",
      "Review the official exam guide",
      "Take practice questions until comfortable",
      "Schedule and pass the Cloud Digital Leader exam",
    ],
    relatedSkills: ["career"],
  },
  {
    id: "meta-back-end",
    name: "Meta Back-End Developer",
    provider: "Coursera / Meta",
    category: "Tech",
    cost: "$",
    time: "5-8 months",
    payoff: "Junior backend path · often $65-90k",
    url: "https://www.coursera.org/professional-certificates/meta-back-end-developer",
    overview:
      "Meta’s professional certificate covering Python, APIs, databases, Django, version control, and backend system design basics. Includes portfolio projects suitable for junior backend applications. Complements front-end study for full-stack goals.",
    whoItsFor:
      "Learners targeting junior backend or full-stack developer roles.",
    prerequisites: "Basic programming comfort recommended",
    howToStart: [
      "Enroll in the Meta Back-End Developer Professional Certificate on Coursera",
      "Complete Python and Django courses with projects",
      "Publish API and database projects on GitHub",
      "Apply to junior backend roles with the certificate listed",
    ],
    relatedSkills: ["career", "wealth", "mindset"],
  },
  {
    id: "microsoft-power-bi-data-analyst",
    name: "Microsoft Power BI Data Analyst (PL-300)",
    provider: "Microsoft",
    category: "Tech",
    cost: "$$",
    time: "1-3 months",
    payoff: "BI / analyst edge · often $60-85k",
    url: "https://learn.microsoft.com/credentials/certifications/data-analyst-associate/",
    overview:
      "Microsoft certification for preparing data, modeling in Power BI, visualizing insights, and deploying analytics assets. Maps to the PL-300 exam and is valued in Excel-heavy business environments. Strong practical credential for analyst and BI roles.",
    whoItsFor:
      "Analysts, Excel power users, and IT pros moving into business intelligence.",
    prerequisites: "Familiarity with data analysis concepts and Excel recommended",
    howToStart: [
      "Complete the free PL-300 learning path on Microsoft Learn",
      "Build sample reports in Power BI Desktop",
      "Take Microsoft’s practice assessment",
      "Schedule and pass the PL-300 exam",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "freecodecamp-data-analysis-python",
    name: "Data Analysis with Python",
    provider: "freeCodeCamp",
    category: "Tech",
    cost: "Free",
    time: "300 hours",
    payoff: "Python analytics portfolio · analyst path",
    url: "https://www.freecodecamp.org/learn/data-analysis-with-python/",
    overview:
      "Free freeCodeCamp certification teaching NumPy, Pandas, Matplotlib, and data cleaning workflows in Python. You complete five projects including medical data visualizer and sea-level predictor style challenges. Excellent free bridge into analytics or data science study.",
    whoItsFor:
      "Self-taught learners who want Python data skills without tuition costs.",
    prerequisites: "Basic Python helpful; beginner-friendly with patience",
    howToStart: [
      "Open the Data Analysis with Python curriculum on freeCodeCamp",
      "Work through the interactive lessons and notebooks",
      "Complete all five required projects",
      "Claim the certificate and showcase projects on GitHub",
    ],
    relatedSkills: ["career", "mindset"],
  },
  {
    id: "isc2-cc",
    name: "ISC² Certified in Cybersecurity (CC)",
    provider: "ISC²",
    category: "Tech",
    cost: "Free",
    time: "2-6 weeks",
    payoff: "Entry cyber credential · path toward Security+ / SOC roles",
    url: "https://www.isc2.org/certifications/cc",
    overview:
      "Entry-level ISC² certification covering security principles, incident response basics, network and access control concepts, and security operations vocabulary. Designed for people starting in cybersecurity rather than advanced practitioners. Confirm current exam fees and any first-attempt voucher eligibility on the official ISC² site before registering.",
    whoItsFor:
      "Career changers, students, and IT beginners who want a recognized first cyber credential before CompTIA Security+ or role-specific study.",
    prerequisites: "None; basic IT familiarity helps",
    howToStart: [
      "Create an ISC² account and review the official CC exam outline",
      "Study free or low-cost prep aligned to the domains (security principles, access controls, networking, incident response)",
      "Register for the exam through ISC²’s authorized process and confirm any fee or voucher terms",
      "Pass the exam and claim your Credly badge; plan a next step such as CompTIA Security+ if aiming at SOC roles",
    ],
    relatedSkills: ["career", "mindset"],
  },

  // ── Business ──────────────────────────────────────────
  {
    id: "hubspot-inbound",
    name: "HubSpot Inbound Marketing",
    provider: "HubSpot Academy",
    category: "Business",
    cost: "Free",
    time: "1 week",
    payoff: "Resume booster · marketing basics",
    url: "https://academy.hubspot.com/courses/inbound-certification",
    overview:
      "HubSpot’s flagship free certification on inbound methodology: attract, engage, and delight customers. Covers content strategy, buyer personas, and funnel basics. Fast to complete and widely recognized in marketing hiring.",
    whoItsFor:
      "Marketing beginners, career switchers, and founders learning inbound fundamentals.",
    prerequisites: "None",
    howToStart: [
      "Create a free HubSpot Academy account",
      "Enroll in the Inbound certification course",
      "Watch lessons and take the final exam",
      "Add the badge to LinkedIn and your resume",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "hubspot-content-marketing",
    name: "HubSpot Content Marketing",
    provider: "HubSpot Academy",
    category: "Business",
    cost: "Free",
    time: "1 week",
    payoff: "Content roles · freelance writing edge",
    url: "https://academy.hubspot.com/courses/content-marketing",
    overview:
      "Free HubSpot certification covering content strategy, creation, distribution, and measurement. Emphasizes blogs, topic clusters, and aligning content to buyer journeys. Useful for content marketers and freelance writers.",
    whoItsFor:
      "Aspiring content marketers, writers, and social/media coordinators.",
    prerequisites: "None",
    howToStart: [
      "Sign into HubSpot Academy",
      "Start the Content Marketing certification",
      "Complete lessons and pass the exam",
      "Share the certificate and pair it with writing samples",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "hubspot-inbound-sales",
    name: "HubSpot Inbound Sales",
    provider: "HubSpot Academy",
    category: "Business",
    cost: "Free",
    time: "3-5 hours",
    payoff: "SDR / sales coordinator path",
    url: "https://academy.hubspot.com/courses/inbound-sales",
    overview:
      "Short free certification on inbound sales methodology: identifying active buyers, connecting with context, exploring needs, and advising. Practical for SDR and BDR roles that use HubSpot CRM. Quick resume signal for sales coordinators.",
    whoItsFor:
      "People breaking into sales development or CRM-assisted selling.",
    prerequisites: "None",
    howToStart: [
      "Create a HubSpot Academy account",
      "Enroll in Inbound Sales",
      "Finish the modules and exam in a few sessions",
      "List it when applying to SDR / BDR roles",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "hubspot-email-marketing",
    name: "HubSpot Email Marketing",
    provider: "HubSpot Academy",
    category: "Business",
    cost: "Free",
    time: "1 week",
    payoff: "Email / CRM marketing roles",
    url: "https://academy.hubspot.com/courses/email-marketing-certification-en",
    overview:
      "Free HubSpot certification on email strategy, segmentation, personalization, deliverability, and testing. Teaches how to design campaigns that convert without spamming. Strong fit for CRM and lifecycle marketing roles.",
    whoItsFor:
      "Marketers and small-business operators who send campaigns or manage CRM lists.",
    prerequisites: "None",
    howToStart: [
      "Open HubSpot Academy and enroll in Email Marketing",
      "Complete the course lessons",
      "Pass the certification exam",
      "Apply concepts in a real HubSpot or email tool sandbox",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "hubspot-social-media",
    name: "HubSpot Social Media Marketing",
    provider: "HubSpot Academy",
    category: "Business",
    cost: "Free",
    time: "1 week",
    payoff: "Social / community coordinator edge",
    url: "https://academy.hubspot.com/courses/social-media",
    overview:
      "Free HubSpot certification covering social strategy, content calendars, engagement, and measuring social ROI. Complements platform-native ads certifications from Meta and Google. Popular resume add-on for community and social roles.",
    whoItsFor:
      "Social media coordinators, freelancers, and small-business marketers.",
    prerequisites: "None",
    howToStart: [
      "Sign up for HubSpot Academy",
      "Take the Social Media Marketing certification course",
      "Pass the exam and download your badge",
      "Pair with Meta or Google ads certs for a stronger profile",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "google-analytics-ga4",
    name: "Google Analytics (GA4)",
    provider: "Google Skillshop",
    category: "Business",
    cost: "Free",
    time: "1-2 weeks",
    payoff: "Marketing analytics · resume staple",
    url: "https://skillshop.withgoogle.com/",
    overview:
      "Google Skillshop certification for Google Analytics 4: events, conversions, reports, and measurement basics. Free to earn and commonly requested on digital marketing job posts. Demonstrates you can navigate modern web analytics.",
    whoItsFor:
      "Marketers, analysts, and site owners who need credible GA4 fluency.",
    prerequisites: "Basic computer skills",
    howToStart: [
      "Create or sign in to a Google Skillshop account",
      "Find the Google Analytics certification course",
      "Study the lessons and practice in a GA4 demo property",
      "Pass the assessment and display the certificate",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "google-ads-search",
    name: "Google Ads Search Certification",
    provider: "Google Skillshop",
    category: "Business",
    cost: "Free",
    time: "1-2 weeks",
    payoff: "PPC / paid media entry",
    url: "https://skillshop.withgoogle.com/",
    overview:
      "Free Google Skillshop certification focused on Search campaigns, keywords, bidding, and measurement in Google Ads. A standard credential for junior paid media and PPC roles. Pair with Display or Measurement certifications as you grow.",
    whoItsFor:
      "Aspiring PPC specialists, freelancers, and marketers managing paid search.",
    prerequisites: "Basic marketing or computer skills",
    howToStart: [
      "Sign in to Google Skillshop",
      "Complete the Google Ads Search course materials",
      "Practice in a Google Ads account if available",
      "Pass the Search certification assessment",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "google-project-mgmt",
    name: "Google Project Management",
    provider: "Coursera / Google",
    category: "Business",
    cost: "$",
    time: "3-6 months",
    payoff: "PM coordinator · $55-75k",
    url: "https://www.coursera.org/professional-certificates/google-project-management",
    overview:
      "Google’s professional certificate covering traditional and Agile project management, including planning, risk, quality, and stakeholder communication. Includes a Capstone and preparation concepts aligned with CAPM-style study. Strong for coordinator and junior PM roles.",
    whoItsFor:
      "Career changers targeting project coordinator or junior PM positions.",
    prerequisites: "Basic computer skills",
    howToStart: [
      "Enroll in the Google Project Management Professional Certificate on Coursera",
      "Complete courses covering waterfall and Agile practices",
      "Finish the capstone project",
      "List the certificate and consider CAPM next if pursuing formal PM credentials",
    ],
    relatedSkills: ["career", "wealth", "mindset"],
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
    overview:
      "Career certificate covering customer journey, email, social, SEM, analytics, and ecommerce storefront skills. Designed for entry marketing and ecommerce coordinator roles. Includes portfolio-ready projects.",
    whoItsFor:
      "Beginners entering digital marketing or small-business ecommerce operations.",
    prerequisites: "Basic computer skills",
    howToStart: [
      "Enroll on Coursera in Google Digital Marketing & E-commerce",
      "Complete each course and hands-on project",
      "Build a simple campaign or storefront sample for your portfolio",
      "Apply to coordinator-level marketing roles",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "meta-social-media",
    name: "Meta Social Media Marketing",
    provider: "Coursera / Meta",
    category: "Business",
    cost: "$",
    time: "3-5 months",
    payoff: "Social / community roles · $40-60k",
    url: "https://www.coursera.org/professional-certificates/facebook-social-media-marketing",
    overview:
      "Meta’s professional certificate on social strategy, content, Meta ads fundamentals, and measuring results on Facebook and Instagram. More structured than short free platform badges. Useful for social media manager and community roles.",
    whoItsFor:
      "Aspiring social media marketers and freelancers managing brand pages.",
    prerequisites: "Basic computer skills",
    howToStart: [
      "Enroll in the Meta Social Media Marketing Professional Certificate",
      "Complete courses on strategy, content, and advertising",
      "Practice in Meta Business Suite with a test page if possible",
      "Share the credential and apply to social roles",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "servsafe-food-handler",
    name: "ServSafe Food Handler",
    provider: "National Restaurant Association",
    category: "Business",
    cost: "$",
    time: "2-4 hours",
    payoff: "Food service · hospitality jobs",
    url: "https://www.servsafe.com/ServSafe-Food-Handler",
    overview:
      "Widely accepted food safety credential covering personal hygiene, cross-contamination, time/temperature control, and cleaning. Often required or preferred for restaurant and hospitality hiring. Short online course with an assessment.",
    whoItsFor:
      "Food service workers, hospitality staff, and anyone starting restaurant work.",
    prerequisites: "None",
    howToStart: [
      "Purchase ServSafe Food Handler access on servsafe.com",
      "Complete the online training modules",
      "Pass the assessment",
      "Print or save your certificate for employers",
    ],
    relatedSkills: ["career", "health"],
  },
  {
    id: "pmi-capm",
    name: "Certified Associate in Project Management (CAPM)",
    provider: "Project Management Institute (PMI)",
    category: "Business",
    cost: "$$",
    time: "2-4 months",
    payoff: "Formal PM credential · often $60-80k coordinator/PM track",
    url: "https://www.pmi.org/certifications/certified-associate-capm",
    overview:
      "PMI’s entry project management credential based on the PMBOK Guide and Agile practice guide concepts. Requires secondary education plus 23 contact hours of project management education before the exam. Stronger formal signal than many online certificates for PM career tracks.",
    whoItsFor:
      "Aspiring project coordinators and junior PMs who want a PMI-recognized credential.",
    prerequisites: "Secondary degree + 23 hours of project management education",
    howToStart: [
      "Complete 23 contact hours via PMI-approved or Google PM / similar coursework",
      "Create a PMI account and submit a CAPM application",
      "Study the current CAPM exam content outline",
      "Schedule and pass the CAPM exam",
    ],
    relatedSkills: ["career", "wealth", "mindset"],
  },
  {
    id: "shopify-academy",
    name: "Shopify Academy Foundational / Verified Skills",
    provider: "Shopify Academy",
    category: "Business",
    cost: "Free",
    time: "1-4 weeks",
    payoff: "Ecommerce / Shopify partner edge",
    url: "https://www.shopifyacademy.com/",
    overview:
      "Shopify’s official learning hub for commerce fundamentals, partner skills, and product knowledge. Free courses available; optional proctored Verified Skills assessments are paid. Useful for freelancers, agency partners, and store operators on Shopify.",
    whoItsFor:
      "Ecommerce merchants, freelancers, and aspiring Shopify Partners.",
    prerequisites: "Basic computer skills",
    howToStart: [
      "Create a Shopify Academy account",
      "Complete foundational commerce courses",
      "Earn course certificates or explore Verified Skills assessments",
      "List Shopify credentials when pitching clients or applying to ecommerce roles",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "salesforce-associate",
    name: "Salesforce Certified Associate",
    provider: "Salesforce",
    category: "Business",
    cost: "$",
    time: "2-6 weeks",
    payoff: "CRM / Salesforce admin path entry",
    url: "https://trailhead.salesforce.com/credentials/associate",
    overview:
      "Entry Salesforce credential validating CRM vocabulary, Salesforce ecosystem basics, and navigation of the platform. Prep is free on Trailhead; the exam has a fee. A practical first step before Administrator certification.",
    whoItsFor:
      "People entering Salesforce admin, CRM operations, or sales ops careers.",
    prerequisites: "Basic computer skills; Trailhead modules recommended",
    howToStart: [
      "Create a free Trailhead account",
      "Complete the Associate exam prep trailmix",
      "Register for the Salesforce Certified Associate exam",
      "Pass the exam and plan next steps toward Administrator if desired",
    ],
    relatedSkills: ["career", "wealth"],
  },

  // ── Trades ────────────────────────────────────────────
  {
    id: "osha-10",
    name: "OSHA 10-Hour Construction",
    provider: "OSHA",
    category: "Trades",
    cost: "$",
    time: "10 hours",
    payoff: "Required for many job sites",
    url: "https://www.osha.gov/training/outreach",
    overview:
      "OSHA Outreach Training Program 10-hour course for construction workers covering hazard recognition and workplace safety rights. Widely required by contractors and unions for site access. Must be delivered by authorized OSHA Outreach trainers (in-person or approved online providers).",
    whoItsFor:
      "Construction laborers, apprentices, and anyone needing site safety cards.",
    prerequisites: "None",
    howToStart: [
      "Find an OSHA-authorized Outreach trainer or approved online provider",
      "Complete the full 10-hour construction curriculum",
      "Receive your DOL / OSHA 10 card",
      "Keep the card with your work credentials",
    ],
    relatedSkills: ["career", "health"],
  },
  {
    id: "osha-30",
    name: "OSHA 30-Hour Construction",
    provider: "OSHA",
    category: "Trades",
    cost: "$",
    time: "30 hours",
    payoff: "Supervisor / safety-aware trades edge",
    url: "https://www.osha.gov/training/outreach",
    overview:
      "Extended OSHA Outreach construction course for supervisors and workers with safety responsibilities. Goes deeper on hazard abatement, fall protection, and competent-person topics than OSHA 10. Often preferred or required for foreman-level roles.",
    whoItsFor:
      "Crew leads, supervisors, and tradespeople seeking stronger safety credentials.",
    prerequisites: "None (OSHA 10 helpful but not required)",
    howToStart: [
      "Choose an OSHA-authorized 30-hour construction provider",
      "Complete all required training hours",
      "Obtain your OSHA 30 card",
      "Use it when applying for lead or supervisor roles",
    ],
    relatedSkills: ["career", "health"],
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
    overview:
      "Federal certification required to handle regulated refrigerants under Section 608 of the Clean Air Act. Types I–III (or Universal) cover different equipment classes. Essential for HVAC technicians working on air conditioning and refrigeration systems.",
    whoItsFor:
      "HVAC apprentices, technicians, and facilities maintenance workers.",
    prerequisites: "Basic HVAC knowledge recommended for Universal",
    howToStart: [
      "Study EPA 608 core and type-specific material via an approved prep course",
      "Schedule the exam with an EPA-certifying organization",
      "Pass the core plus desired type sections (or Universal)",
      "Keep your certification card for employers and compliance",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "epa-609",
    name: "EPA 609 (Motor Vehicle A/C)",
    provider: "EPA",
    category: "Trades",
    cost: "$",
    time: "1 day–1 week",
    payoff: "Auto A/C repair compliance · shop hireability",
    url: "https://www.epa.gov/section609",
    overview:
      "Section 609 certification for technicians who service motor vehicle air conditioning systems using regulated refrigerants. Required for purchasing certain refrigerants and performing MVAC work. Shorter than EPA 608 and focused on automotive HVAC.",
    whoItsFor:
      "Auto techs and shop workers who service vehicle A/C systems.",
    prerequisites: "Basic automotive repair knowledge helpful",
    howToStart: [
      "Complete an EPA-approved Section 609 training program",
      "Pass the Section 609 exam",
      "Receive your certification credentials",
      "Present them when buying refrigerant or applying to auto shops",
    ],
    relatedSkills: ["career"],
  },
  {
    id: "cpr-first-aid",
    name: "CPR / First Aid / AED",
    provider: "American Red Cross / AHA",
    category: "Trades",
    cost: "$",
    time: "1 day",
    payoff: "Job-site & caregiver requirement",
    url: "https://www.redcross.org/take-a-class/cpr",
    overview:
      "Hands-on certification in adult/child CPR, AED use, and basic first aid. Required or preferred for construction, coaching, caregiving, schools, and many workplaces. Offered by American Red Cross, American Heart Association, and authorized training centers.",
    whoItsFor:
      "Workers in trades, childcare, fitness, education, and safety-sensitive jobs.",
    prerequisites: "None",
    howToStart: [
      "Find a Red Cross or AHA class near you (or blended online + skills session)",
      "Complete the coursework and skills practice",
      "Pass the skills check",
      "Carry your digital or printed certification card",
    ],
    relatedSkills: ["health", "career", "family"],
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
    overview:
      "State-issued commercial driver’s license required to operate commercial motor vehicles. Typically involves ELDT theory, behind-the-wheel training, knowledge tests, and skills tests; Class A is most common for over-the-road trucking. Pay varies widely by route, experience, and employer.",
    whoItsFor:
      "People seeking trucking, logistics, or heavy-equipment driving careers.",
    prerequisites: "Valid driver’s license, age and medical (DOT physical) requirements vary by state",
    howToStart: [
      "Review FMCSA CDL requirements and your state DMV process",
      "Get a DOT medical certificate and learner’s permit as required",
      "Complete ELDT training through a registered provider or truck school",
      "Pass knowledge and skills tests to earn your CDL (add endorsements as needed)",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "servsafe-manager",
    name: "ServSafe Manager",
    provider: "National Restaurant Association",
    category: "Trades",
    cost: "$",
    time: "1-2 days",
    payoff: "Kitchen manager / food service leadership",
    url: "https://www.servsafe.com/ServSafe-Manager",
    overview:
      "Food protection manager certification covering foodborne illness prevention, HACCP concepts, and facility sanitation. Accepted or required by many health departments for managers. More advanced than Food Handler and often needed to open or supervise a kitchen.",
    whoItsFor:
      "Kitchen managers, restaurant owners, and supervisors responsible for food safety compliance.",
    prerequisites: "Food Handler knowledge helpful",
    howToStart: [
      "Purchase ServSafe Manager training and exam access",
      "Study the Manager materials (online or instructor-led)",
      "Pass the ServSafe Manager exam",
      "Register your certificate with your local health department if required",
    ],
    relatedSkills: ["career", "health", "wealth"],
  },

  // ── Finance ───────────────────────────────────────────
  {
    id: "quickbooks-online",
    name: "QuickBooks Online Certification",
    provider: "Intuit ProAdvisor Academy",
    category: "Finance",
    cost: "Free",
    time: "1-3 weeks",
    payoff: "Bookkeeping gigs · small-biz ops",
    url: "https://quickbooks.intuit.com/accountants/training-certification/",
    overview:
      "Intuit’s free ProAdvisor training and certification path for QuickBooks Online. Covers bookkeeping workflows, reporting, and client file management. Useful for freelance bookkeepers and small-business operators.",
    whoItsFor:
      "Aspiring bookkeepers, accountants, and small-business owners using QBO.",
    prerequisites: "Basic accounting vocabulary helpful",
    howToStart: [
      "Join Intuit ProAdvisor Academy / training portal",
      "Complete QuickBooks Online training modules",
      "Pass the certification exam(s)",
      "List ProAdvisor credentials for clients and employers",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "bookkeeping-cert",
    name: "Bookkeeping Professional",
    provider: "Intuit / Coursera",
    category: "Finance",
    cost: "$",
    time: "2-4 months",
    payoff: "Bookkeeper · $40-55k",
    url: "https://www.coursera.org/professional-certificates/intuit-bookkeeping",
    overview:
      "Intuit’s Coursera professional certificate covering bookkeeping fundamentals, accounting cycle, and QuickBooks practice. Built for people aiming at bookkeeping jobs or freelance clients. More structured than badge-only QuickBooks training.",
    whoItsFor:
      "Career changers targeting bookkeeping and small-business finance support roles.",
    prerequisites: "Basic computer and math skills",
    howToStart: [
      "Enroll in the Intuit Bookkeeping Professional Certificate on Coursera",
      "Complete courses on accounting basics and QuickBooks",
      "Finish projects that demonstrate ledger and reporting skills",
      "Pursue QuickBooks Online certification and bookkeeping gigs",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "microsoft-excel-associate",
    name: "Microsoft Office Specialist · Excel",
    provider: "Microsoft / Certiport",
    category: "Finance",
    cost: "$",
    time: "2-6 weeks",
    payoff: "Office / admin · data entry edge",
    url: "https://learn.microsoft.com/credentials/certifications/mos-excel-associate-m365-apps/",
    overview:
      "Microsoft Office Specialist Associate certification for Excel, validating formulas, charts, tables, and workbook management. Exam delivered via Certiport. A practical credential for admin, finance ops, and analyst-adjacent roles.",
    whoItsFor:
      "Office workers, admins, and students who need proof of Excel proficiency.",
    prerequisites: "Basic computer skills; some Excel experience recommended",
    howToStart: [
      "Study MOS Excel Associate objectives on Microsoft Learn",
      "Practice in Excel with sample workbooks",
      "Locate a Certiport testing center or online exam option",
      "Pass the MOS Excel Associate exam",
    ],
    relatedSkills: ["career", "wealth"],
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
    overview:
      "Uniform Investment Adviser Law Examination used by most U.S. states for investment adviser representative registration. Covers economics, investment vehicles, client recommendations, and ethics. Pay and outcomes vary widely with firm, licenses, and production.",
    whoItsFor:
      "People pursuing investment adviser roles (RIA / advisory firms).",
    prerequisites: "Sponsorship not required for Series 65; check state registration rules",
    howToStart: [
      "Confirm your state’s investment adviser representative requirements",
      "Study with a reputable Series 65 prep provider",
      "Schedule the exam via FINRA Test Enrollment",
      "Pass the exam and complete state registration steps with your firm",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "finra-sie",
    name: "Securities Industry Essentials (SIE)",
    provider: "FINRA",
    category: "Finance",
    cost: "$",
    time: "2-6 weeks",
    payoff: "Brokerage career entry · pairs with Series exams",
    url: "https://www.finra.org/registration-exams-ce/qualification-exams/sie",
    overview:
      "Introductory FINRA exam on securities industry basics, products, markets, and regulatory structure. Anyone 18+ can take it without firm sponsorship. Often combined later with Series 7 or Series 6 for registered representative roles.",
    whoItsFor:
      "Students and career changers exploring brokerage or wealth-management careers.",
    prerequisites: "None (must be 18+)",
    howToStart: [
      "Review the SIE content outline on FINRA.org",
      "Study with FINRA materials or a prep course",
      "Enroll and schedule the SIE exam",
      "Pass the SIE, then pursue a sponsored Series exam if targeting RR roles",
    ],
    relatedSkills: ["career", "wealth", "mindset"],
  },
  {
    id: "bloomberg-bmc",
    name: "Bloomberg Market Concepts (BMC)",
    provider: "Bloomberg",
    category: "Finance",
    cost: "Free",
    time: "8-12 hours",
    payoff: "Finance internship / analyst resume signal",
    url: "https://www.bloomberg.com/markets/bmc",
    overview:
      "Self-paced e-learning certificate covering economics, currencies, fixed income, equities, and Bloomberg Terminal essentials. Often available free through universities or Bloomberg for Education partners. Recognized by finance recruiters as market literacy proof.",
    whoItsFor:
      "Students and career changers aiming at finance internships or analyst pipelines.",
    prerequisites: "Access via a participating school, library, or Bloomberg program",
    howToStart: [
      "Obtain BMC access through your school or a Bloomberg education partner",
      "Complete all BMC modules and assessments",
      "Download your BMC certificate",
      "List it on your resume when applying to finance roles",
    ],
    relatedSkills: ["career", "wealth"],
  },

  // ── Creative ──────────────────────────────────────────
  {
    id: "google-ux-design",
    name: "Google UX Design",
    provider: "Coursera / Google",
    category: "Creative",
    cost: "$",
    time: "4-6 months",
    payoff: "Junior UX · $55-80k",
    url: "https://www.coursera.org/professional-certificates/google-ux-design",
    overview:
      "Google’s professional certificate teaching UX process: empathy research, wireframes, prototypes, and Figma-based portfolio projects. Built for junior UX designer readiness. Includes multiple end-to-end case studies.",
    whoItsFor:
      "Career changers targeting junior UX / product design roles.",
    prerequisites: "Basic computer skills",
    howToStart: [
      "Enroll in the Google UX Design Professional Certificate on Coursera",
      "Complete courses and build Figma case studies",
      "Publish 2–3 polished case studies in a portfolio",
      "Apply to junior UX roles with the certificate and portfolio linked",
    ],
    relatedSkills: ["career", "wealth", "mindset"],
  },
  {
    id: "adobe-acp-photoshop",
    name: "Adobe Certified Professional · Photoshop",
    provider: "Adobe",
    category: "Creative",
    cost: "$",
    time: "1-2 months",
    payoff: "Design freelance · $25-60/hr",
    url: "https://learning.adobe.com/certification.html",
    overview:
      "Industry exam validating Photoshop skills for digital imaging, compositing, and production workflows. Administered as Adobe Certified Professional (ACP). Useful for designers, marketers, and freelancers who need proof of tool proficiency.",
    whoItsFor:
      "Graphic designers, photographers, and creatives seeking a formal Photoshop credential.",
    prerequisites: "Working knowledge of Photoshop recommended",
    howToStart: [
      "Review ACP Photoshop exam objectives on Adobe Learning",
      "Practice with real design projects in Photoshop",
      "Take an official practice test if available",
      "Schedule and pass the Adobe Certified Professional exam",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "adobe-acp-illustrator",
    name: "Adobe Certified Professional · Illustrator",
    provider: "Adobe",
    category: "Creative",
    cost: "$",
    time: "1-2 months",
    payoff: "Logo / vector design freelance edge",
    url: "https://learning.adobe.com/certification.html",
    overview:
      "Adobe Certified Professional exam focused on Illustrator for vector graphics, branding assets, and print/digital illustration workflows. Complements Photoshop ACP for full graphic design credibility. Recognized by creative employers and clients.",
    whoItsFor:
      "Graphic designers and brand freelancers specializing in logos and vector art.",
    prerequisites: "Working knowledge of Illustrator recommended",
    howToStart: [
      "Study ACP Illustrator objectives on Adobe Learning",
      "Build sample logos, icons, and illustration pieces",
      "Take practice materials",
      "Pass the Adobe Certified Professional Illustrator exam",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "canva-design",
    name: "Canva Design School Certifications",
    provider: "Canva",
    category: "Creative",
    cost: "Free",
    time: "1-2 weeks",
    payoff: "Marketing design basics · side-hustle visuals",
    url: "https://www.canva.com/designschool/courses/",
    overview:
      "Free Canva Design School courses and certifications covering visual design principles, Canva workflows, and marketing creative. Lower barrier than Adobe ACP but practical for social and small-business content. Certificates can be shared on LinkedIn.",
    whoItsFor:
      "Marketers, entrepreneurs, and beginners who design social and presentation graphics.",
    prerequisites: "None",
    howToStart: [
      "Create a free Canva account",
      "Open Canva Design School courses",
      "Complete a certification pathway and quiz",
      "Download your certificate and apply skills to real brand assets",
    ],
    relatedSkills: ["career", "wealth"],
  },
  {
    id: "meta-marketing-analytics",
    name: "Meta Marketing Analytics",
    provider: "Coursera / Meta",
    category: "Creative",
    cost: "$",
    time: "1-3 months",
    payoff: "Ads reporting / growth marketing edge",
    url: "https://www.coursera.org/professional-certificates/facebook-marketing-analytics",
    overview:
      "Meta professional certificate focused on measuring marketing performance, statistics basics, and using data to improve campaigns. Bridges creative marketing with analytics for growth roles. Useful alongside Meta ads and social certificates.",
    whoItsFor:
      "Marketers who want stronger analytics skills for Meta and digital campaigns.",
    prerequisites: "Basic marketing or spreadsheet skills recommended",
    howToStart: [
      "Enroll in the Meta Marketing Analytics Professional Certificate on Coursera",
      "Complete statistics and measurement courses",
      "Practice interpreting campaign data",
      "Add the certificate when applying to growth or ads analyst roles",
    ],
    relatedSkills: ["career", "wealth"],
  },

  // ── Health ────────────────────────────────────────────
  {
    id: "nasm-cpt",
    name: "NASM Certified Personal Trainer (CPT)",
    provider: "National Academy of Sports Medicine",
    category: "Health",
    cost: "$$$",
    time: "3-6 months",
    payoff: "Personal training · often $20-45/hr or studio salary",
    url: "https://www.nasm.org/certification/personal-trainer",
    overview:
      "Widely recognized personal trainer certification based on NASM’s Optimum Performance Training model. Covers assessment, program design, nutrition basics, and professional practice. Required or preferred by many gyms; verify current exam and CPR requirements.",
    whoItsFor:
      "Aspiring personal trainers and fitness coaches seeking gym employment or clients.",
    prerequisites: "High school diploma/GED typical; CPR/AED often required before or soon after",
    howToStart: [
      "Choose an NASM CPT program package on nasm.org",
      "Complete the self-study or guided coursework",
      "Earn/renew CPR/AED as required",
      "Pass the NASM CPT exam and apply to gyms or start training clients",
    ],
    relatedSkills: ["health", "career", "wealth"],
  },
  {
    id: "mental-health-first-aid",
    name: "Mental Health First Aid",
    provider: "National Council for Mental Wellbeing",
    category: "Health",
    cost: "$",
    time: "8 hours",
    payoff: "Care / education / workplace support credential",
    url: "https://www.mentalhealthfirstaid.org/",
    overview:
      "Evidence-based training on recognizing and responding to mental health and substance use challenges until professional help is available. Adult and Youth courses available through certified instructors. Valued in schools, healthcare support, and community roles—not a clinical license.",
    whoItsFor:
      "Teachers, managers, caregivers, coaches, and community volunteers.",
    prerequisites: "None",
    howToStart: [
      "Find an Adult or Youth Mental Health First Aid course near you",
      "Complete the instructor-led training (in-person or blended)",
      "Receive your MHFA certificate (typically valid for 3 years)",
      "List it for education, caregiving, or workplace wellness roles",
    ],
    relatedSkills: ["health", "family", "mindset", "career"],
  },
  {
    id: "ptcb-cpht",
    name: "Certified Pharmacy Technician (CPhT)",
    provider: "PTCB",
    category: "Health",
    cost: "$$",
    time: "2-6 months",
    payoff: "Pharmacy tech roles · often $35-50k",
    url: "https://www.ptcb.org/credentials/certified-pharmacy-technician",
    overview:
      "Pharmacy Technician Certification Board credential widely used for retail and hospital pharmacy technician roles. Requires meeting PTCB eligibility (education/training pathway) and passing the PTCE. State registration/licensure rules still apply separately.",
    whoItsFor:
      "People entering pharmacy technician careers in retail or health systems.",
    prerequisites: "High school diploma/GED and PTCB-recognized education or equivalent pathway",
    howToStart: [
      "Confirm your state’s pharmacy technician requirements",
      "Complete an eligible training program or PTCB-recognized pathway",
      "Apply for and pass the PTCE",
      "Register with your state board as required and apply to pharmacies",
    ],
    relatedSkills: ["health", "career", "wealth"],
  },
  {
    id: "nha-ccma",
    name: "Certified Clinical Medical Assistant (CCMA)",
    provider: "National Healthcareer Association (NHA)",
    category: "Health",
    cost: "$$",
    time: "3-9 months",
    payoff: "Medical assistant roles · often $35-45k",
    url: "https://www.nhanow.com/certification/nha-certifications/certified-clinical-medical-assistant-(ccma)",
    overview:
      "NHA certification for clinical medical assistants covering patient care, vitals, phlebotomy/EKG basics, and administrative support concepts. Common pathway into clinics and outpatient settings. Program length varies by school; exam fee is separate.",
    whoItsFor:
      "Students and career changers entering allied health as medical assistants.",
    prerequisites: "Typically a training program + high school diploma/GED; check NHA eligibility",
    howToStart: [
      "Enroll in a medical assisting program that prepares for CCMA",
      "Complete clinical and administrative coursework",
      "Apply for the NHA CCMA exam",
      "Pass the exam and apply to clinic MA openings",
    ],
    relatedSkills: ["health", "career", "wealth"],
  },
  {
    id: "aha-bls",
    name: "Basic Life Support (BLS) Provider",
    provider: "American Heart Association",
    category: "Health",
    cost: "$",
    time: "4-5 hours",
    payoff: "Healthcare & clinical job requirement",
    url: "https://cpr.heart.org/en/cpr-courses-and-kits/healthcare-professional/basic-life-support-bls-training",
    overview:
      "AHA BLS Provider training for healthcare professionals covering high-quality CPR, AED use, and team dynamics for adults, children, and infants. Often required for clinical students, medical assistants, and hospital staff. Distinct from standard community CPR courses.",
    whoItsFor:
      "Healthcare workers, clinical students, and allied health job seekers.",
    prerequisites: "None (aimed at healthcare providers)",
    howToStart: [
      "Find an AHA BLS Provider course via an authorized training center",
      "Complete classroom or HeartCode blended learning plus skills session",
      "Pass the skills test",
      "Carry your BLS Provider eCard for clinical employers",
    ],
    relatedSkills: ["health", "career"],
  },
];

export function getCertificationById(id: string): Certification | undefined {
  return CERTIFICATIONS.find((c) => c.id === id);
}
