// Constants for ELO calculation
const MIN_K = 16;
const MAX_K = 48;
const CONFIDENCE_THRESHOLD = 30; // number of ratings before confidence is high

export const calculateNewElos = (winner, loser) => {
  // Calculate K-factor based on number of ratings
  const winnerK = getKFactor(winner.ratings_count || 0);
  const loserK = getKFactor(loser.ratings_count || 0);
  const K = (winnerK + loserK) / 2;

  // Calculate expected scores
  const expectedScore = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
  
  // Calculate ELO changes with volatility adjustment
  const eloDiff = Math.abs(winner.elo - loser.elo);
  const volatilityFactor = getVolatilityFactor(eloDiff);
  
  const eloChange = K * (1 - expectedScore) * volatilityFactor;
  
  return {
    winnerNewElo: winner.elo + eloChange,
    loserNewElo: loser.elo - eloChange,
    eloChange
  };
};

const getKFactor = (ratingsCount) => {
  // K-factor decreases as number of ratings increases
  if (ratingsCount < CONFIDENCE_THRESHOLD) {
    return MAX_K; // More volatile for new swimmers
  }
  
  const factor = Math.max(0, (CONFIDENCE_THRESHOLD - ratingsCount) / CONFIDENCE_THRESHOLD);
  return MIN_K + (MAX_K - MIN_K) * factor;
};

const getVolatilityFactor = (eloDiff) => {
  // Reduce ELO changes for very mismatched pairs
  const BASE_DIFF = 400;
  if (eloDiff <= BASE_DIFF) return 1;
  return Math.max(0.5, 1 - (eloDiff - BASE_DIFF) / 800);
}; 