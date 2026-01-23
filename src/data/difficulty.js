export const Difficulty = {
  EASY: "EASY",
  NORMAL: "NORMAL",
  HARD: "HARD",
};

export const DifficultyLabels = {
  [Difficulty.EASY]: "EASY（易）",
  [Difficulty.NORMAL]: "NORMAL（普）",
  [Difficulty.HARD]: "HARD（難）",
};

export const DifficultyParams = {
  [Difficulty.EASY]: {
    visionRange: 110,
    visionFov: 28,
    detectRate: 60,
    coolRate: 140,
    hearingRange: 180,
    noiseThreshold: 22,
    alertDuration: 1.5,
    loseSightTime: 1.5,
    searchDuration: 4.0,
    speedPatrol: 50,
    speedChase: 85,
    guardCount: 2,
  },
  [Difficulty.NORMAL]: {
    visionRange: 130,
    visionFov: 30,
    detectRate: 80,
    coolRate: 120,
    hearingRange: 220,
    noiseThreshold: 15,
    alertDuration: 2.0,
    loseSightTime: 1.2,
    searchDuration: 6.0,
    speedPatrol: 60,
    speedChase: 100,
    guardCount: 3,
  },
  [Difficulty.HARD]: {
    visionRange: 150,
    visionFov: 35,
    detectRate: 110,
    coolRate: 100,
    hearingRange: 260,
    noiseThreshold: 10,
    alertDuration: 2.5,
    loseSightTime: 0.9,
    searchDuration: 8.0,
    speedPatrol: 70,
    speedChase: 120,
    guardCount: 4,
  },
};
