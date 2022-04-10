import { BaseRavenMediaMessage, ExpiredRavenMediaMessage, SentRavenMediaMessage, RavenMediaMessage } from '../types/messages';

const mediaTypes = {
  1: 'picture',
  2: 'video',
};

export function isRavenExpired(msg: BaseRavenMediaMessage): msg is ExpiredRavenMediaMessage {
  return +msg.visual_media.replay_expiring_at_us / 1000 < Date.now();
}

export function isSentRaven(msg: BaseRavenMediaMessage): msg is SentRavenMediaMessage {
  return !!(msg as SentRavenMediaMessage).visual_media.expiring_media_action_summary;
}

export function isRavenMessage(msg: BaseRavenMediaMessage): msg is RavenMediaMessage {
  return !!(msg as RavenMediaMessage).visual_media.media.image_versions2;
}

export function getRavenMediaType(msg: BaseRavenMediaMessage): string {
  return mediaTypes[msg.visual_media.media.media_type];
}
