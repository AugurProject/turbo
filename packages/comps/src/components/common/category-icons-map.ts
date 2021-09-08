import { FINANCE, REP } from "../../utils/constants";
import {
  MedicalIcon,
  PoliticsIcon,
  USPoliticsIcon,
  WorldPoliticsIcon,
  EntertainmentIcon,
  FinanceIcon,
  CryptoIcon,
  SportsIcon,
  EntertainmentAwardsIcon,
  EntertainmentMoviesIcon,
  EntertainmentSocialMediaIcon,
  GolfIcon,
  TennisIcon,
  BasketballIcon,
  HorseRacingIcon,
  SoccerIcon,
  FootballIcon,
  HockeyIcon,
  OlympicIcon,
  BaseballIcon,
  BoxingIcon,
  MMAIcon,
  CarRacingIcon,
  BTCIcon,
  ETHIcon,
  COMPIcon,
  BALIcon,
  REPV2Icon,
  MKRIcon,
  LINKIcon,
  ZRXIcon,
  AMPLIcon,
  LTCIcon,
  AdditionalCryptoIcon,
  WETHIcon,
  ETCIcon,
  ATOMIcon,
  ALGOIcon,
  DASHIcon,
  EOSIcon,
  KNCIcon,
  OMGIcon,
  OXTIcon,
  XLMIcon,
  XRPIcon,
  XTZIcon,
  USDTIcon,
  ADAIcon,
  DOGEIcon,
  MATICIcon,
} from "./category-icons";
import { AugurBlankIcon } from "./icons";
// SUB CATEGORIES
// MEDICAL
// POLITICS
// ENTERTAINMENT
// FINANCE
// CRYPTO
// SPORTS

const WETH: string = "WETH";
const ETC: string = "ETC";
const ATOM: string = "ATOM";
const ALGO: string = "ALGO";
const DASH: string = "DASH";
const EOS: string = "EOS";
const KNC: string = "KNC";
const OMG: string = "OMG";
const OXT: string = "OXT";
const XLM: string = "XLM";
const XRP: string = "XRP";
const XTZ: string = "XTZ";
const USDT: string = "USDT";
const SPORTS = "Sports";
const POLITICS = "Politics";
const ECONOMICS = "Economics";
const ENTERTAINMENT = "Entertainment";
const CRYPTO = "Crypto";
const MEDICAL = "Medical";
const SOCCER = "Football (Soccer)";
const AMERICAN_FOOTBALL = "American Football";
const OLYMPICS = "Olympics";
const BASEBALL = "Baseball";
const GOLF = "Golf";
const MMA = "MMA";
const BOXING = "Boxing";
const CAR_RACING = "Car Racing";
const BASKETBALL = "Basketball";
const TENNIS = "Tennis";
const HOCKEY = "Hockey";
const HORSE_RACING = "Horse Racing";
const US_POLITICS = "US Politics";
const WORLD = "World";
const BITCOIN = "Bitcoin";
const BTC = "BTC";
const ETHEREUM = "Ethereum";
const ETH = "ETH";
const LITECOIN = "Litecoin";
const LTC = "LTC";
const AUGUR = "Augur";
const MAKER = "Maker";
const MKR = "MKR";
const AMPLE = "Ample";
const AMPL = "AMPL";
const COMPOUND = "Compound";
const COMP = "COMP";
const BALANCER = "Balancer";
const BAL = "BAL";
const ZEROX = "0x";
const CHAINLINK = "Chainlink";
const LINK = "LINK";
const ADDITIONAL_TOKENS = "Additional Tokens";
const AWARDS = "Awards";
const TV_MOVIES = "TV & Movies";
const SOCIAL_MEDIA = "Social Media";
const DOGE = "DOGE";
const ADA = "ADA";
const MATIC = "MATIC";

export const CATEGORIES_ICON_MAP = {
  [CRYPTO.toLowerCase()]: {
    icon: CryptoIcon,
    subOptions: {
      [ADDITIONAL_TOKENS.toLowerCase()]: { icon: AdditionalCryptoIcon },
      [ALGO.toLowerCase()]: { icon: ALGOIcon },
      [AMPLE.toLowerCase()]: { icon: AMPLIcon },
      [AMPL.toLowerCase()]: { icon: AMPLIcon },
      [ATOM.toLowerCase()]: { icon: ATOMIcon },
      [AUGUR.toLowerCase()]: { icon: REPV2Icon },
      [REP.toLowerCase()]: { icon: REPV2Icon },
      [BALANCER.toLowerCase()]: { icon: BALIcon },
      [BAL.toLowerCase()]: { icon: BALIcon },
      [BITCOIN.toLowerCase()]: { icon: BTCIcon },
      [BTC.toLowerCase()]: { icon: BTCIcon },
      [CHAINLINK.toLowerCase()]: { icon: LINKIcon },
      [LINK.toLowerCase()]: { icon: LINKIcon },
      [COMPOUND.toLowerCase()]: { icon: COMPIcon },
      [COMP.toLowerCase()]: { icon: COMPIcon },
      [DASH.toLowerCase()]: { icon: DASHIcon },
      [EOS.toLowerCase()]: { icon: EOSIcon },
      [ETC.toLowerCase()]: { icon: ETCIcon },
      [ETHEREUM.toLowerCase()]: { icon: ETHIcon },
      [ETH.toLowerCase()]: { icon: ETHIcon },
      [KNC.toLowerCase()]: { icon: KNCIcon },
      [LITECOIN.toLowerCase()]: { icon: LTCIcon },
      [LTC.toLowerCase()]: { icon: LTCIcon },
      [MAKER.toLowerCase()]: { icon: MKRIcon },
      [MKR.toLowerCase()]: { icon: MKRIcon },
      [OMG.toLowerCase()]: { icon: OMGIcon },
      [OXT.toLowerCase()]: { icon: OXTIcon },
      [USDT.toLowerCase()]: { icon: USDTIcon },
      [WETH.toLowerCase()]: { icon: WETHIcon },
      [XLM.toLowerCase()]: { icon: XLMIcon },
      [XRP.toLowerCase()]: { icon: XRPIcon },
      [XTZ.toLowerCase()]: { icon: XTZIcon },
      [ZEROX.toLowerCase()]: { icon: ZRXIcon },
      [DOGE.toLowerCase()]: { icon: DOGEIcon },
      [ADA.toLowerCase()]: { icon: ADAIcon },
      [MATIC.toLowerCase()]: { icon: MATICIcon },
    },
  },
  [ECONOMICS.toLowerCase()]: { icon: FinanceIcon, subOptions: {} },
  [ENTERTAINMENT.toLowerCase()]: {
    icon: EntertainmentIcon,
    subOptions: {
      [AWARDS.toLowerCase()]: { icon: EntertainmentAwardsIcon },
      [SOCIAL_MEDIA.toLowerCase()]: { icon: EntertainmentSocialMediaIcon },
      [TV_MOVIES.toLowerCase()]: { icon: EntertainmentMoviesIcon },
    },
  },
  [FINANCE.toLowerCase()]: { icon: FinanceIcon, subOptions: {} },
  [MEDICAL.toLowerCase()]: {
    icon: MedicalIcon,
    subOptions: {},
  },
  [POLITICS.toLowerCase()]: {
    icon: PoliticsIcon,
    subOptions: {
      [US_POLITICS.toLowerCase()]: { icon: USPoliticsIcon },
      [WORLD.toLowerCase()]: { icon: WorldPoliticsIcon },
    },
  },
  [SPORTS.toLowerCase()]: {
    icon: SportsIcon,
    subOptions: {
      [AMERICAN_FOOTBALL.toLowerCase()]: { icon: FootballIcon },
      [BASEBALL.toLowerCase()]: { icon: BaseballIcon },
      [BASKETBALL.toLowerCase()]: { icon: BasketballIcon },
      [BOXING.toLowerCase()]: { icon: BoxingIcon },
      [CAR_RACING.toLowerCase()]: { icon: CarRacingIcon },
      [GOLF.toLowerCase()]: { icon: GolfIcon },
      [HOCKEY.toLowerCase()]: { icon: HockeyIcon },
      [HORSE_RACING.toLowerCase()]: { icon: HorseRacingIcon },
      [MMA.toLowerCase()]: { icon: MMAIcon },
      [OLYMPICS.toLowerCase()]: { icon: OlympicIcon },
      [SOCCER.toLowerCase()]: { icon: SoccerIcon },
      [TENNIS.toLowerCase()]: { icon: TennisIcon },
    },
  },
};

export const getCategoryIconLabel = (categories: Array<string>) => {
  const prime = CATEGORIES_ICON_MAP[categories[0]?.toLowerCase()];
  const secondary = prime?.subOptions[categories[1]?.toLowerCase()];
  const icon = secondary?.icon ? secondary.icon : prime?.icon ? prime.icon : AugurBlankIcon;
  const label = categories[categories.length - 1];
  return { icon, label };
};
