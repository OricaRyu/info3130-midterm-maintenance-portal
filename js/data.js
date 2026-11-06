/* Local sample data for the Larchwood maintenance prototype (no backend). */
window.LARCHWOOD_DATA = {
  member: {
    name: "Sébastien Violette",
    email: "sebastien.violette@example.com"
  },

  /* Property types drive which fields and options are shown.
     unitMode: "text"   -> free-text unit number (required)
               "select" -> choose from a fixed list (required)
               "none"   -> single-family home, unit field disabled */
  properties: [
    {
      id: "larchwood-towers",
      name: "Larchwood Towers",
      address: "120 King St N, Waterloo, ON",
      type: "High-rise apartment",
      unitMode: "text",
      features: ["common", "elevator", "parking"]
    },
    {
      id: "riverbend",
      name: "Riverbend Townhomes",
      address: "45 Riverbend Dr, Kitchener, ON",
      type: "Townhouse complex",
      unitMode: "text",
      features: ["common", "exterior", "parking"]
    },
    {
      id: "erb-duplex",
      name: "212 Erb St W",
      address: "212 Erb St W, Waterloo, ON",
      type: "Duplex",
      unitMode: "select",
      units: ["Upper unit", "Lower unit"],
      features: ["exterior"]
    },
    {
      id: "maple-grove",
      name: "18 Maple Grove Ave",
      address: "18 Maple Grove Ave, Cambridge, ON",
      type: "Single-family home",
      unitMode: "none",
      features: ["exterior", "garage"]
    }
  ],

  /* Areas: "requires" lists the property feature needed for the option to appear. */
  areas: [
    { value: "kitchen", label: "Kitchen" },
    { value: "bathroom", label: "Bathroom" },
    { value: "bedroom", label: "Bedroom" },
    { value: "living", label: "Living or dining room" },
    { value: "laundry", label: "Laundry" },
    { value: "basement", label: "Basement", requires: "garage" },
    { value: "hallway", label: "Building hallway or lobby", requires: "common" },
    { value: "elevator-area", label: "Elevator", requires: "elevator" },
    { value: "parking-area", label: "Parking garage or lot", requires: "parking" },
    { value: "garage-area", label: "Garage or driveway", requires: "garage" },
    { value: "yard", label: "Yard, deck or exterior", requires: "exterior" },
    { value: "whole", label: "Whole unit or home" }
  ],

  categories: [
    { value: "plumbing", label: "Plumbing (leaks, drains, toilets)" },
    { value: "electrical", label: "Electrical (outlets, lights, breakers)" },
    { value: "hvac", label: "Heating or cooling" },
    { value: "appliance", label: "Appliances" },
    { value: "doors", label: "Doors, windows or locks" },
    { value: "pests", label: "Pests" },
    { value: "structural", label: "Walls, floors or ceilings" },
    { value: "elevator", label: "Elevator", requires: "elevator" },
    { value: "common", label: "Common area or amenities", requires: "common" },
    { value: "exterior", label: "Exterior, roof or landscaping", requires: "exterior" },
    { value: "safety", label: "Smoke or CO alarm" },
    { value: "other", label: "Other" }
  ],

  urgency: {
    emergency: { label: "Emergency", review: "Reviewed within 1 hour by the on-call manager.", visit: "A technician is dispatched as soon as possible, usually within 4 hours." },
    urgent:    { label: "Urgent",    review: "Reviewed within 4 business hours.",              visit: "Repair visit usually within 24 to 48 hours." },
    routine:   { label: "Routine",   review: "Reviewed within 1 business day.",                visit: "Repair visit usually within 5 to 7 days." },
    low:       { label: "Low",       review: "Reviewed within 2 business days.",               visit: "Scheduled with the next planned maintenance round." }
  }
};
