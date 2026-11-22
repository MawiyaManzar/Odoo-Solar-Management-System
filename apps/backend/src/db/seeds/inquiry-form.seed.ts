/** Seeded survey questions matching the former static `/inquire` wizard (contact stays fixed in UI). */

export const inquiryFormSeedQuestions = [
  {
    id: "ifq-ownership",
    key: "ownership",
    label: "Do you own the roof?",
    helpText: null as string | null,
    fieldType: "single_choice" as const,
    optionsJson: JSON.stringify([
      { value: "yes", label: "Yes", mapValue: true },
      { value: "no", label: "No", mapValue: false }
    ]),
    mapsTo: "gridSuitable" as const,
    sortOrder: 10,
    isRequired: true,
    isActive: true
  },
  {
    id: "ifq-roof-type",
    key: "roof_type",
    label: "What type of roof do you have?",
    helpText: null,
    fieldType: "single_choice" as const,
    optionsJson: JSON.stringify([
      { value: "concrete", label: "Concrete roof" },
      { value: "metal", label: "Metal sheet roof" },
      { value: "brick", label: "Brick roof" },
      { value: "underconstructed", label: "Underconstructed" }
    ]),
    mapsTo: null,
    sortOrder: 20,
    isRequired: true,
    isActive: true
  },
  {
    id: "ifq-terrace",
    key: "terrace",
    label: "Terrace size",
    helpText: null,
    fieldType: "single_choice" as const,
    optionsJson: JSON.stringify([
      { value: "small", label: "< 200 sqft / Small", mapValue: 150 },
      { value: "medium", label: "200 – 400 sqft / Medium", mapValue: 300 },
      { value: "big", label: "400 + sqft / Big", mapValue: 500 }
    ]),
    mapsTo: "roofAreaSqft" as const,
    sortOrder: 30,
    isRequired: true,
    isActive: true
  },
  {
    id: "ifq-power-cuts",
    key: "power_cuts",
    label: "How often do you face power cuts?",
    helpText: null,
    fieldType: "single_choice" as const,
    optionsJson: JSON.stringify([
      { value: "none", label: "No power cut" },
      { value: "under_1h", label: "Less than 1 hour" },
      { value: "under_4h", label: "Less than 4 hours" },
      { value: "over_4h", label: "More than 4 hours" }
    ]),
    mapsTo: null,
    sortOrder: 40,
    isRequired: true,
    isActive: true
  },
  {
    id: "ifq-bill",
    key: "monthly_bill",
    label: "Monthly electricity bill",
    helpText: null,
    fieldType: "single_choice" as const,
    optionsJson: JSON.stringify([
      { value: "under_1500", label: "Under ₹1,500", mapValue: 1000 },
      { value: "1500_2500", label: "₹1,500 – ₹2,500", mapValue: 2000 },
      { value: "2500_4000", label: "₹2,500 – ₹4,000", mapValue: 3200 },
      { value: "over_4000", label: "Over ₹4,000", mapValue: 5000 }
    ]),
    mapsTo: "monthlyBillInr" as const,
    sortOrder: 50,
    isRequired: true,
    isActive: true
  },
  {
    id: "ifq-requested-kw",
    key: "requested_kw",
    label: "Requested kW",
    helpText: "Between 0.5 and 999.9 kW",
    fieldType: "number" as const,
    optionsJson: null,
    mapsTo: "requestedKw" as const,
    sortOrder: 60,
    isRequired: true,
    isActive: true
  },
  {
    id: "ifq-system-kind",
    key: "system_kind",
    label: "System",
    helpText: null,
    fieldType: "select" as const,
    optionsJson: JSON.stringify([
      { value: "on_grid", label: "On-grid" },
      { value: "off_grid", label: "Off-grid" }
    ]),
    mapsTo: "systemKind" as const,
    sortOrder: 70,
    isRequired: true,
    isActive: true
  },
  {
    id: "ifq-subsidy",
    key: "wants_subsidy",
    label: "Interested in government subsidy",
    helpText: null,
    fieldType: "boolean" as const,
    optionsJson: null,
    mapsTo: "wantsSubsidy" as const,
    sortOrder: 80,
    isRequired: false,
    isActive: true
  }
];
