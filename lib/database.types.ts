export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      coverage_requests: {
        Row: {
          id: string;
          created_by: string;
          location_id: string;
          title: string;
          description: string | null;
          created_at: string;
          status: Database["public"]["Enums"]["coverage_request_status"];
          removed_at: string | null;
        };
        Insert: {
          id?: string;
          created_by: string;
          location_id: string;
          title: string;
          description?: string | null;
          created_at?: string;
          status?: Database["public"]["Enums"]["coverage_request_status"];
          removed_at?: string | null;
        };
        Update: {
          id?: string;
          created_by?: string;
          location_id?: string;
          title?: string;
          description?: string | null;
          created_at?: string;
          status?: Database["public"]["Enums"]["coverage_request_status"];
          removed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "coverage_requests_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coverage_requests_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          id: string;
          country: string;
          city: string;
          place: string | null;
          latitude: number | null;
          longitude: number | null;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          country: string;
          city: string;
          place?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          country?: string;
          city?: string;
          place?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          bio: string | null;
          avatar_url: string | null;
          home_city: string | null;
          home_country: string | null;
          created_at: string;
          role: Database["public"]["Enums"]["profile_role"];
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          bio?: string | null;
          avatar_url?: string | null;
          home_city?: string | null;
          home_country?: string | null;
          created_at?: string;
          role?: Database["public"]["Enums"]["profile_role"];
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          bio?: string | null;
          avatar_url?: string | null;
          home_city?: string | null;
          home_country?: string | null;
          created_at?: string;
          role?: Database["public"]["Enums"]["profile_role"];
        };
        Relationships: [];
      };
      report_media: {
        Row: {
          id: string;
          report_id: string;
          media_type: Database["public"]["Enums"]["media_type"];
          media_url: string;
          thumbnail_url: string | null;
          original_filename: string | null;
          captured_at: string | null;
          uploaded_at: string;
          licensing_status: Database["public"]["Enums"]["licensing_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          media_type: Database["public"]["Enums"]["media_type"];
          media_url: string;
          thumbnail_url?: string | null;
          original_filename?: string | null;
          captured_at?: string | null;
          uploaded_at?: string;
          licensing_status?: Database["public"]["Enums"]["licensing_status"];
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          media_type?: Database["public"]["Enums"]["media_type"];
          media_url?: string;
          thumbnail_url?: string | null;
          original_filename?: string | null;
          captured_at?: string | null;
          uploaded_at?: string;
          licensing_status?: Database["public"]["Enums"]["licensing_status"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_media_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          created_by: string;
          request_id: string | null;
          location_id: string;
          title: string;
          description: string | null;
          captured_at: string;
          uploaded_at: string;
          created_at: string;
          licensing_status: Database["public"]["Enums"]["licensing_status"];
          removed_at: string | null;
        };
        Insert: {
          id?: string;
          created_by: string;
          request_id?: string | null;
          location_id: string;
          title: string;
          description?: string | null;
          captured_at: string;
          uploaded_at?: string;
          created_at?: string;
          licensing_status?: Database["public"]["Enums"]["licensing_status"];
          removed_at?: string | null;
        };
        Update: {
          id?: string;
          created_by?: string;
          request_id?: string | null;
          location_id?: string;
          title?: string;
          description?: string | null;
          captured_at?: string;
          uploaded_at?: string;
          created_at?: string;
          licensing_status?: Database["public"]["Enums"]["licensing_status"];
          removed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "coverage_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      request_interests: {
        Row: {
          id: string;
          request_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "request_interests_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "coverage_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_interests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      location_follows: {
        Row: {
          id: string;
          user_id: string;
          location_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          location_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          location_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      report_supports: {
        Row: {
          id: string;
          report_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      report_corrections: {
        Row: {
          id: string;
          report_id: string;
          created_by: string;
          summary: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          created_by: string;
          summary: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          created_by?: string;
          summary?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      licensing_transactions: {
        Row: {
          id: string;
          report_id: string;
          report_media_id: string | null;
          licensee_profile_id: string | null;
          status: Database["public"]["Enums"]["licensing_transaction_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          report_media_id?: string | null;
          licensee_profile_id?: string | null;
          status?: Database["public"]["Enums"]["licensing_transaction_status"];
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          report_media_id?: string | null;
          licensee_profile_id?: string | null;
          status?: Database["public"]["Enums"]["licensing_transaction_status"];
          created_at?: string;
        };
        Relationships: [];
      };
      moderation_reports: {
        Row: {
          id: string;
          submitted_by: string;
          content_type: Database["public"]["Enums"]["moderation_content_type"];
          content_id: string;
          reason: Database["public"]["Enums"]["moderation_reason"];
          details: string | null;
          created_at: string;
          status: Database["public"]["Enums"]["moderation_status"];
        };
        Insert: {
          id?: string;
          submitted_by: string;
          content_type: Database["public"]["Enums"]["moderation_content_type"];
          content_id: string;
          reason: Database["public"]["Enums"]["moderation_reason"];
          details?: string | null;
          created_at?: string;
          status?: Database["public"]["Enums"]["moderation_status"];
        };
        Update: {
          id?: string;
          submitted_by?: string;
          content_type?: Database["public"]["Enums"]["moderation_content_type"];
          content_id?: string;
          reason?: Database["public"]["Enums"]["moderation_reason"];
          details?: string | null;
          created_at?: string;
          status?: Database["public"]["Enums"]["moderation_status"];
        };
        Relationships: [
          {
            foreignKeyName: "moderation_reports_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      coverage_request_status: "open" | "fulfilled" | "closed";
      licensing_status: "view_only" | "licensing_available";
      media_type: "photo" | "video";
      licensing_transaction_status: "inquiry" | "completed" | "cancelled";
      profile_role: "member" | "admin";
      moderation_content_type: "firsthand_report" | "coverage_request";
      moderation_reason:
        | "harassment"
        | "threats"
        | "doxxing"
        | "graphic_content"
        | "copyright"
        | "misleading_ownership"
        | "illegal_content"
        | "other";
      moderation_status: "open" | "reviewed" | "dismissed" | "removed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type PublicTable = keyof Database["public"]["Tables"];
export type TableRow<T extends PublicTable> = Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends PublicTable> = Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends PublicTable> = Database["public"]["Tables"][T]["Update"];

export type Profile = TableRow<"profiles">;
export type Location = TableRow<"locations">;
export type CoverageRequestRecord = TableRow<"coverage_requests">;
export type RequestInterest = TableRow<"request_interests">;
export type ReportRecord = TableRow<"reports">;
export type ReportMedia = TableRow<"report_media">;
export type ProfileFollow = TableRow<"profile_follows">;
export type LocationFollow = TableRow<"location_follows">;
export type ReportSupport = TableRow<"report_supports">;
export type ReportCorrection = TableRow<"report_corrections">;
export type LicensingTransaction = TableRow<"licensing_transactions">;
export type LicensingStatus = Database["public"]["Enums"]["licensing_status"];
export type CoverageRequestStatus = Database["public"]["Enums"]["coverage_request_status"];
export type MediaType = Database["public"]["Enums"]["media_type"];
export type ModerationReportRecord = TableRow<"moderation_reports">;
export type ProfileRole = Database["public"]["Enums"]["profile_role"];
