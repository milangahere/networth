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

type Networth = {
  value: number;
  networks: string[];

  prices: Record<string, number>; // { SYMBOL: 9999 }
  balances: Record<string, number>; // { SYMBOL: 9999 }

  products: Record<string, { value: number; tokens: Record<string, number> }>;
};

type CommandLineArguments = {
  help: boolean;
  addresses: string[];
  balanceThreshold: number;
  dataFolderPath: string;
  format: boolean;
  only: string[];
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
  maximumFractionDigits: 2,
});

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

function getNetworth(portfolio: Portfolio, balanceThreshold: number): Networth {
  const networth: Networth = {
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

    updateNetworthNetworks(networth, tokenBalance.network);
    updateNetworthToken(
      networth,
      baseToken.symbol,
      baseToken.price,
      token.balance,
    );
    networth.value += token.balanceUSD;
  }

  // App (product) balances
  for (const appBalance of portfolio.appBalances) {
    if (appBalance.balanceUSD <= balanceThreshold) {
      continue;
    }

    if (!networth.products[appBalance.appName]) {
      networth.products[appBalance.appName] = { value: 0, tokens: {} };
    }

    for (const product of appBalance.products) {
      for (const asset of product.assets) {
        for (let { token, ...assetToken } of asset.tokens) {
          token = token || assetToken;

          updateNetworthToken(
            networth,
            token.symbol,
            token.price,
            Number(token.balance),
          );

          if (!networth.products[appBalance.appName].tokens[token.symbol]) {
            networth.products[appBalance.appName].tokens[token.symbol] = 0;
          }

          networth.products[appBalance.appName].tokens[token.symbol] += Number(
            token.balance,
          );
        }
      }
    }

    updateNetworthNetworks(networth, appBalance.network);
    networth.products[appBalance.appName].value += appBalance.balanceUSD;
    networth.value += appBalance.balanceUSD;
  }

  return networth;
}

function updateNetworthNetworks(networth: Networth, network: string) {
  if (!networth.networks.includes(network)) {
    networth.networks.push(network);
  }
}

function updateNetworthToken(
  networth: Networth,
  symbol: string,
  price: number,
  balance: number,
) {
  if (!symbol) {
    return;
  }

  if (!networth.prices[symbol]) {
    networth.prices[symbol] = price;
  }

  if (balance) {
    if (!networth.balances[symbol]) {
      networth.balances[symbol] = 0;
    }

    networth.balances[symbol] += balance;
  }
}

// -----------------------------------------------------
// Main

function printHelpText() {
  console.log(`Usage: networth [...flags]

Flags:
\t--addresses                 Comma separated list of addresses (can be a single one).                         --addresses=0xdeadbeef,0xdadefeeb
\t--balanceThreshold          A numeric value for the minimum balance in USD, less than that will be filtered. --balanceThreshold=200
\t--dataFolderPath            Folder path where to store the result of the run, it'll save it with the date of today as filename
\t--format                    Format the numbers in the result as your system base formatting. 10000 -> $10,000.00
\t--only                      Comma separated list of 
`);
}

async function main() {
  const args = getCommandLineArgs();

  if (args.help) {
    printHelpText();
    return;
  }

  const portfolio = await getPorfolio(args.addresses);
  const baseNetworth = getNetworth(portfolio, args.balanceThreshold);

  let networth: string | number | Networth | Record<string, string> =
    Object.assign({}, baseNetworth);

  if (args.format) {
    networth = formatObjectNumbers(networth);
  }

  if (args.only.length > 1) {
    networth = args.only.reduce((obj, key) => {
      obj[key] = networth[key];
      return obj;
    }, {});
  } else if (args.only.length == 1) {
    networth = networth[args.only[0]];
  } else {
  }

  const networthStr = JSON.stringify(networth, null, 2);

  if (args.dataFolderPath) {
    await fs.writeFile(
      `${args.dataFolderPath}/${getFilename()}.json`,
      networthStr,
      "utf8",
    );
  } else {
    console.log(networthStr);
  }
}

function formatObjectNumbers(obj: any): Record<string, string> {
  for (const key in obj) {
    if (typeof obj[key] === "object") {
      obj[key] = formatObjectNumbers(obj[key]);
    } else if (typeof obj[key] === "number") {
      const formatter = key === "value" ? usdFormatter : decimalFormatter;
      obj[key] = formatter.format(obj[key]);
    }
  }

  return obj;
}

function getFilename() {
  const date = new Date();
  const iso = date.toISOString().slice(0, 10);
  return `${iso}T${date.getHours()}:${date.getMinutes()}`;
}

function getCommandLineArgs(): CommandLineArguments {
  let help: boolean = false;
  let addresses: string[] = [];
  let dataFolderPath: string = "";
  let balanceThreshold: number = 0;
  let format: boolean = false;
  let only: string[] = [];

  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split("=");

    if (key === "--help") {
      help = true;
    }

    if (key === "--addresses") {
      addresses = value.split(",");
    }

    if (key === "--dataFolder") {
      dataFolderPath = value;
    }

    if (key === "--balanceThreshold") {
      balanceThreshold = Number(value);
    }

    if (key === "--format") {
      format = true;
    }

    if (key === "--only") {
      only = value.split(",");
    }
  }

  if (!help && addresses.length === 0) {
    console.error(`Missing command line argument --addreses.

Run ./networth --help for more info`);
    process.exit(1);
  }

  return { help, addresses, dataFolderPath, balanceThreshold, format, only };
}

main();
