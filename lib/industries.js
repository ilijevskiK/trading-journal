// Industry groups for the Leading Groups ranking, in the spirit of IBD's
// ~197 groups inside ~33 sectors. IBD's own membership is proprietary, so
// this folds the SEC's SIC codes (free, one per company) into groups of our
// own. SIC is coarse and dated: for instance every drug maker and biotech
// shares 2834/2836. Refine by editing the tables below; nothing else needs
// to change. Exact 4-digit codes win over the broad ranges.

import { allTaxonomyGroups } from "./industryTaxonomy.js";

const EXCLUDED = "Excluded";

// [group name, sector, SIC codes]. A code may appear in only one group
// (the test checks), so the lists are what each group really covers.
export const SPECIFIC = [
  // Energy
  ["Oil & Gas Exploration & Production", "Energy", [1311]],
  ["Oil & Gas Drilling & Services", "Energy", [1381, 1382, 1389, 3533]],
  ["Oil Refining & Marketing", "Energy", [2911, 2990, 5171, 5172]],
  ["Oil & Gas Pipelines", "Energy", [4610, 4922, 4923]],
  ["Coal", "Energy", [1220, 1221, 1222, 1231]],
  // Basic materials
  ["Gold & Silver Mining", "Basic Materials", [1040]],
  ["Metal Mining", "Basic Materials", [1000, 1090, 1094, 1099]],
  ["Industrial Minerals Mining", "Basic Materials", [1400, 1422, 1423, 1429, 1440, 1455, 1459, 1475, 1499]],
  ["Steel", "Basic Materials", [3310, 3312, 3317, 3320, 3325]],
  ["Aluminum & Nonferrous Metals", "Basic Materials", [3330, 3334, 3341, 3350, 3357, 3360, 3390]],
  ["Paper & Forest Products", "Basic Materials", [2400, 2421, 2430, 2600, 2611, 2621, 2631, 2650, 2670]],
  ["Containers & Packaging", "Basic Materials", [2652, 2653, 2655, 2656, 2657, 3220, 3221, 3411, 3412]],
  // Chemicals
  ["Specialty Chemicals", "Chemicals", [2800, 2810, 2820, 2821, 2851, 2860, 2890, 2891, 2899]],
  ["Agricultural Chemicals", "Chemicals", [2870, 2873, 2874, 2879]],
  ["Plastics & Rubber", "Chemicals", [2822, 3011, 3050, 3060, 3080, 3081, 3086, 3089]],
  // Construction & building
  ["Homebuilding", "Construction & Building", [1520, 1531, 2451, 2452]],
  ["Building Products", "Construction & Building", [3211, 3231, 3241, 3250, 3251, 3270, 3272, 3281, 3290, 3430, 3431, 3433, 3440, 3442, 3448]],
  ["Engineering & Construction", "Construction & Building", [1600, 1623, 1700, 1731, 8711]],
  ["Building Materials Retail", "Construction & Building", [5031, 5039, 5072, 5200, 5211]],
  // Industrial
  ["Industrial Machinery", "Industrial", [3510, 3523, 3524, 3530, 3531, 3532, 3540, 3550, 3555, 3560, 3561, 3562, 3564, 3569, 3580, 3585, 3590, 3599]],
  ["Electrical Equipment", "Industrial", [3600, 3610, 3612, 3613, 3620, 3621, 3629, 3640, 3690, 3691, 3692, 3699]],
  ["Tools & Hardware", "Industrial", [3420, 3421, 3423, 3425, 3460, 3470, 3490]],
  ["Waste & Environmental Services", "Industrial", [4950, 4953, 4955, 4959]],
  ["Staffing & Employment Services", "Industrial", [7360, 7361, 7363]],
  // Aerospace & defense
  ["Aerospace & Defense", "Aerospace & Defense", [3480, 3482, 3483, 3484, 3489, 3720, 3721, 3724, 3728, 3760, 3761, 3764, 3769, 3812]],
  // Autos & transportation equipment
  ["Auto Manufacturers", "Autos", [3711, 3713, 3715, 3716]],
  ["Auto Parts", "Autos", [3714]],
  ["Auto Dealers & Services", "Autos", [5500, 5510, 5511, 5521, 5531, 5541, 5561, 5571, 5599, 7500, 7510, 7515, 7519]],
  ["Rail Equipment", "Autos", [3740, 3743]],
  ["Boats & Recreational Vehicles", "Autos", [3730, 3732, 3751, 3792, 3799, 5551]],
  // Transportation
  ["Airlines & Air Services", "Transportation", [4512, 4513, 4522, 4581]],
  ["Railroads & Transit", "Transportation", [4011, 4013, 4100, 4111, 4119, 4170]],
  ["Trucking", "Transportation", [4200, 4210, 4212, 4213, 4214, 4220, 4231]],
  ["Marine Shipping", "Transportation", [4400, 4412, 4424, 4430, 4432, 4449, 4481, 4491, 4493, 4499]],
  ["Logistics & Freight Services", "Transportation", [4700, 4731]],
  // Utilities
  ["Electric Utilities", "Utilities", [4911, 4931]],
  ["Gas Utilities", "Utilities", [4924, 4932]],
  ["Water Utilities", "Utilities", [4940, 4941]],
  ["Independent Power & Renewables", "Utilities", [4900, 4961, 4991]],
  // Telecom & media
  ["Telecom Services", "Telecom & Media", [4810, 4812, 4813, 4822, 4899]],
  ["Broadcasting & Cable", "Telecom & Media", [4832, 4833, 4840, 4841]],
  ["Publishing & Printing", "Telecom & Media", [2700, 2711, 2721, 2731, 2741, 2750, 2761, 2771, 2780, 2790]],
  ["Advertising & Marketing", "Telecom & Media", [7310, 7311, 7319]],
  // Software & internet
  ["Software", "Software & Internet", [7371, 7372]],
  ["IT Services & Data Processing", "Software & Internet", [7370, 7373, 7374, 7379]],
  ["Internet & Catalog Retail", "Software & Internet", [5960, 5961]],
  // Technology hardware & semiconductors
  ["Computer Hardware", "Technology Hardware", [3570, 3571, 3572, 3575, 3576, 3577, 3578, 3579, 3695]],
  ["Communications Equipment", "Technology Hardware", [3660, 3661, 3663, 3669]],
  ["Electronic Components", "Technology Hardware", [3651, 3670, 3672, 3677, 3678, 3679]],
  ["Instruments & Controls", "Technology Hardware", [3820, 3821, 3822, 3823, 3824, 3825, 3826, 3827, 3829, 3860, 3861, 3873]],
  ["Semiconductors", "Semiconductors", [3674]],
  ["Semiconductor Equipment", "Semiconductors", [3559]],
  // Healthcare
  ["Pharmaceuticals", "Healthcare", [2834]],
  ["Biotechnology", "Healthcare", [2833, 2836]],
  ["Diagnostics & Research", "Healthcare", [2835, 8071, 8731]],
  ["Medical Devices", "Healthcare", [3840, 3841, 3842, 3843, 3844, 3845, 3851]],
  ["Medical Distribution", "Healthcare", [5047, 5122]],
  ["Hospitals & Care Facilities", "Healthcare", [8000, 8011, 8050, 8051, 8060, 8062, 8063, 8082, 8090, 8093, 8099]],
  ["Managed Care", "Healthcare", [6324]],
  // Financial
  ["Banks", "Financial", [6020, 6021, 6022, 6029]],
  ["Savings & Thrifts", "Financial", [6035, 6036]],
  ["Consumer & Specialty Lending", "Financial", [6111, 6140, 6141, 6150, 6153, 6159, 6162, 6163, 6172, 6199]],
  ["Brokers & Capital Markets", "Financial", [6200, 6211, 6221]],
  ["Asset Managers", "Financial", [6282]],
  // Insurance
  ["Life & Health Insurance", "Insurance", [6311, 6321]],
  ["Property & Casualty Insurance", "Insurance", [6300, 6331, 6351, 6361, 6399]],
  ["Insurance Brokers", "Insurance", [6411]],
  // Real estate
  ["REITs", "Real Estate", [6798]],
  ["Real Estate Services", "Real Estate", [6500, 6510, 6512, 6513, 6519, 6531, 6552]],
  // Retail
  ["Department & General Stores", "Retail", [5300, 5311, 5331, 5399]],
  ["Specialty Retail", "Retail", [5600, 5621, 5651, 5661, 5700, 5712, 5731, 5734, 5735, 5940, 5944, 5945, 5990]],
  ["Grocery & Drug Stores", "Retail", [5400, 5411, 5412, 5900, 5912]],
  // Consumer goods
  ["Food Processing", "Consumer Goods", [2000, 2011, 2013, 2015, 2020, 2024, 2030, 2033, 2040, 2050, 2052, 2060, 2070, 2090, 2092, 5140, 5141, 5150, 5190]],
  ["Beverages", "Consumer Goods", [2080, 2082, 2084, 2086, 5180]],
  ["Tobacco", "Consumer Goods", [2100, 2111, 2121, 2131]],
  ["Household & Personal Products", "Consumer Goods", [2840, 2842, 2843, 2844, 3630, 3634, 3639]],
  ["Apparel & Footwear", "Consumer Goods", [2300, 2320, 2330, 2340, 2390, 3021, 3100, 3140, 3142, 3144, 3149, 3150, 3171, 3172, 5130, 5136, 5137, 5139]],
  ["Textiles", "Consumer Goods", [2200, 2211, 2221, 2250, 2273, 2280, 2290]],
  ["Furniture & Home Furnishings", "Consumer Goods", [2500, 2510, 2511, 2520, 2531, 2540, 2590]],
  ["Toys, Sporting & Recreation", "Consumer Goods", [3910, 3911, 3914, 3940, 3942, 3944, 3949, 3990]],
  // Leisure & hospitality
  ["Restaurants", "Leisure & Hospitality", [5810, 5812, 5813]],
  ["Hotels & Lodging", "Leisure & Hospitality", [7000, 7010, 7011, 7020, 7030, 7040, 7041]],
  ["Travel & Cruise", "Leisure & Hospitality", [4489, 4720, 4724, 4725]],
  ["Entertainment & Gaming", "Leisure & Hospitality", [7812, 7819, 7822, 7829, 7830, 7833, 7841, 7900, 7948, 7990, 7993, 7996, 7997]],
  // Business services
  ["Business Services", "Business Services", [7300, 7320, 7330, 7340, 7350, 7380, 7381, 7384, 7385, 7389, 8700, 8741, 8742, 8744]],
  ["Education Services", "Business Services", [8200, 8211, 8220, 8221, 8244, 8249, 8299]],
  ["Personal Services", "Business Services", [7200, 7210, 7220, 7231, 7240, 7260, 7290, 8300, 8351]],
  // Shells and funds: not companies to rank
  ["Blank-Check & Asset-Backed", EXCLUDED, [6189, 6726, 6770, 9990, 9995]],
];

// Broad fallback by SIC range, so every classified company lands somewhere.
// First match wins; the exact codes above are checked first.
const BROAD = [
  [[100, 999], "Agriculture", "Agriculture"],
  [[1000, 1099], "Basic Materials", "Metal Mining"],
  [[1200, 1299], "Energy", "Coal"],
  [[1300, 1399], "Energy", "Oil & Gas Exploration & Production"],
  [[1400, 1499], "Basic Materials", "Industrial Minerals Mining"],
  [[1500, 1799], "Construction & Building", "Engineering & Construction"],
  [[2000, 2099], "Consumer Goods", "Food Processing"],
  [[2100, 2199], "Consumer Goods", "Tobacco"],
  [[2200, 2399], "Consumer Goods", "Textiles"],
  [[2400, 2499], "Basic Materials", "Paper & Forest Products"],
  [[2500, 2599], "Consumer Goods", "Furniture & Home Furnishings"],
  [[2600, 2699], "Basic Materials", "Paper & Forest Products"],
  [[2700, 2799], "Telecom & Media", "Publishing & Printing"],
  [[2800, 2899], "Chemicals", "Specialty Chemicals"],
  [[2900, 2999], "Energy", "Oil Refining & Marketing"],
  [[3000, 3099], "Chemicals", "Plastics & Rubber"],
  [[3100, 3199], "Consumer Goods", "Apparel & Footwear"],
  [[3200, 3299], "Construction & Building", "Building Products"],
  [[3300, 3399], "Basic Materials", "Steel"],
  [[3400, 3499], "Industrial", "Tools & Hardware"],
  [[3500, 3599], "Industrial", "Industrial Machinery"],
  [[3600, 3699], "Industrial", "Electrical Equipment"],
  [[3700, 3799], "Autos", "Auto Parts"],
  [[3800, 3899], "Technology Hardware", "Instruments & Controls"],
  [[3900, 3999], "Consumer Goods", "Toys, Sporting & Recreation"],
  [[4000, 4099], "Transportation", "Railroads & Transit"],
  [[4100, 4299], "Transportation", "Trucking"],
  [[4400, 4499], "Transportation", "Marine Shipping"],
  [[4500, 4599], "Transportation", "Airlines & Air Services"],
  [[4600, 4699], "Energy", "Oil & Gas Pipelines"],
  [[4700, 4799], "Transportation", "Logistics & Freight Services"],
  [[4800, 4899], "Telecom & Media", "Telecom Services"],
  [[4900, 4999], "Utilities", "Electric Utilities"],
  [[5000, 5199], "Industrial", "Wholesale Distribution"],
  [[5200, 5299], "Construction & Building", "Building Materials Retail"],
  [[5300, 5399], "Retail", "Department & General Stores"],
  [[5400, 5499], "Retail", "Grocery & Drug Stores"],
  [[5500, 5599], "Autos", "Auto Dealers & Services"],
  [[5600, 5999], "Retail", "Specialty Retail"],
  [[6000, 6099], "Financial", "Banks"],
  [[6100, 6199], "Financial", "Consumer & Specialty Lending"],
  [[6200, 6299], "Financial", "Brokers & Capital Markets"],
  [[6300, 6399], "Insurance", "Property & Casualty Insurance"],
  [[6400, 6499], "Insurance", "Insurance Brokers"],
  [[6500, 6599], "Real Estate", "Real Estate Services"],
  [[6700, 6799], "Real Estate", "REITs"],
  [[7000, 7099], "Leisure & Hospitality", "Hotels & Lodging"],
  [[7200, 7299], "Business Services", "Personal Services"],
  [[7300, 7399], "Business Services", "Business Services"],
  [[7400, 7599], "Business Services", "Business Services"],
  [[7800, 7999], "Leisure & Hospitality", "Entertainment & Gaming"],
  [[8000, 8099], "Healthcare", "Hospitals & Care Facilities"],
  [[8200, 8299], "Business Services", "Education Services"],
  [[8700, 8799], "Business Services", "Business Services"],
  [[8800, 9999], "Business Services", "Business Services"],
];

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// The first table to list a code wins, so a code that appears in two
// groups above (several do, being close cousins) lands in the earlier one.
const exact = new Map();
for (const [name, sector, codes] of SPECIFIC) {
  for (const code of codes) if (Number.isInteger(code) && !exact.has(code)) exact.set(code, { name, sector });
}

// { key, name, sector } for a SIC code, or null when there's no code or
// it's a shell company / fund that shouldn't be ranked.
export function groupForSic(sic) {
  const code = Number(sic);
  if (!Number.isInteger(code) || code <= 0) return null;
  const hit = exact.get(code) ?? BROAD.map(([[lo, hi], sector, name]) => (code >= lo && code <= hi ? { sector, name } : null)).find(Boolean);
  if (!hit || hit.sector === EXCLUDED) return null;
  return { key: slug(hit.name), name: hit.name, sector: hit.sector };
}

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// A rule of thumb from O'Neil's books: look for leaders in the top 40 groups.
export const LEADING_GROUP_RANKS = 40;

export const MIN_GROUP_MEMBERS = 3;
const MIN_MEMBERS = MIN_GROUP_MEMBERS;

// The group a ticker is in comes from a resolver, ticker -> { key, name, sector }
// or null: the AI-assigned taxonomy (lib/industryTaxonomy.js) once companies
// have been classified into it, the SIC-code tables above until then.
const taxonomyByName = new Map(allTaxonomyGroups().map((g) => [g.name, { key: slug(g.name), name: g.name, sector: g.sector }]));

export function groupForName(name) {
  return taxonomyByName.get(name) ?? null;
}

export function makeResolver({ assignments, sicByTicker }) {
  if (assignments?.size) return { scheme: "ai", resolve: (ticker) => groupForName(assignments.get(ticker)) };
  return { scheme: "sic", resolve: (ticker) => groupForSic(sicByTicker?.get(ticker)) };
}

// Ranks the groups, best first, by the median RS score of their stocks (the
// median, so one runaway stock doesn't carry a small group).
// `ratings` is [{ ticker, score, rating }]; `resolve` is from makeResolver.
// Groups with fewer than `minMembers` rated stocks are left out.
export function rankGroups(ratings, resolve, { minMembers = MIN_MEMBERS } = {}) {
  const groups = new Map();
  for (const r of ratings) {
    const group = resolve(r.ticker);
    if (!group) continue;
    if (!groups.has(group.key)) groups.set(group.key, { ...group, scores: [], ratings: [] });
    const g = groups.get(group.key);
    g.scores.push(Number(r.score));
    g.ratings.push(Number(r.rating));
  }
  return [...groups.values()]
    .filter((g) => g.scores.length >= minMembers)
    .map((g) => ({
      key: g.key,
      name: g.name,
      sector: g.sector,
      members: g.scores.length,
      medianScore: median(g.scores),
      medianRating: Math.round(median(g.ratings)),
    }))
    .sort((a, b) => b.medianScore - a.medianScore || a.name.localeCompare(b.name))
    .map((g, i) => ({ ...g, rank: i + 1 }));
}

// Every group the tables can produce, for listing or sanity checks.
export function allGroups() {
  const seen = new Map();
  for (const [name, sector] of SPECIFIC) if (sector !== EXCLUDED && !seen.has(slug(name))) seen.set(slug(name), { key: slug(name), name, sector });
  for (const [, sector, name] of BROAD) if (!seen.has(slug(name))) seen.set(slug(name), { key: slug(name), name, sector });
  return [...seen.values()];
}

// { key, name, sector } for a group key saved in the database, or null.
export function groupByKey(key) {
  return [...taxonomyByName.values()].find((g) => g.key === key) ?? allGroups().find((g) => g.key === key) ?? null;
}
