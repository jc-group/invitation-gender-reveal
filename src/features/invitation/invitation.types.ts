export interface InvitationPlace {
  name: string;
  address: string;
  mapsUrl: string;
}

export interface InvitationRsvp {
  deadline: string;
}

export interface Invitation {
  eyebrow: string;
  intro: string;
  title: string;
  subtitle: string;
  parents: string;
  month: string;
  day: string;
  date: string;
  time: string;
  eventDateIso: string;
  place: InvitationPlace;
  dressCode: string;
  rsvp: InvitationRsvp;
}
