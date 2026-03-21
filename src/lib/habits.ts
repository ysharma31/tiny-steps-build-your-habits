const HABITS = {
  workout: {
    label: "Workout",
    stages: [
      { goal: "15 min light jog",    advanceAfterDays: 3 },
      { goal: "30 min jog",          advanceAfterDays: 5 },
      { goal: "45 min cardio",       advanceAfterDays: 7 },
      { goal: "Strength training",   advanceAfterDays: null, isFinal: true },
    ]
  },
  reading: {
    label: "Reading",
    stages: [
      { goal: "20 min/day any genre",       advanceAfterDays: 3 },
      { goal: "30 min/day finance focus",   advanceAfterDays: 5 },
      { goal: "45 min/day finance primary", advanceAfterDays: null, isFinal: true },
    ]
  },
  screenTime: {
    label: "Screen Time",
    stages: [
      { goal: "Reduce by 30 min from baseline", advanceAfterDays: 5 },
      { goal: "Reduce by 1 hr from baseline",   advanceAfterDays: 7 },
      { goal: "Cap at 2 hrs/day",               advanceAfterDays: null, isFinal: true },
    ]
  },
  singing: {
    label: "Singing Practice",
    stages: [
      { goal: "15 min voice warm-up",       advanceAfterDays: 5 },
      { goal: "30 min structured practice", advanceAfterDays: 7 },
      { goal: "45 min with repertoire",     advanceAfterDays: 7 },
      { goal: "1 hr performance focus",     advanceAfterDays: null, isFinal: true },
    ]
  },
  aiTools: {
    label: "AI Tools",
    stages: [
      { goal: "30 min exploring one new tool",          advanceAfterDays: 3 },
      { goal: "1 hr deep dive every other day",         advanceAfterDays: 5 },
      { goal: "Build a small project with a new tool weekly",
        advanceAfterDays: null, isFinal: true },
    ]
  }
}

export default HABITS;
export type HabitKey = keyof typeof HABITS;
