'use strict';

const util = require('util');
const ora = require('ora');

const snx = require('synthetix');
const abiDecoder = require('abi-decoder');
const ethers = require('ethers');
const { gray, green, red, cyan } = require('chalk');
const { loadContractFromSymbol } = require('./src/contractLoader');

//const tokenSymbol = process.argv[2] || 'SNX';
const tokenSymbol = 'SNX';
// const provider = ethers.getDefaultProvider();

const network = 'mainnet';

const provider = new ethers.providers.InfuraProvider(
  network === 'mainnet' ? 'mainnet' : network
  // process.env.INFURA_PROJECT_ID
);

// const provider = new JsonRpcProvider('http://13.55.223.48:8545');
const whenTokenAddressLoaded = /^0x/.test(tokenSymbol)
  ? Promise.resolve(tokenSymbol)
  : loadContractFromSymbol(tokenSymbol);

require('dotenv-safe').config();

// whenTokenAddressLoaded
//   .then(address => {
//     ora({
//       text: gray(
//         `Listening for ${tokenSymbol} ${
//           tokenSymbol !== address ? `logs (${address})` : ''
//         }`
//       ),
//       spinner: 'rainbow'
//     }).start();

//     // { address } listens for all events within transactions that involve the contract
//     provider.on({ address }, log => {
//       console.log(util.inspect(log));
//       provider
//         .getTransaction(log.transactionHash)
//         .then(() => {
//           // console.log(util.inspect(txn));
//           return provider.getTransactionReceipt(log.transactionHash);
//         })
//         .then(txnReceipt => {
//           const { logs, transactionHash } = txnReceipt;
//           console.log(cyan(`\nhttps://etherscan.io/tx/${transactionHash}`));
//           console.log(util.inspect(logs));
//           process.exit();
//         });
//     });
//   })
//   .catch(err => {
//     console.error(red(err));
//     process.exit(1);
//   });

const apikey = process.env.ETHERSCAN_API_KEY;
const fetch = require('node-fetch');

// TODO make this generic
const sources = snx.getSource({ network });
Object.entries(sources).forEach(([source, { abi }]) => {
  console.log(gray('Loading abi for', source));
  abiDecoder.addABI(abi);
});
const targets = snx.getTarget({ network });
const addresses = Object.values(targets).map(({ address }) =>
  address.toLowerCase()
);

ora({
  text: gray('Listening for contract events for all SNX addresses'),
  spinner: 'rainbow'
}).start();
provider.on('block', blockNbr => {
  if (!blockNbr) return;
  provider.getBlock(blockNbr).then(({ transactions }) => {
    transactions.forEach(txn => {
      if (!txn) return;
      provider
        .getTransaction(txn)
        .then(txn => {
          if (!txn) return Promise.resolve([]);
          const { to, data, hash } = txn;
          if (addresses.indexOf((to || '').toLowerCase()) < 0)
            return Promise.resolve();

          return Promise.all([
            Promise.resolve(to),
            provider.getCode(to),
            provider.getTransactionReceipt(hash),
            data
          ]);
        })
        .then(([, hex, { from, gasUsed, status, logs } = {}, data] = []) => {
          if (!hex || hex === '0x') return Promise.resolve();

          console.log('from:', from);
          console.log('method:', abiDecoder.decodeMethod(data));
          console.log(
            'logs:',
            util.inspect(abiDecoder.decodeLogs(logs), {
              showHidden: true,
              depth: null
            })
          );
          console.log('gasUsed:', gasUsed);
          console.log('success:', status === 1 ? green('true') : red('false'));

          console.log(
            cyan(
              `https://${
                network === 'mainnet' ? '' : network + '.'
              }etherscan.io/tx/${txn}`
            )
          );
          // return Promise.all([
          //   Promise.resolve(to),
          //   hex === '0x'
          //     ? Promise.resolve()
          //     : fetch(
          //       `https://${
          //         network === 'mainnet' ? 'api' : network
          //       }.etherscan.io/api?module=contract&apikey=${apikey}&action=getsourcecode&address=${to}`
          //     )
          //       .then(res => res.json())
          //       .catch(() => {})
          // ]);
        });
      // .then(([, response] = []) => {
      //   if (!response) return;
      //   console.log(
      //     '\nContract invocation: ',
      //     cyan(
      //       `https://${
      //         network === 'mainnet' ? '' : network + '.'
      //       }etherscan.io/tx/${txn}`
      //     ),
      //     txn
      //   );
      //   console.log(response.result[0].ContractName);
      // });
    });
  });
});
