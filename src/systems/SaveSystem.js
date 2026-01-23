const STORAGE_KEY = "phantomshift_save_v1";

const defaultData = {
  cleared: {
    tutorial: false,
    "1-1": {
      EASY: false,
      NORMAL: false,
      HARD: false,
    },
  },
  best: {
    "1-1": {
      EASY: { bestTime: null, minDetectedCount: null, minDeathCount: null },
      NORMAL: { bestTime: null, minDetectedCount: null, minDeathCount: null },
      HARD: { bestTime: null, minDetectedCount: null, minDeathCount: null },
    },
  },
  settings: {
    bgmVolume: 60,
    seVolume: 70,
    showVisionCone: true,
    touchOpacity: 0.7,
    pauseOnPortrait: true,
  },
};

export const SaveSystem = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { ...defaultData };
      }
      const parsed = JSON.parse(raw);
      return {
        ...defaultData,
        ...parsed,
        cleared: {
          ...defaultData.cleared,
          ...parsed.cleared,
          "1-1": {
            ...defaultData.cleared["1-1"],
            ...parsed?.cleared?.["1-1"],
          },
        },
        best: {
          ...defaultData.best,
          "1-1": {
            ...defaultData.best["1-1"],
            ...parsed?.best?.["1-1"],
          },
        },
        settings: {
          ...defaultData.settings,
          ...parsed.settings,
        },
      };
    } catch (error) {
      console.warn("Save data load failed", error);
      return { ...defaultData };
    }
  },
  save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  updateSettings(data, settings) {
    const next = { ...data, settings: { ...data.settings, ...settings } };
    this.save(next);
    return next;
  },
  updateBest(data, stageId, difficulty, result) {
    const current = data.best?.[stageId]?.[difficulty];
    const nextBest = {
      bestTime: current?.bestTime === null ? result.time : Math.min(current.bestTime, result.time),
      minDetectedCount:
        current?.minDetectedCount === null
          ? result.detected
          : Math.min(current.minDetectedCount, result.detected),
      minDeathCount:
        current?.minDeathCount === null
          ? result.deaths
          : Math.min(current.minDeathCount, result.deaths),
    };

    const next = {
      ...data,
      cleared: {
        ...data.cleared,
        [stageId]:
          stageId === "tutorial"
            ? true
            : {
                ...data.cleared[stageId],
                [difficulty]: true,
              },
      },
      best: {
        ...data.best,
        [stageId]: {
          ...data.best[stageId],
          [difficulty]: nextBest,
        },
      },
    };
    this.save(next);
    return next;
  },
};
