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
  {
    slug: "legacy-call-new-jersey-hospital",
    title:
      "Catapult Fundraising's Legacy Call Program Secures $1,023,000 in Planned Gifts for a New Jersey Hospital",
    sector: "Healthcare · Legacy & Planned Giving",
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
    slug: "legacy-calls-hill-school",
    title:
      "Catapult Fundraising's Legacy Calls Program Secures Over $7,500,000 in Planned Gifts for The Hill School",
    sector: "Independent School · Legacy & Planned Giving",
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
    slug: "legacy-call-international-ministry",
    title:
      "Catapult Fundraising's Legacy Call Program Secures Over $6.8 Million in Planned Gifts for an International Ministry",
    sector: "Faith-Based Organization · Legacy & Planned Giving",
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
    title:
      "Catapult Fundraising's Legacy Call Program Secures $2,825,000 in Planned Gifts for a U.S. Presidential Library",
    sector: "Museum & Cultural Institution · Legacy & Planned Giving",
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
    slug: "af-connect-special-olympics-indiana",
    title:
      "Catapult Fundraising's AF Connect Calling Program Achieves an 85% Pledge Rate with Lapsed Donors for Special Olympics of Indiana",
    sector: "Annual Fund Calling · Donor Engagement",
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
];

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((cs) => cs.slug === slug);
}
