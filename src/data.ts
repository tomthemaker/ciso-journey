import type { Phase, LearningResource } from "./types";

export const phases: Phase[] = [
  {
    id: "p1",
    months: "1–3",
    name: "Security foundations & architecture",
    desc: "Understand core security concepts and the enterprise control landscape.",
    tasks: [
      [
        "w1",
        "Week 1 · CIA triad, assets, threats, vulnerabilities, controls",
        "Produce a security vocabulary and concept map",
      ],
      [
        "w2",
        "Week 2 · Authentication, authorization, IAM, MFA, PAM",
        "Draw an identity-security reference architecture",
      ],
      [
        "w3",
        "Week 3 · Networking, segmentation, endpoints, Zero Trust",
        "Create an enterprise security architecture diagram",
      ],
      [
        "w4",
        "Week 4 · Encryption, classification, backups and recovery",
        "Draft a data protection control assessment",
      ],
      [
        "w5",
        "Week 5 · Cloud, containers and supply-chain security",
        "Review shared-responsibility and key AWS/Azure risks",
      ],
      [
        "w6",
        "Week 6 · Threat modeling and common attack paths",
        "Document five realistic threat scenarios",
      ],
      [
        "w7",
        "Week 7 · NIST CSF 2.0 functions and categories",
        "Create an initial security capability map",
      ],
      [
        "w8",
        "Week 8 · NIST CSF organizational profiles",
        "Draft a current vs target capability profile",
      ],
      [
        "w9",
        "Week 9 · Governance structures, policies, decisions",
        "Draft a security governance charter",
      ],
      [
        "w10",
        "Week 10 · Likelihood, impact and risk treatment",
        "Start an enterprise risk register",
      ],
      [
        "w11",
        "Week 11 · Security metrics and indicators",
        "Create an executive security scorecard",
      ],
      [
        "w12",
        "Week 12 · Integrated security assessment",
        "Deliver a short CISO assessment report",
      ],
    ],
  },
  {
    id: "p2",
    months: "4–6",
    name: "Cybersecurity governance & enterprise risk",
    desc: "Govern security, define accountability and communicate risk in business terms.",
    tasks: [
      [
        "p2a",
        "Study NIST CSF Govern function and COBIT principles",
        "Define responsibilities and decision rights",
      ],
      [
        "p2b",
        "Study risk appetite, tolerance, ownership and acceptance",
        "Write an enterprise risk management policy",
      ],
      [
        "p2c",
        "Practice FAIR-style risk scenarios and uncertainty",
        "Quantify or range-estimate three loss scenarios",
      ],
      [
        "p2d",
        "Create risk taxonomy and prioritization criteria",
        "Build a risk register with treatment decisions",
      ],
      [
        "p2e",
        "Produce a board-level governance report",
        "Explain top risks, decisions and owners",
      ],
    ],
  },
  {
    id: "p3",
    months: "7–9",
    name: "Compliance, ISMS & assurance",
    desc: "Learn to build an information security management system and prove control effectiveness.",
    tasks: [
      [
        "p3a",
        "Study ISO/IEC 27001 and 27002",
        "Define ISMS scope and policy hierarchy",
      ],
      [
        "p3b",
        "Learn control selection and statement of applicability",
        "Create a sample control mapping",
      ],
      [
        "p3c",
        "Study audit planning and evidence collection",
        "Run a mock control gap assessment",
      ],
      [
        "p3d",
        "Review Swiss FADP, GDPR, NIS2, DORA and AI Act applicability",
        "Create a regulatory obligation register",
      ],
      [
        "p3e",
        "Build an ISMS management review package",
        "Draft a remediation and audit calendar",
      ],
    ],
  },
  {
    id: "p4",
    months: "10–12",
    name: "Security operations, incidents & resilience",
    desc: "Understand oversight of detection, response, recovery and critical-service resilience.",
    tasks: [
      [
        "p4a",
        "Study SOC models, detection and vulnerability management",
        "Define security operations KPIs and ownership",
      ],
      [
        "p4b",
        "Study NIST incident response guidance",
        "Draft severity levels and escalation matrix",
      ],
      [
        "p4c",
        "Study crisis management and communication",
        "Prepare ransomware decision exercise",
      ],
      [
        "p4d",
        "Learn business impact analysis, RTO, RPO and recovery",
        "Create critical service recovery priorities",
      ],
      [
        "p4e",
        "Conduct an incident tabletop",
        "Write an after-action and improvement report",
      ],
    ],
  },
  {
    id: "p5",
    months: "13–15",
    name: "Security strategy, finance & leadership",
    desc: "Practice strategy, investment prioritization and influencing executive stakeholders.",
    tasks: [
      [
        "p5a",
        "Design security organization and operating model",
        "Define roles, committees and sourcing choices",
      ],
      [
        "p5b",
        "Develop three-year security strategy",
        "Prioritize investments and milestones",
      ],
      [
        "p5c",
        "Build a risk-based security budget",
        "Create two investment business cases",
      ],
      [
        "p5d",
        "Design executive security performance reporting",
        "Build a board dashboard and narrative",
      ],
      [
        "p5e",
        "Present strategy and risk tradeoffs",
        "Produce a board-level decision memo",
      ],
    ],
  },
  {
    id: "p6",
    months: "16–18",
    name: "CISO readiness & transition",
    desc: "Demonstrate accountability, validate capability and prepare for senior security leadership.",
    tasks: [
      [
        "p6a",
        "Reassess all six competencies with evidence",
        "Document demonstrated strengths and remaining gaps",
      ],
      [
        "p6b",
        "Review CISM and CISSP eligibility and exam readiness",
        "Choose realistic exam dates if appropriate",
      ],
      [
        "p6c",
        "Lead or contribute to a real security/GRC initiative",
        "Record measurable organizational impact",
      ],
      [
        "p6d",
        "Compile executive security portfolio",
        "Package strategy, risk, ISMS, incident and board artifacts",
      ],
      [
        "p6e",
        "Practice CISO interview and board scenarios",
        "Write a 90-day plan for your first CISO-track role",
      ],
    ],
  },
];
export const taskLearningResources: Record<string, LearningResource> = {
  w1: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF 2.0",
    officialUrl: "https://www.nist.gov/cyberframework",
    searchTerms: "CIA triad cybersecurity fundamentals",
    focus:
      "Learn how assets, threats, vulnerabilities and controls form a risk scenario.",
  },
  w2: {
    linkedinTitle: "Cybersecurity Fundamentals learning path",
    linkedinUrl:
      "https://www.linkedin.com/learning/paths/cybersecurity-fundamentals",
    officialTitle: "NIST Zero Trust Architecture",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/207/final",
    searchTerms: "identity access management privileged access security",
    focus:
      "Focus on the distinction between identity, authentication, authorization and privileges.",
  },
  w3: {
    linkedinTitle: "Cybersecurity Fundamentals learning path",
    linkedinUrl:
      "https://www.linkedin.com/learning/paths/cybersecurity-fundamentals",
    officialTitle: "NIST Zero Trust Architecture",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/207/final",
    searchTerms: "network security segmentation zero trust architecture",
    focus: "Identify trust boundaries and the controls that enforce them.",
  },
  w4: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF 2.0",
    officialUrl: "https://www.nist.gov/cyberframework",
    searchTerms: "encryption data protection backup recovery cybersecurity",
    focus: "Explain data protection obligations and control ownership.",
  },
  w5: {
    linkedinTitle: "Cybersecurity Fundamentals learning path",
    linkedinUrl:
      "https://www.linkedin.com/learning/paths/cybersecurity-fundamentals",
    officialTitle: "AWS Well-Architected Security Pillar",
    officialUrl:
      "https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html",
    searchTerms: "cloud security shared responsibility containers supply chain",
    focus:
      "Contrast provider and customer responsibilities, including third parties.",
  },
  w6: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "MITRE ATT&CK",
    officialUrl: "https://attack.mitre.org/",
    searchTerms: "threat modeling attack paths cybersecurity",
    focus: "Connect potential attacks to business assets and potential impact.",
  },
  w7: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF 2.0",
    officialUrl: "https://www.nist.gov/cyberframework",
    searchTerms: "NIST cybersecurity framework 2.0",
    focus: "Understand Govern, Identify, Protect, Detect, Respond and Recover.",
  },
  w8: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF Quick Starts",
    officialUrl: "https://www.nist.gov/cyberframework/quick-start-guides",
    searchTerms: "NIST CSF organizational profiles maturity assessment",
    focus: "Compare current capability with a risk-informed target profile.",
  },
  w9: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF Govern function",
    officialUrl: "https://www.nist.gov/cyberframework",
    searchTerms: "information security governance policies risk committees",
    focus: "Document decision rights and escalation paths.",
  },
  w10: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF / enterprise risk guidance",
    officialUrl: "https://www.nist.gov/cyberframework/quick-start-guides",
    searchTerms:
      "cybersecurity risk assessment likelihood impact risk treatment",
    focus: "Separate likelihood, consequence and risk acceptance.",
  },
  w11: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF 2.0",
    officialUrl: "https://www.nist.gov/cyberframework",
    searchTerms: "security metrics KRI KPI executive dashboard",
    focus: "Choose measures linked to important business outcomes.",
  },
  w12: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF Quick Starts",
    officialUrl: "https://www.nist.gov/cyberframework/quick-start-guides",
    searchTerms: "cybersecurity assessment executive security report",
    focus: "Synthesize findings into three actionable executive decisions.",
  },
  p2a: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "COBIT at ISACA",
    officialUrl: "https://www.isaca.org/resources/cobit",
    searchTerms: "COBIT governance cybersecurity NIST govern",
    focus: "Distinguish governance oversight from management execution.",
  },
  p2b: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF Govern guidance",
    officialUrl: "https://www.nist.gov/cyberframework/quick-start-guides",
    searchTerms: "cyber risk appetite tolerance risk acceptance",
    focus: "Write a clear risk-acceptance authority matrix.",
  },
  p2c: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "FAIR Institute",
    officialUrl: "https://www.fairinstitute.org/",
    searchTerms: "FAIR quantitative cyber risk analysis",
    focus: "Use defensible ranges and state uncertainty explicitly.",
  },
  p2d: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF 2.0",
    officialUrl: "https://www.nist.gov/cyberframework",
    searchTerms: "risk register risk taxonomy risk prioritization",
    focus: "Connect every material risk with owner, controls and treatment.",
  },
  p2e: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF Quick Starts",
    officialUrl: "https://www.nist.gov/cyberframework/quick-start-guides",
    searchTerms: "cybersecurity board reporting risk communication",
    focus: "Make the board report decision-oriented.",
  },
  p3a: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "ISO/IEC 27001",
    officialUrl: "https://www.iso.org/standard/27001",
    searchTerms: "ISO 27001 ISMS foundations",
    focus:
      "Distinguish ISO 27001 requirements from ISO 27002 implementation guidance.",
  },
  p3b: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "ISO/IEC 27001",
    officialUrl: "https://www.iso.org/standard/27001",
    searchTerms: "ISO 27001 statement of applicability controls",
    focus: "Document why controls are included or excluded.",
  },
  p3c: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "ISO/IEC 27001",
    officialUrl: "https://www.iso.org/standard/27001",
    searchTerms: "ISO 27001 internal audit evidence controls",
    focus: "Evaluate both control design and operating effectiveness.",
  },
  p3d: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "EDPB guidance",
    officialUrl: "https://www.edpb.europa.eu/",
    searchTerms: "GDPR NIS2 DORA FADP AI Act cybersecurity compliance",
    focus: "Assess applicability by jurisdiction, sector and legal entity.",
  },
  p3e: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "ISO/IEC 27001",
    officialUrl: "https://www.iso.org/standard/27001",
    searchTerms: "ISO 27001 management review audit corrective action",
    focus: "Prepare owners, deadlines and evidence for corrective actions.",
  },
  p4a: {
    linkedinTitle: "Foundations of Cybersecurity Operations",
    linkedinUrl:
      "https://www.linkedin.com/learning/foundations-of-cybersecurity-operations",
    officialTitle: "NIST CSF Detect function",
    officialUrl: "https://www.nist.gov/cyberframework",
    searchTerms: "security operations center SOC vulnerability management",
    focus:
      "Define detection coverage, escalation and meaningful operational metrics.",
  },
  p4b: {
    linkedinTitle: "Foundations of Cybersecurity Operations",
    linkedinUrl:
      "https://www.linkedin.com/learning/foundations-of-cybersecurity-operations",
    officialTitle: "NIST SP 800-61 Rev. 3",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/61/r3/final",
    searchTerms: "incident response playbook severity escalation",
    focus: "Link severity to organizational impact and decision authority.",
  },
  p4c: {
    linkedinTitle: "Foundations of Cybersecurity Operations",
    linkedinUrl:
      "https://www.linkedin.com/learning/foundations-of-cybersecurity-operations",
    officialTitle: "NIST incident response guidance",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/61/r3/final",
    searchTerms: "cyber incident crisis communications ransomware",
    focus: "Practice tradeoffs across legal, communications and operations.",
  },
  p4d: {
    linkedinTitle: "Foundations of Cybersecurity Operations",
    linkedinUrl:
      "https://www.linkedin.com/learning/foundations-of-cybersecurity-operations",
    officialTitle: "NIST Contingency Planning",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final",
    searchTerms: "business continuity business impact analysis RTO RPO",
    focus: "Prioritize critical services rather than just IT systems.",
  },
  p4e: {
    linkedinTitle: "Foundations of Cybersecurity Operations",
    linkedinUrl:
      "https://www.linkedin.com/learning/foundations-of-cybersecurity-operations",
    officialTitle: "NIST incident response guidance",
    officialUrl: "https://csrc.nist.gov/pubs/sp/800/61/r3/final",
    searchTerms: "cybersecurity tabletop exercise incident response",
    focus: "Capture decisions, lessons learned and accountable actions.",
  },
  p5a: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF Govern function",
    officialUrl: "https://www.nist.gov/cyberframework",
    searchTerms: "CISO security operating model team organization",
    focus: "Make roles, RACI and sourcing choices explicit.",
  },
  p5b: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF organizational profiles",
    officialUrl: "https://www.nist.gov/cyberframework/quick-start-guides",
    searchTerms: "cybersecurity strategy roadmap executive leadership",
    focus: "Map strategic initiatives to risk reduction and business goals.",
  },
  p5c: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "FAIR Institute",
    officialUrl: "https://www.fairinstitute.org/",
    searchTerms: "cybersecurity budget business case risk quantification",
    focus: "Compare security investment scenarios and residual risks.",
  },
  p5d: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF 2.0",
    officialUrl: "https://www.nist.gov/cyberframework",
    searchTerms: "board cybersecurity dashboards KRIs KPI",
    focus: "Make reported metrics traceable to risk treatment decisions.",
  },
  p5e: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF 2.0",
    officialUrl: "https://www.nist.gov/cyberframework",
    searchTerms: "CISO executive communication board presentation",
    focus:
      "Communicate one recommendation, alternatives, tradeoffs and an ask.",
  },
  p6a: {
    linkedinTitle: "Cybersecurity Fundamentals learning path",
    linkedinUrl:
      "https://www.linkedin.com/learning/paths/cybersecurity-fundamentals",
    officialTitle: "ISC2 CISSP domains",
    officialUrl: "https://www.isc2.org/certifications/cissp",
    searchTerms: "cybersecurity competency assessment leadership",
    focus: "Support scores with work products and feedback.",
  },
  p6b: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "ISACA CISM certification",
    officialUrl: "https://www.isaca.org/credentialing/cism",
    searchTerms: "CISM CISSP certification exam prep",
    focus: "Audit experience eligibility before choosing an exam date.",
  },
  p6c: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF organizational profiles",
    officialUrl: "https://www.nist.gov/cyberframework/quick-start-guides",
    searchTerms: "cybersecurity GRC program implementation",
    focus: "Prioritize demonstrated business impact over course completions.",
  },
  p6d: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "NIST CSF 2.0",
    officialUrl: "https://www.nist.gov/cyberframework",
    searchTerms: "CISO professional portfolio security strategy",
    focus: "Build a concise evidence-based leadership portfolio.",
  },
  p6e: {
    linkedinTitle: "Cybersecurity Foundations",
    linkedinUrl:
      "https://www.linkedin.com/learning/cybersecurity-foundations-22006082",
    officialTitle: "ISACA CISM",
    officialUrl: "https://www.isaca.org/credentialing/cism",
    searchTerms: "CISO interview executive cybersecurity strategy",
    focus: "Prepare a realistic 90-day leadership plan.",
  },
};
export const competencies: [string, number][] = [
  ["Security architecture", 0],
  ["Cyber-risk management", 1],
  ["Governance", 0],
  ["Compliance", 0],
  ["Security operations", 0],
  ["Executive reporting", 2],
];
export const resources: [string, string, string][] = [
  [
    "NIST Cybersecurity Framework 2.0",
    "https://www.nist.gov/cyberframework",
    "Primary governance and security-capability map",
  ],
  [
    "NIST CSF Quick Start Guides",
    "https://www.nist.gov/cyberframework/quick-start-guides",
    "Profiles, tiers and implementation guidance",
  ],
  [
    "NIST Zero Trust Architecture",
    "https://csrc.nist.gov/pubs/sp/800/207/final",
    "Security architecture principles",
  ],
  [
    "NIST Incident Response Guidance",
    "https://csrc.nist.gov/pubs/sp/800/61/r3/final",
    "Response and recovery governance",
  ],
  [
    "ISO 27001",
    "https://www.iso.org/standard/27001",
    "ISMS reference; full standard may require purchase",
  ],
  [
    "ISC2 CISSP",
    "https://www.isc2.org/certifications/cissp",
    "Security knowledge domains and certification",
  ],
  [
    "ISACA CISM",
    "https://www.isaca.org/credentialing/cism",
    "Security management certification",
  ],
  [
    "ISACA CRISC",
    "https://www.isaca.org/credentialing/crisc",
    "Risk management specialization",
  ],
  [
    "ENISA",
    "https://www.enisa.europa.eu/",
    "European cyber threat and regulatory guidance",
  ],
];
