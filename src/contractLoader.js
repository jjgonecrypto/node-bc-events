'use strict';

const https = require('https');
const fs =require('fs');
const ora = require('ora');

const { gray, green } = require('chalk');

const listOfTokens = 'https://raw.githubusercontent.com/kvhnuke/etherwallet/v3.22.3/app/scripts/tokens/ethTokens.json';

const PATH_TO_TOKEN_JSON = '../tokens.json';

module.exports = {
  loadContractFromSymbol: (tokenSymbol) => {
    const whenTokensLoaded = new Promise((resolve, reject) => {
      if (fs.existsSync(PATH_TO_TOKEN_JSON)) {
        console.log(gray('Opening local file for reading.'));
        fs.readFile(PATH_TO_TOKEN_JSON, (err, data) => {
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
          fs.writeFileSync(PATH_TO_TOKEN_JSON, content);
          resolve(JSON.parse(content));
        });
      }).on('error', reject);
    });

    return whenTokensLoaded.then(tokens => tokens.find(({ symbol }) => symbol === tokenSymbol).address);

  }
};


