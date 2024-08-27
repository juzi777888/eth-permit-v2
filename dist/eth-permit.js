"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signERC2612Permit = exports.signDaiPermit = void 0;
const rpc_1 = require("./rpc");
const lib_1 = require("./lib");
const MAX_INT = 100000000000000;
const EIP712Domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
];
const createTypedDaiData = (message, domain) => {
    const typedData = {
        types: {
            EIP712Domain,
            Permit: [
                { name: "holder", type: "address" },
                { name: "spender", type: "address" },
                { name: "nonce", type: "uint256" },
                { name: "expiry", type: "uint256" },
                { name: "allowed", type: "bool" },
            ],
        },
        primaryType: "Permit",
        domain,
        message,
    };
    return typedData;
};
const createTypedERC2612Data = (message, domain) => {
    const typedData = {
        types: {
            EIP712Domain,
            Permit: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "value", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        },
        primaryType: "Permit",
        domain,
        message,
    };
    return typedData;
};
const NONCES_FN = '0x7ecebe00';
const NAME_FN = '0x06fdde03';
const zeros = (numZeros) => ''.padEnd(numZeros, '0');
const getTokenName = (provider, address) => __awaiter(void 0, void 0, void 0, function* () { return lib_1.hexToUtf8((yield rpc_1.call(provider, address, NAME_FN)).substr(130)); });
const getDomain = (provider, token, version, name) => __awaiter(void 0, void 0, void 0, function* () {
    if (typeof token !== 'string') {
        return token;
    }
    const tokenAddress = token;
    // const [name, chainId] = await Promise.all([
    //   getTokenName(provider, tokenAddress),
    //   getChainId(provider),
    // ]);
    if (name == 'DAI') {
        name = 'Dai Stablecoin';
    }
    else if (name == 'USDC') {
        name = 'USD Coin';
    }
    const domain = { name, version: version, chainId: 1, verifyingContract: tokenAddress };
    return domain;
});
exports.signDaiPermit = (provider, token, holder, spender, expiry, nonce) => __awaiter(void 0, void 0, void 0, function* () {
    const tokenAddress = token.verifyingContract || token;
    let nonceTemp = 0;
    if (nonce === undefined) {
        nonceTemp = yield rpc_1.call(provider, tokenAddress, `${NONCES_FN}${zeros(24)}${holder.substr(2)}`);
        nonceTemp = parseInt(nonceTemp + '');
    }
    const message = {
        holder,
        spender,
        nonce: nonce === undefined ? nonceTemp : Number(nonce),
        expiry: expiry || MAX_INT,
        allowed: true,
    };
    const domain = yield getDomain(provider, token, '1', 'DAI');
    const typedData = createTypedDaiData(message, domain);
    const sig = yield rpc_1.signData(provider, holder, typedData);
    return Object.assign(Object.assign({}, sig), message);
});
exports.signERC2612Permit = (provider, token, owner, spender, value = MAX_INT, deadline, nonce) => __awaiter(void 0, void 0, void 0, function* () {
    const tokenAddress = token.verifyingContract || token;
    let nonceTemp = 0;
    if (nonce === undefined) {
        nonceTemp = yield rpc_1.call(provider, tokenAddress, `${NONCES_FN}${zeros(24)}${owner.substr(2)}`);
        nonceTemp = parseInt(nonceTemp + '');
    }
    const message = {
        owner,
        spender,
        value,
        nonce: nonce === undefined ? nonceTemp : nonce,
        deadline: deadline || 3325150269000,
    };
    const domain = yield getDomain(provider, token, '2', 'USDC');
    const typedData = createTypedERC2612Data(message, domain);
    const sig = yield rpc_1.signData(provider, owner, typedData);
    return Object.assign(Object.assign({}, sig), message);
});
