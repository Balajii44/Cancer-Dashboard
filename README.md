# Cancer Financial Toxicity Dashboard

A comprehensive dashboard application to help cancer patients assess financial toxicity and find suitable hospitals for their treatment.

## Features

- **Patient Information Collection**: Collect personal, location, and financial details
- **Hospital Database Integration**: Uses a comprehensive hospital directory to find nearby treatment facilities
- **Financial Toxicity Assessment**: Analyzes potential financial burden based on cancer type, stage, and financial situation
- **Personalized Recommendations**: Suggests actions to mitigate financial burden
- **Hospital Finder**: Displays hospitals in the patient's area with contact information and facilities

## Hospital Database

The application uses a comprehensive hospital directory database with over 30,000 hospitals across India. The database includes:

- Hospital names and contact information
- Location details (coordinates, address, state, district)
- Facilities and specialties
- Bed capacity and doctor information
- Hospital type and care system

## Project Structure

```
cancer-financial-toxicity-dashboard/
├── src/
│   ├── components/        # React components
│   ├── services/          # API services
│   ├── types/             # TypeScript type definitions
│   ├── App.tsx            # Main application component
│   └── main.tsx           # Entry point
├── public/                # Static assets
├── hospital_directory.csv # Hospital database
└── server.js              # Express server for hospital data API
```

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies

```bash
npm install
```

3. Start the backend server

```bash
npm run server
```

4. In a new terminal, start the frontend development server

```bash
npm run dev
```

## Usage

1. Open your browser and navigate to http://localhost:5173/
2. Start by clicking "Begin Assessment"
3. Complete all the required information in each section
4. Review your assessment and submit
5. View hospitals in your area and financial toxicity recommendations

## Technologies Used

- **Frontend**: React, TypeScript, Material UI
- **Backend**: Express.js
- **Data Processing**: CSV Parser
- **State Management**: React Hooks
- **API Communication**: Axios

## License

This project is licensed under the MIT License. 