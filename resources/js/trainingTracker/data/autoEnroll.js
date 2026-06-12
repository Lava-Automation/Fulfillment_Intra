// Auto-enrollment config (type defaults + event rules).
export const AUTO_ENROLL = {
  "defaults": {
    "combo": [
      "va-onboarding",
      "agencyzoom-mastery"
    ],
    "gen": [
      "va-onboarding",
      "insurance-101"
    ],
    "broad": [
      "va-onboarding"
    ]
  },
  "rules": [
    {
      "id": "r1",
      "event": "combo-to-ins",
      "courses": [
        "insurance-101"
      ]
    },
    {
      "id": "r2",
      "event": "dev-complete",
      "courses": [
        "security-awareness"
      ]
    }
  ]
};

export const AE_EVENTS = [
  [
    "va-created-combo",
    "Combo VA created"
  ],
  [
    "va-created-gen",
    "Gen VA created"
  ],
  [
    "va-created-broad",
    "Broad VA created"
  ],
  [
    "combo-to-ins",
    "Combo moves to Insurance training"
  ],
  [
    "dev-complete",
    "Dev Complete"
  ],
  [
    "ins-complete",
    "Insurance Complete"
  ],
  [
    "endorsed-qaqc",
    "Endorsed to QAQC"
  ],
  [
    "qaqc-passed",
    "QAQC passed"
  ]
];
