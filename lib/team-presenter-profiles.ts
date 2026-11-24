// Existing leadership roles and portraits verified against /our-team.
// Shared by the team bio cards and webinar bylines so they cannot drift.
export const TEAM_PRESENTER_PROFILES = {
  Anthony: {
    id: "anthony-alonso",
    role: "President & CEO",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/5ac6ad8e-2df9-495a-812f-da0bf44735b9.png",
  },
  Jeff: {
    id: "jeff-grandy",
    role: "Vice President of Client Development",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/52219736-dfaf-4dd5-9a66-c758720799cb.png",
  },
  Gwen: {
    id: "gwen-paxon",
    role: "Vice President of Client Services",
    photo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/adaffa6f-1329-4284-b98b-2b6ef9677093.png",
  },
};

export function presenterProfileFor(presenter: string) {
  if (!Object.prototype.hasOwnProperty.call(TEAM_PRESENTER_PROFILES, presenter)) {
    throw new Error("Unknown webinar presenter");
  }
  return TEAM_PRESENTER_PROFILES[presenter as keyof typeof TEAM_PRESENTER_PROFILES];
}
