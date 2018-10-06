'use strict';

const https = require('https');
const { getDefaultProvider } = require('ethers');
const { gray, green } = require('chalk');

const listOfTokens = 'https://raw.githubusercontent.com/kvhnuke/etherwallet/v3.22.3/app/scripts/tokens/ethTokens.json';

const whenTokensLoaded = new Promise((resolve, reject) => {
  process.stdout.write(gray('Downloading list of tokens...'));
  https.get(listOfTokens, response => {
    let content = '';

    response.on('data', d => {
      process.stdout.write(gray('.'));
      content += d.toString();
    }).on('end', () => {
      process.stdout.write(green(' Complete.\n'));
      resolve(JSON.parse(content));
    });
  }).on('error', reject);
});

const tokenSymbol = process.argv[2] || 'nUSD';
const provider = getDefaultProvider();

whenTokensLoaded.then(tokens => {
  const address = tokens.find(({ symbol }) => symbol === tokenSymbol).address;
  console.log(gray(`Listening for ${tokenSymbol} logs (${address})`));
  provider.on({address}, log => {
    console.log(`\n${log}`);
  });
});


