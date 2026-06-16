// ── SHARED DATA CONSTANTS ─────────────────────────────────────────────
// All financial tables sourced from official government publications.
// See CLAUDE.md → Data Accuracy Standards for source URLs.

// ── DFAS 2026 BASIC PAY TABLES (Effective January 1, 2026) ─────────────
// Source: DFAS.mil — Page updated Jan/Feb 2026 (3.8% raise per FY2026 NDAA)
// Columns = cumulative YOS breakpoints: ≤2, >2, >3, >4, >6, >8, >10, >12, >14, >16, >18, >20, >22, >24, >26, >28, >30, >32, >34, >36, >38, >40
export const YOS_BREAKS = [0,2,3,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40];

// ── RETIREMENT SYSTEM CONSTANTS ───────────────────────────────────────
// Per-year multipliers and statutory caps by retirement system.
// Source: 10 USC § 1409 (High-3, 2.5%/yr, 75% cap) and the Blended
// Retirement System (FY2016 NDAA, 2.0%/yr, 60% cap).
export const RET_SYSTEMS = {
  "High-3": { mult: 2.5, cap: 75 },
  "BRS":    { mult: 2.0, cap: 60 },
};

// BRS Lump Sum Discount Rate (a.k.a. Personal Discount Rate) for the
// present-value buyout election. Set annually by DoD Office of the Actuary.
// Source: DASD(MPP) memo 2025-05-22 — CY2026 rate = 6.46% (CY2025 was 6.43%).
export const PDR_2026 = 0.0646;

// BRS lump sum payments are discounted to present value through age 67.
export const LUMP_SUM_AGE = 67;

export const PAY2026 = {
  // ENLISTED
  "E-1": [2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20,2407.20],
  "E-2": [2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90,2697.90],
  "E-3": [2836.80,3015.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00,3198.00],
  "E-4": [3142.20,3303.00,3482.40,3658.50,3815.40,3815.40,3815.40,3815.40,3815.40,3815.40,3815.40,3815.40,3815.40,3815.40,3815.40,3815.40,3815.40,3815.40,3815.40,3815.40,3815.40,3815.40],
  "E-5": [3342.90,3598.20,3775.80,3946.80,4110.00,4299.90,4395.30,4421.70,4421.70,4421.70,4421.70,4421.70,4421.70,4421.70,4421.70,4421.70,4421.70,4421.70,4421.70,4421.70,4421.70,4421.70],
  "E-6": [3401.10,3743.10,3908.10,4068.90,4235.70,4612.80,4759.50,5043.30,5130.30,5193.60,5267.70,5267.70,5267.70,5267.70,5267.70,5267.70,5267.70,5267.70,5267.70,5267.70,5267.70,5267.70],
  "E-7": [3932.10,4291.50,4456.20,4673.10,4843.80,5135.70,5300.40,5591.70,5835.00,6000.90,6177.30,6245.70,6475.20,6598.20,7067.40,7067.40,7067.40,7067.40,7067.40,7067.40,7067.40,7067.40],
  "E-8": [null,null,null,null,null,5656.50,5907.00,6061.80,6247.20,6448.20,6811.20,6995.40,7308.30,7481.70,7908.90,7908.90,8067.30,8067.30,8067.30,8067.30,8067.30,8067.30],
  "E-9": [null,null,null,null,null,null,6910.20,7066.50,7263.60,7496.10,7730.70,8105.10,8423.10,8756.70,9267.90,9267.90,9730.20,9730.20,10217.40,10217.40,10729.20,10729.20],
  // WARRANT OFFICERS
  "W-1": [4056.60,4493.70,4611.00,4859.10,5152.20,5584.20,5786.10,6069.30,6346.50,6564.90,6766.20,7010.10,7010.10,7010.10,7010.10,7010.10,7010.10,7010.10,7010.10,7010.10,7010.10,7010.10],
  "W-2": [4621.80,5058.90,5193.30,5286.00,5585.40,6051.00,6282.60,6509.40,6787.50,7005.00,7201.50,7437.00,7591.50,7714.20,7714.20,7714.20,7714.20,7714.20,7714.20,7714.20,7714.20,7714.20],
  "W-3": [5223.30,5440.50,5664.30,5736.90,5970.90,6431.10,6910.50,7136.40,7397.70,7665.90,8150.40,8476.50,8671.80,8879.70,9162.60,9162.60,9162.60,9162.60,9162.60,9162.60,9162.60,9162.60],
  "W-4": [5719.80,6152.10,6328.50,6502.20,6801.90,7098.00,7398.00,7848.30,8243.70,8619.90,8928.60,9228.90,9669.60,10032.00,10445.40,10445.40,10653.60,10653.60,10653.60,10653.60,10653.60,10653.60],
  "W-5": [null,null,null,null,null,null,null,null,null,null,null,10169.70,10685.70,11070.30,11495.10,11495.10,12070.80,12070.80,12673.50,12673.50,13308.30,13308.30],
  // COMMISSIONED OFFICERS
  "O-1": [4150.20,4320.00,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40,5222.40],
  "O-2": [4782.00,5446.20,6272.40,6484.50,6617.70,6617.70,6617.70,6617.70,6617.70,6617.70,6617.70,6617.70,6617.70,6617.70,6617.70,6617.70,6617.70,6617.70,6617.70,6617.70,6617.70,6617.70],
  "O-3": [5534.10,6273.90,6770.40,7382.70,7737.00,8125.50,8375.70,8788.20,9004.20,9004.20,9004.20,9004.20,9004.20,9004.20,9004.20,9004.20,9004.20,9004.20,9004.20,9004.20,9004.20,9004.20],
  // COMMISSIONED OFFICERS WITH PRIOR ENLISTED SERVICE (4+ YOS required)
  "O-1E":[null,null,null,5222.40,5576.70,5783.10,5993.70,6200.70,6484.50,6484.50,6484.50,6484.50,6484.50,6484.50,6484.50,6484.50,6484.50,6484.50,6484.50,6484.50,6484.50,6484.50],
  "O-2E":[null,null,null,6484.50,6617.70,6828.00,7183.80,7458.90,7663.50,7663.50,7663.50,7663.50,7663.50,7663.50,7663.50,7663.50,7663.50,7663.50,7663.50,7663.50,7663.50,7663.50],
  "O-3E":[null,null,null,7382.70,7737.00,8125.50,8375.70,8788.20,9137.10,9336.90,9609.60,9609.60,9609.60,9609.60,9609.60,9609.60,9609.60,9609.60,9609.60,9609.60,9609.60,9609.60],
  "O-4": [6294.60,7286.40,7773.60,7881.00,8332.20,8816.40,9420.00,9888.30,10214.40,10401.60,10509.90,10509.90,10509.90,10509.90,10509.90,10509.90,10509.90,10509.90,10509.90,10509.90,10509.90,10509.90],
  "O-5": [7295.40,8218.20,8787.00,8894.10,9249.60,9461.40,9928.50,10271.70,10715.10,11391.30,11713.80,12032.70,12394.80,12394.80,12394.80,12394.80,12394.80,12394.80,12394.80,12394.80,12394.80,12394.80],
  "O-6": [8751.30,9613.80,10245.00,10245.00,10284.30,10725.00,10783.50,10783.50,11396.40,12479.70,13115.40,13751.10,14112.90,14479.20,15188.70,15188.70,15408.30,15408.30,15408.30,15408.30,15408.30,15408.30],
  "O-7": [11540.10,12076.20,12324.30,12522.00,12878.70,13231.80,13639.20,14045.70,14454.30,15735.30,16817.70,16817.70,16817.70,16817.70,16904.40,16904.40,17242.20,17242.20,17242.20,17242.20,17242.20,17242.20],
  "O-8": [13888.50,14343.90,14645.40,14729.40,15106.50,15735.30,15882.00,16479.60,16651.80,17166.60,17911.80,18598.20,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90],
  "O-9": [null,null,null,null,null,null,null,null,null,null,null,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90],
  "O-10":[null,null,null,null,null,null,null,null,null,null,null,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90,18999.90],
};

// Rank titles for display
export const GRADE_LABELS = {
  "E-1":"E-1 (Pvt/SR/Amn Basic)","E-2":"E-2 (PV2/SA/Amn)","E-3":"E-3 (PFC/SN/A1C)",
  "E-4":"E-4 (SPC/CPL/PO3/SrA)","E-5":"E-5 (SGT/PO2/SSgt)","E-6":"E-6 (SSG/PO1/TSgt)",
  "E-7":"E-7 (SFC/CPO/MSgt)","E-8":"E-8 (MSG/SCPO)","E-9":"E-9 (SGM/MCPO)",
  "W-1":"W-1 (WO1)","W-2":"W-2 (CW2)","W-3":"W-3 (CW3)","W-4":"W-4 (CW4)","W-5":"W-5 (CW5)",
  "O-1":"O-1 (2LT/ENS/2ndLt)","O-2":"O-2 (1LT/LTJG/1stLt)","O-3":"O-3 (CPT/LT/Capt)",
  "O-1E":"O-1E (Prior Enl)","O-2E":"O-2E (Prior Enl)","O-3E":"O-3E (Prior Enl)",
  "O-4":"O-4 (MAJ/LCDR/Maj)","O-5":"O-5 (LTC/CDR/LtCol)","O-6":"O-6 (COL/CAPT/Col)",
  "O-7":"O-7 (BG/RDML/BGen)","O-8":"O-8 (MG/RADM/MajGen)",
  "O-9":"O-9 (LTG/VADM/LtGen)","O-10":"O-10 (GEN/ADM/Gen)",
};

export const GRADE_GROUPS = [
  {label:"Enlisted",grades:["E-1","E-2","E-3","E-4","E-5","E-6","E-7","E-8","E-9"]},
  {label:"Warrant Officer",grades:["W-1","W-2","W-3","W-4","W-5"]},
  {label:"Officer",grades:["O-1","O-2","O-3","O-4","O-5","O-6","O-7","O-8","O-9","O-10"]},
  {label:"Officer (Prior Enlisted)",grades:["O-1E","O-2E","O-3E"]},
];

// ── 2026 VA DISABILITY COMPENSATION RATES ────────────────────────────
// Source: va.gov/disability/compensation-rates/veteran-disability-rates/
export const VA = {
  10:{s:180.42}, 20:{s:356.66},
  30:{s:552.47,sp:617.47,spc:666.47,c:596.47,ac:32.00},
  40:{s:795.84,sp:882.84,spc:947.84,c:853.84,ac:43.00},
  50:{s:1132.90,sp:1241.90,spc:1322.90,c:1205.90,ac:54.00},
  60:{s:1435.02,sp:1566.02,spc:1663.02,c:1523.02,ac:65.00},
  70:{s:1808.45,sp:1961.45,spc:2073.98,c:1910.45,ac:76.00},
  80:{s:2102.15,sp:2277.15,spc:2406.15,c:2219.15,ac:87.00},
  90:{s:2362.30,sp:2559.30,spc:2704.30,c:2494.30,ac:98.00},
  100:{s:3938.58,sp:4158.17,spc:4318.99,c:4085.43,ac:109.11},
};

// ── STATE MILITARY RETIREMENT TAX DATA ──────────────────────────────
// Source: each state's revenue department (verified 2026)
export const STATES = {
  // ── NO STATE INCOME TAX ──
  "Alaska":{ok:true,label:"Tax-Free (No State Income Tax)",note:"No state income tax"},
  "Florida":{ok:true,label:"Tax-Free (No State Income Tax)",note:"No state income tax"},
  "Nevada":{ok:true,label:"Tax-Free (No State Income Tax)",note:"No state income tax"},
  "New Hampshire":{ok:true,label:"Tax-Free (No State Income Tax)",note:"No state income tax"},
  "South Dakota":{ok:true,label:"Tax-Free (No State Income Tax)",note:"No state income tax"},
  "Tennessee":{ok:true,label:"Tax-Free (No State Income Tax)",note:"No state income tax"},
  "Texas":{ok:true,label:"Tax-Free (No State Income Tax)",note:"No state income tax"},
  "Washington":{ok:true,label:"Tax-Free (No State Income Tax)",note:"No state income tax"},
  "Wyoming":{ok:true,label:"Tax-Free (No State Income Tax)",note:"No state income tax"},
  // ── INCOME TAX — FULLY EXEMPT MILITARY RETIREMENT ──
  "Alabama":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Arizona":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Arkansas":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Connecticut":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Hawaii":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Illinois":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Indiana":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Iowa":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Kansas":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Louisiana":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Maine":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Massachusetts":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Michigan":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Minnesota":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Mississippi":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Missouri":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Nebraska":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "New Jersey":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "New York":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "North Carolina":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt (Bailey Exclusion)"},
  "North Dakota":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Ohio":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Pennsylvania":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "South Carolina":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "West Virginia":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  "Wisconsin":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt"},
  // ── PARTIAL EXEMPTIONS ──
  "California":{ok:false,rate:9.3,exempt:20000,label:"Partial Exemption — first $20k exempt (income limits apply)",note:"Up to $20k exempt for AGI ≤$125k (single/HOH) / $250k (joint) · 2025–2029 · also applies to SBP annuities"},
  "Colorado":{ok:false,rate:4.4,exempt:20000,label:"Partial Exemption — age-based",note:"Under 55: $15k exempt · 55–64: $20k exempt · 65+: $24k exempt · applied via age at filing"},
  "Delaware":{ok:false,rate:6.6,exempt:12500,label:"Partial Exemption — first $12,500 exempt",note:"Up to $12,500 exempt any age · taxed above"},
  "Georgia":{ok:false,rate:5.49,exempt:65000,label:"Partial Exemption — first $65k exempt",note:"Starting 2026: up to $65,000 exempt any age (full exemption for most retirees)"},
  "Idaho":{ok:false,rate:5.8,exempt:41140,ageExempt:62,label:"Partial Exemption — age/disability based",note:"Age 62+/disabled: up to $41,140 exempt (max SS benefit) · under 62 non-disabled: fully taxable"},
  "Kentucky":{ok:false,rate:4.0,exempt:31110,label:"Partial Exemption — up to $31,110",note:"Pre-1997 retirees fully exempt · post-1997: first $31,110 exempt"},
  "Maryland":{ok:false,rate:5.75,exempt:12500,label:"Partial Exemption — age-based",note:"Under 55: $12,500 exempt · 55+: $20,000 exempt · applied via age at filing"},
  "Montana":{ok:false,rate:6.5,exempt:0,label:"Partial Exemption — 50% up to 5 years",note:"50% deductible for first 5 years of eligibility · age 65+: additional $5,500 subtraction"},
  "New Mexico":{ok:false,rate:4.9,exempt:30000,label:"Partial Exemption — first $30k exempt",note:"Up to $30,000 exempt (2024–2026) · age 100+: fully exempt"},
  "Oklahoma":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt since 2022"},
  "Oregon":{ok:false,rate:9.9,exempt:0,label:"Exempt (pre-Oct 1991 service only)",note:"Service before Oct 1, 1991: fully exempt · after: fully taxable · mixed: prorated"},
  "Rhode Island":{ok:true,label:"Tax-Free (Military Exempt)",note:"Fully exempt since 2023 · no age or income limit"},
  "Utah":{ok:false,rate:0.05,exempt:0,label:"Tax Credit Offset",note:"4.55% flat tax offset by non-refundable credit of 4.5% of retirement pay · effective rate ≈ 0%"},
  "Vermont":{ok:false,rate:6.6,exempt:0,label:"Exempt (AGI ≤ $125k) / Partial above",note:"AGI ≤$125k: fully exempt · $125k–$175k: partial (prorated) · above $175k: fully taxable"},
  "Virginia":{ok:false,rate:5.75,exempt:40000,label:"Partial Exemption — first $40k exempt",note:"$40,000 exemption any age (2025+) · age requirement removed 2023 · remainder taxed at VA marginal rates"},
  // ── FULLY TAXABLE ──
  "District of Columbia":{ok:false,rate:8.95,exempt:0,label:"Fully Taxable",note:"No military retirement tax exemption"},
};

// ── COST OF LIVING INDEX BY CITY ─────────────────────────────────────
export const COL = {
  // ── ALABAMA ──
  "Anniston, AL":82,"Auburn, AL":88,"Birmingham, AL":87,"Dothan, AL":82,
  "Huntsville, AL":90,"Mobile, AL":86,"Montgomery, AL":84,"Tuscaloosa, AL":87,
  // ── ALASKA ──
  "Anchorage, AK":130,"Fairbanks, AK":135,"Juneau, AK":140,"Kodiak, AK":138,
  // ── ARIZONA ──
  "Flagstaff, AZ":108,"Phoenix, AZ":103,"Sierra Vista, AZ":91,"Tucson, AZ":95,"Yuma, AZ":95,
  // ── ARKANSAS ──
  "Fayetteville, AR":88,"Fort Smith, AR":82,"Little Rock, AR":86,"Pine Bluff, AR":80,
  // ── CALIFORNIA ──
  "Bakersfield, CA":106,"Barstow, CA":105,"Fresno, CA":112,"Los Angeles, CA":158,
  "Monterey, CA":172,"Oakland, CA":162,"Riverside, CA":130,"Sacramento, CA":122,
  "San Bernardino, CA":118,"San Diego, CA":152,"San Francisco, CA":190,
  "San Jose, CA":182,"Santa Barbara, CA":168,"Stockton, CA":118,"Ventura, CA":145,
  // ── COLORADO ──
  "Colorado Springs, CO":100,"Denver, CO":115,"Fort Collins, CO":108,
  "Grand Junction, CO":99,"Pueblo, CO":91,
  // ── CONNECTICUT ──
  "Bridgeport, CT":132,"Groton, CT":120,"Hartford, CT":118,"New Haven, CT":122,
  // ── DELAWARE ──
  "Dover, DE":105,"Wilmington, DE":112,
  // ── FLORIDA ──
  "Destin/Fort Walton Beach, FL":100,"Fort Lauderdale, FL":116,"Gainesville, FL":97,
  "Jacksonville, FL":93,"Key West, FL":145,"Melbourne, FL":98,"Miami, FL":118,
  "Orlando, FL":100,"Panama City, FL":97,"Pensacola, FL":94,"Port St. Lucie, FL":102,
  "Tallahassee, FL":95,"Tampa, FL":101,"West Palm Beach, FL":112,
  // ── GEORGIA ──
  "Albany, GA":80,"Athens, GA":91,"Atlanta, GA":106,"Augusta, GA":88,
  "Columbus, GA":84,"Hinesville, GA":84,"Macon, GA":83,"Savannah, GA":92,
  "Valdosta, GA":82,"Warner Robins, GA":85,
  // ── HAWAII ──
  "Hilo, HI":182,"Kailua-Kona, HI":185,"Maui, HI":201,"Oahu, HI":196,
  // ── IDAHO ──
  "Boise, ID":104,"Coeur d'Alene, ID":107,"Idaho Falls, ID":93,"Mountain Home, ID":90,
  // ── ILLINOIS ──
  "Chicago, IL":115,"Peoria, IL":90,"Rockford, IL":90,"Springfield, IL":88,
  // ── INDIANA ──
  "Evansville, IN":86,"Fort Wayne, IN":86,"Indianapolis, IN":92,"South Bend, IN":89,
  // ── IOWA ──
  "Cedar Rapids, IA":88,"Des Moines, IA":90,"Sioux City, IA":87,
  // ── KANSAS ──
  "Junction City/Fort Riley, KS":84,"Kansas City, KS":88,"Topeka, KS":83,"Wichita, KS":86,
  // ── KENTUCKY ──
  "Elizabethtown/Fort Campbell, KY":85,"Hopkinsville, KY":82,"Lexington, KY":90,
  "Louisville, KY":88,"Richmond, KY":84,
  // ── LOUISIANA ──
  "Baton Rouge, LA":90,"Bossier City/Barksdale, LA":86,"New Orleans, LA":97,
  "Shreveport, LA":85,
  // ── MAINE ──
  "Augusta, ME":101,"Bangor, ME":96,"Brunswick, ME":108,"Portland, ME":112,
  // ── MARYLAND ──
  "Annapolis, MD":120,"Baltimore, MD":115,"College Park, MD":130,
  "Frederick, MD":118,"Hagerstown, MD":100,
  // ── MASSACHUSETTS ──
  "Boston, MA":162,"Cape Cod, MA":142,"Lowell, MA":130,"Springfield, MA":112,"Worcester, MA":120,
  // ── MICHIGAN ──
  "Ann Arbor, MI":108,"Detroit, MI":98,"Grand Rapids, MI":96,"Lansing, MI":91,
  "Sault Ste. Marie, MI":89,
  // ── MINNESOTA ──
  "Duluth, MN":96,"Minneapolis-St. Paul, MN":106,"Rochester, MN":99,"St. Cloud, MN":93,
  // ── MISSISSIPPI ──
  "Biloxi/Keesler, MS":85,"Columbus, MS":79,"Gulfport, MS":86,"Hattiesburg, MS":82,
  "Jackson, MS":83,
  // ── MISSOURI ──
  "Columbia, MO":90,"Jefferson City, MO":88,"Kansas City, MO":88,
  "Springfield, MO":85,"St. Louis, MO":91,
  // ── MONTANA ──
  "Billings, MT":97,"Bozeman, MT":110,"Great Falls, MT":91,"Helena, MT":96,"Missoula, MT":105,
  // ── NEBRASKA ──
  "Lincoln, NE":89,"Offutt/Omaha, NE":89,
  // ── NEVADA ──
  "Las Vegas, NV":104,"Reno, NV":107,
  // ── NEW HAMPSHIRE ──
  "Concord, NH":112,"Manchester, NH":116,"Portsmouth, NH":118,
  // ── NEW JERSEY ──
  "Atlantic City, NJ":120,"Camden, NJ":115,"Jersey City, NJ":148,"Newark, NJ":145,
  "Trenton, NJ":118,
  // ── NEW MEXICO ──
  "Alamogordo/Holloman, NM":87,"Albuquerque, NM":93,"Clovis/Cannon, NM":84,
  "Las Cruces, NM":88,"Santa Fe, NM":112,
  // ── NEW YORK ──
  "Albany, NY":106,"Buffalo, NY":95,"Ithaca, NY":108,"New York, NY":187,
  "Rochester, NY":99,"Syracuse, NY":98,"Watertown/Fort Drum, NY":94,
  // ── NORTH CAROLINA ──
  "Asheville, NC":103,"Camp Lejeune/Jacksonville, NC":86,"Charlotte, NC":98,
  "Durham, NC":106,"Fayetteville/Fort Liberty, NC":86,"Goldsboro/Seymour Johnson, NC":84,
  "Greensboro, NC":92,"Raleigh, NC":102,"Wilmington, NC":98,"Winston-Salem, NC":90,
  // ── NORTH DAKOTA ──
  "Bismarck, ND":93,"Fargo, ND":94,"Grand Forks, ND":91,"Minot, ND":90,
  // ── OHIO ──
  "Akron, OH":89,"Cincinnati, OH":95,"Cleveland, OH":94,"Columbus, OH":96,
  "Dayton/Wright-Patterson, OH":91,"Toledo, OH":89,"Youngstown, OH":86,
  // ── OKLAHOMA ──
  "Enid/Vance, OK":80,"Lawton/Fort Sill, OK":81,"Oklahoma City, OK":86,"Tulsa, OK":87,
  // ── OREGON ──
  "Bend, OR":118,"Eugene, OR":112,"Medford, OR":108,"Portland, OR":130,"Salem, OR":108,
  // ── PENNSYLVANIA ──
  "Allentown, PA":105,"Erie, PA":91,"Harrisburg, PA":99,"Philadelphia, PA":118,
  "Pittsburgh, PA":96,"Reading, PA":101,"Scranton, PA":91,
  // ── RHODE ISLAND ──
  "Newport, RI":128,"Providence, RI":122,
  // ── SOUTH CAROLINA ──
  "Beaufort/Parris Island, SC":96,"Charleston, SC":104,"Columbia, SC":91,
  "Greenville, SC":94,"Myrtle Beach, SC":95,"Sumter/Shaw, SC":88,
  // ── SOUTH DAKOTA ──
  "Rapid City, SD":92,"Sioux Falls, SD":93,
  // ── TENNESSEE ──
  "Chattanooga, TN":92,"Clarksville/Fort Campbell, TN":85,"Jackson, TN":85,
  "Knoxville, TN":91,"Memphis, TN":88,"Nashville, TN":102,
  // ── TEXAS ──
  "Abilene/Dyess, TX":83,"Amarillo, TX":84,"Austin, TX":102,"Beaumont, TX":88,
  "Corpus Christi, TX":90,"Dallas, TX":100,"El Paso/Fort Bliss, TX":85,
  "Fort Worth, TX":98,"Houston, TX":95,"Killeen/Fort Cavazos, TX":83,
  "Laredo, TX":83,"Lubbock, TX":85,"Midland-Odessa, TX":97,"San Antonio, TX":91,
  "Texarkana, TX":81,"Waco, TX":88,"Wichita Falls/Sheppard, TX":82,
  // ── UTAH ──
  "Logan, UT":96,"Ogden, UT":100,"Provo, UT":104,"Salt Lake City, UT":108,
  "St. George, UT":103,
  // ── VERMONT ──
  "Burlington, VT":118,
  // ── VIRGINIA ──
  "Charlottesville, VA":114,"Fredericksburg, VA":118,"Hampton Roads/Norfolk, VA":100,
  "Harrisonburg, VA":96,"Northern Virginia (DC area)":132,"Quantico, VA":122,
  "Richmond, VA":95,"Roanoke, VA":91,"Virginia Beach, VA":98,
  // ── WASHINGTON ──
  "Bremerton, WA":120,"Everett, WA":130,"Olympia, WA":116,"Seattle, WA":145,
  "Spokane/Fairchild, WA":96,"Tacoma/Joint Base Lewis-McChord, WA":118,"Yakima, WA":95,
  // ── WEST VIRGINIA ──
  "Charleston, WV":85,"Huntington, WV":82,"Morgantown, WV":90,
  // ── WISCONSIN ──
  "Green Bay, WI":92,"Madison, WI":104,"Milwaukee, WI":98,
  // ── WYOMING ──
  "Casper, WY":95,"Cheyenne, WY":94,
  // ── DC ──
  "Washington DC":158,
  // ── OVERSEAS (CONUS-indexed) ──
  "Baumholder, Germany":108,"Kaiserslautern, Germany":105,"Ramstein, Germany":110,
  "Stuttgart, Germany":115,"Grafenwöhr, Germany":107,
  "Aviano, Italy":112,"Naples, Italy":118,"Sigonella, Italy":108,"Vicenza, Italy":114,
  "Rota, Spain":106,"Mildenhall/Lakenheath, UK":138,"Alconbury, UK":135,
  "Yokota, Japan":128,"Kadena, Okinawa":118,"Sasebo, Japan":120,"Misawa, Japan":115,
  "Camp Humphreys, South Korea":112,"Osan, South Korea":110,
  "Guam (Andersen/Naval Base)":138,
};

// ── 2026 BAH / GI BILL MHA RATES (E-5 with dependents) ──────────────
// Source: DTMO BAH rate lookup — travel.dod.mil (effective Jan 1, 2026)
export const MHA_CITIES = {
  // ── ALABAMA ──
  "Anniston/Fort McClellan, AL":    1185,
  "Auburn, AL":                     1707,
  "Birmingham, AL":                 2439,
  "Fort Rucker/Enterprise, AL":     1572,
  "Huntsville, AL":                 1797,
  "Mobile, AL":                     1887,
  "Montgomery, AL":                 1683,
  // ── ALASKA ──
  "Anchorage, AK":                  2874,
  "Fairbanks, AK":                  2436,
  "Juneau, AK":                     3354,
  "Kodiak Island, AK":              2865,
  "Ketchikan, AK":                  2868,
  "Sitka, AK":                      3210,
  // ── ARIZONA ──
  "Phoenix, AZ":                    2289,
  "Fort Huachuca/Sierra Vista, AZ": 1719,
  "Tucson/Davis-Monthan, AZ":       1905,
  "Yuma, AZ":                       1695,
  // ── ARKANSAS ──
  "Fayetteville, AR":               1782,
  "Fort Smith/Fort Chaffee, AR":    1263,
  "Little Rock, AR":                1848,
  // ── CALIFORNIA ──
  "Barstow/Fort Irwin, CA":         2001,
  "Beale AFB/Marysville, CA":       2967,
  "Camp Pendleton/Oceanside, CA":   3963,
  "China Lake/Ridgecrest, CA":      1563,
  "Edwards AFB/Palmdale, CA":       2658,
  "El Centro, CA":                  1986,
  "Fresno, CA":                     2439,
  "Humboldt County, CA":            1827,
  "Lemoore NAS/Hanford, CA":        2139,
  "Los Angeles, CA":                3882,
  "Marin/Sonoma County, CA":        3303,
  "Monterey, CA":                   3465,
  "Oakland/Alameda, CA":            3759,
  "Riverside, CA":                  3351,
  "Sacramento, CA":                 2904,
  "San Bernardino, CA":             3288,
  "San Diego, CA":                  3975,
  "San Francisco, CA":              5127,
  "San Jose/Santa Clara County, CA":4659,
  "San Luis Obispo, CA":            3198,
  "Santa Barbara/Ventura, CA":      3537,
  "Stockton, CA":                   2553,
  "Travis AFB/Fairfield, CA":       3369,
  "Twenty-Nine Palms MCB, CA":      1980,
  "Vandenberg SFB/Santa Maria, CA": 3333,
  // ── COLORADO ──
  "Boulder, CO":                    2754,
  "Colorado Springs, CO":           2358,
  "Denver, CO":                     2841,
  "Fort Collins, CO":               2268,
  // ── CONNECTICUT ──
  "Hartford, CT":                   2901,
  "New Haven/Fairfield, CT":        3069,
  "New London/Groton, CT":          2580,
  // ── DELAWARE ──
  "Dover AFB/Rehoboth, DE":         2277,
  // ── FLORIDA ──
  "Eglin AFB/Fort Walton Beach, FL":2433,
  "Florida Keys, FL":               3969,
  "Fort Myers Beach, FL":           2694,
  "Fort Pierce, FL":                2691,
  "Gainesville, FL":                2040,
  "Jacksonville, FL":               2181,
  "Miami/Fort Lauderdale, FL":      3660,
  "Ocala, FL":                      2370,
  "Orlando, FL":                    2658,
  "Panama City/Tyndall, FL":        2163,
  "Patrick SFB/Melbourne, FL":      2502,
  "Pensacola, FL":                  1863,
  "Tallahassee, FL":                1824,
  "Tampa/MacDill, FL":              2709,
  "Volusia County/Daytona, FL":     2286,
  "West Palm Beach, FL":            3423,
  // ── GEORGIA ──
  "Albany, GA":                     1371,
  "Atlanta, GA":                    2388,
  "Augusta/Fort Eisenhower, GA":    1890,
  "Brunswick/Kings Bay, GA":        2133,
  "Columbus/Fort Moore, GA":        1716,
  "Dahlonega, GA":                  2208,
  "Hinesville/Fort Stewart, GA":    2310,
  "Savannah, GA":                   2415,
  "Valdosta/Moody AFB, GA":         1524,
  "Warner Robins/Robins AFB, GA":   1800,
  // ── HAWAII ──
  "Oahu/Honolulu, HI":              3663,
  "Maui County, HI":                4329,
  "Hawaii County/Hilo, HI":         3594,
  "Kauai County, HI":               3798,
  // ── IDAHO ──
  "Boise, ID":                      1926,
  "Mountain Home AFB, ID":          1605,
  // ── ILLINOIS ──
  "Chicago, IL":                    3438,
  "Great Lakes/North Chicago, IL":  2427,
  "Peoria, IL":                     1572,
  "Rock Island/Moline, IL":         1908,
  "Scott AFB/Belleville, IL":       1542,
  "Springfield/Decatur, IL":        1527,
  // ── INDIANA ──
  "Fort Wayne, IN":                 1947,
  "Indianapolis, IN":               1875,
  // ── IOWA ──
  "Des Moines, IA":                 1770,
  // ── KANSAS ──
  "Fort Leavenworth, KS":           1815,
  "Fort Riley/Junction City, KS":   1314,
  "Topeka, KS":                     1626,
  "Wichita/McConnell AFB, KS":      1377,
  // ── KENTUCKY ──
  "Fort Campbell/Clarksville, KY":  1815,
  "Fort Knox, KY":                  1647,
  "Lexington, KY":                  1875,
  "Louisville, KY":                 1989,
  // ── LOUISIANA ──
  "Baton Rouge, LA":                1875,
  "Fort Polk/Leesville, LA":        1218,
  "New Orleans, LA":                1905,
  "Shreveport/Barksdale AFB, LA":   1845,
  "Lafayette, LA":                  1584,
  // ── MAINE ──
  "Bangor, ME":                     1893,
  "Brunswick, ME":                  2205,
  "Portland, ME":                   3252,
  // ── MARYLAND ──
  "Annapolis, MD":                  2928,
  "Baltimore, MD":                  2610,
  "Fort Detrick/Frederick, MD":     2682,
  "Fort Meade/Laurel, MD":          2901,
  "Indian Head/Waldorf, MD":        3249,
  "Patuxent River NAS, MD":         2406,
  "Washington DC Metro (MD)":       3132,
  // ── MASSACHUSETTS ──
  "Boston, MA":                     4791,
  "Cape Cod/Plymouth, MA":          3924,
  "Essex County/Salem, MA":         3477,
  "Hanscom AFB/Bedford, MA":        4188,
  "Nantucket, MA":                  4344,
  "Springfield/Holyoke, MA":        2388,
  "Worcester, MA":                  2919,
  // ── MICHIGAN ──
  "Ann Arbor, MI":                  2559,
  "Detroit, MI":                    2361,
  "Grand Rapids, MI":               2148,
  "Lansing, MI":                    1806,
  "Sault Ste. Marie, MI":           1536,
  // ── MINNESOTA ──
  "Duluth, MN":                     2064,
  "Minneapolis/St. Paul, MN":       2541,
  // ── MISSISSIPPI ──
  "Columbus AFB, MS":               1398,
  "Gulfport/Keesler, MS":           1602,
  "Hattiesburg/Camp Shelby, MS":    1395,
  "Jackson, MS":                    1920,
  "Meridian NAS, MS":               1290,
  // ── MISSOURI ──
  "Fort Leonard Wood/Rolla, MO":    1479,
  "Kansas City, MO":                1986,
  "Springfield, MO":                1389,
  "St. Louis/Scott AFB, MO":        2436,
  "Whiteman AFB/Sedalia, MO":       1611,
  // ── MONTANA ──
  "Great Falls/Malmstrom, MT":      1608,
  "Helena, MT":                     1887,
  // ── NEBRASKA ──
  "Lincoln, NE":                    1788,
  "Omaha/Offutt AFB, NE":           2085,
  // ── NEVADA ──
  "Las Vegas/Nellis AFB, NV":       2070,
  "Reno/Carson City, NV":           2391,
  // ── NEW HAMPSHIRE ──
  "Manchester/Concord, NH":         3177,
  "Portsmouth/Pease, NH":           3321,
  // ── NEW JERSEY ──
  "Atlantic City/Egg Harbor, NJ":   2655,
  "Cape May NWS, NJ":               2754,
  "Fort Dix/McGuire/Lakehurst, NJ": 2823,
  "Fort Monmouth/Earle NWS, NJ":    3549,
  "Northern New Jersey, NJ":        4749,
  "Trenton, NJ":                    3465,
  // ── NEW MEXICO ──
  "Albuquerque/Kirtland AFB, NM":   2211,
  "Cannon AFB/Clovis, NM":          1365,
  "Holloman AFB/Alamogordo, NM":    1590,
  "Las Cruces/White Sands, NM":     1701,
  "Santa Fe/Los Alamos, NM":        2964,
  // ── NEW YORK ──
  "Albany, NY":                     2634,
  "Buffalo, NY":                    2214,
  "Fort Drum/Watertown, NY":        1665,
  "Long Island, NY":                4425,
  "New York City, NY":              5070,
  "Rochester, NY":                  2214,
  "Rome/Griffiss AFB, NY":          2109,
  "Staten Island, NY":              3735,
  "Syracuse, NY":                   2049,
  "West Point, NY":                 3468,
  "Westchester County, NY":         4479,
  // ── NORTH CAROLINA ──
  "Asheville, NC":                  2214,
  "Camp Lejeune/Jacksonville, NC":  1584,
  "Charlotte, NC":                  2169,
  "Cherry Point MCAS/Morehead, NC": 1851,
  "Durham/Chapel Hill, NC":         2118,
  "Elizabeth City, NC":             2508,
  "Fort Liberty/Fayetteville, NC":  1806,
  "Greensboro, NC":                 1809,
  "Outer Banks, NC":                2604,
  "Raleigh, NC":                    2091,
  "Seymour Johnson AFB/Goldsboro, NC":1521,
  "Wilmington, NC":                 2040,
  // ── NORTH DAKOTA ──
  "Bismarck, ND":                   1596,
  "Fargo, ND":                      1707,
  "Grand Forks AFB, ND":            1731,
  "Minot AFB, ND":                  1548,
  // ── OHIO ──
  "Akron, OH":                      1581,
  "Cincinnati, OH":                 2283,
  "Cleveland, OH":                  1998,
  "Columbus, OH":                   1875,
  "Dayton/Wright-Patterson, OH":    1650,
  "Toledo, OH":                     2031,
  // ── OKLAHOMA ──
  "Altus AFB, OK":                  1254,
  "Fort Sill/Lawton, OK":           1233,
  "Oklahoma City/Tinker, OK":       1644,
  "Tulsa, OK":                      1638,
  "Vance AFB/Enid, OK":             1200,
  // ── OREGON ──
  "Corvallis, OR":                  2388,
  "Eugene, OR":                     2187,
  "Portland, OR":                   2379,
  "Salem, OR":                      2004,
  // ── PENNSYLVANIA ──
  "Allentown/Bethlehem, PA":        2373,
  "Carlisle Barracks, PA":          2076,
  "Erie, PA":                       1464,
  "Philadelphia, PA":               2691,
  "Pittsburgh, PA":                 2283,
  "State College, PA":              1791,
  "Wilkes-Barre/Scranton, PA":      1740,
  "Willow Grove/Philadelphia suburbs, PA": 2934,
  // ── RHODE ISLAND ──
  "Newport/NWS Newport, RI":        2847,
  "Providence, RI":                 3195,
  // ── SOUTH CAROLINA ──
  "Beaufort/Parris Island, SC":     2403,
  "Charleston, SC":                 2385,
  "Columbia/Fort Jackson, SC":      1878,
  "Greenville, SC":                 1923,
  "Myrtle Beach, SC":               2097,
  "Sumter/Shaw AFB, SC":            1503,
  // ── SOUTH DAKOTA ──
  "Rapid City/Ellsworth AFB, SD":   1986,
  "Sioux Falls, SD":                1554,
  // ── TENNESSEE ──
  "Chattanooga, TN":                1986,
  "Johnson City/Kingsport, TN":     1548,
  "Knoxville, TN":                  2184,
  "Memphis, TN":                    2154,
  "Nashville, TN":                  2268,
  // ── TEXAS ──
  "Abilene/Dyess AFB, TX":          1554,
  "Austin, TX":                     2241,
  "Beaumont, TX":                   1518,
  "College Station, TX":            1758,
  "Corpus Christi NAS, TX":         1788,
  "Dallas, TX":                     2469,
  "Del Rio/Laughlin AFB, TX":       1470,
  "El Paso/Fort Bliss, TX":         1809,
  "Fort Worth/NAS JRB, TX":         2118,
  "Houston, TX":                    2193,
  "Killeen/Fort Cavazos, TX":       1695,
  "Lubbock, TX":                    1476,
  "San Angelo/Goodfellow AFB, TX":  1578,
  "San Antonio, TX":                1869,
  "Waco, TX":                       1755,
  "Wichita Falls/Sheppard AFB, TX": 1491,
  // ── UTAH ──
  "Hill AFB/Ogden, UT":             2118,
  "Provo, UT":                      2058,
  "Salt Lake City, UT":             2130,
  // ── VERMONT ──
  "Burlington, VT":                 3120,
  // ── VIRGINIA ──
  "Charlottesville, VA":            2373,
  "Dahlgren/Fort A.P. Hill, VA":    2313,
  "Fort Belvoir/Quantico, VA":      2955,
  "Hampton/Newport News/Langley, VA":2274,
  "Norfolk/Portsmouth/NAS Oceana, VA":2430,
  "Richmond/Fort Gregg-Adams, VA":  2358,
  "Roanoke, VA":                    1911,
  "Washington DC Metro (VA)":       3132,
  "Warrenton/Culpeper, VA":         3066,
  // ── WASHINGTON ──
  "Bremerton/NB Kitsap, WA":        2364,
  "Everett/NAS Whidbey Island, WA": 2748,
  "Seattle, WA":                    3135,
  "Spokane/Fairchild AFB, WA":      2184,
  "Tacoma/JBLM, WA":                2556,
  "Yakima, WA":                     1923,
  // ── WASHINGTON DC ──
  "Washington DC":                  3132,
  // ── WEST VIRGINIA ──
  "Charleston, WV":                 1404,
  "Morgantown, WV":                 1641,
  // ── WISCONSIN ──
  "Madison, WI":                    2655,
  "Milwaukee, WI":                  2607,
  // ── WYOMING ──
  "Cheyenne/F.E. Warren, WY":       1653,
};

// ── 2026 FEDERAL INCOME TAX BRACKETS ─────────────────────────────────
// Source: IRS Rev. Proc. 2025-28 + One Big Beautiful Bill (OBBB) adjustments
// 2026 IRS figures — standard deductions: $16,100 single/MFS / $32,200 MFJ / $24,150 HOH
export const TAX_BRACKETS_2026 = {
  single: [
    { rate: 0.10, min: 0,       max: 11925 },
    { rate: 0.12, min: 11925,   max: 48475 },
    { rate: 0.22, min: 48475,   max: 103350 },
    { rate: 0.24, min: 103350,  max: 197300 },
    { rate: 0.32, min: 197300,  max: 250525 },
    { rate: 0.35, min: 250525,  max: 626350 },
    { rate: 0.37, min: 626350,  max: Infinity },
  ],
  mfj: [
    { rate: 0.10, min: 0,       max: 23850 },
    { rate: 0.12, min: 23850,   max: 96950 },
    { rate: 0.22, min: 96950,   max: 206700 },
    { rate: 0.24, min: 206700,  max: 394600 },
    { rate: 0.32, min: 394600,  max: 501050 },
    { rate: 0.35, min: 501050,  max: 751600 },
    { rate: 0.37, min: 751600,  max: Infinity },
  ],
  hoh: [
    { rate: 0.10, min: 0,       max: 17000 },
    { rate: 0.12, min: 17000,   max: 64850 },
    { rate: 0.22, min: 64850,   max: 103350 },
    { rate: 0.24, min: 103350,  max: 197300 },
    { rate: 0.32, min: 197300,  max: 250500 },
    { rate: 0.35, min: 250500,  max: 626350 },
    { rate: 0.37, min: 626350,  max: Infinity },
  ],
};
TAX_BRACKETS_2026.mfs = TAX_BRACKETS_2026.single; // MFS uses single brackets

export const STANDARD_DEDUCTION_2026 = { single: 16100, mfj: 32200, hoh: 24150, mfs: 16100 };

export const FILING_STATUS_LABELS = { single:"Single", mfj:"MFJ", hoh:"Head of Household", mfs:"Married Filing Separately" };

// ── TRICARE 2026 PREMIUM RATES (Monthly, Retiree Enrollment Fees) ────
// Source: tricare.mil/costs — CY2026 rates (effective Jan 1, 2026)
// Group A = entered service before Jan 1, 2018; Group B = on/after Jan 1, 2018
export const TRICARE_PLANS = {
  prime: {
    label: "TRICARE Prime",
    note: "Lowest out-of-pocket for retirees < 65. Network only, PCM required.",
    medicare_b: 0,
    groupA: { self: 31.83, family: 63.75 },
    groupB: { self: 38.58, family: 77.25 },
  },
  select: {
    label: "TRICARE Select",
    note: "Freedom to see any provider. Higher cost-shares, no referral needed.",
    medicare_b: 0,
    groupA: { self: 15.58, family: 31.25 },
    groupB: { self: 49.58, family: 99.25 },
  },
  tfl: {
    label: "TRICARE For Life",
    note: "Wraps around Medicare for retirees 65+. Requires Medicare Part B enrollment.",
    medicare_b: 185.00,
    groupA: { self: 0, family: 0 },
    groupB: { self: 0, family: 0 },
  },
  select_overseas: {
    label: "TRICARE Select Overseas",
    note: "Select plan for retirees living overseas. Similar cost-shares to stateside Select.",
    medicare_b: 0,
    groupA: { self: 15.58, family: 31.25 },
    groupB: { self: 49.58, family: 99.25 },
  },
};

// TRICARE Reserve Select
// Source: tricare.mil 2026 Costs & Fees PDF — effective Jan 1, 2026
export const TRICARE_RS = {
  individual: 57.88,
  family:     286.66,
  note: "TRICARE Reserve Select · Available to Selected Reserve (drilling) members only. Lost if you stop drilling."
};

// TRICARE Retired Reserve (gray area retirees not yet drawing pay)
// Source: tricare.mil 2026 Costs & Fees PDF — effective Jan 1, 2026
export const TRICARE_TRR = {
  individual: 645.90,
  family:     1548.30,
  note: "TRICARE Retired Reserve · Available if you've retired from the Reserve but aren't yet drawing retirement pay. Compare with ACA marketplace — premiums are significant."
};

// VA Healthcare Priority Groups
// Source: va.gov/health-care/eligibility/priority-groups/ (verified March 2026)
export const VA_PRIORITY_GROUPS = [
  { group: 1, who: "50%+ service-connected disability; TDIU (unemployability); or Medal of Honor", copay: "None for SC conditions", free: true },
  { group: 2, who: "30–40% service-connected disability", copay: "None for SC conditions", free: true },
  { group: 3, who: "10–20% service-connected disability; Purple Heart; former POW; or discharged for disability", copay: "None for SC conditions", free: true },
  { group: 4, who: "Receiving VA Aid & Attendance or Housebound benefits; or catastrophically disabled", copay: "Reduced or no copays", free: false },
  { group: 5, who: "0% non-compensable or non-SC disability with income below VA threshold; or VA pension recipients", copay: "Reduced copays", free: false },
  { group: 6, who: "Combat veterans (post-9/11, 10-yr window); PACT Act toxic exposure; Camp Lejeune; Vietnam/Gulf War exposures; 0% SC compensable", copay: "$0 for related conditions; $30/visit for others", free: false },
  { group: 7, who: "Income above VA threshold but below geographic (GMT) threshold — agrees to copays", copay: "Standard copays", free: false },
  { group: 8, who: "Income above all thresholds, no qualifying SC disability — agrees to copays", copay: "Standard copays", free: false },
];

// ── VGLI RATE TABLE ──────────────────────────────────────────────────
// Source: va.gov/life-insurance/options-eligibility/vgli/ — Effective July 1, 2025
// Monthly cost per $1,000 of coverage. Max coverage: $500,000.
// Keyed by upper age of bracket (29 = "under 30", 34 = "30-34", etc.)
export const VGLI_RATES = {
  29: 0.06, 34: 0.08, 39: 0.10, 44: 0.14,
  49: 0.19, 54: 0.29, 59: 0.50, 64: 0.85,
  69: 1.38, 74: 2.15, 79: 3.85, 99: 4.40,
};

// ── GI BILL ELIGIBILITY TIERS ────────────────────────────────────────
// Source: va.gov/education/about-gi-bill-benefits/post-9-11/
export const ELIG_TIERS = [
  { pct: 100, label: "100% — 36+ months active duty" },
  { pct: 90,  label: "90% — 30 months" },
  { pct: 80,  label: "80% — 24 months" },
  { pct: 70,  label: "70% — 18 months" },
  { pct: 60,  label: "60% — 12 months" },
  { pct: 50,  label: "50% — 6 months" },
  { pct: 40,  label: "40% — 90 days" },
];

export const ENROLL_OPTS = [
  { v: 1.0,  l: "Full-Time (100%)" },
  { v: 0.75, l: "¾ Time (75%)" },
  { v: 0.5,  l: "Half-Time (50%)" },
  { v: 0.25, l: "¼ Time (25%)" },
];

// Post-9/11 GI Bill online-only MHA rate for the 2026 academic year cycle
// Source: va.gov/education/benefit-rates — Aug 2026–Jul 2027 cycle
export const GI_BILL_ONLINE_MHA = 1261;

// ── MGIB Chapter 30 (Active Duty) rates — Oct 1 2025–Sep 30 2026 ────
// Source: va.gov/education/benefit-rates/montgomery-active-duty-rates
// Note: MGIB pays directly to student and IS taxable income (unlike Post-9/11)
export const MGIB_AD = {
  "3+": { full: 2518.00, three_quarter: 1888.50, half: 1259.00, quarter: 629.50 },
  "2-3": { full: 2043.00, three_quarter: 1532.25, half: 1021.50, quarter: 510.75 },
};

// ── MGIB Chapter 1606 (Selected Reserve) rates — Oct 1 2025–Sep 30 2026 ──
// Source: va.gov/education/benefit-rates/montgomery-selected-reserve-rates
export const MGIB_SR = { full: 493.00, three_quarter: 369.00, half: 246.00, quarter: 123.25 };

export const MGIB_ENROLL_OPTS = [
  { v: "full", l: "Full-Time" },
  { v: "three_quarter", l: "¾ Time" },
  { v: "half", l: "Half-Time" },
  { v: "quarter", l: "¼ Time or Less" },
];

// ── 2026 BAS (Basic Allowance for Subsistence) ─────────────────────────
// Source: DFAS — adjusted annually per USDA Cost of Food at Home data
// BAS does NOT increase by the same % as base pay; separate calculation
export const BAS_2026 = { enlisted: 471.84, officer: 325.58 };

// ── SPECIAL & INCENTIVE PAY DEFINITIONS ────────────────────────────────
// Source: 37 U.S.C. Chapter 5; DoD Financial Management Regulation Vol. 7A
// Note: Special pays are TAX-FREE and NOT included in High-3/pension calculations
// They DO count toward TSP contribution limits (annual elective deferral)
export const SPECIAL_PAY_DEFS = [
  { cat: "Hazardous Duty / Aviation", items: [
    { id: "acip", label: "Aviation Career Incentive Pay (ACIP)", prefill: 0, hint: "Up to $1,000/mo based on years of aviation service" },
    { id: "hdip", label: "Hazardous Duty Incentive Pay (HDIP)", prefill: 150, hint: "Parachute, demolitions, experimental stress duty" },
    { id: "jumpPay", label: "Jump Pay (Static Line / HALO)", prefill: 150 },
    { id: "divePay", label: "Dive Pay", prefill: 240 },
    { id: "hfp", label: "Hostile Fire / Combat Pay (IDP/HFP)", prefill: 225 },
  ]},
  { cat: "Submarine & Sea", items: [
    { id: "subPay", label: "Submarine Pay", prefill: 0, hint: "Varies by grade and years of sub service" },
    { id: "seaPay", label: "Career Sea Pay", prefill: 0, hint: "Varies by grade and years at sea" },
    { id: "seaPayPrem", label: "Career Sea Pay Premium", prefill: 100, hint: "36+ consecutive months at sea" },
  ]},
  { cat: "Nuclear", items: [
    { id: "nuclearPay", label: "Nuclear Career Incentive Pay", prefill: 0, hint: "Varies significantly by position" },
    { id: "nuclearBonus", label: "Nuclear Career Annual Bonus (\u00F712)", prefill: 0, hint: "Enter annual bonus \u00F7 12 for monthly" },
  ]},
  { cat: "Medical / Professional", items: [
    { id: "medOfficer", label: "Medical Officer Special Pay", prefill: 0 },
    { id: "dentalOfficer", label: "Dental Officer Special Pay", prefill: 0 },
    { id: "vetOfficer", label: "Veterinary Officer Special Pay", prefill: 0 },
    { id: "boardCert", label: "Board Certified Pay", prefill: 0 },
    { id: "optometry", label: "Optometry Special Pay", prefill: 0 },
  ]},
  { cat: "Retention / Incentive", items: [
    { id: "csrb", label: "Critical Skills Retention Bonus (\u00F712)", prefill: 0, hint: "Enter annual CSRB \u00F7 12" },
    { id: "reenlistBonus", label: "Reenlistment Bonus (\u00F7 months)", prefill: 0, hint: "Bonus amount \u00F7 remaining obligated months" },
  ]},
  { cat: "Other", items: [
    { id: "hdpLoc", label: "Hardship Duty Pay \u2014 Location", prefill: 100, hint: "$50\u2013$150/mo depending on location" },
    { id: "hdpMission", label: "Hardship Duty Pay \u2014 Mission", prefill: 150 },
    { id: "flpp", label: "Foreign Language Proficiency Pay", prefill: 0, hint: "Up to $500/mo based on language and proficiency" },
    { id: "sdap", label: "Special Duty Assignment Pay (SDAP)", prefill: 0, hint: "Varies by duty position (SD-1 through SD-6)" },
    { id: "recruiterDrill", label: "Recruiter / Drill Sergeant Pay", prefill: 375 },
    { id: "otherSpecial", label: "Other Special Pay", prefill: 0, hint: "Any other special or incentive pay" },
  ]},
];
