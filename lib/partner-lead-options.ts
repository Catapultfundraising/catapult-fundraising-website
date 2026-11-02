import type { Partner } from "./partners";

/** Accept only configured choices; never trust destinations sent by a browser. */
export function selectedPartnerChoices(input: unknown, choices: readonly string[] = []): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.filter((v): v is string =>
    typeof v === "string" && choices.includes(v)))).slice(0, choices.length);
}

export function partnerNotificationRecipients(partner: Partner, followUp: readonly string[]): string[] {
  const recipients = [
    ...partner.notify,
    ...(partner.followUpChoices ?? [])
      .filter((choice) => followUp.includes(choice.label))
      .flatMap((choice) => choice.notify ?? []),
  ];
  return Array.from(new Set(recipients.map((email) => email.toLowerCase())));
}
