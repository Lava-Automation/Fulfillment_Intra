// Course catalog, categories, and skill taxonomy — ported from the mockup.
export const CATALOG = {
  "agencyzoom-mastery": {
    "name": "LAVA AgencyZoom Mastery",
    "category": "crm",
    "desc": "Full AgencyZoom build track for combo VAs. Form templates, CRM setup, Zapier automations, and client handoff workflows.",
    "cert": true,
    "skill": {
      "name": "AgencyZoom",
      "cat": "crm"
    },
    "modules": [
      {
        "id": "az_m0",
        "name": "Getting Started",
        "lessons": [
          {
            "id": "az_m0_l0",
            "name": "Welcome & Onboarding",
            "gate": null,
            "blocks": [
              {
                "id": "az_m0_l0_b0",
                "type": "text"
              }
            ]
          },
          {
            "id": "az_m0_l1",
            "name": "Platform Tour",
            "gate": null,
            "blocks": [
              {
                "id": "az_m0_l1_b0",
                "type": "video"
              }
            ]
          }
        ]
      },
      {
        "id": "az_m1",
        "name": "Form Templates",
        "lessons": [
          {
            "id": "az_m1_l0",
            "name": "Setup & Import",
            "gate": null,
            "blocks": [
              {
                "id": "az_m1_l0_b0",
                "type": "video"
              }
            ]
          },
          {
            "id": "az_m1_l1",
            "name": "Updates & Refinements",
            "gate": null,
            "blocks": [
              {
                "id": "az_m1_l1_b0",
                "type": "text"
              }
            ]
          },
          {
            "id": "az_m1_l2",
            "name": "Forms Check",
            "gate": "pass",
            "blocks": [
              {
                "id": "az_m1_l2_b0",
                "type": "quiz"
              }
            ]
          }
        ]
      },
      {
        "id": "az_m2",
        "name": "CRM Build",
        "lessons": [
          {
            "id": "az_m2_l0",
            "name": "CRM Setup for Clients",
            "gate": null,
            "blocks": [
              {
                "id": "az_m2_l0_b0",
                "type": "video"
              }
            ]
          },
          {
            "id": "az_m2_l1",
            "name": "Templates: Updates",
            "gate": null,
            "blocks": [
              {
                "id": "az_m2_l1_b0",
                "type": "text"
              }
            ]
          }
        ]
      },
      {
        "id": "az_m3",
        "name": "Automations",
        "lessons": [
          {
            "id": "az_m3_l0",
            "name": "Zapier: Build & Optimize",
            "gate": "watch90",
            "blocks": [
              {
                "id": "az_m3_l0_b0",
                "type": "video"
              }
            ]
          },
          {
            "id": "az_m3_l1",
            "name": "Zapier Templates",
            "gate": null,
            "blocks": [
              {
                "id": "az_m3_l1_b0",
                "type": "text"
              }
            ]
          },
          {
            "id": "az_m3_l2",
            "name": "Automation Quiz",
            "gate": "pass",
            "blocks": [
              {
                "id": "az_m3_l2_b0",
                "type": "quiz"
              }
            ]
          }
        ]
      },
      {
        "id": "az_m4",
        "name": "Workflows & Handoff",
        "lessons": [
          {
            "id": "az_m4_l0",
            "name": "Sales & Service Workflows",
            "gate": null,
            "blocks": [
              {
                "id": "az_m4_l0_b0",
                "type": "video"
              }
            ]
          },
          {
            "id": "az_m4_l1",
            "name": "Testing & Troubleshooting",
            "gate": null,
            "blocks": [
              {
                "id": "az_m4_l1_b0",
                "type": "text"
              }
            ]
          }
        ]
      }
    ]
  },
  "va-onboarding": {
    "name": "Virtual Assistant Onboarding",
    "category": "general",
    "desc": "Day-one onboarding for every new VA. Tools, access, Lava norms, and how we work.",
    "cert": false,
    "skill": null,
    "modules": [
      {
        "id": "vao_m0",
        "name": "Welcome",
        "lessons": [
          {
            "id": "vao_m0_l0",
            "name": "Tools & Access",
            "gate": null,
            "blocks": [
              {
                "id": "vao_m0_l0_b0",
                "type": "text"
              }
            ]
          },
          {
            "id": "vao_m0_l1",
            "name": "Lava 101",
            "gate": null,
            "blocks": [
              {
                "id": "vao_m0_l1_b0",
                "type": "video"
              }
            ]
          }
        ]
      },
      {
        "id": "vao_m1",
        "name": "Working at Lava",
        "lessons": [
          {
            "id": "vao_m1_l0",
            "name": "Comms Norms",
            "gate": null,
            "blocks": [
              {
                "id": "vao_m1_l0_b0",
                "type": "text"
              }
            ]
          },
          {
            "id": "vao_m1_l1",
            "name": "Time Tracking",
            "gate": null,
            "blocks": [
              {
                "id": "vao_m1_l1_b0",
                "type": "video"
              }
            ]
          }
        ]
      }
    ]
  },
  "insurance-101": {
    "name": "Insurance 101",
    "category": "insurance",
    "desc": "Core insurance fundamentals for gen VAs. Principles, terminology, and the basics of policy servicing.",
    "cert": false,
    "skill": {
      "name": "Insurance Fundamentals",
      "cat": "ins"
    },
    "modules": [
      {
        "id": "ins_m0",
        "name": "Instructions",
        "lessons": [
          {
            "id": "ins_m0_l0",
            "name": "Getting Started",
            "gate": null,
            "blocks": [
              {
                "id": "ins_m0_l0_b0",
                "type": "text",
                "title": "Welcome to Insurance 101",
                "body": "Use this course to build a better understanding of the history of insurance, insurance terminology, the sales process, and more so you can gain insight into the insurance industry.\n\nIf there is a video in the lesson you MUST watch at least 90% before the app lets you continue. At the bottom of each section click \"Complete and Continue\"."
              }
            ]
          },
          {
            "id": "ins_m0_l1",
            "name": "Lesson Recap Instructions",
            "gate": null,
            "blocks": [
              {
                "id": "ins_m0_l1_b0",
                "type": "text",
                "title": "How recaps work",
                "body": "After each lesson you will get a short recap. Review it before moving on."
              }
            ]
          }
        ]
      },
      {
        "id": "ins_m1",
        "name": "Basic Principles of Insurance",
        "lessons": [
          {
            "id": "ins_m1_l0",
            "name": "Basic Principles Explained",
            "gate": null,
            "blocks": [
              {
                "id": "ins_m1_l0_b0",
                "type": "video",
                "label": "Basic Principles Explained",
                "source": ""
              }
            ]
          },
          {
            "id": "ins_m1_l1",
            "name": "Quiz on Basic Principles",
            "gate": "pass",
            "blocks": [
              {
                "id": "ins_m1_l1_b0",
                "type": "text",
                "title": "Before you start",
                "body": "Answer all questions. You must pass to continue."
              },
              {
                "id": "ins_m1_l1_b1",
                "type": "quiz",
                "question": "Which of the following best describes an insurance premium?",
                "options": [
                  {
                    "text": "The amount the insurer pays on a claim",
                    "correct": false
                  },
                  {
                    "text": "The recurring amount the insured pays for coverage",
                    "correct": true
                  },
                  {
                    "text": "The deductible on a policy",
                    "correct": false
                  },
                  {
                    "text": "The agent commission",
                    "correct": false
                  }
                ]
              }
            ]
          },
          {
            "id": "ins_m1_l2",
            "name": "Concepts - Basic Insurance",
            "gate": null,
            "blocks": [
              {
                "id": "ins_m1_l2_b0",
                "type": "video",
                "label": "Core Concepts",
                "source": ""
              }
            ]
          }
        ]
      },
      {
        "id": "ins_m2",
        "name": "Policy & Servicing",
        "lessons": [
          {
            "id": "ins_m2_l0",
            "name": "Policy Lifecycle",
            "gate": null,
            "blocks": [
              {
                "id": "ins_m2_l0_b0",
                "type": "video"
              }
            ]
          },
          {
            "id": "ins_m2_l1",
            "name": "Endorsements",
            "gate": null,
            "blocks": [
              {
                "id": "ins_m2_l1_b0",
                "type": "text"
              }
            ]
          },
          {
            "id": "ins_m2_l2",
            "name": "Servicing Workflows",
            "gate": null,
            "blocks": [
              {
                "id": "ins_m2_l2_b0",
                "type": "video"
              }
            ]
          }
        ]
      },
      {
        "id": "ins_m3",
        "name": "Compliance & Comms",
        "lessons": [
          {
            "id": "ins_m3_l0",
            "name": "Compliance Basics",
            "gate": null,
            "blocks": [
              {
                "id": "ins_m3_l0_b0",
                "type": "pdf"
              }
            ]
          },
          {
            "id": "ins_m3_l1",
            "name": "Client Communication",
            "gate": null,
            "blocks": [
              {
                "id": "ins_m3_l1_b0",
                "type": "text"
              }
            ]
          }
        ]
      }
    ]
  },
  "security-awareness": {
    "name": "Security Awareness – VAs",
    "category": "general",
    "desc": "SOC 2-aligned security basics. Handling client data, phishing, and safe practices.",
    "cert": false,
    "skill": null,
    "modules": [
      {
        "id": "sec_m0",
        "name": "Security Essentials",
        "lessons": [
          {
            "id": "sec_m0_l0",
            "name": "Phishing",
            "gate": null,
            "blocks": [
              {
                "id": "sec_m0_l0_b0",
                "type": "video"
              }
            ]
          },
          {
            "id": "sec_m0_l1",
            "name": "Data Handling",
            "gate": null,
            "blocks": [
              {
                "id": "sec_m0_l1_b0",
                "type": "text"
              }
            ]
          },
          {
            "id": "sec_m0_l2",
            "name": "Passwords & MFA",
            "gate": null,
            "blocks": [
              {
                "id": "sec_m0_l2_b0",
                "type": "text"
              }
            ]
          }
        ]
      }
    ]
  },
  "setting-goals": {
    "name": "Setting Goals for Productivity",
    "category": "general",
    "desc": "Productivity habits for VAs. Goal setting, prioritization, and time blocking.",
    "cert": false,
    "skill": null,
    "modules": [
      {
        "id": "goal_m0",
        "name": "Productivity Basics",
        "lessons": [
          {
            "id": "goal_m0_l0",
            "name": "Goal Setting",
            "gate": null,
            "blocks": [
              {
                "id": "goal_m0_l0_b0",
                "type": "video"
              }
            ]
          },
          {
            "id": "goal_m0_l1",
            "name": "Prioritization",
            "gate": null,
            "blocks": [
              {
                "id": "goal_m0_l1_b0",
                "type": "text"
              }
            ]
          },
          {
            "id": "goal_m0_l2",
            "name": "Time Blocking",
            "gate": null,
            "blocks": [
              {
                "id": "goal_m0_l2_b0",
                "type": "text"
              }
            ]
          }
        ]
      }
    ]
  },
  "ams-ezlynx": {
    "name": "AMS · EZLynx",
    "category": "oneoff",
    "desc": "EZLynx platform training. Orientation, policy entry, endorsements, and reporting.",
    "cert": false,
    "skill": {
      "name": "EZLynx",
      "cat": "ams"
    },
    "modules": [
      {
        "id": "ez_m0",
        "name": "EZLynx Fundamentals",
        "lessons": [
          {
            "id": "ez_m0_l0",
            "name": "EZLynx Orientation",
            "gate": null,
            "blocks": [
              {
                "id": "ez_m0_l0_b0",
                "type": "video"
              }
            ]
          },
          {
            "id": "ez_m0_l1",
            "name": "Policy Entry",
            "gate": null,
            "blocks": [
              {
                "id": "ez_m0_l1_b0",
                "type": "video"
              }
            ]
          }
        ]
      },
      {
        "id": "ez_m1",
        "name": "Servicing in EZLynx",
        "lessons": [
          {
            "id": "ez_m1_l0",
            "name": "Endorsements",
            "gate": null,
            "blocks": [
              {
                "id": "ez_m1_l0_b0",
                "type": "text"
              }
            ]
          },
          {
            "id": "ez_m1_l1",
            "name": "Reporting",
            "gate": null,
            "blocks": [
              {
                "id": "ez_m1_l1_b0",
                "type": "text"
              }
            ]
          }
        ]
      }
    ]
  },
  "ams-hawksoft": {
    "name": "AMS · Hawksoft",
    "category": "oneoff",
    "desc": "Hawksoft platform training. Setup, servicing, and batch tasks.",
    "cert": false,
    "skill": {
      "name": "Hawksoft",
      "cat": "ams"
    },
    "modules": [
      {
        "id": "hawk_m0",
        "name": "Hawksoft Fundamentals",
        "lessons": [
          {
            "id": "hawk_m0_l0",
            "name": "Hawksoft Intro",
            "gate": null,
            "blocks": [
              {
                "id": "hawk_m0_l0_b0",
                "type": "video"
              }
            ]
          },
          {
            "id": "hawk_m0_l1",
            "name": "Client Setup",
            "gate": null,
            "blocks": [
              {
                "id": "hawk_m0_l1_b0",
                "type": "video"
              }
            ]
          }
        ]
      },
      {
        "id": "hawk_m1",
        "name": "Servicing in Hawksoft",
        "lessons": [
          {
            "id": "hawk_m1_l0",
            "name": "Servicing",
            "gate": null,
            "blocks": [
              {
                "id": "hawk_m1_l0_b0",
                "type": "text"
              }
            ]
          },
          {
            "id": "hawk_m1_l1",
            "name": "Batch Tasks",
            "gate": null,
            "blocks": [
              {
                "id": "hawk_m1_l1_b0",
                "type": "text"
              }
            ]
          }
        ]
      }
    ]
  },
  "crm-101": {
    "name": "CRM 101 (Basics)",
    "category": "oneoff",
    "desc": "Entry-level CRM basics. Navigation, records, notes and tasks.",
    "cert": false,
    "skill": null,
    "modules": [
      {
        "id": "crm101_m0",
        "name": "CRM Basics",
        "lessons": [
          {
            "id": "crm101_m0_l0",
            "name": "Navigation",
            "gate": null,
            "blocks": [
              {
                "id": "crm101_m0_l0_b0",
                "type": "video"
              }
            ]
          },
          {
            "id": "crm101_m0_l1",
            "name": "Records",
            "gate": null,
            "blocks": [
              {
                "id": "crm101_m0_l1_b0",
                "type": "text"
              }
            ]
          },
          {
            "id": "crm101_m0_l2",
            "name": "Notes & Tasks",
            "gate": null,
            "blocks": [
              {
                "id": "crm101_m0_l2_b0",
                "type": "text"
              }
            ]
          }
        ]
      }
    ]
  }
};

export const CAT_META = {
  "crm": {
    "label": "CRM",
    "color": "#e73835",
    "chipBg": "#fce8e8",
    "chipFg": "#a32d2d"
  },
  "insurance": {
    "label": "Insurance",
    "color": "#185fa5",
    "chipBg": "#e6f1fb",
    "chipFg": "#185fa5"
  },
  "general": {
    "label": "General",
    "color": "#0f6e56",
    "chipBg": "#e1f5ee",
    "chipFg": "#0f6e56"
  },
  "oneoff": {
    "label": "One-off",
    "color": "#854f0b",
    "chipBg": "#fdf0dd",
    "chipFg": "#a8650f"
  },
  "broad": {
    "label": "Broad Market",
    "color": "#5b3b9c",
    "chipBg": "#efe7fa",
    "chipFg": "#5b3b9c"
  }
};

export const CAT_ORDER = [
  "crm",
  "insurance",
  "general",
  "oneoff"
];

export const SKILL_GROUPS = [
  {
    "id": "crm",
    "label": "CRM Systems",
    "chipBg": "#fce8e8",
    "chipFg": "#a32d2d"
  },
  {
    "id": "ams",
    "label": "AMS Platforms",
    "chipBg": "#e1f0f5",
    "chipFg": "#0c447c"
  },
  {
    "id": "ins",
    "label": "Insurance Skills",
    "chipBg": "#e1f5ee",
    "chipFg": "#0f6e56"
  }
];

export const SKILL_CATALOG = {
  "crm": [
    "AgencyZoom",
    "Zapier",
    "Cognito Forms",
    "HubSpot",
    "InsuredMine"
  ],
  "ams": [
    "EZLynx",
    "Hawksoft",
    "Applied Epic",
    "AMS360"
  ],
  "ins": [
    "Insurance Fundamentals",
    "Policy Basics",
    "Servicing",
    "Client Comms",
    "Quoting",
    "Endorsements"
  ]
};
