export interface RavenMediaMessage {
  item_id: string;
  user_id: number;
  item_type: 'raven_media';
  client_context: string;
  is_ssh_mode: null | boolean;
  visual_media: {
    url_expire_at_secs: number;
    playback_duration_secs: number;
    media: {
      id: string;
      image_versions2: {
        candidates: {
          width: number;
          height: number;
          url: string;
          scans_profile: string;
          estimated_scans_sizes: number[];
        }[]
        original_width: number;
        original_height: number;
        media_type: number;
        media_id: string;
        organic_tracking_token: string;
      }
    }
    reply_type: string;
    seen_user_ids: number[];
    view_mode: string;
    seen_count: number;
    replay_expiring_at_us: null;
  }
}

export interface LinkMessage {
  item_id: number;
  user_id: number;
  timestamp: string;
  item_type: 'link';
  reactions: {
    likes: {
      sender_id: number,
      timestamp: number,
      client_context: null;
    }[];
    likes_count: number;
  };
  link: {
    text: string;
    link_context: {
      link_url: string;
      link_title: string;
      link_summary: string;
      link_image_url: string;
    },
    client_context: string;
    mutation_token: string;
  },
  client_context: string;
  show_forward_attribution: boolean,
  is_shh_mode: boolean
}