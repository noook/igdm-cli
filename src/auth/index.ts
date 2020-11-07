import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { IgApiClient } from 'instagram-private-api';
import inquirer from 'inquirer';
import chalk from 'chalk';

const prefix = chalk.blue('?');

export default class Authenticator {
  private sessionPath: string = resolve(__dirname, '..', 'session', 'session.json')

  private saveSession(data: object) {
    writeFileSync(this.sessionPath, JSON.stringify(data));
  }

  private get sessionExists(): boolean {
    if (!existsSync(this.sessionPath)) return false;

    const cookies: { cookies: { key: string }[] } = JSON.parse(this.loadSession().cookies);

    return cookies.cookies.some(cookie => cookie.key === 'sessionid')
      && cookies.cookies.some(cookie => cookie.key === 'ds_user');
  }

  private loadSession() {
    return JSON.parse(readFileSync(this.sessionPath, 'utf-8'));
  }

  public async login(): Promise<IgApiClient> {
    const ig = new IgApiClient();
    console.log()

    if (this.sessionExists) {
      const session = this.loadSession();
      const username = JSON.parse(session.cookies).cookies.find(({ key }: { key: string}) => key === 'ds_user').value;
      ig.state.generateDevice(username);
    }

    if (this.sessionExists) {
      await ig.simulate.preLoginFlow();
      const serialized = this.loadSession();
      await ig.state.deserialize(serialized);
      await ig.user.info(ig.state.cookieUserId);

      return ig;
    }

    return inquirer.prompt([
      {
        type: 'input',
        prefix,
        name: 'username',
        message: 'Enter your instagram account username:',
      },
      {
        type: 'password',
        prefix,
        mask: '*',
        name: 'password',
        message: 'Enter your account password',
      },
    ])
      .then((answers) => {
        ig.state.generateDevice(answers.username);

        ig.request.end$.subscribe(async () => {
          const serialized = await ig.state.serialize();
          delete serialized.constants; // This deletes the version info, so you'll always use the version provided by the library
          this.saveSession(serialized);
        });

        return ig.account.login(answers.username, answers.password)
      })
      .then(() => ig)
      .catch(err => {
        throw new Error('An error occurred while logging in.');
      });
  }
}
