// src/types/index.ts
// User Types
export interface UserProfile {
  user_id: string;
  bio: string;
  height_cm?: number;
  weight_kg?: number;
  gender?: string;
  birth_date?: string;
  fitness_level: string;
  training_goals?: string[];
  preferred_training_days?: string[];
  training_experience_years?: number;
  equipment_access?: string[];
  health_limitations?: string[];
  last_updated?: string;
}

export enum UserRole {
  Free = 'free',
  Premium = 'premium',
  Admin = 'admin'
}

export enum UserStatus {
  Active = 'active',
  Inactive = 'inactive',
  PendingVerification = 'pending_verification',
  Suspended = 'suspended'
}

export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  current_period_start?: string;
  current_period_end?: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export enum SubscriptionStatus {
  Active = 'active',
  Canceled = 'canceled',
  PastDue = 'past_due',
  Unpaid = 'unpaid',
  Trialing = 'trialing'
}

export enum SubscriptionTier {
  Free = 'free',
  Monthly = 'monthly',
  Yearly = 'yearly'
}

// Workout Types
export interface Workout {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  type: WorkoutType;
  difficulty: WorkoutDifficulty;
  status: WorkoutStatus;
  estimated_duration_min?: number;
  is_ai_generated: boolean;
  is_public: boolean;
  rest_between_exercises_sec?: number;
  order?: number;
  created_at: string;
  updated_at: string;
}

export enum WorkoutType {
  Strength = 'strength',
  Hypertrophy = 'hypertrophy',
  Endurance = 'endurance',
  Cardio = 'cardio',
  HIIT = 'hiit',
  Flexibility = 'flexibility',
  Custom = 'custom'
}

export enum WorkoutDifficulty {
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
  Expert = 'expert'
}

export enum WorkoutStatus {
  Draft = 'draft',
  Active = 'active',
  Archived = 'archived'
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  muscle_groups: string[];
  equipment?: string[];
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  youtube_video_id?: string;
  thumbnail_url?: string;
  created_by?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  edit_history?: ExerciseEditHistory[];
  creator?: {
    id: string;
    full_name?: string;
  };
}

export enum ExerciseCategory {
  Compound = 'compound',
  Isolation = 'isolation',
  Bodyweight = 'bodyweight',
  Cardio = 'cardio',
  Machine = 'machine',
  Stretching = 'stretching'
}

export enum ExerciseDifficulty {
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced'
}

export enum ExerciseTrackingType {
  Weight = 'weight', // Exercício baseado em carga/peso
  Time = 'time'      // Exercício baseado em tempo
}

export interface ExerciseEditHistory {
  id: string;
  exercise_id: string;
  user_id: string;
  user_name?: string; 
  action: 'create' | 'update' | 'delete';
  timestamp: string;
  changes?: Record<string, any>;
}

export interface WorkoutExercise {
  workout_id: string;
  exercise_id: string;
  order_position: number;
  sets: number;
  tracking_type: ExerciseTrackingType;
  reps_per_set?: number;
  reps_type?: string;
  weight_kg?: number;
  duration_sec?: number; // Duração do exercício para exercícios baseados em tempo
  rest_after_sec?: number;
  notes?: string;
  exercise?: Exercise; // For joined queries
}

// Session Types
export interface WorkoutSession {
  id: string;
  workout_id: string;
  user_id: string;
  status: SessionStatus;
  started_at: string;
  completed_at?: string;
  duration_minutes?: number;
  notes?: string;
  perceived_effort?: number;
  mood_rating?: number;
  workout?: Workout; // For joined queries
  exercise_logs?: ExerciseLog[]; // For joined queries
}

export enum SessionStatus {
  InProgress = 'in_progress',
  Completed = 'completed',
  Abandoned = 'abandoned',
  Paused = 'paused'
}

export interface ExerciseLog {
  id: string;
  workout_session_id: string;
  exercise_id: string;
  set_number: number;
  reps_completed?: number;
  weight_kg?: number;
  duration_sec?: number;
  completed_at: string;
  was_skipped: boolean;
  notes?: string;
  exercise?: Exercise; // For joined queries
}

// AI Types
export interface AIWorkoutRequest {
  id: string;
  user_id: string;
  status: AIRequestStatus;
  result_workout_id?: string;
  feedback?: string;
  rating?: number;
  created_at: string;
  completed_at?: string;
  processing_time_sec?: number;
  fitness_goal: string;
  fitness_level: string;
  available_days_per_week: number;
  session_duration_min: number;
  equipment_available?: string[];
  focus_muscle_groups?: string[];
  limitations_injuries?: string[];
  include_warmup: boolean;
  additional_instructions?: string;
}

export enum AIRequestStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed'
}

// UI Types
export interface NavItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
  requiresAuth?: boolean;
  requiresPremium?: boolean;
  children?: NavItem[];
  description?: string;
}

export interface AlertMessage {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  duration?: number;
}

// Todo Types
export enum TodoCategory {
  Personal = "personal",
  Workout = "workout",
  Diet = "diet",
  Custom = "custom"
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

export interface DbTodo {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  category: TodoCategory;
  created_at: string;
  updated_at: string;
}