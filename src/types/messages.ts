import { UserFeedResponseItemsItem } from "instagram-private-api";

type MediaTypePicture = 1;
type MediaTypeVideo = 2;

type ReplyType = 'expiring_media_message' | string;
type ExpiredMediaType = 'raven_opened' | string;
type ViewMode = 'replayable' | string;
interface ExpiringMediaActionSummary {
  type: ExpiredMediaType;
  timestamp: string;
  count: number;
}

interface ImageCandidate {
  width: number;
  height: number;
  url: string;
  scans_profile: string;
  estimated_scans_sizes: number[];
}

type Media = {
  id: string;
  image_versions2: {
    candidates: ImageCandidate[]
  }
  original_width: number;
  original_height: number;
}

interface BaseMessage {
  item_id: string;
  timestamp: string;
  user_id: number;
  item_type: string;
  client_context: string;
  is_ssh_mode: null | boolean;
}

export type BaseRavenMediaMessage = BaseMessage & {
  item_type: 'raven_media';
  visual_media: {
    media: {
      media_type: MediaTypePicture | MediaTypeVideo;
    };
    seen_user_ids: string[];
    view_mode: ViewMode;
    seen_count: number;
    replay_expiring_at_us: string;
  }
}

export type RavenMediaMessage = BaseRavenMediaMessage & {
  visual_media: {
    url_expire_at_secs: number;
    playback_duration_secs: number;
    media: Media & {
      media_id: string;
      organic_tracking_token: string;
    }
  }
}

export type ExpiredRavenMediaMessage = BaseRavenMediaMessage & {
  visual_media: {
    expiring_media_action_summary: {
      type: ExpiredMediaType;
      timestamp: string;
      count: number;
    };
  };
}

export type SentRavenMediaMessage = BaseRavenMediaMessage & {
    visual_media: {
      reply_type: ReplyType;
      expiring_media_action_summary: ExpiringMediaActionSummary;
    }
}

export type LinkMessage = BaseMessage & {
  item_type: 'link';
  reactions: {
    likes: {
      sender_id: number;
      timestamp: number;
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
    };
    client_context: string;
    mutation_token: string;
  };
  show_forward_attribution: boolean;
}

export type MediaMessage = BaseMessage & {
  item_type: 'media';
  media: Media & {
    media_type: MediaTypePicture | MediaTypeVideo;
  };
  show_forward_attribution: boolean;
}

export type MediaShareMessage = BaseMessage & {
  item_type: 'media_share';
  media_share: UserFeedResponseItemsItem;
}

export type PlaceholderMessage = BaseMessage & {
  item_type: 'placeholder';
  placeholder: {
    is_linked: boolean;
    title: string;
    message: string;
  };
}
