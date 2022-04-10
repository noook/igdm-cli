import 'core-js/stable';
import 'regenerator-runtime/runtime';
import chalk from 'chalk';
import Authenticator from './domain/auth';
import DirectMessaging from './domain/direct-messaging';

console.clear();

const authenticator = new Authenticator;

authenticator.login()
  .then(async client => {
    const currentUser = await client.account.currentUser();
    console.log(`✅  Logged in as: ${chalk.bold.green(currentUser.username)}`);

    const dm = new DirectMessaging(client);
    dm.init();
  })
  .catch((err: string) => {
    console.log(chalk.red(err));
    if (err.toString().includes('login_required')) {
      authenticator.logout();
    }
  });
