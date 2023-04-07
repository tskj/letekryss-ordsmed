export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      words_no: {
        Row: {
          checked: string
          id: number
          word: string
        }
        Insert: {
          checked?: string
          id?: number
          word?: string
        }
        Update: {
          checked?: string
          id?: number
          word?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
