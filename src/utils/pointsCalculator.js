// World Records for different courses and events
const worldRecords = {
    'SCY': { // Short Course Yards
      'FREE': {
        '50': 17.63,  // Caeleb Dressel (2018)
        '100': 39.90, // Caeleb Dressel (2018)
        '200': 88.81, // Luke Hobson (2024)
        '500': 244.45, // Rex Maurer (2024)
        '1000': 513.93, // Clark Smith (2015)
        '1650': 852.08  // Bobby Finke (2020)
      },
      'BACK': {
        '50': 20.35,  // Kacper Stokowski (2022)
        '100': 43.35, // Luca Urlando (2022)
        '200': 95.37  // Destin Lasco (2024)
      },
      'BREAST': {
        '50': 22.40,  // Michael Andrew (2018)
        '100': 49.53, // Liam Bell (2024)
        '200': 107.91 // Will Licon (2017)
      },
      'FLY': {
        '50': 20.00,  // Caeleb Dressel (2018)
        '100': 42.80, // Caeleb Dressel (2018)
        '200': 97.35  // Jack Conger (2017)
      },
      'IM': {
        '200': 97.91,  // Destin Lasco (2024)
        '400': 213.42  // Chase Kalisz (2017)
      }
    },
    'SCM': { // Short Course Meters
      'FREE': {
        '50': 19.90,  // Jordan Crooks (2024)
        '100': 44.84, // Kyle Chalmers (2021)
        '200': 98.61, // Luke Hobson (2024)
        '400': 212.25, // Yannick Agnel (2012)
        '800': 440.46, // Daniel Wiffen (2023)
        '1500': 846.88  // Florian Wellbrock (2021)
      },
      'BACK': {
        '50': 22.11,  // Kliment Kolesnikov (2022)
        '100': 48.33, // Coleman Stewart (2021)
        '200': 105.63  // Mitch Larkin (2015)
      },
      'BREAST': {
        '50': 24.95,  // Emre Sakçı (2021)
        '100': 55.28, // Ilya Shymanovich (2021)
        '200': 120.16 // Kirill Prigoda (2018)
      },
      'FLY': {
        '50': 21.32,  // Noè Ponti (2024)
        '100': 47.71, // Noè Ponti (2024)
        '200': 106.85  // Tomoru Honda (2022)
      },
      'IM': {
        '100': 49.28,  // Caeleb Dressel (2020)
        '200': 108.88, // Léon Marchand (2024)
        '400': 234.81  // Daiya Seto (2019)
      }
    },
    'LCM': { // Long Course Meters
      'FREE': {
        '50': 20.91,  // César Cielo (2009)
        '100': 46.40, // Pan Zhanle (2024)
        '200': 102.00, // Paul Biedermann (2009)
        '400': 220.07, // Paul Biedermann (2009)
        '800': 452.12, // Zhang Lin (2009)
        '1500': 870.67  // Bobby Finke (2024)
      },
      'BACK': {
        '50': 23.55,  // Kliment Kolesnikov (2023)
        '100': 51.60, // Thomas Ceccon (2022)
        '200': 111.92  // Aaron Peirsol (2009)
      },
      'BREAST': {
        '50': 25.95,  // Adam Peaty (2017)
        '100': 56.88, // Adam Peaty (2019)
        '200': 125.48 // Qin Haiyang (2023)
      },
      'FLY': {
        '50': 22.27,  // Andriy Govorov (2018)
        '100': 49.45, // Caeleb Dressel (2021)
        '200': 110.34  // Kristóf Milák (2022)
      },
      'IM': {
        '200': 114.00, // Ryan Lochte (2011)
        '400': 242.50  // Léon Marchand (2023)
      }
    }
  };

// Parse event name into components (e.g., "100 Y FREE" -> { distance: 100, course: "Y", stroke: "FREE" })
function parseEventName(eventName) {
  const parts = eventName.split(' ');
  if (parts.length < 3) return null;

  const distance = parseInt(parts[0]);
  const course = parts[1]; // Y, L, or S
  const stroke = parts.slice(2).join(' ').toUpperCase();

  return {
    distance,
    course,
    stroke,
    original: eventName
  };
}

// Convert course code to standard format
function standardizeCourse(course) {
  switch (course.toUpperCase()) {
    case 'Y': return 'SCY';
    case 'S': return 'SCM';
    case 'L': return 'LCM';
    default: return course;
  }
}

// Standardize stroke name
function standardizeStroke(stroke) {
  const strokes = {
    'FREE': ['FREE', 'FREESTYLE', 'FR'],
    'BACK': ['BACK', 'BACKSTROKE', 'BK'],
    'BREAST': ['BREAST', 'BREASTSTROKE', 'BR'],
    'FLY': ['FLY', 'BUTTERFLY', 'FL'],
    'IM': ['IM', 'I.M.', 'INDIVIDUAL MEDLEY', 'MEDLEY']
  };

  const upperStroke = stroke.toUpperCase();
  for (const [standard, variations] of Object.entries(strokes)) {
    if (variations.includes(upperStroke)) {
      return standard;
    }
  }
  return upperStroke;
}

// Calculate points for a single event
function calculateEventPoints(eventName, timeInSeconds) {
  if (!timeInSeconds) return 0;
  
  const parsed = parseEventName(eventName);
  if (!parsed) return 0;

  const course = standardizeCourse(parsed.course);
  const stroke = standardizeStroke(parsed.stroke);

  // Get world record time for the course
  const records = worldRecords[course];
  if (!records || !records[stroke]) return 0;

  const worldRecord = records[stroke][parsed.distance.toString()];
  if (!worldRecord) return 0;

  // Calculate points using the formula: 1000 * (World Record / Swimmer's Time)^3
  const points = 1000 * Math.pow(worldRecord / timeInSeconds, 3);
  return Math.round(points);
}

// Sort and organize events by points
function organizeEventsByPoints(events) {
  if (!events || typeof events !== 'object') {
    console.warn('Invalid events object:', events);
    return { scoredEvents: [], unscoredEvents: [], overallScore: 0 };
  }

  const eventsList = Object.entries(events).map(([event, data]) => {
    const points = calculateEventPoints(event, data.seconds);
    return {
      event,
      time: data.time,
      seconds: data.seconds,
      points
    };
  });

  // Sort by points (highest to lowest)
  eventsList.sort((a, b) => b.points - a.points);

  // Separate into scored and unscored events
  const scoredEvents = eventsList.filter(e => e.points > 0);
  const unscoredEvents = eventsList.filter(e => e.points === 0);

  // Sort unscored events by time
  unscoredEvents.sort((a, b) => (a.seconds || 0) - (b.seconds || 0));

  return {
    scoredEvents,
    unscoredEvents,
    // Calculate overall score using top 4 events with weights
    overallScore: calculateOverallScore(scoredEvents)
  };
}

// Calculate overall score using weighted average of top 4 events
function calculateOverallScore(scoredEvents) {
  const weights = [0.40, 0.40, 0.15, 0.05]; // Weights for top 4 events
  const topEvents = scoredEvents.slice(0, 4);
  
  if (topEvents.length === 0) return 0;

  let totalScore = 0;
  let totalWeight = 0;

  topEvents.forEach((event, index) => {
    const weight = weights[index] || 0;
    totalScore += event.points * weight;
    totalWeight += weight;
  });

  // If less than 4 events, normalize the score
  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

export {
  calculateEventPoints,
  organizeEventsByPoints
}; 