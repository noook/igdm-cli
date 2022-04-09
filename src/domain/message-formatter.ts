import { DirectInboxFeedResponseItemsItem } from "instagram-private-api";
import chalk from 'chalk';
import { ActionMessage, AnimationMessage, BaseRavenMediaMessage, FelixShareMessage, LinkMessage, MediaMessage, MediaShareMessage, ReelShareMessage, Video, VoiceMessage } from "types/messages";
import { getRavenMediaType, isRavenExpired, isRavenMessage, isSentRaven } from "./raven-message";

type Formatter = (msg: DirectInboxFeedResponseItemsItem) => string;
export default class MessageFormatter {
  private formatterMap: Record<string, Formatter> = {
    text: (msg) => this.textFormatter(msg),
    action_log: (msg) => this.actionFormatter(msg),
    raven_media: (msg) => this.ravenFormatter(msg),
    link: (msg) => this.linkFormatter(msg),
    media: (msg) => this.mediaFormatter(msg),
    voice_media: (msg) => this.voiceFormatter(msg),
    animated_media: (msg) => this.animationFormatter(msg),
    media_share: (msg) => this.mediaShareFormatter(msg),
    reel_share: (msg) => this.reelShareFormatter(msg),
    felix_share: (msg) => this.felixShareFormatter(msg),
    placeholder: (msg) => this.placeholderFormatter(msg),
  };
  private users: Record<number, string> = {};

  public setUsers(users: Record<number, string>) {
    this.users = users;
  }
  
  public format(msg: DirectInboxFeedResponseItemsItem): string {
    const user = this.users[msg.user_id];
    try {
      return this.formatterMap[msg.item_type](msg);
    } catch (e) {
      return chalk.bold.red(`${user} sent message of type: ${msg.item_type}`);
    }
  }

  private maxLength(text: string, lineLength: number) {
    const paragraphs = text.split('\n');
    const chunks = paragraphs
      .map(paragraph => {
        return paragraph
          .split(' ')
          .reduce<string[][]>((acc, word) => {
            const row = acc.pop()!;
            if (`${row.join(' ')} ${word}`.length < lineLength) {
              row.push(word);
              acc.push(row);
            } else {
              acc.push(row, [word]);
            }
            
            return acc;
          }, [[]])
          .map(row => row.join(' '))
          .join('\n');
      });

    return chunks.join('\n');
  }

  private textFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const user = this.users[msg.user_id];
    return `${chalk.bold.blue(user)}: ${this.maxLength(msg.text!, 100)}`;
  }

  private actionFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const user = this.users[msg.user_id];
    const action = msg as ActionMessage;
    if (!action?.action_log?.description) {
      throw Error('unsupported action_log');
    }
    return chalk.bold.blue(`${user} ${action.action_log.description.toLowerCase()}`);
  }

  private linkFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const user = this.users[msg.user_id];
    const link = msg as LinkMessage;
    return [
      `${chalk.bold.blue(user)}: ${this.maxLength(link.link.text, 100)}`,
      chalk.green.bold('[LINK]'),
      `${chalk.green('[LINK TITLE]:')} ${link.link.link_context.link_title}`,
      `${chalk.green('[LINK URL]:')} ${link.link.link_context.link_url}`,
    ].join('\n');
  }
  
  private ravenFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const media = msg as unknown as BaseRavenMediaMessage;
    const user = this.users[msg.user_id];
    if (isSentRaven(media)) {
      return `${chalk.bold.blue(user)}: ${chalk.green('You sent a ' + getRavenMediaType(media))}`;
    }
    if (isRavenMessage(media)) {
      const img = media.visual_media.media.image_versions2?.candidates
        .find(({ width }) => width === media.visual_media.media.original_width) || media.visual_media.media.image_versions2?.candidates[0];
      const video = media.visual_media.media?.video_versions
        ?.sort((a: Video, b: Video) => (a.height < b.height) ? 1 : -1)
        .shift();

      if (!img && !video) {
        return `${chalk.bold.blue(user)}: ${chalk.red('[Ephemeral media]')}${chalk.bold.red('(no url)')}`;
      }

      let mediaAppearance = '';
      if (img) {
        mediaAppearance += chalk.green(`[Ephemeral image](${img.url})`);
      }
      if (video) {
        mediaAppearance += chalk.magenta(`[Ephemeral video](${video.url})`);
      }
      return `${chalk.bold.blue(user)}: ${mediaAppearance}`;
    }

    if (isRavenExpired(media)) {
      return `${chalk.bold.blue(user)}: ${chalk.green('Sent a ' + getRavenMediaType(media) + ' (expired)')}`;
    }
  
    return `${chalk.bold.blue(user)}: ${chalk.red('[Ephemeral media](unhandled type)')}`;
  }

  private mediaFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const user = this.users[msg.user_id];
    const media = msg as MediaMessage;

    const img = media.media.image_versions2?.candidates
      .find(({ width }) => width === media.media.original_width) || media.media.image_versions2?.candidates[0];
    const video = media.media?.video_versions
      ?.sort((a: Video, b: Video) => (a.height < b.height) ? 1 : -1)
      .shift();

    if (!img && !video) {
      return `${chalk.bold.blue(user)}: ${chalk.red('[Media]')}${chalk.bold.red('(no url)')}`;
    }

    let mediaAppearance = '';
    if (img) {
      mediaAppearance += chalk.green(`[Media image](${img.url})`);
    }
    if (video) {
      mediaAppearance += chalk.magenta(`[Media video](${video.url})`);
    }
    return `${chalk.bold.blue(user)}: ${mediaAppearance}`;
  }

  private voiceFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const user = this.users[msg.user_id];
    const media = msg as VoiceMessage;

    const audio = media.voice_media.media.audio?.audio_src
      .replace(/&dl=1$/, '');

    if (!audio) {
      return `${chalk.bold.blue(user)}: ${chalk.red('[Voice]')}${chalk.bold.red('(no url)')}`;
    }
    const mediaAppearance = chalk.green(`[Voice](${audio})`);
    return `${chalk.bold.blue(user)}: ${mediaAppearance}`;
  }

  private animationFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const user = this.users[msg.user_id];
    const media = msg as AnimationMessage;

    const animation = media.animated_media.images.fixed_height.url;

    if (!animation) {
      return `${chalk.bold.blue(user)}: ${chalk.red('[Animation]')}${chalk.bold.red('(no url)')}`;
    }
    const mediaAppearance = chalk.green(`[Animation](${animation})`);
    return `${chalk.bold.blue(user)}: ${mediaAppearance}`;
  }

  private mediaShareFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const user = this.users[msg.user_id];
    const media = msg as MediaShareMessage;
    const mediaAppearance = chalk.magenta(`@${media.media_share.user.username}`);
    return [
      `${chalk.bold.blue(user)}: Shared a media by ${mediaAppearance}`,
      chalk.yellow('Media share can\'t be seen from a terminal.'),
    ].join('\n');
  }

  private reelShareFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const user = this.users[msg.user_id];
    const media = msg as unknown as ReelShareMessage;
    const img = media.reel_share.media.image_versions2?.candidates
      .find(({ width }) => width === media.reel_share.media.original_width) || media.reel_share.media.image_versions2?.candidates[0];
    const video = media.reel_share.media?.video_versions
      ?.sort((a: Video, b: Video) => (a.height < b.height) ? 1 : -1)
      .shift();
    const text = media.reel_share.text;
    if (!img && !video) {
      return `${chalk.bold.blue(user)}: ${chalk.red('[Reel share]')}${chalk.bold.red('(no url)')}`;
    }
    let mediaAppearance = '';
    if (img) {
      mediaAppearance += chalk.green(`[Reel share image](${img.url})`);
    }
    if (video) {
      mediaAppearance += chalk.magenta(`[Reel share video](${video.url})`);
    }
    if (text) {
      mediaAppearance += `[Reel share text](${text})`;
    }
    return `${chalk.bold.blue(user)}: ${mediaAppearance}`;
  }

  private felixShareFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const user = this.users[msg.user_id];
    const media = msg as FelixShareMessage;
    const img = media.felix_share.video.image_versions2?.candidates
      .find(({ width }) => width === media.felix_share.video.original_width) || media.felix_share.video.image_versions2?.candidates[0];
    const video = media.felix_share.video?.video_versions
      ?.sort((a: Video, b: Video) => (a.height < b.height) ? 1 : -1)
      .shift();
    if (!img && !video) {
      return `${chalk.bold.blue(user)}: ${chalk.red('[Felix share]')}${chalk.bold.red('(no url)')}`;
    }
    let mediaAppearance = '';
    if (img) {
      mediaAppearance += chalk.green(`[Felix share image](${img.url})`);
    }
    if (video) {
      mediaAppearance += chalk.magenta(`[Felix share video](${video.url})`);
    }
    return `${chalk.bold.blue(user)}: ${mediaAppearance}`;
  }

  private placeholderFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const user = this.users[msg.user_id];
    const mediaAppearance = chalk.red('Non displayable placeholder');
    return `${chalk.bold.blue(user)}: ${mediaAppearance}`;
  }
}