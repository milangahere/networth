# Networth

Uses http://zapper.xyz API (which by the looks of it seems to be using a GraphQL service like https://thegraph.com/) to gather the networth of set of addresses and prints it to the console.
It's functionally the same as going to either http://zapper.xyz/account/{ADDRESS} or http://zapper.xyz/bundle/{ADDRESS1},{ADDRESS2},{...}, but printing it to the terminal allows to pipe it to whatever you need, which is hard to do otherwise.

For example, you could setup a crontab like:

```bash
crontab -e

# Save a file to /DESKTOP/NET_WORTH every day at 10am, 6pm and 2am. Uses https://bun.sh/ to run the Typescript file
0 10,18,2 * * * /usr/local/bin/bun /PATH/TO/NETWORTH/index.ts --addresses="0xdeadbeef,0x123123" --dataFolder="/DESKTOP/NET_WORTH" --balanceThreshold=100
```

so you have a historical view of those red candles.

## Build

The `dist` folder has a binary with the latest build it's built using [Bun](https://bun.sh/) like this `bun build ./index.ts --compile --outfile networth`.
You can move that binary to your `bin` folder and run it by calling `networth`.

```bash
➜  ~ # download repo
➜  ~ mv dist/networth /usr/bin
➜  ~ networth --addresses="0xdeadbeef"

# OR

➜  ~ bun build ./index.ts --compile --outfile networth
➜  ~ ./networth --addresses="0xdeadbeef"
```

## Run

```bash
➜  ~ networth --addrees="0xyour_address,(...)"
# Prints a JSON with the results for you address(es)
```

For a list of flags and what they do, run `help`

```bash
➜  ~ networth --help
# Get a list of possible flags
```
