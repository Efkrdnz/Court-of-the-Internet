import type { ReactNode } from "react";
import { CATEGORIES } from "../../src/lib/categories";
import * as Props from "../../src/components/art/props";
import {
  CategoryIcon,
  Crest,
  EvidenceFolder,
  FlourishDivider,
  Gavel,
  Laurel,
  OrnateCorner,
  Scales,
  VerdictStamp,
  WaxSeal,
  Wordmark,
} from "../../src/components/art/props";

const Fig = ({ cap, w, children }: { cap: string; w?: number; children: ReactNode }) => (
  <figure style={{ width: w }}>
    {children}
    <figcaption>{cap}</figcaption>
  </figure>
);

const icons = Object.entries(Props).filter(([k]) => k.startsWith("Icon")) as [string, (p: { className?: string }) => ReactNode][];

const Row = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-end", width: "100%" }}>{children}</div>
);

export default (
  <div className="gallery" style={{ flexDirection: "column", alignItems: "flex-start" }}>
    <style>{`.gallery figure > svg{width:100%;height:auto;display:block}`}</style>
    <Row>
      {(["GUILTY", "NOT_GUILTY", "MISTRIAL", "DISMISSED"] as const).map((v) => (
        <Fig key={v} cap={`VerdictStamp ${v}`} w={300}>
          <VerdictStamp verdict={v} />
        </Fig>
      ))}
      <Fig cap="VerdictStamp small (140px)" w={140}>
        <VerdictStamp verdict="NOT_GUILTY" />
      </Fig>
    </Row>
    <Row>
      {(["burgundy", "gold", "teal"] as const).map((c, i) => (
        <Fig key={c} cap={`WaxSeal ${c} / ${(["scales", "gavel", "pizza"] as const)[i]}`} w={150}>
          <WaxSeal color={c} emblem={(["scales", "gavel", "pizza"] as const)[i]} />
        </Fig>
      ))}
      <Fig cap="WaxSeal burgundy / crown" w={150}>
        <WaxSeal emblem="crown" />
      </Fig>
      <Fig cap="WaxSeal 56px" w={56}>
        <WaxSeal emblem="pizza" color="gold" />
      </Fig>
      <Fig cap="Gavel" w={230}>
        <Gavel />
      </Fig>
      <Fig cap="Gavel slam (impact)" w={230}>
        <Gavel slam />
      </Fig>
    </Row>
    <Row>
      <Fig cap="EvidenceFolder" w={240}>
        <EvidenceFolder />
      </Fig>
      <Fig cap="EvidenceFolder open, label" w={240}>
        <EvidenceFolder open label="EXHIBIT B-12" />
      </Fig>
      <Fig cap="Crest" w={220}>
        <Crest />
      </Fig>
      <Fig cap="Crest 64px" w={64}>
        <Crest />
      </Fig>
      <Fig cap="Wordmark" w={460}>
        <Wordmark />
      </Fig>
    </Row>
    <Row>
      {CATEGORIES.map((c) => (
        <Fig key={c.key} cap={c.key} w={96}>
          <CategoryIcon category={c.key} className="ci" />
          <style>{`.ci{width:64px;height:64px}`}</style>
        </Fig>
      ))}
      <Fig cap="unknown → misc" w={96}>
        <CategoryIcon category="nope" className="ci" />
      </Fig>
    </Row>
    <Row>
      {CATEGORIES.map((c) => (
        <CategoryIcon key={c.key} category={c.key} className="ci32" />
      ))}
      <style>{`.ci32{width:32px;height:32px}`}</style>
    </Row>
    <Row>
      <Fig cap="OrnateCorner tl/tr/bl/br" w={260}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, width: 240 }}>
          <OrnateCorner position="tl" />
          <OrnateCorner position="tr" />
          <OrnateCorner position="bl" />
          <OrnateCorner position="br" />
        </div>
      </Fig>
      <Fig cap="FlourishDivider" w={420}>
        <FlourishDivider />
      </Fig>
      <Fig cap="Laurel left / right" w={150}>
        <div style={{ display: "flex", width: 150 }}>
          <Laurel side="left" />
          <Laurel side="right" />
        </div>
      </Fig>
      {(["left", "level", "right"] as const).map((t) => (
        <Fig key={t} cap={`Scales ${t}`} w={160}>
          <Scales tilt={t} />
        </Fig>
      ))}
    </Row>
    <Row>
      {icons.map(([name, C]) => (
        <Fig key={name} cap={name.replace("Icon", "")} w={96}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <C className="i24" />
            <C className="i48" />
          </div>
        </Fig>
      ))}
      <style>{`.i24{width:24px;height:24px}.i48{width:48px;height:48px}`}</style>
    </Row>
  </div>
);
