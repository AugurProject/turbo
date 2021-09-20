// This file is updated by deployer.
import { AddressMapping } from "./constants";

export const addresses: AddressMapping = {
  137: {
    reputationToken: "0x435C88888388D73BD97dab3B3EE1773B084E0cdd",
    balancerFactory: "0x3eC09e2A4699951179B61c03434636746aBE61AA",
    marketFactories: [
      {
        type: "MMA",
        subtype: "V3",
        address: "0xdCabBAE1c5885134f42F05e60D67f6794f091732",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "0xaDC46f6b0bB03cC229Be56AFF70a8A4E012D812D",
        description: "mma/ufc",
        version: "v1.2.0",
        hasRewards: false,
      },
      {
        type: "NFL",
        subtype: "V3",
        address: "0xBDCE355234dd9d2CCE0912D6132F5Db70bC40287",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "0xaDC46f6b0bB03cC229Be56AFF70a8A4E012D812D",
        description: "nfl",
        version: "v1.2.0",
        hasRewards: false,
      },
      {
        type: "Crypto",
        subtype: "V3",
        address: "0x300d2D67ecB24E63f1bC2fAC4Bc0F314607aDDE5",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "0x96a6e9E91BDb0114C41bB9A389eD20F7FEcDCA03",
        description: "crypto prices",
        version: "v1.2.0",
        hasRewards: false,
      },
      {
        type: "SportsLink",
        subtype: "V2",
        address: "0xA76C803c1D3B4cc31b1B964f29357BbF23B6D6f7",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "0x1F26275cf999B33Eb39f304E622adbe0C5214Cbf",
        description: "mlb and nba",
        version: "v1.1.0",
        hasRewards: false,
      },
      {
        type: "MMALink",
        subtype: "V2",
        address: "0xe296e39b44911a7fd4C741daa4eFDd345bF5a076",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "0xAE9df5bf273bfF861174194ca190e99e95a15a26",
        description: "mma",
        version: "v1.1.0",
        hasRewards: false,
      },
      {
        type: "SportsLink",
        subtype: "V1",
        address: "0xEFA66e55707C43Db47D43fD65c2Ab4e861e989B6",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x63BBEEa5085E94D1F57A5938f9a22dd485572Bb3",
        fetcher: "",
        description: "mlb and nba",
        version: "v1.0.0",
        hasRewards: false,
      },
      {
        type: "Crypto",
        subtype: "V2",
        address: "0x8105DFaDBE4a09f52EbF98eB68e31a33C898Fc74",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "",
        description: "crypto prices",
        version: "v1.1.0",
        hasRewards: false,
      },
    ],
    info: { uploadBlockNumber: 15336699, graphName: "matic" },
  },
  31337: {
    reputationToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    balancerFactory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    marketFactories: [
      {
        type: "Futures",
        subtype: "V3",
        address: "0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0x9E545E3C0baAB3E08CdfD552C960A1050f373042",
        fetcher: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690",
        hasRewards: false,
        description: "futures",
        version: "FILL THIS OUT",
      },
      {
        type: "Crypto",
        subtype: "V3",
        address: "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0x9E545E3C0baAB3E08CdfD552C960A1050f373042",
        fetcher: "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
        hasRewards: false,
        description: "crypto prices",
        version: "FILL THIS OUT",
      },
      {
        type: "Futures",
        subtype: "V3",
        address: "0x67d269191c92Caf3cD7723F116c85e6E9bf55933",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690",
        fetcher: "0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E",
        hasRewards: false,
        description: "futures",
        version: "FILL THIS OUT",
      },
      {
        type: "NBA",
        subtype: "V3",
        address: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690",
        fetcher: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
        hasRewards: false,
        description: "nba",
        version: "FILL THIS OUT",
      },
    ],
    info: { uploadBlockNumber: 1, graphName: "" },
  },
  80001: {
    reputationToken: "0x1A921b8a13372Cc81A415d02627756b5418a71c9",
    balancerFactory: "0xE152327f9700F1733d12e7a507045FB4A4606C6F",
    marketFactories: [
      {
        type: "MLB",
        subtype: "V3",
        address: "0x2E90616F796ba8976B5A1216014Df6dEf29598E9",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xDcf4173FC3947bC2CbAB929559b7f38Cb25Bef34",
        fetcher: "0x76d9b64518623123936E07D10BF7C23063Fa66B5",
        hasRewards: true,
        masterChef: "0x2A8D1CDBaC136aB2984A13E36b39bC29d848fC14",
        description: "mlb",
        version: "FILL THIS OUT",
      },
      {
        type: "NBA",
        subtype: "V3",
        address: "0x902c96242D4483F8761DACa8A78152fcB7dAD0B6",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xDcf4173FC3947bC2CbAB929559b7f38Cb25Bef34",
        fetcher: "0x76d9b64518623123936E07D10BF7C23063Fa66B5",
        hasRewards: true,
        masterChef: "0x2A8D1CDBaC136aB2984A13E36b39bC29d848fC14",
        description: "nba",
        version: "FILL THIS OUT",
      },
      {
        type: "NFL",
        subtype: "V3",
        address: "0x31eBd440F52B537845126E9d013FEbD9E610F78A",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xDcf4173FC3947bC2CbAB929559b7f38Cb25Bef34",
        fetcher: "0x76d9b64518623123936E07D10BF7C23063Fa66B5",
        hasRewards: true,
        masterChef: "0x2A8D1CDBaC136aB2984A13E36b39bC29d848fC14",
        description: "nfl",
        version: "FILL THIS OUT",
      },
      {
        type: "MMA",
        subtype: "V3",
        address: "0x62a790F5A710f46d618fB0243Cb440ed13f02655",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xDcf4173FC3947bC2CbAB929559b7f38Cb25Bef34",
        fetcher: "0x76d9b64518623123936E07D10BF7C23063Fa66B5",
        hasRewards: true,
        masterChef: "0x2A8D1CDBaC136aB2984A13E36b39bC29d848fC14",
        description: "mma/ufc",
        version: "FILL THIS OUT",
      },
      {
        type: "Crypto",
        subtype: "V3",
        address: "0xDf73B0ed460242EB8203312871221F1eE0c82FF3",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xDcf4173FC3947bC2CbAB929559b7f38Cb25Bef34",
        fetcher: "0x85b39A6160cF9f15e539088F568a47f0CB641Ee4",
        hasRewards: true,
        masterChef: "0x2A8D1CDBaC136aB2984A13E36b39bC29d848fC14",
        description: "crypto prices",
        version: "FILL THIS OUT",
      },
    ],
    info: { uploadBlockNumber: 15336699, graphName: "mumbai" },
  },
};
