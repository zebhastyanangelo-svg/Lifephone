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
      products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          description: string | null;
          wholesale_price: number;
          stock_quantity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          sku: string;
          name: string;
          description?: string | null;
          wholesale_price: number;
          stock_quantity?: number;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [];
      };
      store_orders: {
        Row: {
          id: string;
          store_profile_id: string;
          status: 'requested' | 'confirmed' | 'preparing' | 'shipped' | 'completed' | 'cancelled';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_profile_id: string;
          status?: Database['public']['Tables']['store_orders']['Row']['status'];
          notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['store_orders']['Insert']>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
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