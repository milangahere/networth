import fs from "fs/promises";

// -----------------------------------------------------
// Types

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

type Token = {
  metaType: string;
  address: string;
  network: string;
  balance: string;
  balanceUSD: number;
  price: number;
  symbol: string;
};

type TokenBalance = {
  key: string;
  address: string;
  network: string;
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
  network: string;
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
  tokens: (Token & { token?: Token })[];
};

type Product = {
  assets: Asset[];
};

type AppBalance = {
  key: string;
  address: string;
  network: string;
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
  networks: string[];

  prices: Record<string, number>; // { SYMBOL: 9999 }
  balances: Record<string, number>; // { SYMBOL: 9999 }

  products: Record<string, { value: number; tokens: Record<string, number> }>;
};

type CommandLineArguments = {
  addresses: string[];
  balanceThreshold: number;
  dataFolderPath: string;
};

// -----------------------------------------------------
// Fetch

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

// -----------------------------------------------------
// Parse

function getNetWorth(portfolio: Portfolio, balanceThreshold: number): NetWorth {
  const netWorth: NetWorth = {
    networks: [],
    value: 0,
    prices: {},
    balances: {},
    products: {},
  };

  // Token balances
  for (const tokenBalance of portfolio.tokenBalances) {
    const { token } = tokenBalance;
    const { baseToken } = token;

    if (token.balanceUSD <= balanceThreshold) {
      continue;
    }

    updateNetworthNetworks(netWorth, tokenBalance.network);
    updateNetworthToken(
      netWorth,
      baseToken.symbol,
      baseToken.price,
      token.balance,
    );
    netWorth.value += token.balanceUSD;
  }

  // App (product) balances
  for (const appBalance of portfolio.appBalances) {
    if (appBalance.balanceUSD <= balanceThreshold) {
      continue;
    }

    if (!netWorth.products[appBalance.appName]) {
      netWorth.products[appBalance.appName] = { value: 0, tokens: {} };
    }

    for (const product of appBalance.products) {
      for (const asset of product.assets) {
        for (let { token, ...assetToken } of asset.tokens) {
          token = token || assetToken;

          updateNetworthToken(
            netWorth,
            token.symbol,
            token.price,
            Number(token.balance),
          );

          if (!netWorth.products[appBalance.appName].tokens[token.symbol]) {
            netWorth.products[appBalance.appName].tokens[token.symbol] = 0;
          }

          netWorth.products[appBalance.appName].tokens[token.symbol] += Number(
            token.balance,
          );
        }
      }
    }

    updateNetworthNetworks(netWorth, appBalance.network);
    netWorth.products[appBalance.appName].value += appBalance.balanceUSD;
    netWorth.value += appBalance.balanceUSD;
  }

  return netWorth;
}

function updateNetworthNetworks(netWorth: NetWorth, network: string) {
  if (!netWorth.networks.includes(network)) {
    netWorth.networks.push(network);
  }
}

function updateNetworthToken(
  netWorth: NetWorth,
  symbol: string,
  price: number,
  balance: number,
) {
  if (!symbol) {
    return;
  }

  if (!netWorth.prices[symbol]) {
    netWorth.prices[symbol] = price;

    if (balance) {
      netWorth.balances[symbol] = 0;
      netWorth.balances[symbol] += balance;
    }
  }
}

// -----------------------------------------------------
// Main

async function main() {
  const args = getCommandLineArgs();

  const portfolio = await getPorfolio(args.addresses);
  const netWorth = getNetWorth(portfolio, args.balanceThreshold);

  const prettyNetworth = JSON.stringify(netWorth, null, 2);
  console.log(prettyNetworth);

  if (args.dataFolderPath) {
    await fs.writeFile(
      `${args.dataFolderPath}/${getFilename()}.json`,
      prettyNetworth,
      "utf8",
    );
  }
}

function getFilename() {
  const date = new Date();
  const iso = date.toISOString().slice(0, 10);
  return `${iso}T${date.getHours()}:${date.getMinutes()}`;
}

function getCommandLineArgs(): CommandLineArguments {
  let addresses: string[] = [];
  let dataFolderPath: string = "";
  let balanceThreshold: number = 0;

  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split("=");
    if (key === "--addresses") {
      addresses = value.split(",");
    }

    if (key === "--dataFolder") {
      dataFolderPath = value;
    }

    if (key === "--balanceThreshold") {
      balanceThreshold = Number(value);
    }
  }

  if (addresses.length === 0) {
    console.error(`Missing command line argument --addreses

Example:
./networth --addresses=0xabcdea,0xdeadbeef`);
    process.exit(1);
  }

  return { addresses, dataFolderPath, balanceThreshold };
}

main();
