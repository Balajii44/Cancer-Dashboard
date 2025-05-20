import express from 'express';
import cors from 'cors';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Store hospitals data in memory
let hospitals = [];
let districts = new Set();
let states = new Set();

// Sanitize data fields to handle missing or '0' values
const sanitizeData = (data) => {
  const result = {};
  
  // Loop through all properties
  for (const key in data) {
    // Convert empty values and '0' values to null or empty string based on preference
    const value = (!data[key] || data[key] === '0') ? '' : data[key].trim();
    result[key] = value;
  }
  
  return result;
};

// Parse CSV file on server startup
const loadHospitalData = () => {
  const results = [];
  
  try {
    const csvPath = path.join(__dirname, 'hospital_directory.csv');
    console.log('Attempting to load CSV from:', csvPath);
    
    if (!fs.existsSync(csvPath)) {
      console.error(`Error: CSV file not found at ${csvPath}`);
      return;
    }
    
    console.log('CSV file found, starting to read...');
    
    fs.createReadStream(csvPath)
      .on('error', (error) => {
        console.error(`Error reading CSV file: ${error.message}`);
      })
      .pipe(csv())
      .on('data', (data) => {
        try {
          // Clean up data
          const rawHospital = sanitizeData(data);
          
          const hospital = {
            id: rawHospital.Sr_No,
            name: rawHospital.Hospital_Name,
            coordinates: rawHospital.Location_Coordinates,
            location: rawHospital.Location,
            category: rawHospital.Hospital_Category,
            careType: rawHospital.Hospital_Care_Type,
            medicine: rawHospital.Discipline_Systems_of_Medicine,
            address: rawHospital.Address_Original_First_Line,
            state: rawHospital.State,
            district: rawHospital.District,
            subdistrict: rawHospital.Subdistrict,
            pincode: rawHospital.Pincode,
            telephone: rawHospital.Telephone,
            mobile: rawHospital.Mobile_Number,
            emergency: rawHospital.Emergency_Num,
            ambulance: rawHospital.Ambulance_Phone_No,
            bloodbank: rawHospital.Bloodbank_Phone_No,
            email: rawHospital.Hospital_Primary_Email_Id,
            website: rawHospital.Website,
            specialties: rawHospital.Specialties,
            facilities: rawHospital.Facilities,
            totalBeds: rawHospital.Total_Num_Beds,
            privateWards: rawHospital.Number_Private_Wards,
            doctors: rawHospital.Number_Doctor
          };
          
          // Only add valid hospitals with names that are allopathy hospitals
          if (hospital.name && 
              hospital.medicine && 
              hospital.medicine.toLowerCase().includes('allopathy') &&
              !hospital.category.toLowerCase().includes('dispensary') &&
              !hospital.category.toLowerCase().includes('nursing home') &&
              !hospital.name.toLowerCase().includes('children') &&
              !hospital.name.toLowerCase().includes('child') &&
              !hospital.specialties?.toLowerCase().includes('pediatric') &&
              !hospital.specialties?.toLowerCase().includes('children') &&
              // Enhanced nursing home filtering
              !hospital.name.toLowerCase().includes('nursing home') &&
              !hospital.name.toLowerCase().includes('nursing') &&
              !hospital.name.toLowerCase().includes('nursing home') &&
              !hospital.name.toLowerCase().includes('nursinghome') &&
              !hospital.name.toLowerCase().includes('nursing-home') &&
              !hospital.name.toLowerCase().includes('nursing_home') &&
              !hospital.category.toLowerCase().includes('nursing') &&
              !hospital.careType?.toLowerCase().includes('nursing') &&
              // Additional exclusions for small healthcare facilities
              !hospital.name.toLowerCase().includes('clinic') &&
              !hospital.name.toLowerCase().includes('dispensary') &&
              !hospital.name.toLowerCase().includes('health center') &&
              !hospital.name.toLowerCase().includes('health centre') &&
              !hospital.name.toLowerCase().includes('healthcare center') &&
              !hospital.name.toLowerCase().includes('healthcare centre') &&
              // Ensure it's a proper hospital
              (hospital.totalBeds && parseInt(hospital.totalBeds) > 10) &&
              (hospital.doctors && parseInt(hospital.doctors) > 2)) {
            results.push(hospital);
            
            // Collect unique districts and states
            if (hospital.district && hospital.district.trim()) {
              districts.add(hospital.district.trim());
            }
            if (hospital.state && hospital.state.trim()) {
              states.add(hospital.state.trim());
            }
          }
        } catch (error) {
          console.error(`Error processing hospital data: ${error.message}`);
          console.error('Problematic data:', data);
        }
      })
      .on('end', () => {
        hospitals = results;
        console.log('CSV file reading completed');
        console.log('Sample hospital data:', hospitals[0]);
        console.log('Sample states:', Array.from(states).slice(0, 5));
        console.log('Sample districts:', Array.from(districts).slice(0, 5));
        console.log(`Loaded ${hospitals.length} hospitals from CSV file`);
        console.log(`Found ${districts.size} districts and ${states.size} states`);
      });
  } catch (error) {
    console.error(`Error in loadHospitalData: ${error.message}`);
    console.error('Full error:', error);
  }
};

// Load hospital data on startup
loadHospitalData();

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error(`API Error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}).on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// API Endpoints

// Get all hospitals
app.get('/api/hospitals', (req, res) => {
  try {
    res.json(hospitals);
  } catch (error) {
    console.error(`Error in /api/hospitals: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve hospitals' });
  }
});

// Get hospitals by district
app.get('/api/hospitals/district/:district', (req, res) => {
  try {
    const { district } = req.params;
    const { locality } = req.query;
    
    if (!district) {
      return res.status(400).json({ error: 'District parameter is required' });
    }
    
    let filteredHospitals = hospitals.filter(
      hospital => hospital.district && hospital.district.toLowerCase() === district.toLowerCase()
    );

    // If locality is provided, prioritize hospitals in that locality
    if (locality) {
      filteredHospitals.sort((a, b) => {
        const aInLocality = a.subdistrict?.toLowerCase().includes(locality.toLowerCase());
        const bInLocality = b.subdistrict?.toLowerCase().includes(locality.toLowerCase());
        
        if (aInLocality && !bInLocality) return -1;
        if (!aInLocality && bInLocality) return 1;
        return 0;
      });
    }
    
    res.json(filteredHospitals);
  } catch (error) {
    console.error(`Error in /api/hospitals/district: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve hospitals by district' });
  }
});

// Get hospitals by state
app.get('/api/hospitals/state/:state', (req, res) => {
  try {
    const { state } = req.params;
    
    if (!state) {
      return res.status(400).json({ error: 'State parameter is required' });
    }
    
    const filteredHospitals = hospitals.filter(
      hospital => hospital.state && hospital.state.toLowerCase() === state.toLowerCase()
    );
    
    res.json(filteredHospitals);
  } catch (error) {
    console.error(`Error in /api/hospitals/state: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve hospitals by state' });
  }
});

// Get districts by state
app.get('/api/state/:state/districts', (req, res) => {
  try {
    const { state } = req.params;
    
    if (!state) {
      return res.status(400).json({ error: 'State parameter is required' });
    }
    
    const stateDistricts = [...new Set(
      hospitals
        .filter(hospital => hospital.state && hospital.state.toLowerCase() === state.toLowerCase())
        .map(hospital => hospital.district)
        .filter(district => district)
    )].sort();
    
    res.json(stateDistricts);
  } catch (error) {
    console.error(`Error in /api/state/districts: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve districts by state' });
  }
});

// Get hospitals by name search with enhanced filtering
app.get('/api/hospitals/search', (req, res) => {
  try {
    const { query, district, locality } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    let filteredHospitals = hospitals.filter(
      hospital => hospital.name && hospital.name.toLowerCase().includes(query.toLowerCase())
    );

    // Additional filtering by district if provided
    if (district) {
      filteredHospitals = filteredHospitals.filter(
        hospital => hospital.district && hospital.district.toLowerCase() === district.toLowerCase()
      );
    }

    // Additional filtering by locality if provided
    if (locality) {
      filteredHospitals = filteredHospitals.filter(
        hospital => hospital.subdistrict && hospital.subdistrict.toLowerCase().includes(locality.toLowerCase())
      );
    }

    // Sort by relevance
    filteredHospitals.sort((a, b) => {
      // Exact name match gets highest priority
      const aExactMatch = a.name.toLowerCase() === query.toLowerCase();
      const bExactMatch = b.name.toLowerCase() === query.toLowerCase();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // Then sort by locality match if locality is provided
      if (locality) {
        const aInLocality = a.subdistrict?.toLowerCase().includes(locality.toLowerCase());
        const bInLocality = b.subdistrict?.toLowerCase().includes(locality.toLowerCase());
        if (aInLocality && !bInLocality) return -1;
        if (!aInLocality && bInLocality) return 1;
      }

      // Finally sort by name
      return a.name.localeCompare(b.name);
    });
    
    res.json(filteredHospitals);
  } catch (error) {
    console.error(`Error in /api/hospitals/search: ${error.message}`);
    res.status(500).json({ error: 'Failed to search for hospitals' });
  }
});

// Get all districts
app.get('/api/districts', (req, res) => {
  try {
    res.json([...districts].sort());
  } catch (error) {
    console.error(`Error in /api/districts: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve districts' });
  }
});

// Get all states
app.get('/api/states', (req, res) => {
  try {
    res.json([...states].sort());
  } catch (error) {
    console.error(`Error in /api/states: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve states' });
  }
});

// Get hospital details by id
app.get('/api/hospitals/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Hospital ID is required' });
    }
    
    const hospital = hospitals.find(h => h.id === id);
    
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    
    res.json(hospital);
  } catch (error) {
    console.error(`Error in /api/hospitals/:id: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve hospital details' });
  }
});

// Get hospital details with cost estimates
app.get('/api/hospitals/:id/details', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Hospital ID is required' });
    }
    
    const hospital = hospitals.find(h => h.id === id);
    
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    // Add cost estimates based on hospital type
    const costEstimates = {
      baseTreatment: {
        min: hospital.careType?.toLowerCase().includes('government') ? 200000 : 400000,
        max: hospital.careType?.toLowerCase().includes('government') ? 400000 : 800000
      },
      roomRent: {
        standard: 2000,
        deluxe: 5000
      },
      facilities: hospital.facilities ? hospital.facilities.split(',').map(f => f.trim()) : [],
      specialties: hospital.specialties ? hospital.specialties.split(',').map(s => s.trim()) : []
    };
    
    res.json({
      ...hospital,
      costEstimates
    });
  } catch (error) {
    console.error(`Error in /api/hospitals/:id/details: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve hospital details' });
  }
});

// Get hospitals by locality
app.get('/api/hospitals/locality/:locality', (req, res) => {
  try {
    const { locality } = req.params;
    
    if (!locality) {
      return res.status(400).json({ error: 'Locality parameter is required' });
    }
    
    const filteredHospitals = hospitals.filter(
      hospital => hospital.subdistrict && hospital.subdistrict.toLowerCase().includes(locality.toLowerCase())
    );
    
    res.json(filteredHospitals);
  } catch (error) {
    console.error(`Error in /api/hospitals/locality: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve hospitals by locality' });
  }
});

// Handle all other routes by serving the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
}); 