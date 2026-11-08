import { P } from "../../src/components/art/palette";
export default (
  <div className="gallery">
    <figure>
      <svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill={P.gold} stroke={P.outline} strokeWidth={3} /></svg>
      <figcaption style={{ fontFamily: "UnifrakturCook" }}>Court of the Internet</figcaption>
    </figure>
  </div>
);
