export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'staff_orders'
  | 'read_only'
  | 'store_user';

export type Database = {
  public: {
    Tables: {
      expansion_leads: {
        Row: {
          id: string;
          store_name: string;
          contact_name: string;
          phone: string | null;
          email: string | null;
          state: string;
          city: string;
          status: 'new' | 'contacted' | 'qualified' | 'negotiating' | 'won' | 'lost';
          notes: string | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_name: string;
          contact_name: string;
          phone?: string | null;
          email?: string | null;
          state: string;
          city: string;
          status?: Database['public']['Tables']['expansion_leads']['Row']['status'];
          notes?: string | null;
          owner_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['expansion_leads']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_user_role: {
        Args: { required_role: UserRole };
        Returns: boolean;
      };
    };
    Enums: { user_role: UserRole };
    CompositeTypes: Record<string, never>;
  };
};