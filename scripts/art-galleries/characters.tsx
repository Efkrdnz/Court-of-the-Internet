import type { ReactNode } from "react";
import {
  BailiffBulldog,
  CatJury,
  CryingPizza,
  HamsterDefendant,
  JudgeOwl,
  PigeonAttorney,
  RaccoonProsecutor,
} from "../../src/components/art/characters";

const fig = (node: ReactNode, caption: string, w = 220) => (
  <figure key={caption} style={{ width: w }}>
    {node}
    <figcaption>{caption}</figcaption>
  </figure>
);

export default (
  <div className="gallery">
    {fig(<JudgeOwl />, "JudgeOwl (stern)")}
    {fig(<JudgeOwl mood="shocked" />, "JudgeOwl shocked")}
    {fig(<JudgeOwl mood="sleepy" />, "JudgeOwl sleepy")}
    {fig(<PigeonAttorney />, "PigeonAttorney")}
    {fig(<RaccoonProsecutor />, "RaccoonProsecutor")}
    {fig(<HamsterDefendant />, "HamsterDefendant")}
    {fig(<HamsterDefendant nervous />, "HamsterDefendant nervous")}
    {fig(<BailiffBulldog />, "BailiffBulldog", 260)}
    {fig(<CryingPizza />, "CryingPizza")}
    {fig(<CatJury />, "CatJury judging", 330)}
    {fig(<CatJury mood="shocked" />, "CatJury shocked", 330)}
    {fig(<CatJury mood="asleep" />, "CatJury asleep", 330)}
    {fig(<CatJury mood="approving" />, "CatJury approving", 330)}
    {fig(<CatJury count={6} />, "CatJury count=6 judging", 330)}
    {fig(<CatJury count={6} mood="shocked" />, "CatJury count=6 shocked", 330)}
    {fig(<CatJury count={6} mood="asleep" />, "CatJury count=6 asleep", 330)}
    <figure style={{ width: "100%", margin: 0 }}>
      <figcaption>with className=&quot;chr-sticker&quot; (recommended on dark backgrounds)</figcaption>
    </figure>
    {fig(<JudgeOwl className="chr-sticker" />, "JudgeOwl sticker", 180)}
    {fig(<PigeonAttorney className="chr-sticker" />, "PigeonAttorney sticker", 180)}
    {fig(<RaccoonProsecutor className="chr-sticker" />, "RaccoonProsecutor sticker", 180)}
    {fig(<HamsterDefendant className="chr-sticker" />, "HamsterDefendant sticker", 180)}
    {fig(<BailiffBulldog className="chr-sticker" />, "BailiffBulldog sticker", 220)}
    {fig(<CryingPizza className="chr-sticker" />, "CryingPizza sticker", 180)}
    {fig(<CatJury className="chr-sticker" mood="approving" />, "CatJury sticker", 300)}
  </div>
);
