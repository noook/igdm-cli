import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { IgApiClient, IgLoginTwoFactorRequiredError } from 'instagram-private-api';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as Bluebird from 'bluebird';

const prefix = chalk.blue('?');

export default class Authenticator {
  private sessionPath: string = resolve(process.mainModule!.path, '..', 'session.json')

  private saveSession(data: object) {
    writeFileSync(this.sessionPath, JSON.stringify(data));
  }

  private get sessionExists(): boolean {
    const session = readFileSync(this.sessionPath, { encoding: 'utf-8' });
    if (session === '{}') return false;

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
      const username = JSON.parse(session.cookies).cookies.find(({ key }: { key: string }) => key === 'ds_user').value;
      ig.state.generateDevice(username);

      await ig.simulate.preLoginFlow();
      const serialized = this.loadSession();
      await ig.state.deserialize(serialized);
      await ig.user.info(ig.state.cookieUserId);

      console.log(chalk.blue('Logging from session...'));

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

        return Bluebird.try(() => ig.account.login(answers.username, answers.password)).catch(
          IgLoginTwoFactorRequiredError,
          async err => {
            const {username, totp_two_factor_on, two_factor_identifier} = err.response.body.two_factor_info;
            // decide which method to use
            const verificationMethod = totp_two_factor_on ? '0' : '1'; // default to 1 for SMS
            // At this point a code should have been sent
            // Get the code
            const { code } = await inquirer.prompt([
              {
                type: 'input',
                name: 'code',
                message: `Enter code received via ${verificationMethod === '1' ? 'SMS' : 'TOTP'}`,
              },
            ]);
            // Use the code to finish the login process
            return ig.account.twoFactorLogin({
              username,
              verificationCode: code,
              twoFactorIdentifier: two_factor_identifier,
              verificationMethod, // '1' = SMS (default), '0' = TOTP (google auth for example)
              trustThisDevice: '1', // Can be omitted as '1' is used by default
            });
          },
        ).catch(e => console.error('An error occurred while processing two factor auth', e, e.stack));
      })
      .then(() => ig)
      .catch(() => {
        const error = chalk.red.bold('An error occurred while logging in. Check your credentials or your network connectivity.');
        console.error(error);
        this.logout();
        throw new Error(error);
      });
  }

  public logout() {
    writeFileSync(this.sessionPath, '{}');
    process.exit();
  }
}
