export const CAR_MAKES = [
  "Maruti Suzuki",
  "Hyundai",
  "Tata",
  "Mahindra",
  "Toyota",
  "Kia",
  "Honda",
  "Volkswagen",
  "Skoda",
  "MG",
  "Renault",
  "Nissan",
  "Jeep",
  "Ford",
  "Audi",
  "BMW",
  "Mercedes-Benz"
];

export const CAR_MODELS: Record<string, string[]> = {
  "Maruti Suzuki": ["Swift", "Baleno", "Wagon R", "Alto", "Dzire", "Ertiga", "Brezza", "Grand Vitara", "Jimny", "Fronx", "XL6", "Celerio", "Ignis"],
  "Hyundai": ["Creta", "Venue", "i20", "Grand i10 Nios", "Verna", "Tucson", "Aura", "Alcazar", "Exter", "Ioniq 5"],
  "Tata": ["Nexon", "Punch", "Harrier", "Safari", "Tiago", "Tigor", "Altroz"],
  "Mahindra": ["Thar", "XUV700", "Scorpio-N", "Scorpio Classic", "XUV300", "Bolero", "XUV400"],
  "Toyota": ["Innova Crysta", "Innova Hycross", "Fortuner", "Glanza", "Urban Cruiser Hyryder", "Hilux", "Camry"],
  "Kia": ["Seltos", "Sonet", "Carens", "EV6"],
  "Honda": ["City", "Amaze", "Elevate"],
  "Volkswagen": ["Virtus", "Taigun", "Tiguan"],
  "Skoda": ["Slavia", "Kushaq", "Kodiaq", "Superb"],
  "MG": ["Hector", "Astor", "Gloster", "Comet EV", "ZSEV"],
  "Renault": ["Kwid", "Triber", "Kiger"],
  "Nissan": ["Magnite"],
  "Jeep": ["Compass", "Meridian", "Wrangler", "Grand Cherokee"],
  "Ford": ["EcoSport", "Endeavour", "Figo", "Aspire"],
  "Audi": ["A4", "A6", "Q3", "Q5", "Q7"],
  "BMW": ["3 Series", "5 Series", "X1", "X3", "X5"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLC", "GLE"]
};

// Generic Trim/Variants mapped by Make in Indian Market
export const CAR_VARIANTS: Record<string, string[]> = {
  "Maruti Suzuki": ["Sigma", "Delta", "Zeta", "Alpha", "LXI", "VXI", "ZXI", "ZXI+"],
  "Hyundai": ["E", "EX", "S", "SX", "SX(O)", "S+", "Asta"],
  "Tata": ["XE", "XM", "XT", "XZ", "XZ+", "Fearless", "Accomplished", "Creative", "Smart"],
  "Mahindra": ["MX", "AX3", "AX5", "AX7", "Z2", "Z4", "Z6", "Z8", "Z8L", "W4", "W6", "W8"],
  "Toyota": ["G", "V", "Z", "ZX", "VX", "GX", "S", "E"],
  "Kia": ["HTE", "HTK", "HTK+", "HTX", "HTX+", "GTX", "GTX+", "X-Line"],
  "Honda": ["SV", "V", "VX", "ZX", "E", "S"],
  "Volkswagen": ["Comfortline", "Highline", "Topline", "GT"],
  "Skoda": ["Active", "Ambition", "Style", "L&K", "Monte Carlo"],
  "MG": ["Style", "Super", "Smart", "Sharp", "Savvy"],
  "Renault": ["RXE", "RXL", "RXT", "RXZ"],
  "Nissan": ["XE", "XL", "XV", "XV Premium"],
  "Jeep": ["Sport", "Longitude", "Limited", "Model S", "Rubicon"],
  "Ford": ["Ambiente", "Trend", "Titanium", "Titanium+"],
  "Audi": ["Premium Plus", "Technology", "Standard"],
  "BMW": ["xLine", "M Sport", "Sport", "Luxury Line"],
  "Mercedes-Benz": ["Progressive", "AMG Line", "Exclusive"]
};
