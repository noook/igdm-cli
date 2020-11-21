import { DirectInboxFeedResponseItemsItem } from "instagram-private-api";
import chalk from 'chalk';
import { LinkMessage, RavenMediaMessage } from "types/messages";

type Formatter = (msg: DirectInboxFeedResponseItemsItem) => string;
export default class MessageFormatter {
  private formatterMap: Record<string, Formatter> = {
    text: (msg) => this.textFormatter(msg),
    raven_media: (msg) => this.ravenFormatter(msg),
    link: (msg) => this.linkFormatter(msg),
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
      return chalk.bold.red(`${user} send message of type: ${msg.item_type}`);
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
    const link = msg as unknown as LinkMessage;
    return [
      `${chalk.bold.blue(user)}: ${this.maxLength(link.link.text, 100)}`,
      chalk.green.bold('[LINK]'),
      `${chalk.green('[LINK TITLE]:')} ${link.link.link_context.link_title}`,
      `${chalk.green('[LINK URL]:')} ${link.link.link_context.link_url}`,
    ].join('\n');
  }
  
  private ravenFormatter(msg: DirectInboxFeedResponseItemsItem): string {
    const media = msg as unknown as RavenMediaMessage;
    const user = this.users[msg.user_id];
    const img = media.visual_media.media.image_versions2.candidates
    .sort((a, b) => {
      if (a.width < b.width) return -1;
      if (a.width > b.width) return 1;
      return 0;
    })[0];
    if (!img) {
      `${chalk.bold.blue(user)}: [Ephemeral picture]${chalk.bold.red('(NO URL)')}`;
    }
    return `${chalk.bold.blue(user)}: [Ephemeral picture](${img.url})`;
  }
}