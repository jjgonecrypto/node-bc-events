'use strict';

const util =require('util');
const ora = require('ora');

const { getDefaultProvider, providers: { JsonRpcProvider } } = require('ethers');
const { gray, red, cyan } = require('chalk');
const fetch = require('node-fetch');
const { loadContractFromSymbol } = require('./src/contractLoader');

const tokenSymbol = process.argv[2] || 'nUSD';
const provider = getDefaultProvider();

// const provider = new JsonRpcProvider('http://13.55.223.48:8545');
const whenTokenAddressLoaded = (/^0x/.test(tokenSymbol)) ? Promise.resolve(tokenSymbol) : loadContractFromSymbol(tokenSymbol);

require('dotenv-safe').config();

const apikey = process.env.ETHERSCAN_API_KEY;

whenTokenAddressLoaded.then(address => {
  ora({ text: gray(`Listening for ${tokenSymbol} ${tokenSymbol !== address ? `logs (${address})` : ''}`), spinner: 'rainbow' }).start();


  provider.on('block', blockNbr => {
    if (!blockNbr) return;
    provider.getBlock(blockNbr).then(({ transactions }) => {
      transactions.forEach(txn => {
        if (!txn) return;
        provider.getTransaction(txn).then(txn => {
          if (!txn) return Promise.resolve([]);
          const { to } = txn;
          return Promise.all([Promise.resolve(to), provider.getCode(to)]);
        }).then(([to, hex]) => {
          return Promise.all([
            Promise.resolve(to),
            (hex === '0x') ?
              Promise.resolve() :
              fetch(`https://api.etherscan.io/api?module=contract&apikey=${apikey}&action=getsourcecode&address=${to}`).then(res => res.json()).catch(() => {})
          ]);
        }).then(([to, response]) => {
          if (!response) return;
          console.log('\nContract invocation: ', cyan(`https://etherscan.io/address/${to}`));
          console.log(response.result[0].ContractName);
          // console.log(response);
        });
      });
    });
  });

  // { address } listens for all events within transactions that involve the contract
  // provider.on({ address }, log => {
  //   // console.log(util.inspect(log));
  //   provider.getTransaction(log.transactionHash).then(txn => {
  //     // console.log(util.inspect(txn));
  //     return provider.getTransactionReceipt(log.transactionHash);
  //   }).then(txnReceipt => {
  //     const { logs, transactionHash } = txnReceipt;
  //     console.log(cyan(`\nhttps://etherscan.io/tx/${transactionHash}`));
  //     console.log(util.inspect(logs));
  //     process.exit();
  //   });
  // });
}).catch(err => {
  console.error(red(err));
  process.exit(1);
});


