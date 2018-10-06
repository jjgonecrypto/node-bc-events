'use strict';

const util =require('util');
const ora = require('ora');

const { getDefaultProvider } = require('ethers');
const { gray, red } = require('chalk');

const { loadContractFromSymbol } = require('./src/contractLoader');

const tokenSymbol = process.argv[2] || 'nUSD';
const provider = getDefaultProvider();

const whenTokenAddressLoaded = (/^0x/.test(tokenSymbol)) ? Promise.resolve(tokenSymbol) : loadContractFromSymbol(tokenSymbol);

whenTokenAddressLoaded.then(address => {
  ora({ text: gray(`Listening for ${tokenSymbol} ${tokenSymbol !== address ? `logs (${address})` : ''}`), spinner: 'rainbow' }).start();
  provider.on({ address }, log => {
    console.log(util.inspect(log));
  });
}).catch(err => {
  console.error(red(err));
  process.exit(1);
});


