import { DirectInboxFeedResponseItemsItem } from "instagram-private-api";
import chalk from 'chalk';
import { BaseRavenMediaMessage, LinkMessage, MediaMessage, MediaShareMessage } from "types/messages";
import { getRavenMediaType, isRavenExpired, isRavenMessage, isSentRaven } from "./raven-message";

type Formatter = (msg: DirectInboxFeedResponseItemsItem) => string;
export default class MessageFormatter {
  private formatterMap: Record<string, Formatter> = {
    text: (msg) => this.textFormatter(msg),
    raven_media: (msg) => this.ravenFormatter(msg),
    link: (msg) => this.linkFormatter(msg),
    media: (msg) => this.mediaFormatter(msg),
    media_share: (msg) => this.mediaShareFormatter(msg),
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
      const img = media.visual_media.media.image_versions2.candidates
        .find(({ width }) => width === media.visual_media.media.original_width) || media.visual_media.media.image_versions2.candidates[0];

      if (!img) {
        return `${chalk.bold.blue(user)}: ${chalk.red('[Ephemeral picture]')}${chalk.bold.red('(no url)')}`;
      }

      const mediaAppearance = chalk.green(`[Ephemeral picture](${img.url})`)

      return `${chalk.bold.blue(user)}: ${mediaAppearance}`;
    }

    if (isRavenExpired(media)) {
      return `${chalk.bold.blue(user)}: ${chalk.green('Sent a ' + getRavenMediaType(media) + ' (expired)')}`;
    }
  
    return `${chalk.bold.blue(user)}: ${chalk.red('[Ephemeral picture](unhandled type)')}`;
  }

  private mediaFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const user = this.users[msg.user_id];
    const media = msg as MediaMessage;

    const img = media.media.image_versions2.candidates
      .find(({ width }) => width === media.media.original_width) || media.media.image_versions2.candidates[0];

    if (!img) {
      return `${chalk.bold.blue(user)}: [Media]${chalk.bold.red('(no url)')}`;
    }
    const mediaAppearance = chalk.green(`[Media](${img.url})`);
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

  private placeholderFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const user = this.users[msg.user_id];
    const mediaAppearance = chalk.red('Non displayable placeholder');
    return `${chalk.bold.blue(user)}: ${mediaAppearance}`;
  }
}