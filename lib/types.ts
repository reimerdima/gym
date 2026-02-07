export interface ExerciseSet {
  weight: number
  reps: number
}

export interface UnilateralSet {
  left: { weight: number; reps: number }
  right: { weight: number; reps: number }
}

export interface Exercise {
  id: string
  user_id: string
  exercise_name: string
  weight: number
  reps: number
  sets: ExerciseSet[] | UnilateralSet[]
  is_unilateral: boolean
  workout_date: string
  created_at: string
  updated_at: string
}

export interface ExerciseWithProgress extends Exercise {
  previousWeight?: number
  previousReps?: number
  previousDate?: string
  weightChange?: number
  repsChange?: number
}

export type TimeRange = "last" | "2weeks" | "1month" | "3months" | "6months" | "1year" | "alltime"

export interface JournalNote {
  id: string
  user_id: string
  note_date: string
  content: string
  created_at: string
  updated_at: string
}

export interface ProgressDataPoint {
  date: string
  displayDate: string
  score: number
  weight: number
  reps: number
  exercise_name: string
}

export interface ProgressComparison {
  exercise_name: string
  currentWeight: number
  currentReps: number
  currentDate: string
  previousWeight: number
  previousReps: number
  previousDate: string
  weightChange: number
  repsChange: number
  percentageChange: number
}

export interface ProgressPhoto {
  id: string
  photo_date: string
  blob_url: string
  thumbnail_url?: string
  created_at: string
}

export interface FoodEntry {
  id: string
  entry_date: string
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  created_at: string
}
