// Salvation Army wording is independent of the other clients' board review.
export const SA_CHOICES = [
 {key:'A',label:'A = Fully comfortable making the ask to this prospect directly'},
 {key:'B',label:'B = Comfortable with you using my name in making the ask, and will make a follow-up call after you send the pitch'},
 {key:'C',label:'C = Not comfortable making an ask, but I know the prospect and am fine with you mentioning my name in the pitch'},
 {key:'D',label:"D = I don't know this prospect, but I have another good contact at the organization (please insert their name in the comments below and whether you’re open to making the ask or having us use your name in the pitch)"},
] as const;
export const LEGACY_CHOICES:Record<string,string>={A:'Fully comfortable making the ask to this prospect, serving as the primary solicitor',B:'Comfortable in a secondary solicitor role with this prospect',C:'Not comfortable making an ask, but could serve as a door opener to this prospect',D:"Don't know this prospect",O:'Other'};
