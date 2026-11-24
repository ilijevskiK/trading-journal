// The industry groups companies are sorted into by scripts/classify-industries.mjs
// (an AI model picks one per company). IBD-style: about 190 groups inside
// about 25 sectors. IBD's own list is proprietary, so these are our own.
// Edit freely, but the classifier saves a group's name, so after renaming or
// removing one, re-run the classifier with --redo for the affected companies.

export const TAXONOMY = {
  Energy: [
    "Oil & Gas - Exploration & Production", "Oil & Gas - Integrated", "Oil & Gas - Drilling",
    "Oil & Gas - Field Services & Equipment", "Oil & Gas - Refining & Marketing", "Oil & Gas - Midstream & Pipelines",
    "Coal", "Uranium & Nuclear", "Solar", "Alternative Energy - Hydrogen, Wind & Biofuels",
  ],
  "Basic Materials": [
    "Gold & Silver Mining", "Battery & Critical Metals", "Copper & Diversified Metals Mining", "Steel Producers",
    "Aluminum & Nonferrous Metals", "Industrial Minerals & Aggregates", "Paper & Pulp", "Lumber & Wood Products", "Containers & Packaging",
  ],
  Chemicals: ["Commodity Chemicals & Plastics", "Specialty Chemicals & Coatings", "Fertilizers & Agricultural Chemicals", "Industrial Gases"],
  "Construction & Building": [
    "Homebuilding & Manufactured Housing", "Building Products", "Cement & Construction Materials", "Engineering & Construction",
    "Home Improvement Retail", "HVAC & Plumbing Products",
  ],
  Industrial: [
    "Machinery - Construction & Mining", "Machinery - Agricultural", "Machinery - Industrial & Packaging", "Electrical Equipment",
    "Power & Grid Equipment", "Batteries & Energy Storage", "Tools & Metal Fabrication", "Industrial Distribution",
    "Pumps, Valves & Flow Control", "Waste & Environmental Services", "Staffing & Employment Services",
    "Facility & Security Services", "Industrial Conglomerates",
  ],
  "Aerospace & Defense": ["Aerospace - Aircraft & Parts", "Defense Contractors & Drones", "Space & Satellites"],
  Autos: [
    "Auto Manufacturers", "Electric Vehicles", "Auto Parts", "Auto Dealers", "Trucks, Heavy Vehicles & Rail Equipment",
    "Recreational Vehicles & Powersports", "Boats & Marine",
  ],
  Transportation: [
    "Airlines & Air Services", "Air Freight & Logistics", "Railroads", "Trucking", "Shipping - Dry Bulk & Tankers",
    "Shipping - Containers & Marine Services", "Transportation Services & Mobility", "Car Rental & Leasing",
  ],
  Utilities: ["Electric Utilities", "Gas Utilities", "Water Utilities", "Multi-Utilities", "Independent & Renewable Power"],
  "Telecom & Media": [
    "Telecom - Wireless", "Telecom - Wireline", "Cable & Satellite", "Broadcasting - TV & Radio", "Publishing",
    "Commercial Printing", "Advertising Agencies", "Digital Advertising", "Streaming & Entertainment Media",
  ],
  "Software & Internet": [
    "Software - Enterprise & Collaboration", "Software - Infrastructure & DevOps", "Software - Cybersecurity", "Software - Data & AI",
    "Software - Healthcare", "Software - Financial, Payments & Fintech", "Software - Design & Engineering",
    "Video Games & Interactive", "IT Consulting & Services", "Data Processing & Outsourcing", "Cloud & Data Center Services",
    "Internet - Social Media", "Internet - Search & Content", "Internet - Marketplaces", "Internet - Travel & Booking",
    "Internet - Consumer Services", "Crypto & Blockchain",
  ],
  "Technology Hardware": [
    "Computers & Servers", "Data Storage", "Networking Equipment", "Telecom Equipment", "Consumer Electronics",
    "Electronic Components & Displays", "Electronic Manufacturing Services", "Connectors & Cables", "Lasers & Photonics",
    "Test & Measurement Instruments", "Industrial Automation & 3D Printing",
  ],
  Semiconductors: [
    "Semiconductors - Analog, Power & Mixed Signal", "Semiconductors - Digital & GPUs", "Semiconductors - Memory",
    "Semiconductors - RF & Wireless", "Semiconductor Equipment", "Semiconductor Materials & Foundry",
  ],
  Healthcare: [
    "Biotech - Oncology", "Biotech - Rare Disease & Genetic Medicine", "Biotech - Immunology & Inflammation", "Biotech - Neuroscience",
    "Biotech - Infectious Disease & Vaccines", "Biotech - Metabolic & Cardiovascular", "Biotech - Cell & Gene Therapy",
    "Biotech - Platform & Specialty", "Drugs - Large Pharma", "Drugs - Specialty, Delivery & Cannabis Pharma", "Drugs - Generics",
    "Animal Health", "Medical Devices - Cardiovascular", "Medical Devices - Orthopedic & Spine",
    "Medical Devices - Diabetes & Monitoring", "Medical Devices - Surgical & Robotics", "Medical Devices - Imaging",
    "Medical Devices - Aesthetics & Dental", "Medical Supplies & Distribution", "Diagnostics & Lab Services",
    "Genomics & Life Science Tools", "CROs & Research Services", "Hospitals", "Nursing, Home Care & Outpatient Services",
    "Managed Care", "Pharmacy Services & Benefit Managers", "Healthcare IT & Digital Health",
  ],
  Financial: [
    "Banks - Large National", "Banks - Regional", "Banks - Community & Savings", "Credit Cards & Consumer Lending",
    "Mortgage Finance", "Specialty Finance & Leasing", "Business Development Companies", "Investment Banking & Brokers",
    "Asset Management", "Exchanges & Financial Data", "Payment Processors",
  ],
  Insurance: [
    "Insurance - Life", "Insurance - Property & Casualty", "Insurance - Specialty, Reinsurance & Title", "Insurance - Health",
    "Insurance Brokers",
  ],
  "Real Estate": [
    "REIT - Office", "REIT - Retail", "REIT - Residential & Self Storage", "REIT - Industrial & Logistics", "REIT - Healthcare",
    "REIT - Data Center & Towers", "REIT - Mortgage", "REIT - Hotels, Diversified & Specialty", "Real Estate Services & Developers",
  ],
  Retail: [
    "Department Stores", "Discount, Variety & Warehouse Stores", "Grocery Stores", "Drug Stores", "Apparel & Footwear Retail",
    "Electronics Retail", "Home Furnishings Retail", "Sporting Goods Retail", "Specialty Retail - Hobby, Books, Pets & Jewelry",
    "E-Commerce Retail", "Auto Parts Retail", "Convenience Stores & Fuel Retail",
  ],
  "Consumer Goods": [
    "Packaged Foods & Dairy", "Meat & Poultry", "Snacks & Confectionery", "Beverages - Soft Drinks", "Beverages - Alcohol",
    "Food Distribution", "Tobacco, Vaping & Cannabis", "Household & Pet Products", "Personal Care & Cosmetics", "Apparel - Clothing",
    "Apparel - Footwear", "Luxury Goods & Accessories", "Textiles", "Furniture & Home Appliances", "Toys & Games",
    "Sporting Goods & Fitness",
  ],
  "Leisure & Hospitality": [
    "Restaurants - Fast Food & Coffee", "Restaurants - Casual Dining", "Hotels & Resorts", "Casinos & Gaming", "Online Gaming & Betting",
    "Cruise Lines", "Travel Services", "Theme Parks, Recreation & Fitness Clubs", "Movie Theaters & Live Events", "Film & TV Production",
  ],
  "Business Services": [
    "Consulting & Research Services", "Business Support Services", "Education - For-Profit", "Education - Online & EdTech",
    "Funeral & Personal Services", "Payroll & HR Services", "Credit & Collection Services", "Equipment Rental & Leasing",
  ],
  Agriculture: ["Farming, Crops & Forestry", "Aquaculture & Fisheries"],
  Other: ["Conglomerates & Holding Companies"],
};

// Not companies to rank: the classifier uses this for shells, SPACs, funds
// and anything that fits no group above.
export const UNRANKED = "Unclassified";

export const allTaxonomyGroups = () =>
  Object.entries(TAXONOMY).flatMap(([sector, groups]) => groups.map((name) => ({ sector, name })));
