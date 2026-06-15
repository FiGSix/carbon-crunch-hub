
export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  avatar_url: string | null;
  role: UserRole | undefined;
  agent_status: string | null;
  terms_accepted_at: string | null;
  created_at: string;
  intro_video_viewed: boolean | null;
  intro_video_viewed_at: string | null;
  super_partner_id?: string | null;
  super_partner_status?: string | null;
}

export type UserRole = 'client' | 'agent' | 'admin' | 'super_partner';
