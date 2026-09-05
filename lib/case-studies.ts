import type { ContentBlock } from "@/components/content-blocks";

export interface CaseStudy {
  slug: string;
  title: string;
  // Short (<=47 char) title/description pair used only for the <title> tag
  // and meta description on the case study page. `title`/`summary` stay
  // long-form since they're also the on-page H1 and hero copy.
  metaTitle: string;
  metaDescription: string;
  sector: string;
  summary: string;
  stats: { value: string; label: string }[];
  image: string;
  content: ContentBlock[];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "legacy-call-northeast-university",
    metaTitle: "Legacy Call Secures $4.8M for a University",
    metaDescription: "A 500-donor Legacy Call outreach program confirmed 50 planned gifts totaling $4,894,000 for a Northeast university's most loyal donors.",
    title:
      "Catapult Fundraising's Legacy Call Program Secures Over $4.8 Million in Confirmed Planned Gifts for a Prestigious Northeast University",
    sector: "Higher Education · Legacy & Planned Giving",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/08323a7f-1d6b-4dea-b612-931fcfa1f79a.png",
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
  {
    slug: "mid-level-donor-engagement-faith-based-organization",
    metaTitle: "Mid-Level Engagement Builds a Gift Pipeline",
    metaDescription: "A mid-level donor engagement program built a qualified major gift pipeline for a faith-based organization through personalized outreach.",
    title:
      "Catapult Fundraising's Mid-Level Donor Engagement Program Builds a Major Gift Pipeline for a Faith-Based Organization",
    sector: "Faith-Based Organization · Mid-Level Donor Engagement",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/c59be935-f746-4cc7-9938-b32dcf520fe3.png",
    summary:
      "A segmented Reactivate, Renewal, and Upgrade campaign for a faith-based organization drove a 32% higher response rate among lapsed donors, qualified 57% of participants for additional stewardship, and identified 9% as ready for a major gift appointment.",
    stats: [
      { value: "32%", label: "Higher response rate — Reactivate segment" },
      { value: "57%", label: "Qualified for additional stewardship" },
      { value: "9%", label: "Qualified for a major gift appointment" },
      { value: "3", label: "Donor segments activated" },
    ],
    content: [
      { type: "heading", text: "The Challenge" },
      {
        type: "paragraph",
        text: "The organization wanted to deepen relationships with its most loyal donors and identify which mid-level supporters were most ready to reactivate, renew, or upgrade their giving. Like many faith-based organizations, it had a deep bench of long-tenured donors whose true capacity and readiness had never been formally assessed.",
      },
      { type: "heading", text: "Audience Segments" },
      {
        type: "paragraph",
        text: "Catapult built three distinct audience segments from the organization's donor file, each with its own outreach strategy and ask:",
      },
      {
        type: "list",
        items: [
          "Reactivate: Donors with a most-recent gift of $500 given 23+ months ago",
          "Renewal: Donors with a most-recent gift of $1,000 given within the last 12 months",
          "Upgrade: Current donors giving less than $2,500 who showed higher giving capacity",
        ],
      },
      { type: "heading", text: "The Strategy" },
      {
        type: "paragraph",
        text: "Selected donors were invited into a recognition society through a personalized, multi-touch outreach sequence:",
      },
      {
        type: "list",
        items: [
          "An email or letter was sent based on each donor's stated communication preference",
          "A follow-up phone call thanked the donor for their loyalty",
          "Each donor was personally invited to join, sustain, or upgrade their support",
        ],
      },
      { type: "heading", text: "The Results" },
      {
        type: "list",
        items: [
          "Reactivate donors achieved a 32% higher response rate than the organization's historical benchmark",
          "Renewal donors produced a higher average gift than prior renewal efforts",
          "57% of contacted donors qualified for additional stewardship",
          "Upgrade donors produced both a higher response rate and a higher average gift",
          "9% of contacted donors qualified for a major gift appointment",
        ],
      },
      { type: "heading", text: "Conclusion" },
      {
        type: "paragraph",
        text: "By segmenting the donor file into Reactivate, Renewal, and Upgrade audiences and pairing personalized outreach with a genuine thank-you, Catapult helped the organization re-energize lapsed relationships, strengthen its base of loyal mid-level donors, and surface a qualified pipeline of prospects ready for a major gift conversation.",
      },
    ],
  },
  {
    slug: "legacy-call-new-jersey-hospital",
    metaTitle: "Legacy Call Secures $1M+ for an NJ Hospital",
    metaDescription: "A Legacy Call telephone outreach program secured $1,023,000 in confirmed planned gifts for a New Jersey hospital's loyal donor base.",
    title:
      "Catapult Fundraising's Legacy Call Program Secures $1,023,000 in Planned Gifts for a New Jersey Hospital",
    sector: "Healthcare · Legacy & Planned Giving",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/cc4d5a8d-b615-4d77-9ca3-7a7a6c313973.png",
    summary:
      "A 1,000-donor Legacy Call telephone outreach program for a southern New Jersey hospital confirmed 18 planned gifts totaling $1,023,000, with an additional $412,500 in gift potential identified among the hospital's most loyal donors.",
    stats: [
      { value: "1,000", label: "Loyal donors contacted" },
      { value: "770", label: "Reached by Tier 1 callers" },
      { value: "18", label: "Confirmed planned gifts" },
      { value: "$1,023,000", label: "Total confirmed gift value" },
    ],
    content: [
      { type: "heading", text: "The Situation" },
      {
        type: "paragraph",
        text: "Catapult Fundraising partnered with a private hospital located in southern New Jersey to provide a planned giving telephone outreach program to 1,000 of the hospital's most loyal donors. Due to their large number of donors, Catapult partnered with the institution to help identify planned giving interest, cultivate these prospects, and educate these donors on planned giving options.",
      },
      { type: "heading", text: "The Solution" },
      {
        type: "paragraph",
        text: "Catapult partnered with the hospital to design a highly personalized planned giving telephone outreach program and selected 1,000 of the hospital's best planned giving prospects to contact. Donors were called by Catapult's Tier 1 callers who thanked the prospect for loyal support over the years and determined the prospect's interest in making a planned gift. Depending on their level of interest, an additional phone call was made by a Tier 2 caller.",
      },
      {
        type: "paragraph",
        text: "Catapult's Tier 2 callers are planned giving specialists, each with more than 20 years of experience working directly in planned giving. They have held roles such as Director and Vice President of Planned Giving at major institutions across the United States. Tier 2 callers informed Legacy Call prospects of their planned gift options and confirmed and quantified planned gifts over the phone.",
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
          "To determine interest in including the hospital in their estate plans",
          "To confirm and quantify gifts already completed and thank/recognize these donors",
          "To educate/assist donors about planned gift options",
        ],
      },
      { type: "heading", text: "The Result" },
      {
        type: "paragraph",
        text: "Of the 1,000 donors that were reached during the calling program, 770 were reached by our Tier 1 callers. Of those reached, 30% expressed a current interest in planned giving or had already completed a planned gift. Tier 2 callers followed up with each of these individuals to secure the gift. The projected planned giving results for telephone outreach programs are that 10-15% of those reached would have an interest in planned giving.",
      },
      {
        type: "paragraph",
        text: "The 30% rate of interest our calling program identified indicates that the donor base has very strong loyalty to the hospital. An additional 68 prospects expressed interest in exploring options for a planned gift within the next five years. The hospital will personally follow up with these prospects in the future.",
      },
      {
        type: "paragraph",
        text: "Tier 2 callers secured and received written/verbal confirmation of 18 planned gifts, which totaled $1,023,000. There is potential of an additional $75,000 from prospects with short-term planned giving/outright interest, a potential $22,500 in long-term planned giving interest, a potential $255,000 from prospects with possible future interest, and a potential $60,000 from prospects who would like to continue to receive planned giving marketing materials.",
      },
      {
        type: "list",
        items: [
          "Total confirmed gifts: $1,023,000",
          "Total potential gifts: $412,500",
          "Total gift potential/confirmed gifts: $1,435,500",
          "Cost per dollar for confirmed gifts: $0.06",
        ],
      },
      { type: "heading", text: "Conclusion" },
      {
        type: "paragraph",
        text: "The hospital provided Catapult Fundraising with 1,000 loyal donors to solicit. Donors were mailed a personalized thank you letter, which was followed by a telephone call. The entire program took a total of 3 months to complete. 770 prospects were reached, and 18 planned gifts were secured, totaling $1,023,000. An additional 68 prospects expressed interest in making a future planned gift, which resulted in a potential total of $412,500.",
      },
      {
        type: "paragraph",
        text: "Catapult Fundraising's Legacy Call program accomplishes many goals. Loyal donors are thanked for their years of support of the hospital. Through Catapult's process, callers were able to identify prospects who already left the hospital in their will, which allows the institution to properly acknowledge these gifts they otherwise would not have known about. New planned gifts were confirmed through Tier II calling by gift planning specialists. For those donors who did not commit to making a gift at this time, they were educated on planned gift options to consider for the future. Lastly, a pipeline for major gifts and future planned gifts was created for the hospital. The effects of the Legacy Call program will impact the hospital's development efforts for years to come.",
      },
    ],
  },
  {
    slug: "engaging-hidden-donor-potential-performing-arts-organization",
    metaTitle: "Hidden Major Gift Potential in Performing Arts",
    metaDescription: "How Catapult uncovered hidden major gift potential within a performing arts organization's existing donor base through targeted research.",
    title:
      "Catapult Fundraising Uncovers Hidden Major Gift Potential Within a Performing Arts Organization's Donor Base",
    sector: "Performing Arts Organization · Mid-Level Donor Engagement",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/9ed75050-079d-4df0-b73d-9fc4fe1efec2.png",
    summary:
      "A targeted engagement campaign for a performing arts organization reached 1,026 donors with a lifetime giving history under $350, generating 467 new gifts, a 72% increase in overall giving, and an average first-time gift of $2,390.",
    stats: [
      { value: "2,067", label: "Donors selected for personalized engagement" },
      { value: "1,026", label: "Donors engaged through the campaign" },
      { value: "467", label: "New gifts generated" },
      { value: "72%", label: "Increase in overall giving" },
    ],
    content: [
      { type: "heading", text: "The Challenge" },
      {
        type: "paragraph",
        text: "The organization identified a donor segment with lifetime philanthropic giving of less than $350, even though public-domain wealth and affinity data suggested this audience had major giving potential that had never been cultivated.",
      },
      { type: "heading", text: "The Audience" },
      {
        type: "paragraph",
        text: "Catapult selected a targeted audience of 2,067 donors from this overlooked segment for personalized engagement, prioritizing those with the strongest indicators of connection to the organization's mission.",
      },
      { type: "heading", text: "The Strategy" },
      {
        type: "paragraph",
        text: "The outreach approach focused on deepening connection and demonstrating impact rather than leading with an ask:",
      },
      {
        type: "list",
        items: [
          "Identified each donor's personal reasons for being connected to the mission",
          "Introduced the segment to the tangible impact of the organization's work",
          "Provided added value to enhance each donor's experience with the mission",
          "Reinforced the importance of their monetary support before soliciting a gift",
        ],
      },
      { type: "heading", text: "The Results" },
      {
        type: "list",
        items: [
          "1,026 donors were engaged through the campaign",
          "467 new gifts were generated from this previously overlooked segment",
          "Overall giving from the segment increased by 72%",
          "Average gift size increased between 61% and 135%, depending on segment",
          "The average first-time gift from non-donors within the segment was $2,390",
        ],
      },
      { type: "heading", text: "Conclusion" },
      {
        type: "paragraph",
        text: "By pairing donor data with a relationship-first cultivation sequence, Catapult helped the organization convert an under-engaged, low-dollar-history segment into a meaningful source of new and upgraded gifts, proving that lifetime giving totals alone don't tell the whole story of a donor's capacity or loyalty.",
      },
    ],
  },
  {
    slug: "legacy-calls-hill-school",
    metaTitle: "Legacy Calls Secure $7.5M for The Hill School",
    metaDescription: "Two phases of Legacy Call outreach secured over $7,500,000 in confirmed planned gifts for The Hill School, a Pennsylvania boarding school.",
    title:
      "Catapult Fundraising's Legacy Calls Program Secures Over $7,500,000 in Planned Gifts for The Hill School",
    sector: "Independent School · Legacy & Planned Giving",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/30c6b2c2-5ea9-48a4-8ba1-944a67e0ce4b.png",
    summary:
      "Two phases of Legacy Calls outreach for The Hill School, a private boarding school in Pennsylvania, secured 47 confirmed planned gifts totaling $7,666,000, with $1,212,500 in additional gift potential.",
    stats: [
      { value: "1,501", label: "Total prospects called (both phases)" },
      { value: "639", label: "Prospects reached" },
      { value: "47", label: "Confirmed planned gifts" },
      { value: "$7,666,000", label: "Total confirmed gift value" },
    ],
    content: [
      { type: "heading", text: "The Situation" },
      {
        type: "paragraph",
        text: "The Hill School is a private, traditional boarding school located in Pottstown, Pennsylvania. Due to their high volume of loyal donors, Catapult Fundraising partnered with The Hill School to assist in cultivating relationships with those donors with the highest planned giving potential.",
      },
      {
        type: "quote",
        text: "It would take about 8 years for one Director of Planned Giving to visit 1,000 donors; it took Legacy Calls 3 months. — Christian Sockel, Assistant Headmaster for Advancement",
      },
      { type: "heading", text: "The Solution" },
      {
        type: "paragraph",
        text: "Catapult created a highly personalized planned giving telephone outreach program and selected 1,000 of the Hill School's most loyal donors to contact. Donors were initially called by Catapult's Tier 1 callers who thanked the prospect for their years of loyal support and determined the prospect's interest in making a planned gift. Depending on the prospect's level of interest, an additional phone call was made by a Tier 2 caller, a planned giving specialist with more than 20 years of planned giving experience. Tier 2 callers informed prospects of planned gift options and confirmed and quantified planned gifts.",
      },
      { type: "heading", text: "The Goals" },
      {
        type: "paragraph",
        text: "The planned giving calling program had four broad goals:",
      },
      {
        type: "list",
        items: [
          "To thoroughly thank the donors for their loyal support over the years",
          "To determine interest in including The Hill School in their estate plans",
          "To confirm and quantify gifts already completed and thank/recognize these donors",
          "To educate/assist donors about planned gift options",
        ],
      },
      { type: "heading", text: "The Result — Phase One" },
      {
        type: "paragraph",
        text: "Of the 1,000 prospects called, 518 were reached. Of these, 28% expressed a current interest in planned giving or had already completed a planned gift. Tier 2 callers followed up with each of these individuals to secure the gift. An additional 70 prospects expressed interest in exploring options for a planned gift in the future. The Hill School will follow up with these prospects in the future.",
      },
      {
        type: "paragraph",
        text: "Tier 2 callers secured and received written/verbal confirmation of 41 planned gifts, totaling $2,166,000. There is potential of an additional $90,000 from prospects with short-term planned giving/outright interest, a potential $180,000 in long-term planned giving interest, a potential $350,000 from prospects with possible future interest, and a potential $92,500 from prospects who would like to continue to receive planned giving marketing materials.",
      },
      {
        type: "list",
        items: [
          "Total confirmed gifts: $2,166,000",
          "Total potential gifts: $712,500",
          "Total gift potential/confirmed gifts: $2,878,500",
        ],
      },
      { type: "heading", text: "Phase Two" },
      {
        type: "paragraph",
        text: "Because of the great success of the planned giving calling program, The Hill School partnered with Catapult on a second phase of calling. Of the 501 prospects called, 121 were reached. Of those reached, 36 prospects expressed a current interest in planned giving or had already completed a planned gift. The pre-call letter was the catalyst for another prospect to reveal a previously unknown $1,000,000 gift commitment. An additional 22 prospects expressed interest in exploring options for a planned gift in the future.",
      },
      {
        type: "paragraph",
        text: "Tier 2 callers secured and received written/verbal confirmation of 6 planned gifts, totaling $5,500,000. One prospect is in the process of completing his gift ($50,000 potential). There is potential of an additional $80,000 from prospects with short-term planned giving/outright interest, a potential $220,000 in long-term planned giving interest, a potential $110,000 from prospects with possible future interest, and a potential $40,000 from prospects who would like to continue to receive planned giving marketing materials.",
      },
      {
        type: "list",
        items: [
          "Total confirmed gifts: $5,500,000",
          "Total potential gifts: $500,000",
          "Total gift potential/confirmed gifts: $6,000,000",
        ],
      },
      { type: "heading", text: "Phase 1 & 2 Grand Totals" },
      {
        type: "list",
        items: [
          "Total confirmed gifts: $7,666,000",
          "Total potential gifts: $1,212,500",
          "Total gift potential/confirmed gifts: $8,878,500",
        ],
      },
    ],
  },
  {
    slug: "af-connect-special-olympics-indiana",
    metaTitle: "AF Connect: 85% Pledge Rate, Special Olympics",
    metaDescription: "Catapult's AF Connect calling program achieved an 85% pledge rate with lapsed donors for Special Olympics of Indiana.",
    title:
      "Catapult Fundraising's AF Connect Calling Program Achieves an 85% Pledge Rate with Lapsed Donors for Special Olympics of Indiana",
    sector: "Annual Fund Calling · Donor Engagement",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/14f53258-e3a4-457b-8b2c-ddf692ac9535.png",
    summary:
      "Catapult's AF Connect calling program for Special Olympics of Indiana lifted average gift size by 39% and achieved an 85% pledge rate with lapsed donors, nearly double the 45% industry average.",
    stats: [
      { value: "39%", label: "Average gift size increase" },
      { value: "85%", label: "Pledge rate with lapsed donors" },
      { value: "45%", label: "Industry average pledge rate" },
      { value: "3–5 yrs", label: "Since donors' last phone solicitation" },
    ],
    content: [
      { type: "heading", text: "The Situation" },
      {
        type: "paragraph",
        text: "Catapult Fundraising partnered with Special Olympics of Indiana to conduct an annual fund telephone solicitation program for current and lapsed business donors, many of which had not been solicited via telephone in 3-5 years. Catapult solicits unrestricted annual fund support, cultivates prospects, gathers feedback, and updates personal information. With the goal of freeing up development staff time to focus on major gifts, Special Olympics of Indiana outsourced the program to utilize Catapult's dedicated team of professional callers.",
      },
      { type: "heading", text: "The Goals" },
      {
        type: "paragraph",
        text: "There are several key goals for the calling program:",
      },
      {
        type: "list",
        items: [
          "Steward and renew donors",
          "Upgrade current donors",
          "Re-engage lapsed donors",
          "Upgrade gift amounts by soliciting multiple installment gifts, which also instills a habit of giving",
          "Substantially increase average gifts",
          "Create a pipeline for major gifts",
        ],
      },
      { type: "heading", text: "The Process" },
      {
        type: "paragraph",
        text: "Catapult's methodology is modeled after face-to-face solicitation techniques. Catapult worked with Special Olympics of Indiana to identify prospects for the calling program. Once the calling pool was selected, each prospect was sent a pre-call letter, signed by a volunteer. The letter signer's personal story and reasons for supporting were highlighted in the letter. Also included was the case for support and a personalized ask amount for each prospect.",
      },
      {
        type: "paragraph",
        text: "Catapult assigned personalized ask amounts based on each prospect's giving history over the last five years. Catapult's fundraising specialists reached out to each prospect to follow up on the letter, to thank each prospect for their previous gifts, to build relationships, and to solicit a new gift. Donors who made a pledge commitment through Catapult's program were sent a thank-you letter from the original letter signer and a pledge confirmation within 48 hours of the phone call.",
      },
      { type: "heading", text: "The Result" },
      {
        type: "paragraph",
        text: "Catapult's results are a clear indication that this type of solicitation is successful in stewarding, soliciting, and upgrading Special Olympics of Indiana's prospects. Catapult's callers increased the average gift size by 39%. Strong results were achieved across all donor groups: Catapult's pledge rate of 85% for lapsed donors far exceeds the industry average of 45%.",
      },
      { type: "heading", text: "Conclusion" },
      {
        type: "paragraph",
        text: "Based on the outstanding results and the positive response from the donors solicited, a combination mail/phone program for Special Olympics of Indiana is the best way to upgrade current donors and renew lapsed donors at a low cost-per-dollar.",
      },
    ],
  },
  {
    slug: "legacy-call-international-ministry",
    metaTitle: "Legacy Call Secures $6.8M for a Global Ministry",
    metaDescription: "A Legacy Call telephone outreach program secured over $6.8 million in confirmed planned gifts for an international ministry.",
    title:
      "Catapult Fundraising's Legacy Call Program Secures Over $6.8 Million in Planned Gifts for an International Ministry",
    sector: "Faith-Based Organization · Legacy & Planned Giving",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/5bdff259-a3ba-4ebc-9918-cc8f3424ee06.png",
    summary:
      "Two phases of Legacy Call outreach to 3,100 loyal donors for a northern California ministry secured 149 confirmed planned gifts totaling $6,867,161, with $4,960,063 in additional gift potential.",
    stats: [
      { value: "3,100", label: "Loyal donors contacted (both phases)" },
      { value: "149", label: "Confirmed planned gifts" },
      { value: "$6,867,161", label: "Total confirmed gift value" },
      { value: "$4,960,063", label: "Total gift potential" },
    ],
    content: [
      { type: "heading", text: "The Situation" },
      {
        type: "paragraph",
        text: "Catapult Fundraising partnered with a ministry located in northern California to provide an off-site planned giving telephone outreach program to 1,000 of the ministry's most loyal donors.",
      },
      { type: "heading", text: "The Goals" },
      {
        type: "paragraph",
        text: "Catapult's Legacy Call program has four broad goals:",
      },
      {
        type: "list",
        items: [
          "To thoroughly thank the donors for their loyal support over the years",
          "To determine interest in including the ministry in their estate plans",
          "To confirm and quantify gifts already completed and thank/recognize these donors",
          "To educate/assist donors about planned gift options",
        ],
      },
      { type: "heading", text: "The Solution" },
      {
        type: "paragraph",
        text: "Catapult partnered with the ministry to design a highly personalized planned giving telephone outreach program and selected 1,000 of the ministry's best planned giving prospects to contact. Donors were called by Catapult's Tier 1 callers who thanked the prospect for loyal support over the years and determined the prospect's interest in making a planned gift. If interest was identified, an additional phone call was made by a Tier 2 caller.",
      },
      {
        type: "paragraph",
        text: "Catapult's Tier 2 callers are gift planning consultants, each with more than 20 years of experience working directly in planned giving. They have held roles such as Director and Vice President of Planned Giving at major institutions across the United States. Tier 2 callers discussed gift options with donors and confirmed and quantified planned gifts over the phone. Gift commitment forms were sent to donors and signed commitments were then sent back to the ministry.",
      },
      { type: "heading", text: "The Result — Phase One" },
      {
        type: "paragraph",
        text: "Of the 1,000 donors that were reached during the calling program, 31% expressed a current interest in planned giving or had already completed a planned gift. Tier 2 callers followed up with each of these individuals to secure the gift. The projected planned giving results for telephone outreach programs are that 10-15% of those reached would have an interest in planned giving. The 31% rate of interest Catapult's calling program identified indicates that the ministry has a very loyal donor base.",
      },
      {
        type: "paragraph",
        text: "Tier 2 callers secured and received written/verbal confirmation of 43 planned gifts, which totaled $2,077,813. Tier 2 callers identified an additional potential of $90,000 from prospects with short-term planned giving/outright interest, a potential of $126,000 in long-term planned giving interest, and a potential of $123,750 from prospects who would like to continue to receive planned giving marketing materials. Tier 1 callers were able to identify an additional potential of $499,500 from prospects who expressed a possible interest in making a planned gift in the future.",
      },
      {
        type: "list",
        items: [
          "Total confirmed gifts: $2,077,813",
          "Total potential gifts: $839,250",
          "Total gift potential/confirmed gifts: $2,917,063",
          "Cost per dollar for confirmed gifts: $0.03",
        ],
      },
      { type: "heading", text: "Phase Two" },
      {
        type: "paragraph",
        text: "Due to the highly successful planned giving calling program, the ministry partnered with Catapult to conduct a second phase of calling. Catapult callers reached out to an additional 2,100 loyal donors to identify previously made planned gifts and identify planned giving interest. The program yielded 1,305 decisions, of which 106 resulted in a planned gift. An additional 259 prospects expressed interest in exploring gift planning options in the future.",
      },
      {
        type: "paragraph",
        text: "Tier 2 callers secured and received written/verbal confirmation of 106 planned gifts, totaling $4,789,348. There is potential of an additional $909,000 from prospects with short-term planned giving/outright interest, a potential $459,000 in long-term planned giving interest, and a potential $675,000 from prospects who would like to continue to receive planned giving marketing materials.",
      },
      {
        type: "list",
        items: [
          "Total confirmed gifts: $4,789,348",
          "Total potential gifts: $2,043,000",
          "Total gift potential/confirmed gifts: $6,832,348",
        ],
      },
      { type: "heading", text: "Phase 1 & 2 Grand Totals" },
      {
        type: "list",
        items: [
          "Total confirmed gifts: $6,867,161",
          "Total potential gifts: $4,960,063",
          "Cost per dollar for confirmed gifts: $0.03",
        ],
      },
      { type: "heading", text: "Conclusion" },
      {
        type: "paragraph",
        text: "Over two separate phases of the Legacy Call program, the ministry provided Catapult Fundraising with 3,100 loyal donors to solicit over the course of 12 months.",
      },
      {
        type: "paragraph",
        text: "Catapult Fundraising's Legacy Call program accomplishes many goals. Loyal donors were thanked for their years of support. Through Catapult's process, callers were able to identify prospects who already left the ministry in their will, which allows the organization to properly acknowledge these gifts they otherwise would not have known about. New planned gifts were confirmed through Tier II calling by gift planning specialists. For those donors who did not commit to making a gift at this time, they were educated on planned gift options to consider for the future. Lastly, a pipeline for major gifts and future planned gifts was created for the ministry. The effects of the Legacy Call program will impact their development efforts for years to come.",
      },
    ],
  },
  {
    slug: "legacy-call-presidential-library",
    metaTitle: "Legacy Call Secures $2.8M for a Library",
    metaDescription: "A 2,000-donor Legacy Call telephone outreach program confirmed 26 planned gifts totaling $2,825,000 for a U.S. Presidential Library.",
    title:
      "Catapult Fundraising's Legacy Call Program Secures $2,825,000 in Planned Gifts for a U.S. Presidential Library",
    sector: "Museum & Cultural Institution · Legacy & Planned Giving",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/35a626c0-e150-4ceb-91eb-d23693c01819.png",
    summary:
      "A 2,000-donor Legacy Call telephone outreach program for a U.S. Presidential Library confirmed 26 planned gifts totaling $2,825,000, with an additional $1,510,000 in gift potential identified.",
    stats: [
      { value: "2,000", label: "Loyal donors contacted" },
      { value: "22%", label: "Expressed planned-giving interest" },
      { value: "26", label: "Confirmed planned gifts" },
      { value: "$2,825,000", label: "Total confirmed gift value" },
    ],
    content: [
      { type: "heading", text: "The Situation" },
      {
        type: "paragraph",
        text: "Catapult Fundraising partnered with a U.S. Presidential Library to provide a planned giving telephone outreach program to 2,000 of the organization's most loyal donors. Due to their large number of loyal donors, Catapult partnered with the Library to help identify gift planning interest, cultivate these prospects, and educate donors on planned giving options.",
      },
      { type: "heading", text: "The Solution" },
      {
        type: "paragraph",
        text: "Catapult partnered with the Library to design a highly personalized planned giving telephone outreach program and selected 2,000 of the best planned giving prospects to contact. Donors were called by Catapult's Tier 1 callers who thanked the prospect for their loyal support over the years and determined the prospect's interest in making a planned gift. Depending on their level of interest, an additional phone call was made by a Tier 2 caller. Catapult's Tier 2 callers are planned giving specialists, each with more than 20 years of experience working directly in planned giving. They have held roles such as Director and Vice President of Planned Giving at major institutions across the United States. Tier 2 callers informed Legacy Call prospects of their planned gift options and confirmed and quantified planned gifts over the phone.",
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
          "To determine interest in including the Library in their estate plans",
          "To confirm and quantify gifts already completed and thank/recognize these donors",
          "To educate/assist donors about planned gift options",
        ],
      },
      { type: "heading", text: "The Result" },
      {
        type: "paragraph",
        text: "Of the 2,000 prospects called, 22% expressed a current interest in planned giving or had already completed a planned gift. Those donors were referred to Planned Giving Specialists for follow-up. The projected planned giving results for telephone outreach programs are that 10-15% of those reached would have an interest in planned giving. The 22% rate of interest our calling program identified indicates that the donor base has very strong loyalty to the organization.",
      },
      {
        type: "paragraph",
        text: "An additional 17% of the prospects expressed future planned giving interest. The organization will personally follow up with these donors in the future.",
      },
      {
        type: "paragraph",
        text: "Tier 2 callers secured and received written/verbal confirmation of 26 planned gifts, which totaled $2,825,000. There is potential of an additional $600,000 from prospects with short-term planned giving/outright interest, a potential $50,000 from prospects with long-term planned giving interest, and a potential $860,000 from prospects with possible future interest.",
      },
      {
        type: "list",
        items: [
          "Total confirmed gifts: $2,825,000",
          "Total potential gifts: $1,510,000",
          "Total gift potential/confirmed gifts: $4,335,000",
          "Cost per dollar for confirmed gifts: $0.04",
        ],
      },
      { type: "heading", text: "Conclusion" },
      {
        type: "paragraph",
        text: "Catapult Fundraising's Legacy Call program accomplishes many goals. Most importantly, loyal donors were thanked for their years of support to the Library.",
      },
      {
        type: "paragraph",
        text: "Through Catapult's process, callers were able to identify prospects who already left the Library in their will, which allows the Library to properly acknowledge these gifts they otherwise would not have known about.",
      },
      {
        type: "paragraph",
        text: "New planned gifts were confirmed through calls with our Gift Planning Specialists. For those donors who did not commit to making a gift at this time, they were educated on planned gift options to consider for the future.",
      },
      {
        type: "paragraph",
        text: "Lastly, a pipeline for major gifts and future planned gifts was created for the Library. The effects of the Legacy Call program will impact the Library's development efforts for years to come.",
      },
    ],
  },
  {
    slug: "salvation-army-southern-nevada-capital-campaign",
    metaTitle: "Stalled Campaign Finishes at $10 Million",
    metaDescription:
      "Catapult took over a stalled Salvation Army of Southern Nevada capital campaign, ran the study that had never been done, and helped finish at $10 million.",
    title:
      "Catapult Fundraising Restarts a Stalled Capital Campaign and Helps The Salvation Army of Southern Nevada Finish at $10 Million",
    sector: "Social Service · Capital Campaign & Endowment",
    image: "/case-studies/salvation-army-southern-nevada.jpg",
    summary:
      "The Salvation Army of Southern Nevada had a half-finished capital campaign for a new Family Services Center, no study to guide it, and construction approval on hold. Catapult ran the study that had never been done, rebuilt the gift chart and prospect strategy, and the campaign went on to raise $10 million including a $1.25 million endowment.",
    stats: [
      { value: "$10M", label: "Total campaign commitments" },
      { value: "$1.25M", label: "Endowment secured by irrevocable trust" },
      { value: "100%", label: "Study interviewees calling the organization worthy of support" },
      { value: "63", label: "Gifts mapped in the rebuilt gift chart" },
    ],
    content: [
      {
        type: "lede",
        text: "A capital campaign that had run out of momentum halfway to its goal finished fully funded, with an endowment attached and a building under construction.",
      },
      { type: "heading", text: "The Situation" },
      {
        type: "paragraph",
        text: "For seventy-five years The Salvation Army of Southern Nevada has served the most vulnerable people in Las Vegas. To meet growing demand, the corps set out to build a new Family Services Center in North Las Vegas, with case management, emergency assistance for families in crisis, and a client-choice food pantry.",
      },
      {
        type: "paragraph",
        text: "By the spring of 2023 the campaign had stalled. It had raised roughly $4 to $4.5 million toward a $6 million goal, and about $800,000 was needed quickly so that construction approval could move forward under divisional policy. No study had ever been conducted to test the campaign, so there was no independent read on community support, no validated gift chart, and no prospect plan for the balance. Catapult was brought in at that point to complete the campaign.",
      },
      { type: "heading", text: "The Solution" },
      {
        type: "paragraph",
        text: "Catapult started with the step that had been skipped. In the fall of 2023 Catapult designed and conducted a major gifts study, drafting the interview questions and FAQs, building the interview list with the corps, and conducting confidential telephone interviews with community leaders, donors, and prospective donors. Findings and recommendations were presented in December 2023.",
      },
      {
        type: "paragraph",
        text: "The study answered the questions the campaign had never asked: how the organization is regarded locally, whether gifts of $100,000 and above were realistic, and which corporations and foundations would engage. From there Catapult rebuilt the campaign plan.",
      },
      {
        type: "list",
        items: [
          "A gift chart for the remaining balance, with the top ten gifts carrying at least 60 percent of it",
          "Major donor identification, wealth screening, and research profiles down to the $10,000 level",
          "Ask amounts, naming opportunities, and a donor recognition plan tied to each remaining giving opportunity",
          "Weekly portfolio work and pre-visit coaching with corps and divisional leadership",
          "Solicitation training for local and divisional staff so mid-level gifts were closed, not left on the table",
          "A monthly gift chart to actuals report so progress was measured against the plan every month",
        ],
      },
      { type: "heading", text: "What the Study Found" },
      {
        type: "list",
        items: [
          "100 percent of interviewees said the organization was worthy of donations",
          "93.1 percent called its work very important, and no one called it unimportant",
          "89.7 percent could name specific programs that mattered to them, most often food assistance, addiction rehabilitation, and mental health services",
          "65.5 percent believed local corporations and foundations would give",
          "The clearest barriers were visibility and donor education, not doubt about the mission",
        ],
      },
      {
        type: "paragraph",
        text: "Those findings became the talking points for solicitation, and the gaps they exposed became the marketing and cultivation plan for the rest of the campaign.",
      },
      { type: "heading", text: "The Result" },
      {
        type: "paragraph",
        text: "The campaign restarted and kept going past its original target. Rather than stopping at the building, the effort was extended to raise additional support and add an endowment, and total commitments reached $10 million, including $1.25 million in endowment secured through an irrevocable trust. Construction of the new Family Services Center moved into mobilization in 2026.",
      },
      {
        type: "quote",
        text: "Anthony Alonso and the Catapult Consulting team were brought in at a critical time to help us address a capital campaign that was not meeting its potential. Through their professionalism, strategic insight, tireless work ethic, and exceptional fundraising expertise, they helped turn the campaign around and position it for success. Their partnership has made a meaningful difference in our ability to advance the mission of The Salvation Army. I am deeply grateful for their commitment, leadership, and the outstanding results they delivered.",
      },
      {
        type: "paragraph",
        text: "Major Kyle Smith, Corps Officer and Southern Nevada Coordinator, Las Vegas Citadel Corps, The Salvation Army",
      },
      { type: "heading", text: "Why It Worked" },
      {
        type: "list",
        items: [
          "The study was done, even though it was late. Testing the case with the community gave the campaign a defensible goal and a real prospect pool instead of hope.",
          "The gift chart drove the work. Every remaining gift level had named prospects, an ask amount, and an owner.",
          "Leadership was coached before visits, not briefed after them.",
          "The campaign was not allowed to coast to the finish line. Once the building was funded, the plan moved to endowment and long-term sustainability.",
        ],
      },
      { type: "heading", text: "Conclusion" },
      {
        type: "paragraph",
        text: "A stalled campaign is rarely a fundraising failure. It is usually a planning gap. When the study, the gift chart, and the prospect strategy were put in place, The Salvation Army of Southern Nevada finished the campaign, built the endowment, and put a new Family Services Center into construction for the families who need it.",
      },
    ],
  },
];

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((cs) => cs.slug === slug);
}
