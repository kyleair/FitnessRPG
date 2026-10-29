import rules from './activity-rules.mjs';
const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
function amount(value, label, min, max, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) invalid(`Invalid ${label}.`);
  return value;
}
export function validateManual(input, now = Date.now()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('An activity is required.');
  if (typeof input.requestId !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(input.requestId)) invalid('A valid save request ID is required.');
  if (!['manual', 'workout'].includes(input.kind)) invalid('Invalid recording method.');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 120) invalid('Activity name must contain 1-120 characters.');
  const date = Date.parse(input.startDate);
  if (!Number.isFinite(date) || date < Date.UTC(1900, 0, 1) || date > now + 300000 || new Date(date).toISOString() !== input.startDate) invalid('Use a valid activity date that is not in the future.');
  const movingTime = amount(input.movingTime, 'duration (seconds)', 1, 604800, true);
  if (!['Run', 'Ride', 'Walk', 'Swim', 'Workout', 'WeightTraining'].includes(input.sportType)) invalid('Invalid activity type.');
  let distance = 0, exercises, volumeLb;
  if (input.kind === 'workout') {
    if (input.sportType !== 'WeightTraining') invalid('Workouts must be Strength activities.');
    if (!['lb', 'kg'].includes(input.weightUnit)) invalid('Choose pounds or kilograms.');
    if (!Array.isArray(input.exercises) || !input.exercises.length || input.exercises.length > 40) invalid('Choose 1-40 exercises.');
    let completed = 0;
    exercises = input.exercises.map(exercise => {
      if (!exercise || !rules.exercises.includes(exercise.name)) invalid('Unknown strength exercise.');
      if (!Array.isArray(exercise.sets) || !exercise.sets.length || exercise.sets.length > 30) invalid('Each exercise needs 1-30 sets.');
      return { name: exercise.name, sets: exercise.sets.map(set => {
        if (!set || set.completed !== true) invalid('Submit only completed sets.');
        completed++;
        return { weight: amount(set.weight, 'set weight', 0, 2000), reps: amount(set.reps, 'set reps', 1, 1000, true), completed: true };
      }) };
    });
    if (!completed) invalid('Complete at least one set.');
    volumeLb = exercises.reduce((sum, exercise) => sum + exercise.sets.reduce((total, set) => total + set.weight * set.reps, 0), 0) * (input.weightUnit === 'kg' ? rules.kgToLb : 1);
  } else {
    if (input.sportType === 'WeightTraining') invalid('Use the workout builder to record Strength sets and reps.');
    distance = amount(input.distance, 'distance (meters)', input.sportType === 'Workout' ? 0 : 1, 2000000);
  }
  return { requestId: input.requestId, name, sportType: input.sportType, startDate: input.startDate, movingTime, distance, elevationGain: 0,
    source: 'manual', recordingMethod: input.kind, ...(exercises ? { exercises, weightUnit: input.weightUnit, volumeLb } : {}) };
}
