import chalk from 'chalk';
import Authenticator from './auth';

console.clear();

const authenticator = new Authenticator;
authenticator.login()
  .then(async client => {
    console.log(await client.account.currentUser());
  })
  .catch(err => console.log(chalk.red(err)));

