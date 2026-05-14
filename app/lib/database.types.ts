// Auto-generated Supabase database types.
// After running schema.sql, regenerate with:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > app/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      professors: {
        Row: {
          id: string;
          name: string;
          university: string;
          faculty: string | null;
          title: string | null;
          position_title: string | null;
          research_areas: string[];
          email: string | null;
          profile_url: string | null;
          google_scholar_url: string | null;
          linkedin_url: string | null;
          lab_url: string | null;
          grant_status: string;
          suitable_student_backgrounds: string[];
          potential_rp_topics: string[];
          "references": string | null;
          verification_status: string;
          contributed_by: string | null;
          contributed_at: string | null;
          source_candidate_id: string | null;
          arc_project_ids: string[] | null;
          semantic_scholar_id: string | null;
          h_index: number | null;
          paper_count: number | null;
          citation_count: number | null;
          accepting_students: string | null;
          data_sources: string[] | null;
          last_synced_at: string | null;
          opportunity_score: number | null;
          opportunity_breakdown: Json | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['professors']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['professors']['Insert']>;
      };
      grants: {
        Row: {
          id: string;
          grant_name: string;
          funding_body: string;
          arc_project_id: string | null;
          year: string;
          amount: string;
          lead_professor: string;
          lead_professor_id: string | null;
          university: string;
          industry_partner: string | null;
          project_title: string;
          project_abstract: string | null;
          keywords: string[];
          phd_relevance: string;
          industry_scholarship_potential: string;
          reference_url: string | null;
          verification_status: string;
          source_candidate_id: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['grants']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['grants']['Insert']>;
      };
      topics: {
        Row: {
          id: string;
          name: string;
          description: string;
          research_field: string | null;
          related_professor_ids: string[] | null;
          related_grant_ids: string[] | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['topics']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['topics']['Insert']>;
      };
      content_cards: {
        Row: {
          id: string;
          title: string;
          status: string;
          source_type: string | null;
          source_entity_id: string | null;
          xiaohongshu_post: string | null;
          xiaohongshu_carousel: string | null;
          wechat_moment: string | null;
          website_article: string | null;
          linkedin_post: string | null;
          image_prompt: string | null;
          reference: string | null;
          compliance_check: string | null;
          generated_by: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['content_cards']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['content_cards']['Insert']>;
      };
      publishing_items: {
        Row: {
          id: string;
          platform: string;
          content_title: string;
          publish_date: string;
          publish_url: string;
          views: number;
          likes: number;
          saves: number;
          comments: number;
          dms: number;
          wechat_adds: number;
          consultations: number;
          conversion_notes: string | null;
          content_card_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['publishing_items']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['publishing_items']['Insert']>;
      };
      knowledge_chunks: {
        Row: {
          id: string;
          source_type: string;
          source_title: string;
          content: string;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['knowledge_chunks']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['knowledge_chunks']['Insert']>;
      };
      blog_posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string;
          content: string;
          category: string;
          tags: string[];
          cover_image: string | null;
          author_name: string;
          content_card_id: string | null;
          status: string;
          published_at: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['blog_posts']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['blog_posts']['Insert']>;
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string;
          mode: string;
          messages: Json;
          student_profile_snapshot: Json | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['ai_conversations']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ai_conversations']['Insert']>;
      };
      feedback: {
        Row: {
          id: string;
          conversation_id: string | null;
          message_index: number;
          rating: string;
          correction_text: string | null;
          mode: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['feedback']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['feedback']['Insert']>;
      };
      user_credits: {
        Row: {
          id: string;
          user_id: string;
          credit_balance: number;
          subscription_tier: string | null;
          subscription_monthly_credits: number;
          subscription_expires_at: string | null;
          total_credits_purchased: number;
          total_credits_used: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_credits']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_credits']['Insert']>;
      };
      outreach_emails: {
        Row: {
          id: string;
          user_id: string | null;
          professor_id: string;
          subject_line: string;
          email_body: string;
          followup_body: string | null;
          risk_note: string | null;
          tone: string;
          purpose: string;
          status: string;
          credits_used: number;
          was_free: boolean;
          sent_at: string | null;
          reply_received_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['outreach_emails']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['outreach_emails']['Insert']>;
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_key: string;
          unlocked_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_achievements']['Row'], 'id' | 'unlocked_at'> & {
          id?: string;
          unlocked_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_achievements']['Insert']>;
      };
      daily_tasks: {
        Row: {
          id: string;
          user_id: string;
          day_number: number;
          task_key: string;
          task_title: string;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['daily_tasks']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['daily_tasks']['Insert']>;
      };
      pipeline_runs: {
        Row: {
          id: string;
          source: string;
          status: string;
          professors_added: number;
          professors_updated: number;
          errors: string[];
          started_at: string;
          completed_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['pipeline_runs']['Row'], 'id' | 'started_at'> & {
          id?: string;
          started_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pipeline_runs']['Insert']>;
      };
      sensitive_words: {
        Row: {
          id: string;
          word: string;
          replacement: string;
          platform: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sensitive_words']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sensitive_words']['Insert']>;
      };
    };
    Functions: {
      match_knowledge: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
        };
        Returns: Array<{
          id: string;
          source_type: string;
          source_title: string;
          content: string;
          similarity: number;
        }>;
      };
    };
  };
}
