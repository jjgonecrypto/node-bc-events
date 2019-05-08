'use strict';

const util = require('util');
const ora = require('ora');

const snx = require('synthetix');
const abiDecoder = require('abi-decoder');
const ethers = require('ethers');
const { gray, green, red, cyan } = require('chalk');
const program = require('commander');

require('dotenv-safe').config();
// const { loadContractFromSymbol } = require('./src/contractLoader');

program
  .command('listen')
  .description('Listen for contracts')
  .option(
    '-n, --network <value>',
    'The network to run off.',
    x => x.toLowerCase(),
    'mainnet'
  )
  .action(async ({ network }) => {
    //const tokenSymbol = process.argv[2] || 'SNX';
    // const tokenSymbol = 'SNX';
    // const provider = ethers.getDefaultProvider();

    console.log(gray('Using network', network));
    const provider = new ethers.providers.InfuraProvider(
      network === 'mainnet' ? 'mainnet' : network
      // process.env.INFURA_PROJECT_ID
    );

    // const provider = new JsonRpcProvider('http://13.55.223.48:8545');
    // const whenTokenAddressLoaded = /^0x/.test(tokenSymbol)
    //   ? Promise.resolve(tokenSymbol)
    //   : loadContractFromSymbol(tokenSymbol);

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
      // FeePool Event: IssuanceDebtRatioEntry needs manual tweaking to insert spaces into the event
      let abiContents = JSON.stringify(abi);
      abiContents = abiContents.replace(
        /0x28dcdf40e6b6196065d54760038ab1a8c0c1d9cfa58a99e6b0cb6022f7e24775/gi,
        '0x5d36395f82acdeab7c1acf598913a7bb8a9cbae4c5912d8c7583137990d01652'
      );
      abiDecoder.addABI(JSON.parse(abiContents));
    });
    const targets = snx.getTarget({ network });
    const addresses = Object.values(targets).reduce((memo, target) => {
      const { address } = target;
      memo[address.toLowerCase()] = target;
      return memo;
    }, {});

    const addReadableValues = input => {
      input = Array.isArray(input) ? input : [input];

      input.forEach(obj => {
        if (typeof obj !== 'object') return;

        if (/^uint256/.test(obj.type)) {
          const formatNumber = num => {
            return num.toString().length === 10
              ? new Date(num * 1000) // handle timestamps
              : num / 1e18;
          };

          obj.formatted = Array.isArray(obj.value)
            ? obj.value.map(formatNumber)
            : formatNumber(obj.value);
        } else if (/^bytes/.test(obj.type)) {
          obj.formatted = Array.isArray(obj.value)
            ? obj.value.map(ethers.utils.toUtf8String)
            : ethers.utils.toUtf8String(obj.value);
        }
        // now iterate over other props
        Object.values(obj)
          .filter(val => typeof val === 'object')
          .forEach(addReadableValues);
      });

      return input;
    };
    console.log(gray('Listening for contract events for all SNX addresses'));
    // ora({
    //   text: gray('Listening for contract events for all SNX addresses'),
    //   spinner: 'growHorizontal'
    // }).start();

    const asyncForEach = async (array, callback) => {
      for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
      }
    };

    provider.on('block', async blockNbr => {
      if (!blockNbr) return;

      const { transactions } = await provider.getBlock(blockNbr);

      await asyncForEach(transactions, async tx => {
        if (!tx) return;
        const txn = (await provider.getTransaction(tx)) || {};

        const { to, data, hash } = txn;
        if (Object.keys(addresses).indexOf((to || '').toLowerCase()) < 0) {
          return;
        }

        const hex = await provider.getCode(to);
        const { from, gasUsed, status, logs } =
          (await provider.getTransactionReceipt(hash)) || {};

        if (!hex || hex === '0x') return;

        console.log('from:', from);
        console.log('contract:', addresses[to.toLowerCase()].name);
        console.log(
          'method:',
          util.inspect(addReadableValues(abiDecoder.decodeMethod(data)), {
            showHidden: true,
            depth: null
          })
        );
        // ensure any log not decoded is replaced with the original
        const decodedLogs = abiDecoder
          .decodeLogs(logs)
          .map((log, i) => log || logs[i]);
        console.log(
          'logs:',
          util.inspect(addReadableValues(decodedLogs), {
            showHidden: true,
            depth: null
          })
        );
        // console.log(util.inspect(logs, { showHidden: true, depth: null }));
        console.log('gasUsed:', gasUsed.toString());
        console.log('success:', status === 1 ? green('true') : red('false'));

        console.log(
          cyan(
            `https://${
              network === 'mainnet' ? '' : network + '.'
            }etherscan.io/tx/${hash}`
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

        // .then(response) => console.log(response.result[0].ContractName);
      });
    });
  });

program.parse(process.argv);
