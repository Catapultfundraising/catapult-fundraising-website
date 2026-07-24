import type { ContentBlock } from "@/components/content-blocks";

export interface CaseStudy {
  slug: string;
  title: string;
  sector: string;
  summary: string;
  stats: { value: string; label: string }[];
  content: ContentBlock[];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "legacy-call-northeast-university",
    title:
      "Catapult Fundraising's Legacy Call Program Secures Over $4.8 Million in Confirmed Planned Gifts for a Prestigious Northeast University",
    sector: "Higher Education · Legacy & Planned Giving",
    summary:
      "A 500-donor Legacy Call telephone outreach program confirmed 50 planned gifts totaling $4,894,000, with an additional $328,500 in gift potential identified among the university's most loyal donors.",
    stats: [
      { value: "500", label: "Loyal donors contacted" },
      { value: "116", label: "Expressed planned-giving interest" },
      { value: "50", label: "Confirmed planned gifts" },
      { value: "$4,894,000", label: "Total confirmed gift value" },
    ],
    content: [
      { type: "heading", text: "The Situation" },
      {
        type: "paragraph",
        text: "Catapult Fundraising partnered with a private university located in the northeast to provide a planned giving telephone outreach program to 500 of the university's most loyal donors. Due to their large number of loyal donors, Catapult partnered with the institution to help identify gift planning interest, cultivate these prospects, and educate donors on planned gift options.",
      },
      { type: "heading", text: "The Solution" },
      {
        type: "paragraph",
        text: "Catapult created a highly personalized planned giving telephone outreach program and selected 500 of the university's most loyal donors to contact. Donors were initially called by Catapult's Tier 1 callers who thanked the prospect for their years of loyal support and determined the prospect's interest in making a planned gift. Depending on the prospect's level of interest, an additional phone call was made by a Gift Planning Specialist.",
      },
      {
        type: "paragraph",
        text: "Catapult's Gift Planning Specialists are planned giving professionals, each with over 20 years of experience working directly in planned giving. They have held roles such as Director and Vice President of Planned Giving at major institutions all over the United States. Planned Giving Specialists informed Legacy Call prospects of their gift planning options and confirmed and quantified planned gifts over the phone.",
      },
      { type: "heading", text: "The Goals" },
      {
        type: "paragraph",
        text: "Legacy Call calling programs have four broad goals:",
      },
      {
        type: "list",
        items: [
          "To thoroughly thank the donors for their loyal support over the years",
          "To determine interest in including the university in their estate plans",
          "To confirm and quantify gifts already completed and thank/recognize these donors",
          "To educate/assist donors about planned gift options",
        ],
      },
      { type: "heading", text: "The Result" },
      {
        type: "paragraph",
        text: "Of the 500 prospects called, 116 donors expressed a current interest in planned giving or had already completed a planned gift. Gift Planning Specialists followed up with each of these individuals to secure the gift or acknowledge the gift that had already been made. An additional 82 prospects expressed interest in exploring options for a legacy gift in the future. The university will follow up with these prospects accordingly.",
      },
      {
        type: "paragraph",
        text: "Tier 2 callers secured and received written/verbal confirmation of 50 planned gifts, totaling $4,894,000. There is potential of an additional $144,000 from prospects with short-term planned giving/outright interest, a potential $99,000 in long-term planned giving interest, and a potential $85,500 from prospects who would like to continue to receive planned giving marketing materials.",
      },
      {
        type: "list",
        items: [
          "Total confirmed gifts: $4,894,000",
          "Total potential gifts: $328,500",
          "Total gift potential/confirmed gifts: $5,222,500",
        ],
      },
      { type: "heading", text: "Conclusion" },
      {
        type: "paragraph",
        text: "Catapult Fundraising's Legacy Call program accomplishes many goals. Most importantly, loyal donors were thanked for their years of support to the university.",
      },
      {
        type: "paragraph",
        text: "Through Catapult's process, callers were able to identify prospects who already left the university in their will, which allows the institution to properly acknowledge these gifts they otherwise would not have known about.",
      },
      {
        type: "paragraph",
        text: "New planned gifts were confirmed through calls with our Gift Planning Specialists. For those donors who did not commit to making a gift at this time, they were educated on planned gift options to consider for the future.",
      },
      {
        type: "paragraph",
        text: "Lastly, a pipeline for major gifts and future planned gifts was created for the university. The effects of the Legacy Call program will impact the university's development efforts for years to come.",
      },
    ],
  },
];

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((cs) => cs.slug === slug);
}
