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
      access_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          duration_days: number
          id: string
          max_uses: number | null
          note: string | null
          revoked: boolean
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          duration_days?: number
          id?: string
          max_uses?: number | null
          note?: string | null
          revoked?: boolean
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          duration_days?: number
          id?: string
          max_uses?: number | null
          note?: string | null
          revoked?: boolean
          uses_count?: number
        }
        Relationships: []
      }
      backtest_sessions: {
        Row: {
          account_currency: string
          chart_state: Json
          commission_per_lot: number
          created_at: string
          description: string | null
          ending_balance: number
          id: string
          last_opened_at: string
          name: string
          notes: string | null
          replay_state: Json
          risk_pct: number
          spread_points: number
          starting_balance: number
          stats: Json
          status: string
          strategy: string | null
          symbol: string
          timeframe: string
          trades: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          account_currency?: string
          chart_state?: Json
          commission_per_lot?: number
          created_at?: string
          description?: string | null
          ending_balance?: number
          id?: string
          last_opened_at?: string
          name?: string
          notes?: string | null
          replay_state?: Json
          risk_pct?: number
          spread_points?: number
          starting_balance?: number
          stats?: Json
          status?: string
          strategy?: string | null
          symbol?: string
          timeframe?: string
          trades?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          account_currency?: string
          chart_state?: Json
          commission_per_lot?: number
          created_at?: string
          description?: string | null
          ending_balance?: number
          id?: string
          last_opened_at?: string
          name?: string
          notes?: string | null
          replay_state?: Json
          risk_pct?: number
          spread_points?: number
          starting_balance?: number
          stats?: Json
          status?: string
          strategy?: string | null
          symbol?: string
          timeframe?: string
          trades?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      backtest_trades: {
        Row: {
          closed_at: string | null
          commission: number
          created_at: string
          direction: string
          duration_sec: number | null
          entry: number | null
          exit: number | null
          exit_reason: string | null
          gross_pnl: number
          id: string
          lots: number
          mae: number | null
          mfe: number | null
          notes: string | null
          opened_at: string | null
          order_type: string
          pnl: number
          risk_amount: number | null
          risk_pct: number | null
          rr: number | null
          session_id: string
          sl: number | null
          status: string
          symbol: string
          tp: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          commission?: number
          created_at?: string
          direction: string
          duration_sec?: number | null
          entry?: number | null
          exit?: number | null
          exit_reason?: string | null
          gross_pnl?: number
          id?: string
          lots: number
          mae?: number | null
          mfe?: number | null
          notes?: string | null
          opened_at?: string | null
          order_type?: string
          pnl?: number
          risk_amount?: number | null
          risk_pct?: number | null
          rr?: number | null
          session_id: string
          sl?: number | null
          status?: string
          symbol: string
          tp?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          commission?: number
          created_at?: string
          direction?: string
          duration_sec?: number | null
          entry?: number | null
          exit?: number | null
          exit_reason?: string | null
          gross_pnl?: number
          id?: string
          lots?: number
          mae?: number | null
          mfe?: number | null
          notes?: string | null
          opened_at?: string | null
          order_type?: string
          pnl?: number
          risk_amount?: number | null
          risk_pct?: number | null
          rr?: number | null
          session_id?: string
          sl?: number | null
          status?: string
          symbol?: string
          tp?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backtest_trades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "backtest_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      code_redemptions: {
        Row: {
          code_id: string
          expires_at: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          expires_at: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          expires_at?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_accounts: {
        Row: {
          balance: number | null
          broker: string
          created_at: string
          currency: string | null
          equity: number | null
          free_margin: number | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          leverage: number | null
          login: string
          margin: number | null
          margin_level: number | null
          metaapi_account_id: string | null
          name: string | null
          region: string
          server: string
          status: string
          sync_frequency_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          broker: string
          created_at?: string
          currency?: string | null
          equity?: number | null
          free_margin?: number | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          leverage?: number | null
          login: string
          margin?: number | null
          margin_level?: number | null
          metaapi_account_id?: string | null
          name?: string | null
          region?: string
          server: string
          status?: string
          sync_frequency_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number | null
          broker?: string
          created_at?: string
          currency?: string | null
          equity?: number | null
          free_margin?: number | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          leverage?: number | null
          login?: string
          margin?: number | null
          margin_level?: number | null
          metaapi_account_id?: string | null
          name?: string | null
          region?: string
          server?: string
          status?: string
          sync_frequency_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mt5_tokens: {
        Row: {
          account_number: string | null
          broker: string | null
          created_at: string
          id: string
          label: string | null
          last_seen_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          broker?: string | null
          created_at?: string
          id?: string
          label?: string | null
          last_seen_at?: string | null
          token: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          broker?: string | null
          created_at?: string
          id?: string
          label?: string | null
          last_seen_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_currency: string
          avatar_url: string | null
          created_at: string
          default_risk_pct: number
          display_name: string | null
          id: string
          plan: string
          plan_renewal_at: string | null
          plan_status: string
          starting_balance: number
          timezone: string
          updated_at: string
        }
        Insert: {
          account_currency?: string
          avatar_url?: string | null
          created_at?: string
          default_risk_pct?: number
          display_name?: string | null
          id: string
          plan?: string
          plan_renewal_at?: string | null
          plan_status?: string
          starting_balance?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          account_currency?: string
          avatar_url?: string | null
          created_at?: string
          default_risk_pct?: number
          display_name?: string | null
          id?: string
          plan?: string
          plan_renewal_at?: string | null
          plan_status?: string
          starting_balance?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          asset_class: string
          closed_at: string | null
          created_at: string
          direction: Database["public"]["Enums"]["trade_direction"]
          entry_price: number | null
          exit_price: number | null
          external_id: string | null
          external_source: string | null
          id: string
          lot_size: number | null
          mt5_ticket: string | null
          notes: string | null
          opened_at: string
          pair: string
          pnl: number | null
          risk_amount: number | null
          risk_pct: number | null
          rr_planned: number | null
          rr_realized: number | null
          screenshot_url: string | null
          session: string | null
          smc_tags: string[]
          source: string
          status: Database["public"]["Enums"]["trade_status"]
          stop_loss: number | null
          strategy: string | null
          take_profit: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_class?: string
          closed_at?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["trade_direction"]
          entry_price?: number | null
          exit_price?: number | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          lot_size?: number | null
          mt5_ticket?: string | null
          notes?: string | null
          opened_at?: string
          pair: string
          pnl?: number | null
          risk_amount?: number | null
          risk_pct?: number | null
          rr_planned?: number | null
          rr_realized?: number | null
          screenshot_url?: string | null
          session?: string | null
          smc_tags?: string[]
          source?: string
          status?: Database["public"]["Enums"]["trade_status"]
          stop_loss?: number | null
          strategy?: string | null
          take_profit?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_class?: string
          closed_at?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["trade_direction"]
          entry_price?: number | null
          exit_price?: number | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          lot_size?: number | null
          mt5_ticket?: string | null
          notes?: string | null
          opened_at?: string
          pair?: string
          pnl?: number | null
          risk_amount?: number | null
          risk_pct?: number | null
          rr_planned?: number | null
          rr_realized?: number | null
          screenshot_url?: string | null
          session?: string | null
          smc_tags?: string[]
          source?: string
          status?: Database["public"]["Enums"]["trade_status"]
          stop_loss?: number | null
          strategy?: string | null
          take_profit?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      admin_list_codes: {
        Args: never
        Returns: {
          code: string
          created_at: string
          duration_days: number
          id: string
          max_uses: number
          note: string
          redemptions: Json
          revoked: boolean
          uses_count: number
        }[]
      }
      claim_first_admin: { Args: never; Returns: Json }
      expire_my_plan_if_due: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_access_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
      trade_direction: "long" | "short"
      trade_status: "open" | "win" | "loss" | "breakeven"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      trade_direction: ["long", "short"],
      trade_status: ["open", "win", "loss", "breakeven"],
    },
  },
} as const
