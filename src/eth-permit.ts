import { getChainId, call, signData, RSV } from './rpc';
import { hexToUtf8 } from './lib';

const MAX_INT = 100000000000000;

interface DaiPermitMessage {
  holder: string;
  spender: string;
  nonce: number;
  expiry: number | string;
  allowed?: boolean;
}

interface ERC2612PermitMessage {
  owner: string;
  spender: string;
  value: number | string;
  nonce: number | string;
  deadline: number | string;
}

interface Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const createTypedDaiData = (message: DaiPermitMessage, domain: Domain) => {
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

const createTypedERC2612Data = (message: ERC2612PermitMessage, domain: Domain) => {
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

const zeros = (numZeros: number) => ''.padEnd(numZeros, '0');

const getTokenName = async (provider: any, address: string) =>
  hexToUtf8((await call(provider, address, NAME_FN)).substr(130));


const getDomain = async (provider: any, token: string | Domain, version: string , name: string): Promise<Domain> => {
  if (typeof token !== 'string') {
    return token as Domain;
  }

  const tokenAddress = token as string;

  // const [name, chainId] = await Promise.all([
  //   getTokenName(provider, tokenAddress),
  //   getChainId(provider),
  // ]);
  if (name == 'DAI') {
    name = 'Dai Stablecoin'
  }else if (name == 'USDC') {
    name = 'USD Coin'
  }
  const domain: Domain = { name, version: version, chainId:1, verifyingContract: tokenAddress };
  return domain;
};

export const signDaiPermit = async (
  provider: any,
  token: string | Domain,
  holder: string,
  spender: string,
  expiry?: number,
  nonce?: number,
): Promise<DaiPermitMessage & RSV> => {
  const tokenAddress = (token as Domain).verifyingContract || token as string;
  let nonceTemp = 0;
  if (nonce === undefined) {
    nonceTemp = await call(provider, tokenAddress, `${NONCES_FN}${zeros(24)}${holder.substr(2)}`);
    nonceTemp = parseInt(nonceTemp+ '');
  }
  const message: DaiPermitMessage = {
    holder,
    spender,
    nonce: nonce === undefined ? nonceTemp : Number(nonce),
    expiry: expiry || MAX_INT,
    allowed: true,
  };

  const domain = await getDomain(provider, token , '1','DAI');
  const typedData = createTypedDaiData(message, domain);
  const sig = await signData(provider, holder, typedData);

  return { ...sig, ...message };
};

export const signERC2612Permit = async (
  provider: any,
  token: string | Domain,
  owner: string,
  spender: string,
  value: string | number = MAX_INT,
  deadline?: number,
  nonce?: number,
): Promise<ERC2612PermitMessage & RSV> => {
  const tokenAddress = (token as Domain).verifyingContract || token as string;
  let nonceTemp = 0;
  if (nonce === undefined) {
    nonceTemp = await call(provider, tokenAddress, `${NONCES_FN}${zeros(24)}${owner.substr(2)}`);
    nonceTemp = parseInt(nonceTemp+ '');
  }

  const message: ERC2612PermitMessage = {
    owner,
    spender,
    value,
    nonce: nonce === undefined ? nonceTemp : nonce,
    deadline: deadline || 3325150269000,
  };

  const domain = await getDomain(provider, token , '2','USDC');
  const typedData = createTypedERC2612Data(message, domain);
  const sig = await signData(provider, owner, typedData);

  return { ...sig, ...message };
};
