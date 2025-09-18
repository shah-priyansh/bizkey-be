const mongoose = require('mongoose');
const State = require('./models/State');
const City = require('./models/City');
require('dotenv').config();

// India states and cities data
const indiaData = {
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Rajahmundry", "Kadapa", "Anantapur", "Chittoor"],
    "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tezpur", "Bomdila", "Tawang", "Ziro", "Along", "Daporijo", "Anini"],
    "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Tezpur", "Nagaon", "Tinsukia", "Barpeta", "Dhubri", "Sivasagar"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia", "Arrah", "Begusarai", "Katihar", "Chhapra"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon", "Durg", "Raigarh", "Jagdalpur", "Ambikapur", "Bhatapara"],
    "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Mormugao", "Bicholim", "Valpoi", "Sanguem", "Quepem"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Nadiad", "Morbi"],
    "Haryana": ["Gurgaon", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula"],
    "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Palampur", "Kullu", "Manali", "Chamba", "Baddi", "Una"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Phusro", "Hazaribagh", "Giridih", "Ramgarh", "Medininagar"],
    "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum", "Gulbarga", "Davanagere", "Bellary", "Bijapur", "Shimoga"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Malappuram", "Kannur", "Kasaragod", "Alappuzha"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Amravati", "Kolhapur", "Sangli"],
    "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Ukhrul", "Senapati", "Tamenglong", "Chandel", "Jiribam", "Kakching"],
    "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongstoin", "Williamnagar", "Baghmara", "Nongpoh", "Mairang", "Khliehriat", "Resubelpara"],
    "Mizoram": ["Aizawl", "Lunglei", "Saiha", "Champhai", "Kolasib", "Serchhip", "Lawngtlai", "Mamit", "Saitual", "Hnahthial"],
    "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Zunheboto", "Phek", "Kiphire", "Longleng", "Peren"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada", "Jharsuguda"],
    "Punjab": ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Firozpur", "Batala", "Pathankot"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Bharatpur", "Alwar", "Sikar", "Pali"],
    "Sikkim": ["Gangtok", "Namchi", "Mangan", "Gyalshing", "Singtam", "Rangpo", "Jorethang", "Ravangla", "Pelling", "Lachung"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Erode", "Vellore", "Thoothukkudi"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet"],
    "Tripura": ["Agartala", "Dharmanagar", "Udaipur", "Ambassa", "Kailashahar", "Belonia", "Khowai", "Teliamura", "Sabroom", "Amarpur"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Meerut", "Allahabad", "Bareilly", "Ghaziabad", "Noida", "Moradabad"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Roorkee", "Kashipur", "Rudrapur", "Haldwani", "Nainital", "Almora", "Pithoragarh"],
    "West Bengal": ["Kolkata", "Asansol", "Siliguri", "Durgapur", "Bardhaman", "Malda", "Bahraich", "Habra", "Kharagpur", "Shantipur"]
};

const seedData = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-management');
        console.log('Connected to MongoDB');

        // Clear existing data
        await State.deleteMany({});
        await City.deleteMany({});
        console.log('Cleared existing data');

        // Create states with unique codes
        const states = [];
        const stateCodes = new Set();

        for (const [stateName, cities] of Object.entries(indiaData)) {
            let stateCode = stateName.replace(/\s+/g, '').substring(0, 3).toUpperCase();

            // Handle duplicate codes
            let counter = 1;
            while (stateCodes.has(stateCode)) {
                stateCode = stateName.replace(/\s+/g, '').substring(0, 2).toUpperCase() + counter;
                counter++;
            }

            stateCodes.add(stateCode);

            const state = new State({
                name: stateName,
                code: stateCode
            });
            await state.save();
            states.push(state);
            console.log(`Created state: ${stateName} (${stateCode})`);
        }

        // Create cities
        for (const [stateName, cityNames] of Object.entries(indiaData)) {
            const state = states.find(s => s.name === stateName);
            if (state) {
                for (const cityName of cityNames) {
                    const city = new City({
                        name: cityName,
                        state: state._id
                    });
                    await city.save();
                    console.log(`Created city: ${cityName} in ${stateName}`);
                }
            }
        }

        console.log('Data seeding completed successfully!');
        console.log(`Created ${states.length} states and ${Object.values(indiaData).flat().length} cities`);

    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the seeding function
seedData();
