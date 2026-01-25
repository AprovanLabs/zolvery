/**
 * Get GitHub PR diff
 *
 * Usage: gh-diff --repo owner/repo --number 123
 */

import { gh } from '@urpc/clients';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = await yargs(hideBin(process.argv))
  .option('repo', {
    alias: 'r',
    type: 'string',
    description: 'Repository in owner/repo format',
    demandOption: true,
  })
  .option('number', {
    alias: 'n',
    type: 'string',
    description: 'PR number',
    demandOption: true,
  })
  .help()
  .alias('help', 'h')
  .parse();

const diff = await gh.pr.diff(argv.number, { repo: argv.repo });
console.log(diff);
