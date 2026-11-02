export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "public": {
          Tables: {
            "match_players": {
                  Row: {
                    "correct_answers": number,"is_active": boolean,"joined_at": string,"last_seen_at": string,"match_id": string,"ready_at": string | null,"result": string | null,"rounds_won": number,"slot": number,"total_score": number,"user_id": string,"username_snapshot": string | null,"xp_earned": number
                  }
                  ComputedFields: never
                  Insert: {
                    "correct_answers"?: number,"is_active"?: boolean,"joined_at"?: string,"last_seen_at"?: string,"match_id": string,"ready_at"?: string | null,"result"?: string | null,"rounds_won"?: number,"slot": number,"total_score"?: number,"user_id": string,"username_snapshot"?: string | null,"xp_earned"?: number
                  }
                  Update: {
                    "correct_answers"?: number,"is_active"?: boolean,"joined_at"?: string,"last_seen_at"?: string,"match_id"?: string,"ready_at"?: string | null,"result"?: string | null,"rounds_won"?: number,"slot"?: number,"total_score"?: number,"user_id"?: string,"username_snapshot"?: string | null,"xp_earned"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_players_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"match_rounds": {
                  Row: {
                    "end_reason": string | null,"ends_at": string | null,"id": string,"match_id": string,"resolved_at": string | null,"round_number": number,"starts_at": string | null,"status": string,"winner_user_id": string | null,"winning_points": number
                  }
                  ComputedFields: never
                  Insert: {
                    "end_reason"?: string | null,"ends_at"?: string | null,"id"?: string,"match_id": string,"resolved_at"?: string | null,"round_number": number,"starts_at"?: string | null,"status"?: string,"winner_user_id"?: string | null,"winning_points"?: number
                  }
                  Update: {
                    "end_reason"?: string | null,"ends_at"?: string | null,"id"?: string,"match_id"?: string,"resolved_at"?: string | null,"round_number"?: number,"starts_at"?: string | null,"status"?: string,"winner_user_id"?: string | null,"winning_points"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_rounds_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_rounds_match_id_winner_user_id_fkey"
      columns: ["match_id","winner_user_id"]
isOneToOne: false
      referencedRelation: "match_players"
      referencedColumns: ["match_id","user_id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "created_at": string,"current_round_number": number,"ended_reason": string | null,"finished_at": string | null,"guest_user_id": string | null,"host_user_id": string,"id": string,"language": string,"lobby_expires_at": string,"mode": string,"next_transition_at": string | null,"outcome_type": string | null,"round_count": number,"round_duration_ms": number,"started_at": string | null,"state_version": number,"status": string,"updated_at": string,"winner_user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_round_number"?: number,"ended_reason"?: string | null,"finished_at"?: string | null,"guest_user_id"?: string | null,"host_user_id": string,"id"?: string,"language"?: string,"lobby_expires_at"?: string,"mode"?: string,"next_transition_at"?: string | null,"outcome_type"?: string | null,"round_count"?: number,"round_duration_ms"?: number,"started_at"?: string | null,"state_version"?: number,"status"?: string,"updated_at"?: string,"winner_user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"current_round_number"?: number,"ended_reason"?: string | null,"finished_at"?: string | null,"guest_user_id"?: string | null,"host_user_id"?: string,"id"?: string,"language"?: string,"lobby_expires_at"?: string,"mode"?: string,"next_transition_at"?: string | null,"outcome_type"?: string | null,"round_count"?: number,"round_duration_ms"?: number,"started_at"?: string | null,"state_version"?: number,"status"?: string,"updated_at"?: string,"winner_user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_winner_seat"
      columns: ["id","winner_user_id"]
isOneToOne: false
      referencedRelation: "match_players"
      referencedColumns: ["match_id","user_id"]
    },{
      foreignKeyName: "matches_guest_user_id_fkey"
      columns: ["guest_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_host_user_id_fkey"
      columns: ["host_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_winner_user_id_fkey"
      columns: ["winner_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_seed": string,"correct_answers": number,"created_at": string,"display_name": string,"draws": number,"id": string,"losses": number,"matches_played": number,"onboarding_completed_at": string | null,"updated_at": string,"username": string | null,"wins": number,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_seed"?: string,"correct_answers"?: number,"created_at"?: string,"display_name"?: string,"draws"?: number,"id": string,"losses"?: number,"matches_played"?: number,"onboarding_completed_at"?: string | null,"updated_at"?: string,"username"?: string | null,"wins"?: number,"xp"?: number
                  }
                  Update: {
                    "avatar_seed"?: string,"correct_answers"?: number,"created_at"?: string,"display_name"?: string,"draws"?: number,"id"?: string,"losses"?: number,"matches_played"?: number,"onboarding_completed_at"?: string | null,"updated_at"?: string,"username"?: string | null,"wins"?: number,"xp"?: number
                  }
                  Relationships: [

                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "ensure_profile":
{ Args: Record<PropertyKey, never>; Returns: {
              "avatar_seed": string,
"correct_answers": number,
"created_at": string,
"display_name": string,
"draws": number,
"id": string,
"losses": number,
"matches_played": number,
"onboarding_completed_at": string | null,
"updated_at": string,
"username": string | null,
"wins": number,
"xp": number
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"update_profile":
{ Args: { "p_avatar_seed": string,"p_display_name": string,"p_username": string }; Returns: {
              "avatar_seed": string,
"correct_answers": number,
"created_at": string,
"display_name": string,
"draws": number,
"id": string,
"losses": number,
"matches_played": number,
"onboarding_completed_at": string | null,
"updated_at": string,
"username": string | null,
"wins": number,
"xp": number
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {

          }
        }
} as const
