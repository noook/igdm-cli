import chalk from 'chalk';
import Authenticator from './auth';

console.clear();

const authenticator = new Authenticator;
authenticator.login()
  .then(async client => {
    const currentUser = await client.account.currentUser();
    console.log(`✅  Logged in as: ${chalk.bold.green(currentUser.username)}`);
  })
  .catch(err => console.log(chalk.red(err)));

