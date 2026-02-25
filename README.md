# Stats Tracker

A comprehensive web-based golf statistics tracking system built with React and Node.js. Track your golf rounds with detailed statistics including scores, fairways, greens in regulation, putts, and more.

## Features

### Course Management
- **Multiple Courses**: Add and manage multiple golf courses
- **Tee Selection**: Support for different tee options (Blue, White, Red, etc.)
- **Hole Data**: Store par, distance, and stroke index for each hole

### Competition Types
- **Stroke Play**: Traditional stroke counting
- **Stableford**: Points-based scoring system
- **Par Competition**: Match play against par

### Detailed Statistics
- Score tracking for all 18 holes
- Fairway hit tracking with direction indicators
- Greens in Regulation (GIR)
- Up & Down statistics
- First putt distance
- Total putts per hole
- Automatic handicap stroke allocation
- Real-time score calculation

### Smart Scorecard
- Interactive scorecard interface similar to professional scorecards
- Color-coded scoring (Eagle, Birdie, Par, Bogey, Double Bogey+)
- Front 9, Back 9, and Total calculations
- Click holes to enter detailed statistics
- Auto-population of course data (distances, stroke indexes)

## Tech Stack

### Frontend
- **React** with Vite
- **CSS** for styling
- Responsive design

### Backend
- **Node.js** with Express
- **SQLite** database (better-sqlite3)
- RESTful API architecture

## Installation

### Prerequisites
- Node.js v20+ 
- npm v10+

### Setup

1. **Clone or navigate to the project directory**
   ```bash
   cd /home/alan/dev/stats-tracker
   ```

2. **Install Backend Dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../client
   npm install
   ```

## Running the Application

### Development Mode

You need to run both the backend and frontend servers:

1. **Start the Backend Server** (Terminal 1)
   ```bash
   cd /home/alan/dev/stats-tracker/server
   npm run dev
   ```
   Server will run on: `http://localhost:3000`

2. **Start the Frontend Server** (Terminal 2)
   ```bash
   cd /home/alan/dev/stats-tracker/client
   npm run dev
   ```
   Frontend will run on: `http://localhost:5173`

3. **Open your browser** and navigate to `http://localhost:5173`

## Project Structure

```
stats-tracker/
├── client/                     # React frontend
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js      # API client for backend calls
│   │   ├── components/
│   │   │   ├── NewRound.jsx   # Start new round with course/tee selection
│   │   │   ├── Scorecard.jsx  # Main scorecard interface
│   │   │   ├── HoleInput.jsx  # Detailed hole statistics input
│   │   │   └── RoundsList.jsx # Round history view
│   │   ├── App.jsx            # Main app component
│   │   └── App.css            # Global styles
│   └── package.json
│
├── server/                     # Express backend
│   ├── src/
│   │   ├── db/
│   │   │   └── database.js    # SQLite database setup & seed data
│   │   ├── routes/
│   │   │   ├── courses.js     # Course API endpoints
│   │   │   └── rounds.js      # Rounds API endpoints
│   │   ├── services/
│   │   │   └── scoringService.js # Scoring calculations
│   │   └── server.js          # Express server setup
│   ├── golf.db                # SQLite database (created on first run)
│   └── package.json
│
└── README.md
```

## Database

The application uses SQLite with the following schema:

- **courses**: Golf courses
- **tees**: Tee options for each course
- **course_holes**: Hole data (par, distance, stroke index) for each tee
- **rounds**: Golf rounds played
- **holes**: Hole-by-hole statistics for each round

### Seed Data

The database comes pre-seeded with:
- **Metropolitan Golf Club** (South Oakleigh, Victoria)
  - Blue Tees (6200m)
  - White Tees (5800m)

## API Endpoints

### Courses
- `GET /api/courses` - List all courses
- `POST /api/courses` - Create new course
- `GET /api/courses/:id` - Get course details
- `GET /api/courses/:id/tees` - Get tees for a course
- `GET /api/courses/:courseId/tees/:teeId/holes` - Get hole data

### Rounds
- `GET /api/rounds` - List all rounds
- `POST /api/rounds` - Create new round
- `GET /api/rounds/:id` - Get round with full statistics
- `PUT /api/rounds/:roundId/holes/:holeNumber` - Update hole data
- `DELETE /api/rounds/:id` - Delete a round

## Usage Guide

### Starting a New Round

1. Click **"Start New Round"** from the home page
2. Select your **course** from the dropdown
3. Choose your **tee** (Blue, White, etc.)
4. Pick your **competition type** (Stroke, Stableford, or Par)
5. Enter your **name** and **handicap**
6. Click **"Start Round"** to begin

### Recording Scores

1. Click on any hole number in the scorecard
2. Enter the **score** (required)
3. Optionally record:
   - Penalties
   - Fairway hit (with direction)
   - Green in Regulation (GIR)
   - Up & Down result
   - First putt distance
   - Total putts
4. Click **"Save"**

The system automatically:
- Calculates Stableford/Par points
- Applies handicap strokes based on stroke index
- Updates totals and statistics
- Color-codes scores (Eagle, Birdie, Par, Bogey, etc.)

### Viewing Statistics

After entering scores, the scorecard displays:
- **Front 9 / Back 9 / Total scores**
- **Fairways Hit** (e.g., 4/7 for front nine)
- **Greens in Regulation** (e.g., 6/18)
- **Total Putts**
- **Points** (for Stableford/Par competitions)

### Viewing History

1. Click **"History"** in the navigation
2. Browse your past rounds
3. Click any round card to view full scorecard
4. Delete rounds using the 🗑️ button

## Competition Type Explanations

### Stroke Play
- Traditional golf scoring
- Count total strokes
- Lowest score wins

### Stableford
- Points-based system
- Points per hole based on score vs par:
  - Albatross or better: 5 points
  - Eagle: 4 points
  - Birdie: 3 points
  - Par: 2 points
  - Bogey: 1 point
  - Double Bogey+: 0 points
- Highest points wins

### Par Competition
- Play against par on each hole
- Score relative to par:
  - Better than par: +1
  - Equal to par: 0
  - Worse than par: -1
- Highest positive score wins

## Handicap System

The system automatically allocates handicap strokes based on:
- Player's handicap
- Hole stroke index (1-18, where 1 is hardest)

For example, with an 18 handicap:
- Receive 1 stroke on all 18 holes
- Net score = Gross score - 1

## Future Enhancements

Potential features for future development:
- Multi-player rounds
- Live leaderboards
- Handicap tracking over time
- Course management UI
- Statistics dashboard with charts
- Export to CSV/PDF
- Mobile app version
- Weather integration
- GPS distance tracking

## Troubleshooting

### Port Already in Use
If port 3000 or 5173 is already in use:
- Backend: Set `PORT=3001` in server/.env file
- Frontend: Update API_BASE_URL in client/src/api/client.js

### Database Issues
To reset the database:
```bash
cd server
rm golf.db
npm start  # Database will be recreated with seed data
```

### Can't Connect to API
Ensure:
1. Backend server is running on port 3000
2. Frontend is configured to connect to `http://localhost:3000/api`
3. CORS is enabled in the backend

## License

This project is open source and available for personal use.

## Support

For issues or questions, please create an issue in the project repository.

---

**Enjoy tracking your golf statistics!** ⛳
