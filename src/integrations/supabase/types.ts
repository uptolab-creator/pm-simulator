export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      appeals: {
        Row: {
          admin_resolution: string | null
          attempt_number: number
          call_transcript: Json | null
          complaint_category: string
          complaint_text: string
          created_at: string
          id: string
          lesson_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          student_input: string | null
          system_feedback: string | null
          task_type: string
          user_id: string
        }
        Insert: {
          admin_resolution?: string | null
          attempt_number?: number
          call_transcript?: Json | null
          complaint_category: string
          complaint_text: string
          created_at?: string
          id?: string
          lesson_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_input?: string | null
          system_feedback?: string | null
          task_type: string
          user_id: string
        }
        Update: {
          admin_resolution?: string | null
          attempt_number?: number
          call_transcript?: Json | null
          complaint_category?: string
          complaint_text?: string
          created_at?: string
          id?: string
          lesson_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_input?: string | null
          system_feedback?: string | null
          task_type?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          current_step: number
          id: string
          lesson_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: number
          id?: string
          lesson_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_step?: number
          id?: string
          lesson_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_events: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          kind: string | null
          payload: Json | null
          student_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          kind?: string | null
          payload?: Json | null
          student_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          kind?: string | null
          payload?: Json | null
          student_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          current_step: number
          id: string
          item_id: string
          kind: string
          score: number | null
          started_at: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          current_step?: number
          id?: string
          item_id: string
          kind: string
          score?: number | null
          started_at?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          current_step?: number
          id?: string
          item_id?: string
          kind?: string
          score?: number | null
          started_at?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          id: string
          name: string
          telegram: string
          telegram_norm: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          telegram: string
          telegram_norm?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          telegram?: string
          telegram_norm?: string | null
        }
        Relationships: []
      }
      task_attempts: {
        Row: {
          ai_feedback: Json | null
          attempt_no: number
          created_at: string
          id: string
          lesson_id: string
          overridden_at: string | null
          overridden_by: string | null
          override_note: string | null
          override_score: number | null
          override_status: string | null
          score: number | null
          status: string
          task_type: string
          user_answer: string | null
          user_id: string
        }
        Insert: {
          ai_feedback?: Json | null
          attempt_no?: number
          created_at?: string
          id?: string
          lesson_id: string
          overridden_at?: string | null
          overridden_by?: string | null
          override_note?: string | null
          override_score?: number | null
          override_status?: string | null
          score?: number | null
          status: string
          task_type: string
          user_answer?: string | null
          user_id: string
        }
        Update: {
          ai_feedback?: Json | null
          attempt_no?: number
          created_at?: string
          id?: string
          lesson_id?: string
          overridden_at?: string | null
          overridden_by?: string | null
          override_note?: string | null
          override_score?: number | null
          override_status?: string | null
          score?: number | null
          status?: string
          task_type?: string
          user_answer?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_student: {
        Args: { p_name: string; p_secret: string; p_telegram: string }
        Returns: {
          created_at: string
          id: string
          name: string
          telegram: string
          telegram_norm: string | null
        }
        SetofOptions: {
          from: "*"
          to: "students"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_check: { Args: { p_secret: string }; Returns: undefined }
      admin_list_students: {
        Args: { p_secret: string }
        Returns: {
          avg_score: number
          created_at: string
          id: string
          last_active: string
          lessons_completed: number
          name: string
          practice_completed: number
          telegram: string
          total_items: number
        }[]
      }
      admin_remove_student: {
        Args: { p_id: string; p_secret: string }
        Returns: undefined
      }
      admin_student_detail: {
        Args: { p_id: string; p_secret: string }
        Returns: {
          current_step: number
          item_id: string
          kind: string
          score: number
          status: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      norm_tg: { Args: { p: string }; Returns: string }
      student_log_event: {
        Args: {
          p_item_id: string
          p_kind: string
          p_payload: Json
          p_student_id: string
          p_type: string
        }
        Returns: undefined
      }
      student_login: {
        Args: { p_name: string; p_telegram: string }
        Returns: {
          id: string
          name: string
          telegram: string
        }[]
      }
      student_progress_list: {
        Args: { p_student_id: string }
        Returns: {
          current_step: number
          item_id: string
          kind: string
          score: number
          status: string
          updated_at: string
        }[]
      }
      student_save_progress:
        | {
            Args: {
              p_item_id: string
              p_kind: string
              p_score: number
              p_status: string
              p_step: number
              p_student_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_item_id: string
              p_kind: string
              p_score: number
              p_status: string
              p_step: number
              p_student_id: string
            }
            Returns: undefined
          }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
