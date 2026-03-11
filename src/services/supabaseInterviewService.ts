import { supabase } from '../lib/supabase';

export interface InterviewRecord {
  id?: string;
  user_id: string;
  created_at?: string;
  total_duration_minutes: number;
  overall_confidence: number;
  summary_markdown: string;
  questions_data: any;
  metrics: any;
}

export const supabaseInterviewService = {
  /**
   * Save an interview summary to Supabase
   */
  async saveInterviewSummary(interviewData: InterviewRecord): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .insert([
          {
            user_id: interviewData.user_id,
            total_duration_minutes: interviewData.total_duration_minutes,
            overall_confidence: interviewData.overall_confidence,
            summary_markdown: interviewData.summary_markdown,
            questions_data: interviewData.questions_data,
            metrics: interviewData.metrics,
          }
        ])
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving interview to Supabase:', error);
      throw error;
    }
  },

  /**
   * Fetch a user's past interviews
   */
  async getUserInterviews(userId: string): Promise<InterviewRecord[]> {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching interivews from Supabase:', error);
      throw error;
    }
  }
};
