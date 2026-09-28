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
          event_id: string | null;
        };
        Insert: {
          id?: string;
          created_by: string;
          location_id: string;
          title: string;
          description?: string | null;
          created_at?: string;
          status?: Database["public"]["Enums"]["coverage_request_status"];
          event_id?: string | null;
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
          event_id?: string | null;
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
          {
            foreignKeyName: "coverage_requests_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
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
      events: {
        Row: {
          id: string;
          created_by: string | null;
          location_id: string;
          title: string;
          description: string | null;
          status: Database["public"]["Enums"]["event_status"];
          started_at: string;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          location_id: string;
          title: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          started_at: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string | null;
          location_id?: string;
          title?: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
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
          can_live_stream?: boolean;
          topics: Database["public"]["Enums"]["reporter_topic"][];
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
          can_live_stream?: boolean;
          topics?: Database["public"]["Enums"]["reporter_topic"][];
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
          can_live_stream?: boolean;
          topics?: Database["public"]["Enums"]["reporter_topic"][];
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
          provider: Database["public"]["Enums"]["media_provider"];
          provider_asset_id: string | null;
          upload_status: Database["public"]["Enums"]["media_upload_status"];
          provenance_type: Database["public"]["Enums"]["media_provenance_type"];
          original_sha256: string | null;
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
          provider?: Database["public"]["Enums"]["media_provider"];
          provider_asset_id?: string | null;
          upload_status?: Database["public"]["Enums"]["media_upload_status"];
          provenance_type?: Database["public"]["Enums"]["media_provenance_type"];
          original_sha256?: string | null;
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
          provider?: Database["public"]["Enums"]["media_provider"];
          provider_asset_id?: string | null;
          upload_status?: Database["public"]["Enums"]["media_upload_status"];
          provenance_type?: Database["public"]["Enums"]["media_provenance_type"];
          original_sha256?: string | null;
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
          event_id: string | null;
          publish_status: Database["public"]["Enums"]["report_publish_status"];
          sensitive_content?: boolean;
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
          event_id?: string | null;
          publish_status?: Database["public"]["Enums"]["report_publish_status"];
          sensitive_content?: boolean;
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
          event_id?: string | null;
          publish_status?: Database["public"]["Enums"]["report_publish_status"];
          sensitive_content?: boolean;
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
          {
            foreignKeyName: "reports_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
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
      investigation_follows: {
        Row: {
          id: string;
          user_id: string;
          investigation_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          investigation_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          investigation_id?: string;
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
          reporter_id: string | null;
          organization_name: string | null;
          contact_email: string | null;
          intended_use: string | null;
          message: string | null;
          status: Database["public"]["Enums"]["licensing_transaction_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          report_media_id?: string | null;
          licensee_profile_id?: string | null;
          reporter_id?: string | null;
          organization_name?: string | null;
          contact_email?: string | null;
          intended_use?: string | null;
          message?: string | null;
          status?: Database["public"]["Enums"]["licensing_transaction_status"];
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          report_media_id?: string | null;
          licensee_profile_id?: string | null;
          reporter_id?: string | null;
          organization_name?: string | null;
          contact_email?: string | null;
          intended_use?: string | null;
          message?: string | null;
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
      investigations: {
        Row: {
          id: string;
          reporter_id: string;
          title: string;
          slug: string;
          description: string | null;
          cover_media_id: string | null;
          location_id: string | null;
          status: Database["public"]["Enums"]["investigation_status"];
          created_at: string;
          updated_at: string;
          published_at: string | null;
          removed_at: string | null;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          title: string;
          slug: string;
          description?: string | null;
          cover_media_id?: string | null;
          location_id?: string | null;
          status?: Database["public"]["Enums"]["investigation_status"];
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          removed_at?: string | null;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          cover_media_id?: string | null;
          location_id?: string | null;
          status?: Database["public"]["Enums"]["investigation_status"];
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          removed_at?: string | null;
        };
        Relationships: [];
      };
      investigation_items: {
        Row: {
          id: string;
          investigation_id: string;
          report_id: string | null;
          live_stream_id: string | null;
          position: number;
          added_at: string;
        };
        Insert: {
          id?: string;
          investigation_id: string;
          report_id?: string | null;
          live_stream_id?: string | null;
          position: number;
          added_at?: string;
        };
        Update: {
          id?: string;
          investigation_id?: string;
          report_id?: string | null;
          live_stream_id?: string | null;
          position?: number;
          added_at?: string;
        };
        Relationships: [];
      };
      live_streams: {
        Row: {
          id: string;
          reporter_id: string;
          location_id: string;
          event_id: string | null;
          coverage_request_id: string | null;
          report_id: string | null;
          cloudflare_live_input_id: string | null;
          recording_asset_id: string | null;
          status: Database["public"]["Enums"]["live_stream_status"];
          title: string;
          started_at: string | null;
          ended_at: string | null;
          last_seen_at: string | null;
          created_at: string;
          sensitive_content?: boolean;
          viewer_count?: number | null;
          viewer_count_checked_at?: string | null;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          location_id: string;
          event_id?: string | null;
          coverage_request_id?: string | null;
          report_id?: string | null;
          cloudflare_live_input_id?: string | null;
          recording_asset_id?: string | null;
          status?: Database["public"]["Enums"]["live_stream_status"];
          title: string;
          started_at?: string | null;
          ended_at?: string | null;
          last_seen_at?: string | null;
          created_at?: string;
          sensitive_content?: boolean;
          viewer_count?: number | null;
          viewer_count_checked_at?: string | null;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          location_id?: string;
          event_id?: string | null;
          coverage_request_id?: string | null;
          report_id?: string | null;
          cloudflare_live_input_id?: string | null;
          recording_asset_id?: string | null;
          status?: Database["public"]["Enums"]["live_stream_status"];
          title?: string;
          started_at?: string | null;
          ended_at?: string | null;
          last_seen_at?: string | null;
          created_at?: string;
          sensitive_content?: boolean;
          viewer_count?: number | null;
          viewer_count_checked_at?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: Database["public"]["Enums"]["notification_type"];
          actor_id: string | null;
          location_id: string | null;
          event_id: string | null;
          coverage_request_id: string | null;
          report_id: string | null;
          live_stream_id: string | null;
          message: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: Database["public"]["Enums"]["notification_type"];
          actor_id?: string | null;
          location_id?: string | null;
          event_id?: string | null;
          coverage_request_id?: string | null;
          report_id?: string | null;
          live_stream_id?: string | null;
          message: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          actor_id?: string | null;
          location_id?: string | null;
          event_id?: string | null;
          coverage_request_id?: string | null;
          report_id?: string | null;
          live_stream_id?: string | null;
          message?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          reporter_activity: boolean;
          location_activity: boolean;
          coverage_responses: boolean;
          livestreams: boolean;
          licensing: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          reporter_activity?: boolean;
          location_activity?: boolean;
          coverage_responses?: boolean;
          livestreams?: boolean;
          licensing?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          reporter_activity?: boolean;
          location_activity?: boolean;
          coverage_responses?: boolean;
          livestreams?: boolean;
          licensing?: boolean;
          updated_at?: string;
        };
        Relationships: [];
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
      emit_in_app_notifications: {
        Args: { payload: Json };
        Returns: undefined;
      };
    };
    Enums: {
      coverage_request_status: "open" | "fulfilled" | "closed";
      event_status: "active" | "ended" | "archived";
      investigation_status: "draft" | "published" | "archived";
      licensing_status: "view_only" | "licensing_available";
      media_type: "photo" | "video";
      media_provider: "cloudflare-stream" | "supabase-storage" | "local";
      media_upload_status: "pending" | "uploading" | "processing" | "ready" | "failed";
      media_provenance_type: "creator_declared" | "platform_capture" | "c2pa_verified" | "unknown";
      report_publish_status: "draft" | "published";
      live_stream_status: "created" | "live" | "ended" | "failed" | "terminated";
      licensing_transaction_status:
        | "inquiry"
        | "discussing"
        | "agreed"
        | "declined"
        | "completed"
        | "cancelled";
      profile_role: "member" | "admin";
      reporter_topic:
        | "local_news"
        | "politics"
        | "public_safety"
        | "transportation"
        | "business"
        | "protests"
        | "weather"
        | "community"
        | "other";
      moderation_content_type: "firsthand_report" | "coverage_request" | "live_stream" | "investigation";
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
      notification_type:
        | "new_report_from_followed_reporter"
        | "new_report_from_followed_location"
        | "coverage_request_in_followed_location"
        | "coverage_request_response"
        | "reporter_live"
        | "live_in_followed_location"
        | "licensing_inquiry"
        | "licensing_status_change";
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
export type EventRecord = TableRow<"events">;
export type InvestigationRecord = TableRow<"investigations">;
export type InvestigationItemRecord = TableRow<"investigation_items">;
export type InvestigationStatus = Database["public"]["Enums"]["investigation_status"];
export type EventStatus = Database["public"]["Enums"]["event_status"];
export type CoverageRequestRecord = TableRow<"coverage_requests">;
export type RequestInterest = TableRow<"request_interests">;
export type ReportRecord = TableRow<"reports">;
export type ReportMedia = TableRow<"report_media">;
export type ProfileFollow = TableRow<"profile_follows">;
export type LocationFollow = TableRow<"location_follows">;
export type InvestigationFollow = TableRow<"investigation_follows">;
export type ReportSupport = TableRow<"report_supports">;
export type ReportCorrection = TableRow<"report_corrections">;
export type LicensingTransaction = TableRow<"licensing_transactions">;
export type LicensingStatus = Database["public"]["Enums"]["licensing_status"];
export type CoverageRequestStatus = Database["public"]["Enums"]["coverage_request_status"];
export type MediaType = Database["public"]["Enums"]["media_type"];
export type MediaProvider = Database["public"]["Enums"]["media_provider"];
export type MediaUploadStatus = Database["public"]["Enums"]["media_upload_status"];
export type MediaProvenanceType = Database["public"]["Enums"]["media_provenance_type"];
export type ReportPublishStatus = Database["public"]["Enums"]["report_publish_status"];
export type LiveStreamRecord = TableRow<"live_streams">;
export type LiveStreamStatus = Database["public"]["Enums"]["live_stream_status"];
export type ModerationReportRecord = TableRow<"moderation_reports">;
export type NotificationRecordRow = TableRow<"notifications">;
export type NotificationPreferenceRow = TableRow<"notification_preferences">;
export type ProfileRole = Database["public"]["Enums"]["profile_role"];
export type ReporterTopic = Database["public"]["Enums"]["reporter_topic"];
