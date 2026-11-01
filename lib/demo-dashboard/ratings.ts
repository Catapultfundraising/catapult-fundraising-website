// Example committee prospect-rating roll-up for the fictional sample dashboard. Answers follow the
// real rating form: A = primary solicitor, B = secondary solicitor, C = can open the door, D = don't know.
import { DEMO_DONORS } from "./data";

export const RATING_MEMBERS = ["Dana Whitlock", "Marcus Ellery", "Priya Ostrander", "Tom Brightwell", "Celia Marchetti", "Owen Strand"];
export const RATING_DONE = 4;
const COMMENTS = ["Knows the family through the gallery board.", "Prefers to be approached by a peer, not staff.", "Recently sold a business; timing may be good.", "Met at the spring preview; very engaged.", "", "Would want naming recognition discussed early."];

export function exampleRatings() {
  return DEMO_DONORS.filter((d) => d.ask && !d.pledge).slice(0, 10).map((d, i) => {
    const a = i % 4 === 0 ? 1 : 0, b = i % 3 === 0 ? 1 : 0, c = 1 + (i % 2);
    return { d, a, b, c, dk: RATING_DONE - a - b - c, comments: [COMMENTS[i % 6], COMMENTS[(i + 3) % 6]].filter(Boolean).join(" / ") };
  });
}
