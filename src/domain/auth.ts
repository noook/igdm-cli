import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { IgApiClient } from 'instagram-private-api';
import inquirer from 'inquirer';
import chalk from 'chalk';

const prefix = chalk.blue('?');

export default class Authenticator {
  private sessionPath: string = resolve(process.mainModule!.path, '..', 'session.json')

  private saveSession(data: object) {
    writeFileSync(this.sessionPath, JSON.stringify(data));
  }

  private get sessionExists(): boolean {
    const session = readFileSync(this.sessionPath, { encoding: 'utf-8' });
    if (JSON.stringify(session) === '"{}"') return false;

    const cookies: { cookies: { key: string }[] } = JSON.parse(this.loadSession().cookies);

    return cookies.cookies.some(cookie => cookie.key === 'sessionid')
      && cookies.cookies.some(cookie => cookie.key === 'ds_user');
  }

  private loadSession() {
    return JSON.parse(readFileSync(this.sessionPath, 'utf-8'));
  }

  public async login(): Promise<IgApiClient> {
    const ig = new IgApiClient();

    if (this.sessionExists) {
      const session = this.loadSession();
      const username = JSON.parse(session.cookies).cookies.find(({ key }: { key: string }) => key === 'ds_user').value;
      ig.state.generateDevice(username);

      await ig.simulate.preLoginFlow();
      const serialized = this.loadSession();
      await ig.state.deserialize(serialized);
      await ig.user.info(ig.state.cookieUserId);

      console.log(chalk.blue('Logging from session...'))

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
      .catch(() => {
        this.logout();
        throw new Error('An error occurred while logging in.');
      });
  }

  public logout() {
    writeFileSync(this.sessionPath, '{}');
    process.exit();
  }
}
