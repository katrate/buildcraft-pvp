import { Icon } from '@iconify/react';
import type { IconifyIcon } from '@iconify/react';
import type { CSSProperties, JSX } from 'react';

// ------------------------------------------------------------
// Iconify icon registry.
// Every icon is a bundled JSON icon from @iconify-icons/mdi (Material Design
// Icons) — imported individually so only used icons ship in the bundle, with
// zero runtime network requests. All names verified to exist in the package.
// ------------------------------------------------------------

import account from '@iconify-icons/mdi/account';
import alert from '@iconify-icons/mdi/alert';
import arrowDownBold from '@iconify-icons/mdi/arrow-down-bold';
import arrowLeft from '@iconify-icons/mdi/arrow-left';
import backpack from '@iconify-icons/mdi/backpack';
import battery from '@iconify-icons/mdi/battery';
import bottleTonic from '@iconify-icons/mdi/bottle-tonic';
import bottleTonicPlus from '@iconify-icons/mdi/bottle-tonic-plus';
import boxingGlove from '@iconify-icons/mdi/boxing-glove';
import bullhorn from '@iconify-icons/mdi/bullhorn';
import cactus from '@iconify-icons/mdi/cactus';
import cart from '@iconify-icons/mdi/cart';
import check from '@iconify-icons/mdi/check';
import chiliMild from '@iconify-icons/mdi/chili-mild';
import circleSlice8 from '@iconify-icons/mdi/circle-slice-8';
import close from '@iconify-icons/mdi/close';
import crown from '@iconify-icons/mdi/crown';
import cog from '@iconify-icons/mdi/cog';
import coins from '@iconify-icons/mdi/coins';
import cubeOutline from '@iconify-icons/mdi/cube-outline';
import emoticonAngry from '@iconify-icons/mdi/emoticon-angry';
import fire from '@iconify-icons/mdi/fire';
import flaskRoundBottom from '@iconify-icons/mdi/flask-round-bottom';
import hammer from '@iconify-icons/mdi/hammer';
import handshake from '@iconify-icons/mdi/handshake';
import heart from '@iconify-icons/mdi/heart';
import heartMultiple from '@iconify-icons/mdi/heart-multiple';
import heartPulse from '@iconify-icons/mdi/heart-pulse';
import lightningBolt from '@iconify-icons/mdi/lightning-bolt';
import lock from '@iconify-icons/mdi/lock';
import logout from '@iconify-icons/mdi/logout';
import magnify from '@iconify-icons/mdi/magnify';
import meteor from '@iconify-icons/mdi/meteor';
import necklace from '@iconify-icons/mdi/necklace';
import partyPopper from '@iconify-icons/mdi/party-popper';
import pencil from '@iconify-icons/mdi/pencil';
import play from '@iconify-icons/mdi/play';
import progressClock from '@iconify-icons/mdi/progress-clock';
import refresh from '@iconify-icons/mdi/refresh';
import reply from '@iconify-icons/mdi/reply';
import robot from '@iconify-icons/mdi/robot';
import run from '@iconify-icons/mdi/run';
import shield from '@iconify-icons/mdi/shield';
import shieldAlert from '@iconify-icons/mdi/shield-alert';
import shieldCheck from '@iconify-icons/mdi/shield-check';
import shieldOutline from '@iconify-icons/mdi/shield-outline';
import shieldPlus from '@iconify-icons/mdi/shield-plus';
import shieldRefresh from '@iconify-icons/mdi/shield-refresh';
import skull from '@iconify-icons/mdi/skull';
import snail from '@iconify-icons/mdi/snail';
import squareRounded from '@iconify-icons/mdi/square-rounded';
import star from '@iconify-icons/mdi/star';
import starFourPoints from '@iconify-icons/mdi/star-four-points';
import starShooting from '@iconify-icons/mdi/star-shooting';
import sword from '@iconify-icons/mdi/sword';
import swordCross from '@iconify-icons/mdi/sword-cross';
import testTube from '@iconify-icons/mdi/test-tube';
import trophy from '@iconify-icons/mdi/trophy';
import tshirtCrew from '@iconify-icons/mdi/tshirt-crew';
import volcano from '@iconify-icons/mdi/volcano';
import waterDrop from '@iconify-icons/mdi/water-drop';
import weatherWindy from '@iconify-icons/mdi/weather-windy';
import wrench from '@iconify-icons/mdi/wrench';

export const ICONS = {
  account,
  alert,
  arrowDownBold,
  arrowLeft,
  backpack,
  battery,
  bottleTonic,
  bottleTonicPlus,
  boxingGlove,
  bullhorn,
  cactus,
  cart,
  check,
  chiliMild,
  circleSlice8,
  close,
  cog,
  crown,
  coins,
  cubeOutline,
  emoticonAngry,
  fire,
  flaskRoundBottom,
  hammer,
  handshake,
  heart,
  heartMultiple,
  heartPulse,
  lightningBolt,
  lock,
  logout,
  magnify,
  meteor,
  necklace,
  partyPopper,
  pencil,
  play,
  progressClock,
  refresh,
  reply,
  robot,
  run,
  shield,
  shieldAlert,
  shieldCheck,
  shieldOutline,
  shieldPlus,
  shieldRefresh,
  skull,
  snail,
  squareRounded,
  star,
  starFourPoints,
  starShooting,
  sword,
  swordCross,
  testTube,
  trophy,
  tshirtCrew,
  volcano,
  waterDrop,
  weatherWindy,
  wrench,
} satisfies Record<string, IconifyIcon>;

export type IconName = keyof typeof ICONS;

/**
 * Render an Iconify icon inline with the current text size/color.
 * Use `<I n="sword" />` anywhere an emoji used to be.
 */
export function I(props: {
  n: IconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
}): JSX.Element {
  const { n, size = '1em', className, style } = props;
  return (
    <Icon
      icon={ICONS[n]}
      width={size}
      height={size}
      inline
      className={className}
      style={{ verticalAlign: '-0.15em', ...style }}
    />
  );
}
