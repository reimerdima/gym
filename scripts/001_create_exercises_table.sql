-- Create exercises table to store workout entries
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  weight DECIMAL(10, 2) NOT NULL,
  reps INTEGER NOT NULL,
  workout_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries on user_id and workout_date
CREATE INDEX IF NOT EXISTS idx_exercises_user_date ON exercises(user_id, workout_date);

-- Create index for faster queries on exercise_name for progress tracking
CREATE INDEX IF NOT EXISTS idx_exercises_user_exercise ON exercises(user_id, exercise_name, workout_date);

-- Enable Row Level Security
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own exercises" 
  ON exercises FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercises" 
  ON exercises FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercises" 
  ON exercises FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercises" 
  ON exercises FOR DELETE 
  USING (auth.uid() = user_id);
