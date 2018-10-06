'use strict';

const https = require('https');
const fs =require('fs');
const util =require('util');
const ora = require('ora');

const { getDefaultProvider } = require('ethers');
const { gray, green, red } = require('chalk');

const listOfTokens = 'https://raw.githubusercontent.com/kvhnuke/etherwallet/v3.22.3/app/scripts/tokens/ethTokens.json';

const whenTokensLoaded = new Promise((resolve, reject) => {
  if (fs.existsSync('./tokens.json')) {
    console.log(gray('Opening local file for reading.'));
    fs.readFile('./tokens.json', (err, data) => {
      if (err) reject(err);
      else resolve(JSON.parse(data));
    });
    return;
  }
  const spinner = ora({ text: gray('Downloading list of ERC20 token contracts'), spinner: 'shark' }).start();

  https.get(listOfTokens, response => {
    let content = '';

    response.on('data', d => {
      content += d.toString();
    }).on('end', () => {
      process.stdout.write(green(' Complete.\n'));
      spinner.stop();
      fs.writeFileSync('./tokens.json', content);
      resolve(JSON.parse(content));
    });
  }).on('error', reject);
});

const tokenSymbol = process.argv[2] || 'nUSD';
const provider = getDefaultProvider();

whenTokensLoaded.then(tokens => {
  let address;
  if (/^0x/.test(tokenSymbol)) address = tokenSymbol;
  else address = tokens.find(({ symbol }) => symbol === tokenSymbol).address;

  ora({ text: gray(`Listening for ${tokenSymbol} ${tokenSymbol !== address ? `logs (${address})` : ''}`), spinner: 'rainbow' }).start();
  provider.on({ address }, log => {
    console.log(util.inspect(log));
  });
}).catch(err => {
  console.error(red(err));
  process.exit(1);
});


