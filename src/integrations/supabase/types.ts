export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          letmeuse_id: string
          name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          letmeuse_id: string
          name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          letmeuse_id?: string
          name?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          id: string
          owner_id: string
          title: string
          author: string
          cover_url: string | null
          tags: string[] | null
          status: 'available' | 'swapped'
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          author: string
          cover_url?: string | null
          tags?: string[] | null
          status?: 'available' | 'swapped'
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          author?: string
          cover_url?: string | null
          tags?: string[] | null
          status?: 'available' | 'swapped'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      swaps: {
        Row: {
          id: string
          book_id: string
          from_user_id: string
          to_user_id: string
          note: string | null
          swapped_at: string
        }
        Insert: {
          id?: string
          book_id: string
          from_user_id: string
          to_user_id: string
          note?: string | null
          swapped_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          from_user_id?: string
          to_user_id?: string
          note?: string | null
          swapped_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swaps_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swaps_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swaps_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      book_status: 'available' | 'swapped'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Book = Database['public']['Tables']['books']['Row']
export type Swap = Database['public']['Tables']['swaps']['Row']
