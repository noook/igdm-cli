import { AccountRepositoryCurrentUserResponseUser, DirectInboxFeedResponseThreadsItem, DirectThreadRepositoryBroadcastResponsePayload, IgApiClient } from 'instagram-private-api';
import inquirer from 'inquirer';
import chalk from 'chalk';
import MessageFormatter from './message-formatter';
import Authenticator from './auth';

export default class DirectMessaging {
  private client: IgApiClient;

  private threads: DirectInboxFeedResponseThreadsItem[] = [];

  private me!: AccountRepositoryCurrentUserResponseUser;

  private formatter = new MessageFormatter();

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
    const placeholder = chalk.red('No preview available');
    const choices = this.threads.map(({ thread_id, thread_title, last_permanent_item }) => ({
      name: `${thread_title}: ${last_permanent_item.text ? last_permanent_item.text : placeholder }`,
      value: thread_id,
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
      console.log(chalk.red.bold('Couldn\'t find thread with id ' + threadId));

      return this.init();
    }

    thread.items
      .sort((a, b) => +a.timestamp - +b.timestamp);

    this.printScreen(thread);
  }

  private async printScreen(thread: DirectInboxFeedResponseThreadsItem) {
    console.clear();
    console.log(chalk.yellow.bold(`Messages with: ${thread.thread_title}\n`));

    const users = thread.users.reduce<Record<number, string>>((acc, value) => ({
      ...acc,
      [value.pk]: value.username,
    }), {});
    
    users[this.me.pk] = this.me.username;

    this.formatter.setUsers(users);

    for (let i = 0; i < thread.items.length; i += 1) {
      const msg = thread.items[i];
      const content = await this.formatter.format(msg);
      console.log(content);
    }

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

    switch ((input as string).toLowerCase()) {
      case '\\l': return this.init();
      case '\\r':
        this.threads = await this.getInbox();
        return this.goToThread(thread.thread_id);
      case '\\q': process.exit();
      case '\\logout': return new Authenticator().logout();
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { item_id, timestamp } = await this.client.entity.directThread(thread.thread_id).broadcastText(input) as DirectThreadRepositoryBroadcastResponsePayload;
    thread.items.push({
      item_id,
      user_id: this.me.pk,
      timestamp,
      item_type: 'text',
      text: input,
    });
    this.printScreen(thread);
  }
}
