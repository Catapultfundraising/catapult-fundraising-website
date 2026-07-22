import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { Building, Users, Award } from "lucide-react";

const LEADERSHIP = [
  {
    name: "Anthony R. Alonso",
    role: "President & CEO",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/5ac6ad8e-2df9-495a-812f-da0bf44735b9.png",
    bio: "Every great campaign needs someone who believes, without a doubt, that a community's generosity is bigger than anyone has yet imagined. That's Anthony. In 35 years of fundraising, he's helped organizations raise over a billion dollars in the last decade alone, but the number he's proudest of is the one no spreadsheet can capture: the trust of every board and every donor who took a chance on a bigger vision because he asked them to. A former AFP Las Vegas Chapter President and twice honored for excellence in philanthropy, Anthony also serves as Board Chair of the Salvation Army of Southern Nevada, living out in his own community, the same conviction he brings to every client: that the right ask, made with heart, changes everything.",
  },
  {
    name: "Amy Wiles",
    role: "Chief Campaign Strategist",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/0bd69597-1996-4515-bc30-4eb8744a5af7.png",
    bio: "Amy turns a feasibility study into a movement. With over 30 years in the nonprofit sector, she has the rare gift of translating a bold mission into a campaign plan that staff, volunteers, and donors all rally behind. She has guided organizations through capital campaigns ranging from six figures to nine, building case statements that hold up under a board's toughest questions and gift charts that hold up even better in public phase. Named 2025 Outstanding Fundraising Professional by AFP Las Vegas and a graduate of both the Jameson Fellowship and Leadership Las Vegas, Amy leads Catapult's strategy team with the belief that the best campaigns aren't just well-planned. They're well-loved by everyone who's part of them, built around real donors, not just a spreadsheet.",
  },
  {
    name: "Zina Birmingham",
    role: "Chief Operating Officer",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/8961c994-c970-466b-bc77-e445ff5ae4ff.png",
    bio: "Zina started as a student Engagement Officer, the same seat every one of Catapult's fundraising specialists sits in today, and rose through every leadership role the company offers on her way to COO. That path shows: she's helped raise nearly half a billion dollars for clients over the last quarter century, and she still runs operations like someone who remembers exactly what it feels like to be on the phone making the ask. A hands-on operator with a reputation for fixing problems before clients ever notice them, Zina built the training systems and quality standards that every Catapult Engagement Officer still follows today. Her promise to every client is simple: the machine behind the mission will never let you down.",
  },
  {
    name: "Sharice Lance",
    role: "Chief Financial Officer",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/01087db0-7d09-4fc9-b065-ad0c6c7a13c3.png",
    bio: "Sharice brings more than 25 years of finance and operations leadership to Catapult. She spent six years as Managing Director of Henderson International School and two years as President of the International Academy of Design and Technology, an $8 million division within a $1.7 billion institution. She began her career as an Assistant Controller at Jones Lang LaSalle. As Catapult's CFO, Sharice keeps the firm's finances sound and stable.",
  },
  {
    name: "Maria Healy",
    role: "Senior Vice President",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/8b83e147-d7d5-483e-91a3-1f4ae4c72d95.png",
    bio: "Over three decades, Maria has managed hundreds of client relationships, and she treats every single one like it's her only one. Her superpower is project management with a human touch: turning a complex, multi-phase campaign into a calm, well-run partnership her clients actually enjoy being part of. A longtime AFP New Jersey Chapter board member, Maria believes the best fundraising strategy is also the kindest one.",
  },
  {
    name: "Gwen Paxon, CFRE",
    role: "Vice President of Client Services",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/adaffa6f-1329-4284-b98b-2b6ef9677093.png",
    bio: "Gwen has spent 25 years proving that client service and fundraising results aren't two different jobs. They're the same job, done well. A past president of the AFP-NJ Chapter with degrees from Temple, Saint Mary's, and North Park University, she leads Catapult's client services team with the conviction that a nonprofit partner should never have to wonder what's happening with their campaign, because Gwen already told them.",
  },
  {
    name: "Jeff J. Grandy, M.Ed",
    role: "Vice President of Client Development",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/52219736-dfaf-4dd5-9a66-c758720799cb.png",
    bio: "Jeff has spent 15 years proving that fundraising can be taught, mentored, and passed forward. He's an instructor in UNLV's Nonprofit Management program and a past president of AFP's Texas Coastal Bend chapter. He brings that same teaching instinct to every new Catapult partnership, helping first-time clients understand not just what will happen in their campaign, but why each step matters.",
  },
  {
    name: "Tina Romero",
    role: "Director of Campaign Services",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/20b29291-5afc-4a87-8c36-2e8d74c8bc41.png",
    bio: "Tina has spent 15+ years connecting organizations, including the Atomic Museum and the Neon Museum, with the supporters who believe in them most. Her gift is strategic creativity: finding the initiative or the story that turns a routine campaign touchpoint into a moment donors remember. She leads with a clear conviction, that positive change starts with people who feel truly connected to a cause.",
  },
  {
    name: "Kayla Jones",
    role: "Engagement Center Director",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/c886d71f-9d5b-4345-ae0a-b05e7b5fda0a.png",
    bio: "For nearly a decade, Kayla has led Catapult's engagement team, training hundreds of Engagement Officers and personally shaping what a great donor conversation sounds like. She believes every single call is a chance to make someone's day, not just their ask, and that belief is exactly why Catapult's donor experience consistently outperforms a typical outreach program, one caller at a time.",
  },
  {
    name: "Desiree Potter",
    role: "Information Services Manager",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/d2d96ea1-acb5-4c31-ba24-6093fa43384e.png",
    bio: "Behind every flawless campaign letter and perfectly segmented donor list is Desiree. With nearly 15 years of database leadership experience, she's the reason Catapult's personalization actually works at scale, turning raw donor data into the kind of precision that makes a mailed letter feel like it was written just for an audience of one, every single time.",
  },
  {
    name: "Sean Jones",
    role: "Database Manager",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/2b7cd57c-ca8d-4a37-a37f-ff4378b44533.png",
    bio: "Sean built a 19-year career in higher education data management before joining Catapult, where he designs custom Microsoft Access databases and automated reporting for every client campaign. He spent nearly two decades at UNLV's Financial Aid office, rising through five roles and supervising staff of up to 11 people. A UNLV philosophy graduate, Sean brings that same rigor to every donor database he builds.",
  },
  {
    name: "Jackie Goodman",
    role: "Client Coordinator",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/d11bc880-1ca9-4abc-bb4e-39af2b01e888.png",
    bio: "For over three years, Jackie led major gift research for Catapult's campaign services team, shaping the prospect intelligence behind every feasibility study and quiet-phase strategy. She's since brought that same precision to campaign accounts, pairing a background in real estate with a genuine talent for finding the smartest technology to help a mission move forward.",
  },
  {
    name: "David Beasley, PhD",
    role: "Senior Writer",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/8d8caac4-2594-4239-a897-915d453f6a47.png",
    bio: "David turns a case for support into a case donors can't put down. With degrees from Roanoke College, Virginia Commonwealth University, and a PhD from UNLV, he's as much a coach as a writer, pushing clients to find the sharpest, truest version of their own story, then shaping that story into language that moves people to give, and keep on giving.",
  },
  {
    name: "Bates Childress",
    role: "Consultant",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/8c998b15-db23-4d49-bedf-9bb96d0f0b2e.png",
    bio: "In more than 40 years of nonprofit work, Bates has stewarded donor relationships that resulted in seven-figure gifts, the kind of outcome that only comes from genuine, patient trust-building. A member of AFP, Together SC, and the Charleston Metropolitan Chamber of Commerce, Bates brings a steady, principled hand to every legacy giving conversation Catapult leads, always with an eye on the donor's long-term legacy.",
  },
  {
    name: "Dan Pinto",
    role: "Consultant",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/426ea084-333a-4f76-b7f1-83ea31d986d2.png",
    bio: "Dan spent a decade as Director of Planned Giving at Rider University, where he raised over $50 million in new planned and major gifts and secured the largest blended gift in the University's history. A Certified Financial Planner and former Merrill Lynch advisor, Dan pairs financial fluency with an actor's gift for connection, built across 25 years on national television, to help donors feel heard.",
  },
  {
    name: "Ray Watts, CSPG",
    role: "Consultant",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/fb67d664-1eab-49b7-9e05-b5478e1bb0f8.png",
    bio: "Ray led the fundraising team behind Claremont McKenna College's historic $1.076 billion campaign, the first liberal arts college ever to surpass $1 billion in a single effort. A Certified Specialist in Planned Giving with more than two decades at Redlands and Claremont McKenna, Ray brings seasoned campaign leadership and a lifelong commitment to philanthropic education to every client relationship.",
  },
  {
    name: "Jon Dize, CFRE",
    role: "Consultant",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/20fb7cc5-85f6-4b75-aa8c-a9080d35762a.png",
    bio: "Jon has spent over three decades building fundraising programs from the ground up, from founding North Street Development Advisors to creating a statewide scholarship granting organization from scratch. A CFRE with deep roots in faith-based and educational institutions, Jon brings a builder's instinct for capital campaigns, planned giving, and advancement offices that need to be started, or started over.",
  },
];

const VALUES = [
  {
    icon: Building,
    title: "One firm, every phase",
    description:
      "We are the only national firm that stays with a client from planning through public-phase calling, with no hand-offs between vendors and no lost institutional knowledge.",
  },
  {
    icon: Users,
    title: "Donor-centered, not transactional",
    description:
      "Every prospect is treated like a major donor-in-waiting, whether the ask is $50 or $5 million. That philosophy is why our participation rates run ahead of industry norms.",
  },
  {
    icon: Award,
    title: "Accountability built in",
    description:
      "Trained and monitored Engagement Officers, along with transparent reporting, mean your board sees exactly how the campaign is progressing at every stage.",
  },
];

export const metadata = {
  title: "About Catapult Fundraising | Leadership & Team",
  description:
    "Catapult Fundraising was founded to close a gap in the industry: firms that plan campaigns rarely execute the public phase, and calling firms rarely understand campaign strategy. We do both, as one accountable team.",
  keywords: [
    "nonprofit fundraising consultant",
    "capital campaign consulting firm",
    "fundraising leadership team",
    "Catapult Fundraising",
  ],
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Catapult"
        title="Built on the belief that proven fundraising practice catapults donors to their next level of giving."
        description="Catapult Fundraising was founded to close a gap in the industry: firms that plan campaigns rarely execute the public phase, and calling firms rarely understand campaign strategy. We do both, as one accountable team."
        backgroundImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/6d87d722-c1cc-47ac-82d6-2675e8c2162e.jpeg"
      />

      <section className="relative -mt-1">
        <div className="relative h-[320px] w-full overflow-hidden sm:h-[420px]">
          <Image
            src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/fe9b1561-bc45-465c-8683-06df1c97e73b.jpeg"
            alt="Catapult campaign strategists reviewing case materials"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--paper))] via-transparent to-transparent" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border border-[rgb(var(--line))] bg-white p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--navy))]/5">
                <v.icon className="h-5 w-5 text-[rgb(var(--brass))]" />
              </span>
              <h3 className="mt-6 font-display text-[25px] text-[rgb(var(--navy))]">{v.title}</h3>
              <p className="mt-3 text-xl leading-relaxed text-[rgb(var(--ink))]/70">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <p className="font-display text-xl sm:text-[22.5px] uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
            Leadership
          </p>
          <h2 className="mt-4 max-w-3xl font-display text-6xl tracking-tight text-[rgb(var(--navy))] sm:text-[75px]">
            A team of storytellers, strategists, and lifelong believers in the mission.
          </h2>

          <div className="mt-14 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {LEADERSHIP.map((member) => (
              <div key={member.name} className="flex flex-col items-start">
                <div className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-[rgb(var(--paper))] shadow-md">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-[rgb(var(--navy))]/10" />
                </div>
                <h3 className="mt-5 font-display text-[25px] text-[rgb(var(--navy))]">{member.name}</h3>
                <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                  {member.role}
                </p>
                <p className="mt-3 text-xl leading-relaxed text-[rgb(var(--ink))]/70">{member.bio}</p>
              </div>
           ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
