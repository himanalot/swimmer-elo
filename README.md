# SwimELO 🏊‍♂️

A web application for ranking swimmers through head-to-head comparisons using an ELO rating system. View it live at [swimelo.netlify.app](https://swimelo.netlify.app).

## Features

- **Head-to-Head Comparisons**: Rate swimmers against each other in a simple, intuitive interface
- **ELO Rating System**: Fair and accurate rankings based on community voting
- **Performance Scoring**: Automatic calculation of swimmer performance scores based on their best times
- **Swimmer Profiles**: Detailed profiles including:
  - Best times for various events
  - Performance scores
  - Team affiliation
  - Social media links
  - Profile images
- **Real-time Updates**: Live updates of rankings and ratings
- **Mobile Responsive**: Fully functional on all device sizes
- **Interactive UI**: Animations and intuitive user interface

## Technology Stack

- **Frontend**:
  - React.js
  - Material-UI (MUI)
  - Framer Motion (animations)
  - TypeScript (partial)

- **Backend**:
  - Supabase (Database & Authentication)
  - Deno (Edge Functions)
  - Python (Data Processing)

- **Deployment**:
  - Netlify (Frontend)
  - Supabase (Backend)

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/himanalot/swimmer-elo.git
cd swimmer-elo
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Supabase credentials:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
```

4. Start the development server:
```bash
npm start
```

The app will be available at `http://localhost:3000`.

## Project Structure

```
swimmer-elo/
├── public/                 # Static files
├── src/
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── lib/              # Library configurations
│   ├── utils/            # Utility functions
│   └── App.js            # Main application component
├── supabase/
│   └── functions/        # Supabase Edge Functions
└── scripts/              # Development scripts
```

## Key Components

- `SwimmerCard`: Displays swimmer information and comparison interface
- `Leaderboard`: Shows current rankings and allows searching
- `SwimmerProfile`: Detailed view of individual swimmer stats
- `AddSwimmer`: Interface for adding new swimmers to the database
- `WavesBackground`: Interactive animated background
- `pointsCalculator`: Calculates performance scores based on world records

## Data Processing

The application uses several Python scripts for data processing:

- `roster_scraper.py`: Scrapes swimmer data from SwimCloud
- `convert_to_elo.py`: Processes swimmer data and initializes ELO ratings
- `add-swimmer.py`: Edge function for adding new swimmers

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- SwimCloud for providing swimmer data
- The swimming community for contributing ratings

## Contact

For questions or feedback, please open an issue on GitHub
