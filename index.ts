type Network =
  | "ETHEREUM_MAINNET"
  | "POLYGON_MAINNET"
  | "BASE_MAINNET"
  | "BINANCE_SMART_CHAIN_MAINNET";
// | etc

type BaseToken = {
  id: string;
  name: string;
  label: string;
  symbol: string;
  address: string;
  decimals: number;
  price: number;
  verified: boolean;
  imgUrl: string;
};

type TokenBalance = {
  key: string;
  address: string;
  network: Network;
  updatedAt: number;
  token: {
    balance: number;
    balanceUSD: number;
    balanceRaw: string;
    baseToken: BaseToken;
  };
};

type Asset = {
  __typename: string;
  key: null;
  address: string;
  network: Network;
  appId: string;
  groupId: string;
  groupLabel: string;
  balance: string;
  balanceUSD: number;
  price: number;
  symbol: string;
  decimals: number;
  supply: number;
  pricePerShare: number[];
  tokens: BaseToken[];
};

type Product = {
  assets: Asset[];
};

type AppBalance = {
  key: string;
  address: string;
  network: Network;
  updatedAt: number;
  balanceUSD: number;
  appName: string;
  appId: string;
  products: Product[];
};

type Portfolio = {
  tokenBalances: TokenBalance[];
  appBalances: AppBalance[];
};

type PortfolioResponse = {
  data: {
    portfolio: Portfolio;
  };
};

type NetWorth = {
  value: number;
  tokens: BaseToken[];
  byToken: {
    value: number;
    token: BaseToken;
  };
};

function getQuery(addresses: string[]): string {
  const addressesStr = addresses.map((address) => `"${address}"`).join(",");

  return `
{
  "id": "providerPorfolioQuery",
  "query": "query providerPorfolioQuery(\\n  $addresses: [Address!]!\\n  $networks: [Network!]!\\n  $withOverrides: Boolean\\n) {\\n  portfolio(addresses: $addresses, networks: $networks, withOverrides: $withOverrides) {\\n    proxies {\\n      address\\n      owner {\\n        address\\n        id\\n      }\\n      app {\\n        id\\n        displayName\\n        imgUrl\\n      }\\n    }\\n    tokenBalances {\\n      key\\n      address\\n      network\\n      updatedAt\\n      token {\\n        balance\\n        balanceUSD\\n        balanceRaw\\n        baseToken {\\n          name\\n          label\\n          symbol\\n          address\\n          decimals\\n          price\\n          verified\\n          imgUrl\\n          id\\n        }\\n      }\\n    }\\n    appBalances {\\n      key\\n      address\\n      network\\n      updatedAt\\n      balanceUSD\\n      appName\\n      appId\\n      products {\\n        assets {\\n          __typename\\n          ... on AppTokenPositionBalance {\\n            __typename\\n            key\\n            address\\n            network\\n            appId\\n            groupId\\n            groupLabel\\n            balance\\n            balanceUSD\\n            price\\n            symbol\\n            decimals\\n            supply\\n            pricePerShare\\n            tokens {\\n              __typename\\n              address\\n              network\\n              balance\\n              balanceUSD\\n              price\\n              symbol\\n            }\\n          }\\n          ... on ContractPositionBalance {\\n            __typename\\n            key\\n            address\\n            network\\n            appId\\n            groupId\\n            groupLabel\\n            balanceUSD\\n            tokens {\\n              metaType\\n              token {\\n                __typename\\n                ... on NonFungiblePositionBalance {\\n                  __typename\\n                  address\\n                  balance\\n                  balanceUSD\\n                  network\\n                  symbol\\n                }\\n                ... on BaseTokenPositionBalance {\\n                  __typename\\n                  address\\n                  balance\\n                  balanceUSD\\n                  network\\n                  symbol\\n                }\\n                ... on AppTokenPositionBalance {\\n                  __typename\\n                  address\\n                  balance\\n                  balanceUSD\\n                  network\\n                  symbol\\n                }\\n              }\\n            }\\n          }\\n        }\\n      }\\n    }\\n    nftBalances {\\n      balanceUSD\\n      network\\n    }\\n  }\\n}\\n",
  "variables": {
    "addresses": [
      ${addressesStr}
    ],
    "networks": [
      "APECHAIN_MAINNET",
      "ARBITRUM_MAINNET",
      "AVALANCHE_MAINNET",
      "BASE_MAINNET",
      "BINANCE_SMART_CHAIN_MAINNET",
      "BITCOIN_MAINNET",
      "BLAST_MAINNET",
      "CELO_MAINNET",
      "DEGEN_MAINNET",
      "ETHEREUM_MAINNET",
      "FANTOM_OPERA_MAINNET",
      "GNOSIS_MAINNET",
      "LINEA_MAINNET",
      "MANTLE_MAINNET",
      "METIS_MAINNET",
      "MODE_MAINNET",
      "MOONBEAM_MAINNET",
      "MORPH_MAINNET",
      "OPBNB_MAINNET",
      "OPTIMISM_MAINNET",
      "POLYGON_MAINNET",
      "SCROLL_MAINNET",
      "SHAPE_MAINNET",
      "SOLANA_MAINNET",
      "WORLDCHAIN_MAINNET",
      "ZKSYNC_MAINNET",
      "ZORA_MAINNET"
    ],
    "withOverrides": false
  }
}`;
}

async function getPorfolio(addresses: string[]): Promise<Portfolio> {
  const response = await fetch("https://zapper.xyz/z/graphql", {
    headers: {
      accept: "application/json",
      "cache-control": "no-cache",
      "content-type": "application/json",
    },
    referrer: "https://zapper.xyz/",
    referrerPolicy: "strict-origin-when-cross-origin",
    body: getQuery(addresses),
    method: "POST",
    mode: "cors",
    credentials: "include",
  });
  const json = (await response.json()) as PortfolioResponse;
  return json.data.portfolio;
}

function getNetWorth(portfolio: Portfolio): number {
  let netWorth = 0;
  for (const tokenBalance of portfolio.tokenBalances) {
    const { token } = tokenBalance;
    if (token.balanceUSD > 20) {
      netWorth += token.balanceUSD;
    }
  }

  for (const appBalance of portfolio.appBalances) {
    if (appBalance.balanceUSD > 20) {
      netWorth += appBalance.balanceUSD;
    }
  }

  return netWorth;
}

async function main() {
  const args = getCommandLineArgs();

  const portfolio = await getPorfolio(args.addresses);
  const netWorth = getNetWorth(portfolio);

  console.log(netWorth);
}

type CommandLineArguments = {
  addresses: string[];
};

function getCommandLineArgs(): CommandLineArguments {
  let addresses: string[] = [];

  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split("=");
    if (key === "--addresses") {
      addresses = value.split(",");
    }
  }

  if (addresses.length === 0) {
    console.error(`Missing command line argument --addreses

Example:
./networth --addresses=0xabcdea,0xdeadbeef`);
    process.exit(1);
  }

  return {
    addresses,
  };
}

main();

/*
  Add values via command-line or file
  Addresses via command line
*/
