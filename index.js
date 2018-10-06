'use strict'

const ethers = require('ethers');

const provider = ethers.getDefaultProvider();

provider.on({address:'0x57ab1e02fee23774580c119740129eac7081e9d3'}, log => {
        console.log(log);
    }
);