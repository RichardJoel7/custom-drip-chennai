/**
 * Indian states and union territories with their main cities and towns, for the checkout
 * address dropdowns. Deliberately not exhaustive — both dropdowns end with an "Other"
 * option that lets the customer type their own.
 *
 * "Name|Alias" entries show a second, familiar name: "Bengaluru|Bangalore" is stored as
 * "Bengaluru" and listed as "Bengaluru (Bangalore)". Typed or saved aliases match too.
 */
const RAW_LOCATIONS: Record<string, string[]> = {
  "Andaman and Nicobar Islands": [
    "Car Nicobar", "Diglipur", "Mayabunder", "Rangat", "Sri Vijaya Puram|Port Blair", "Swaraj Dweep|Havelock",
  ],
  "Andhra Pradesh": [
    "Adoni", "Amalapuram", "Amaravati", "Anakapalli", "Anantapur", "Bapatla", "Bhimavaram", "Chilakaluripet",
    "Chittoor", "Dharmavaram", "Eluru", "Gudivada", "Guntakal", "Guntur", "Hindupur", "Kadapa", "Kakinada",
    "Kavali", "Kurnool", "Machilipatnam", "Madanapalle", "Mangalagiri", "Markapur", "Nandyal", "Narasaraopet",
    "Nellore", "Ongole", "Palasa", "Parvathipuram", "Proddatur", "Puttaparthi", "Rajamahendravaram|Rajahmundry",
    "Rayachoti", "Srikakulam", "Srikalahasti", "Tadepalligudem", "Tadipatri", "Tenali", "Tirupati",
    "Vijayawada", "Visakhapatnam|Vizag", "Vizianagaram",
  ],
  "Arunachal Pradesh": [
    "Aalo", "Bomdila", "Changlang", "Daporijo", "Itanagar", "Khonsa", "Naharlagun", "Namsai", "Pasighat",
    "Roing", "Seppa", "Tawang", "Tezu", "Yingkiong", "Ziro",
  ],
  Assam: [
    "Barpeta", "Biswanath Chariali", "Bongaigaon", "Dhemaji", "Dhubri", "Dibrugarh", "Diphu", "Goalpara",
    "Golaghat", "Guwahati", "Hailakandi", "Hojai", "Jorhat", "Kokrajhar", "Mangaldoi", "Morigaon", "Nagaon",
    "Nalbari", "North Lakhimpur", "Silchar", "Sivasagar", "Sribhumi|Karimganj", "Tezpur", "Tinsukia",
  ],
  Bihar: [
    "Arrah", "Aurangabad", "Banka", "Begusarai", "Bettiah", "Bhagalpur", "Bihar Sharif", "Buxar", "Chhapra",
    "Darbhanga", "Dehri", "Gaya", "Gopalganj", "Hajipur", "Jamalpur", "Jamui", "Jehanabad", "Katihar",
    "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Motihari", "Munger", "Muzaffarpur", "Nawada",
    "Patna", "Purnia", "Saharsa", "Samastipur", "Sasaram", "Sitamarhi", "Siwan", "Supaul",
  ],
  Chandigarh: ["Chandigarh"],
  Chhattisgarh: [
    "Ambikapur", "Balod", "Baloda Bazar", "Bemetara", "Bhilai", "Bilaspur", "Dantewada", "Dhamtari", "Durg",
    "Jagdalpur", "Janjgir", "Jashpur Nagar", "Kanker", "Kawardha", "Kondagaon", "Korba", "Mahasamund",
    "Mungeli", "Raigarh", "Raipur", "Rajnandgaon",
  ],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  Delhi: ["Delhi", "New Delhi"],
  Goa: [
    "Bicholim", "Calangute", "Canacona", "Mapusa", "Margao|Madgaon", "Mormugao", "Panaji|Panjim", "Pernem",
    "Ponda", "Quepem", "Sanguem", "Sanquelim", "Valpoi", "Vasco da Gama",
  ],
  Gujarat: [
    "Ahmedabad", "Amreli", "Anand", "Ankleshwar", "Bharuch", "Bhavnagar", "Bhuj", "Botad", "Chhota Udaipur",
    "Dahod", "Deesa", "Dwarka", "Gandhidham", "Gandhinagar", "Godhra", "Himmatnagar", "Jamnagar", "Junagadh",
    "Kalol", "Lunawada", "Mehsana", "Modasa", "Morbi", "Nadiad", "Navsari", "Palanpur", "Patan", "Porbandar",
    "Rajkot", "Rajpipla", "Surat", "Surendranagar", "Vadodara|Baroda", "Valsad", "Vapi", "Veraval", "Vyara",
  ],
  Haryana: [
    "Ambala", "Bahadurgarh", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram|Gurgaon", "Hansi",
    "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Narnaul", "Nuh", "Palwal",
    "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar",
  ],
  "Himachal Pradesh": [
    "Baddi", "Bilaspur", "Chamba", "Dalhousie", "Dharamshala", "Hamirpur", "Kangra", "Keylong", "Kullu",
    "Manali", "Mandi", "Nahan", "Palampur", "Paonta Sahib", "Reckong Peo", "Shimla", "Solan", "Sundernagar",
    "Una",
  ],
  "Jammu and Kashmir": [
    "Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Katra", "Kishtwar",
    "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Sopore",
    "Srinagar", "Udhampur",
  ],
  Jharkhand: [
    "Bokaro Steel City", "Chaibasa", "Chatra", "Deoghar", "Dhanbad", "Dumka", "Garhwa", "Giridih", "Godda",
    "Gumla", "Hazaribagh", "Jamshedpur", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga",
    "Medininagar|Daltonganj", "Pakur", "Phusro", "Ramgarh", "Ranchi", "Sahibganj", "Seraikela", "Simdega",
  ],
  Karnataka: [
    "Bagalkot", "Ballari|Bellary", "Belagavi|Belgaum", "Bengaluru|Bangalore", "Bhatkal", "Bidar",
    "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru|Chikmagalur", "Chitradurga", "Davanagere", "Dharwad",
    "Gadag", "Gangavathi", "Hassan", "Haveri", "Hosapete|Hospet", "Hubballi|Hubli", "Kalaburagi|Gulbarga",
    "Karwar", "Kolar", "Kolar Gold Fields", "Koppal", "Madikeri", "Mandya", "Mangaluru|Mangalore", "Manipal",
    "Mysuru|Mysore", "Raichur", "Ramanagara", "Shivamogga|Shimoga", "Tumakuru|Tumkur", "Udupi",
    "Vijayapura|Bijapur", "Yadgir",
  ],
  Kerala: [
    "Alappuzha|Alleppey", "Aluva", "Angamaly", "Attingal", "Changanassery", "Cherthala", "Guruvayur", "Idukki",
    "Kalpetta", "Kanhangad", "Kannur", "Kasaragod", "Kayamkulam", "Kochi|Cochin", "Kollam|Quilon", "Kottayam",
    "Kozhikode|Calicut", "Malappuram", "Manjeri", "Munnar", "Muvattupuzha", "Nedumangad", "Neyyattinkara",
    "Ottapalam", "Palakkad|Palghat", "Pathanamthitta", "Payyanur", "Perinthalmanna", "Perumbavoor", "Ponnani",
    "Thalassery", "Thiruvalla", "Thiruvananthapuram|Trivandrum", "Thodupuzha", "Thrissur|Trichur", "Tirur",
    "Vadakara", "Varkala",
  ],
  Ladakh: ["Kargil", "Leh"],
  Lakshadweep: ["Agatti", "Amini", "Andrott", "Kalpeni", "Kavaratti", "Minicoy"],
  "Madhya Pradesh": [
    "Agar Malwa", "Alirajpur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur",
    "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda",
    "Indore", "Itarsi", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Mhow",
    "Morena", "Narmadapuram|Hoshangabad", "Narsinghpur", "Neemuch", "Panna", "Pithampur", "Raisen", "Rajgarh",
    "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi",
    "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha",
  ],
  Maharashtra: [
    "Ahmednagar|Ahilyanagar", "Akola", "Alibag", "Ambernath", "Amravati", "Aurangabad|Chhatrapati Sambhajinagar",
    "Badlapur", "Baramati", "Beed", "Bhandara", "Bhiwandi", "Buldhana", "Chandrapur", "Dhule", "Dombivli",
    "Gadchiroli", "Gondia", "Hingoli", "Ichalkaranji", "Jalgaon", "Jalna", "Kalyan", "Karad", "Kolhapur",
    "Latur", "Lonavala", "Malegaon", "Mira-Bhayandar", "Mumbai", "Nagpur", "Nanded", "Nandurbar", "Nashik",
    "Navi Mumbai", "Osmanabad|Dharashiv", "Palghar", "Panvel", "Parbhani", "Pimpri-Chinchwad", "Pune",
    "Ratnagiri", "Sangli", "Satara", "Sawantwadi", "Shirdi", "Solapur", "Thane", "Ulhasnagar", "Vasai-Virar",
    "Wardha", "Washim", "Yavatmal",
  ],
  Manipur: [
    "Bishnupur", "Chandel", "Churachandpur", "Imphal", "Jiribam", "Kakching", "Moirang", "Senapati",
    "Tamenglong", "Thoubal", "Ukhrul",
  ],
  Meghalaya: [
    "Baghmara", "Jowai", "Mawkyrwat", "Nongpoh", "Nongstoin", "Resubelpara", "Shillong", "Sohra|Cherrapunji",
    "Tura", "Williamnagar",
  ],
  Mizoram: [
    "Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saitual",
    "Serchhip", "Siaha",
  ],
  Nagaland: [
    "Chumoukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Peren", "Phek",
    "Tuensang", "Wokha", "Zunheboto",
  ],
  "Odisha|Orissa": [
    "Angul", "Balangir", "Balasore|Baleswar", "Bargarh", "Baripada", "Berhampur|Brahmapur", "Bhadrak",
    "Bhawanipatna", "Bhubaneswar", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Jagatsinghpur", "Jajpur",
    "Jeypore", "Jharsuguda", "Kendrapara", "Kendujhar|Keonjhar", "Koraput", "Malkangiri", "Nabarangpur",
    "Nayagarh", "Nuapada", "Paradip", "Paralakhemundi", "Phulbani", "Puri", "Rayagada", "Rourkela",
    "Sambalpur", "Sonepur", "Sundargarh", "Talcher",
  ],
  "Puducherry|Pondicherry": ["Karaikal", "Mahe", "Puducherry|Pondicherry", "Yanam"],
  Punjab: [
    "Abohar", "Amritsar", "Barnala", "Batala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur",
    "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Khanna", "Ludhiana", "Malerkotla", "Mansa", "Moga",
    "Mohali|SAS Nagar", "Muktsar", "Nawanshahr", "Pathankot", "Patiala", "Phagwara", "Rajpura",
    "Rupnagar|Ropar", "Sangrur", "Tarn Taran", "Zirakpur",
  ],
  Rajasthan: [
    "Ajmer", "Alwar", "Balotra", "Banswara", "Baran", "Barmer", "Beawar", "Bharatpur", "Bhilwara", "Bhiwadi",
    "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur",
    "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kishangarh", "Kota", "Mount Abu",
    "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk",
    "Udaipur",
  ],
  Sikkim: ["Gangtok", "Gyalshing", "Jorethang", "Mangan", "Namchi", "Pakyong", "Rangpo", "Singtam", "Soreng"],
  "Tamil Nadu": [
    "Ambur", "Arakkonam", "Ariyalur", "Aruppukottai", "Attur", "Avadi", "Chengalpattu", "Chennai",
    "Chidambaram", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Gobichettipalayam",
    "Gudiyatham", "Hosur", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karaikudi", "Karur", "Kodaikanal",
    "Kovilpatti", "Krishnagiri", "Kumbakonam", "Madurai", "Mayiladuthurai", "Mettupalayam", "Nagapattinam",
    "Nagercoil", "Namakkal", "Neyveli", "Ooty|Udhagamandalam", "Palani", "Perambalur", "Pollachi",
    "Pudukkottai", "Rajapalayam", "Ramanathapuram", "Rameswaram", "Ranipet", "Salem", "Sivaganga", "Sivakasi",
    "Sriperumbudur", "Srivilliputhur", "Tambaram", "Tenkasi", "Thanjavur|Tanjore", "Theni",
    "Thoothukudi|Tuticorin", "Tiruchengode", "Tiruchirappalli|Trichy", "Tirunelveli", "Tirupathur",
    "Tiruppur|Tirupur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Udumalaipettai", "Vaniyambadi", "Vellore",
    "Villupuram", "Virudhunagar",
  ],
  Telangana: [
    "Adilabad", "Asifabad", "Bhadrachalam", "Bhongir", "Bhupalpally", "Bodhan", "Gadwal", "Hanamkonda",
    "Hyderabad", "Jagtial", "Jangaon", "Kamareddy", "Karimnagar", "Khammam", "Kothagudem", "Mahabubabad",
    "Mahabubnagar", "Mancherial", "Medak", "Miryalaguda", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet",
    "Nirmal", "Nizamabad", "Peddapalli", "Ramagundam", "Sangareddy", "Secunderabad", "Siddipet", "Sircilla",
    "Suryapet", "Vikarabad", "Wanaparthy", "Warangal", "Zaheerabad",
  ],
  Tripura: [
    "Agartala", "Ambassa", "Belonia", "Bishalgarh", "Dharmanagar", "Kailashahar", "Khowai", "Kumarghat",
    "Sabroom", "Sonamura", "Teliamura", "Udaipur",
  ],
  "Uttar Pradesh": [
    "Agra", "Aligarh", "Amroha", "Ayodhya|Faizabad", "Azamgarh", "Bahraich", "Ballia", "Balrampur", "Banda",
    "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot",
    "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Ghaziabad", "Ghazipur", "Gonda",
    "Gorakhpur", "Greater Noida", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jaunpur", "Jhansi", "Kannauj",
    "Kanpur", "Kasganj", "Kaushambi", "Lakhimpur Kheri", "Lalitpur", "Loni", "Lucknow", "Mainpuri", "Mathura",
    "Mau", "Meerut", "Mirzapur", "Modinagar", "Moradabad", "Muzaffarnagar", "Noida", "Orai", "Padrauna",
    "Pilibhit", "Pratapgarh", "Prayagraj|Allahabad", "Raebareli", "Rampur", "Robertsganj", "Saharanpur",
    "Sambhal", "Shahjahanpur", "Shamli", "Siddharthnagar", "Sitapur", "Sultanpur", "Unnao", "Varanasi|Banaras",
    "Vrindavan",
  ],
  "Uttarakhand|Uttaranchal": [
    "Almora", "Bageshwar", "Champawat", "Dehradun", "Gopeshwar", "Haldwani", "Haridwar", "Kashipur", "Khatima",
    "Kotdwar", "Mussoorie", "Nainital", "New Tehri", "Pauri", "Pithoragarh", "Ramnagar", "Rishikesh", "Roorkee",
    "Rudraprayag", "Rudrapur", "Srinagar Garhwal", "Uttarkashi",
  ],
  "West Bengal": [
    "Alipurduar", "Asansol", "Baharampur|Berhampore", "Balurghat", "Bankura", "Barasat", "Bardhaman|Burdwan",
    "Barrackpore", "Bidhannagar|Salt Lake", "Bolpur", "Chinsurah", "Contai", "Cooch Behar", "Darjeeling",
    "Diamond Harbour", "Durgapur", "Haldia", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kalyani",
    "Kharagpur", "Kolkata|Calcutta", "Krishnanagar", "Malda", "Medinipur|Midnapore", "Purulia", "Raiganj",
    "Serampore", "Siliguri", "Suri", "Tamluk",
  ],
};

export interface Place {
  /** What gets stored on the order, e.g. "Bengaluru". */
  name: string;
  /** What the dropdown shows, e.g. "Bengaluru (Bangalore)". */
  label: string;
  alias: string | null;
}

export interface IndiaState extends Place {
  cities: Place[];
}

function toPlace(entry: string): Place {
  const [name, alias = null] = entry.split("|");
  return { name, alias, label: alias ? `${name} (${alias})` : name };
}

const byName = (a: Place, b: Place) => a.name.localeCompare(b.name);

export const INDIA_STATES: IndiaState[] = Object.entries(RAW_LOCATIONS)
  .map(([state, cities]) => ({ ...toPlace(state), cities: cities.map(toPlace).sort(byName) }))
  .sort(byName);

/** "TamilNadu", "tamil nadu" and "Tamil Nadu" all compare equal. */
const simplify = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

function findPlace<T extends Place>(places: T[], value: string): T | undefined {
  const key = simplify(value);
  if (!key) return undefined;
  return places.find((p) => simplify(p.name) === key || (p.alias !== null && simplify(p.alias) === key));
}

export function findState(value: string): IndiaState | undefined {
  return findPlace(INDIA_STATES, value);
}

export function findCity(state: IndiaState, value: string): Place | undefined {
  return findPlace(state.cities, value);
}

/**
 * Snaps a typed or saved state/city onto the dropdown's spelling ("TamilNadu" → "Tamil Nadu",
 * "Bangalore" → "Bengaluru"). Anything that doesn't match is kept exactly as typed.
 */
export function canonicalLocation(location: { state: string; city: string }) {
  const state = findState(location.state);
  if (!state) return location;
  const city = findCity(state, location.city);
  return { state: state.name, city: city ? city.name : location.city };
}
