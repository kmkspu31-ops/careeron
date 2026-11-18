export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update, Relationships = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

type AiMode = "auto" | "career" | "resume" | "interview" | "job-analysis" | "certification" | "roadmap";
type AiExpertMode = Exclude<AiMode, "auto"> | "general";
type MessageRole = "user" | "assistant";

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        { id: string; full_name: string; created_at: string; updated_at: string },
        { id: string; full_name?: string; created_at?: string; updated_at?: string },
        { full_name?: string; updated_at?: string }
      >;
      ai_conversations: Table<
        { id: string; user_id: string; title: string; mode: AiMode; created_at: string; updated_at: string },
        { id?: string; user_id: string; title?: string; mode?: AiMode; created_at?: string; updated_at?: string },
        { title?: string; mode?: AiMode; updated_at?: string }
      >;
      ai_messages: Table<
        {
          id: string;
          conversation_id: string;
          request_id: string | null;
          role: MessageRole;
          content: string;
          mode: AiExpertMode;
          sources: Json;
          status: "pending" | "completed" | "failed";
          created_at: string;
        },
        {
          id?: string;
          conversation_id: string;
          request_id?: string | null;
          role: MessageRole;
          content: string;
          mode?: AiExpertMode;
          sources?: Json;
          status?: "pending" | "completed" | "failed";
          created_at?: string;
        },
        {
          request_id?: string | null;
          role?: MessageRole;
          content?: string;
          mode?: AiExpertMode;
          sources?: Json;
          status?: "pending" | "completed" | "failed";
        },
        [{
          foreignKeyName: "ai_messages_conversation_id_fkey";
          columns: ["conversation_id"];
          isOneToOne: false;
          referencedRelation: "ai_conversations";
          referencedColumns: ["id"];
        }]
      >;
      ai_usage: Table<
        {
          id: number;
          user_id: string | null;
          visitor_hash: string | null;
          model: string;
          input_tokens: number;
          output_tokens: number;
          request_count: number;
          status: "completed" | "failed";
          created_at: string;
        },
        {
          id?: never;
          user_id?: string | null;
          visitor_hash?: string | null;
          model: string;
          input_tokens?: number;
          output_tokens?: number;
          request_count?: number;
          status?: "completed" | "failed";
          created_at?: string;
        },
        {
          user_id?: string | null;
          visitor_hash?: string | null;
          model?: string;
          input_tokens?: number;
          output_tokens?: number;
          request_count?: number;
          status?: "completed" | "failed";
        }
      >;
      ai_usage_daily: Table<
        { subject_hash: string; usage_date: string; request_count: number; last_requested_at: string | null },
        { subject_hash: string; usage_date?: string; request_count?: number; last_requested_at?: string | null },
        { request_count?: number; last_requested_at?: string | null }
      >;
      ai_feedback: Table<
        { id: string; user_id: string; message_id: string; rating: -1 | 1; feedback_text: string | null; created_at: string },
        { id?: string; user_id: string; message_id: string; rating: -1 | 1; feedback_text?: string | null; created_at?: string },
        { rating?: -1 | 1; feedback_text?: string | null }
      >;
      ai_documents: Table<
        {
          id: string;
          user_id: string;
          conversation_id: string | null;
          file_name: string;
          file_type: "application/pdf" | "text/plain" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          storage_path: string;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          conversation_id?: string | null;
          file_name: string;
          file_type: "application/pdf" | "text/plain" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          storage_path: string;
          created_at?: string;
        },
        {
          conversation_id?: string | null;
          file_name?: string;
          file_type?: "application/pdf" | "text/plain" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          storage_path?: string;
        }
      >;
      ai_career_profiles: Table<
        {
          user_id: string;
          desired_roles: string[];
          interests: string[];
          certifications: string[];
          employment_goal: string | null;
          updated_at: string;
        },
        {
          user_id: string;
          desired_roles?: string[];
          interests?: string[];
          certifications?: string[];
          employment_goal?: string | null;
          updated_at?: string;
        },
        {
          desired_roles?: string[];
          interests?: string[];
          certifications?: string[];
          employment_goal?: string | null;
          updated_at?: string;
        }
      >;
      ai_request_keys: Table<
        { conversation_id: string; request_id: string; user_id: string; created_at: string },
        { conversation_id: string; request_id: string; user_id: string; created_at?: string },
        never
      >;
    };
    Views: Record<string, never>;
    Functions: {
      reserve_ai_daily_request: {
        Args: { p_subject_hash: string; p_daily_limit: number; p_min_interval_seconds: number };
        Returns: number;
      };
      record_ai_usage: {
        Args: {
          p_subject_hash: string;
          p_model: string;
          p_input_tokens: number;
          p_output_tokens: number;
          p_user_id: string | null;
          p_status: "completed" | "failed";
        };
        Returns: undefined;
      };
      save_ai_exchange: {
        Args: {
          p_conversation_id: string;
          p_request_id: string;
          p_user_message_id: string;
          p_assistant_message_id: string;
          p_user_content: string;
          p_assistant_content: string;
          p_mode: AiExpertMode;
          p_title: string;
          p_regenerate: boolean;
          p_conversation_mode: AiMode;
        };
        Returns: undefined;
      };
      import_ai_conversation: {
        Args: {
          p_id: string;
          p_title: string;
          p_mode: AiMode;
          p_messages: Json;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
