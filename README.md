# Net worth

```bash
➜  ~ bun index.ts --addresses="0xabc,0xdeadbeef" --balanceThreshold=100 --dataFolder="./data"
```

`balanceThreshold` and `dataFolder` are optional

```bash
➜  ~ bun build ./index.ts --compile --outfile networth
➜  ~ ./networth --addresses="0xdeadbeef"
```
