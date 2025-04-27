import { ExerciseTrackingType } from '../types';

const workoutExercises = [
  {
    workout_id: workoutId,
    exercise_id: exerciseIds['Supino Reto'],
    order_position: 1,
    sets: 3,
    tracking_type: ExerciseTrackingType.Reps,
    reps_per_set: 10,
    rest_after_sec: 60,
  },
  {
    workout_id: workoutId,
    exercise_id: exerciseIds['Agachamento'],
    order_position: 2,
    sets: 4,
    tracking_type: ExerciseTrackingType.Reps,
    reps_per_set: 12,
    rest_after_sec: 90,
  },
  {
    workout_id: workoutId,
    exercise_id: exerciseIds['Prancha Abdominal'],
    order_position: 3,
    sets: 3,
    tracking_type: ExerciseTrackingType.Time,
    duration_sec: 60,
    rest_after_sec: 45,
  },
  {
    workout_id: workoutId,
    exercise_id: exerciseIds['Corrida na Esteira'],
    order_position: 4,
    sets: 1,
    tracking_type: ExerciseTrackingType.Time,
    duration_sec: 300,
    rest_after_sec: 0,
  }
]; 