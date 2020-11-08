import { AccountRepositoryCurrentUserResponseUser, DirectInboxFeedResponseThreadsItem, DirectThreadRepositoryBroadcastResponsePayload, IgApiClient } from 'instagram-private-api';
import inquirer from 'inquirer';
import chalk from 'chalk';
import MessageFormatter from './message-formatter';

export default class DirectMessaging {
  private client: IgApiClient;
  private threads: DirectInboxFeedResponseThreadsItem[] = [];
  private me!: AccountRepositoryCurrentUserResponseUser;

  public constructor(client: IgApiClient) {
    this.client = client;
    this.client.account.currentUser().then(user => this.me = user);
  }

  private getInbox() {
    return this.client.feed.directInbox().items();
  }

  public async init() {
    this.threads = await this.getInbox();
    console.clear();
    const choices = this.threads.map(({ thread_id, thread_title, last_permanent_item }) => ({
      name: `${thread_title}: ${last_permanent_item.text}`,
      value: thread_id
    }));

    const { thread } = await inquirer.prompt([
      {
        type: 'list',
        name: 'thread',
        message: 'Select conversation:',
        choices,
        loop: false,
        pageSize: choices.length,
      },
    ]);

    this.goToThread(thread);
  }

  private async goToThread(threadId: string) {
    const thread = this.threads.find(({ thread_id }) => thread_id === threadId);
    if (!thread) {
      console.log(chalk.red.bold('Couldn\'t find thread with id ' + threadId))

      return this.init();
    }

    thread.items
      .sort((a, b) => +a.timestamp - +b.timestamp);

    this.printScreen(thread);
  }

  private printScreen(thread: DirectInboxFeedResponseThreadsItem) {
    console.clear();
    console.log(chalk.yellow.bold(`Messages with: ${thread.thread_title}\n`));

    const users = thread.users.reduce<Record<number, string>>((acc, value) => ({
      ...acc,
      [value.pk]: value.username,
    }), {});

    users[this.me.pk] = this.me.username;

    thread.items
      .filter(({ item_type }) => !['action_log', 'raven_media'].includes(item_type))
      .forEach(msg => {
        const user = users[msg.user_id];
        let content = '';
        if (msg.item_type === 'media') {
          const imgLink = (msg as unknown as DirectInboxFeedResponseThreadsItem & { media: any }).media.image_versions2.candidates[0].url;
          content = `[image](${imgLink})`;
        } else {
          content = msg.text!;
        }
        if (!content) {
          console.log(msg);
        }
        console.log(`${chalk.bold.blue(user)}:`, MessageFormatter.maxLength(content, 100));
      });

    console.log('\n');

    this.prompt(thread);
  }

  private async prompt(thread: DirectInboxFeedResponseThreadsItem) {
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: chalk.bold.blue('>'),
        prefix: '',
      },
    ]);

    const { item_id, timestamp } = await this.client.entity.directThread(thread.thread_id).broadcastText(input) as DirectThreadRepositoryBroadcastResponsePayload;
    thread.items.push({
      item_id,
      user_id: this.me.pk,
      timestamp,
      item_type: 'text',
      text: input,
    })
    this.printScreen(thread);
  }
}
