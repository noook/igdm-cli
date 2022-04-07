import { UserFeedResponseItemsItem } from "instagram-private-api";

type MediaTypePicture = 1;
type MediaTypeVideo = 2;
type MediaTypeAudio = 11;

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
  estimated_scans_sizes?: number[];
}

interface Video {
  height: number;
  width: number;
  url: string;
  type: number;
  fallback: any;
  url_expiration_timestamp_us: string;
}

interface Audio {
  audio_src: string;
  duration: number;
  waveform_data: number[];
  waveform_sampling_frequency_hz: number;
  fallback: any;
  audio_src_expiration_timestamp_us: string;
}

type Media = {
  id: string;
  image_versions2?: {
    candidates: ImageCandidate[];
  }
  video_versions?: Video[]
  audio?: Audio;
  original_width?: number;
  original_height?: number;
}

interface BaseMessage {
  item_id: string;
  timestamp: string;
  user_id: number;
  item_type: string;
  client_context: string;
  is_shh_mode: null | boolean;
}

export type { Video };

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

export type VoiceMessage = BaseMessage & {
  item_type: 'voice_media';
  voice_media: {
    media: Media & {
      media_type: MediaTypeAudio;
    };
    seen_count: number;
    is_shh_mode: boolean;
    seen_user_ids: string[];
    replay_expiring_at_us: string | null;
    view_mode: ViewMode;
  };
  show_forward_attribution: boolean;
}

export type AnimationMessage = BaseMessage & {
  item_type: 'animated_media';
  animated_media: {
    images: {
      fixed_height: {
        url: string;
      }
    }
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
