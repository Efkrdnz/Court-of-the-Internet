/* Seed content: original, harmless, petty crimes. */
import type { AvatarConfig } from "../src/lib/avatar";

export interface SeedUser {
  username: string;
  displayName: string;
  bio: string;
  avatar: AvatarConfig;
  role?: "ADMIN" | "MODERATOR";
  theme?: string;
}

export const SEED_USERS: SeedUser[] = [
  { username: "judge_wigsworth", displayName: "Judge Wigsworth", bio: "Presiding owl. Has never once removed the wig.", avatar: { species: "owl", headwear: "judge-wig", accessory: "reading-glasses", backdrop: "burgundy" }, role: "ADMIN", theme: "mahogany" },
  { username: "counselor_coo", displayName: "Counselor Coo", bio: "Pigeon attorney. Billable hours paid in breadcrumbs.", avatar: { species: "pigeon", headwear: "barrister-wig", accessory: "bowtie", backdrop: "teal" }, theme: "parchment" },
  { username: "da_rascal", displayName: "D.A. Rascal", bio: "I point at evidence. Professionally.", avatar: { species: "raccoon", headwear: "bowler", accessory: "monocle", backdrop: "charcoal" }, theme: "midnight" },
  { username: "hammy_the_accused", displayName: "Hammy", bio: "Innocent until proven hungry.", avatar: { species: "hamster", headwear: "none", accessory: "none", backdrop: "gold" } },
  { username: "juror_whiskers", displayName: "Whiskers, Esq.", bio: "Has judged you silently since 2019.", avatar: { species: "cat", headwear: "beret", accessory: "reading-glasses", backdrop: "plum" } },
  { username: "fresh_intern", displayName: "The New Intern", bio: "Where is the coffee machine.", avatar: { species: "frog", headwear: "none", accessory: "none", backdrop: "ivory" } },
  { username: "clerk_pemberton", displayName: "Clerk Pemberton", bio: "Keeper of the docket. Smells of toner.", avatar: { species: "bulldog", headwear: "bowler", accessory: "reading-glasses", backdrop: "ivory" }, role: "MODERATOR" },
  { username: "baron_von_snack", displayName: "Baron von Snack", bio: "Aristocrat of the vending machine.", avatar: { species: "bulldog", headwear: "barrister-wig", accessory: "monocle", backdrop: "gold" } },
  { username: "litigious_llama", displayName: "Litigious Llama", bio: "Will sue for emotional damages. Has done so twice.", avatar: { species: "goose", headwear: "beret", accessory: "bowtie", backdrop: "teal" } },
  { username: "captain_crumbs", displayName: "Captain Crumbs", bio: "Leaves a trail. Always.", avatar: { species: "hamster", headwear: "bowler", accessory: "none", backdrop: "burgundy" } },
  { username: "dame_drama", displayName: "Dame Drama", bio: "Objection! (to everything)", avatar: { species: "cat", headwear: "barrister-wig", accessory: "monocle", backdrop: "burgundy" } },
  { username: "the_honorable_toast", displayName: "The Honorable Toast", bio: "Lightly buttered. Firmly impartial.", avatar: { species: "owl", headwear: "beret", accessory: "bowtie", backdrop: "gold" } },
  { username: "pixel_paralegal", displayName: "Pixel Paralegal", bio: "Gaming offenses specialist. Has seen things.", avatar: { species: "frog", headwear: "bowler", accessory: "reading-glasses", backdrop: "charcoal" } },
  { username: "sock_goblin", displayName: "Sock Goblin", bio: "Took one sock from every laundry since 2015.", avatar: { species: "raccoon", headwear: "beret", accessory: "none", backdrop: "plum" } },
  { username: "nachovsky", displayName: "Nachovsky", bio: "Cheese first, questions later.", avatar: { species: "pigeon", headwear: "bowler", accessory: "monocle", backdrop: "gold" } },
  { username: "lady_overruled", displayName: "Lady Overruled", bio: "Sustained by spite and iced coffee.", avatar: { species: "goose", headwear: "barrister-wig", accessory: "reading-glasses", backdrop: "ivory" } },
  { username: "mister_mistrial", displayName: "Mister Mistrial", bio: "Every jury I'm on ends in chaos. Coincidence.", avatar: { species: "frog", headwear: "barrister-wig", accessory: "bowtie", backdrop: "plum" } },
  { username: "sergeant_spoiler", displayName: "Sergeant Spoiler", bio: "He dies at the end. (Who? Exactly.)", avatar: { species: "bulldog", headwear: "beret", accessory: "none", backdrop: "charcoal" } },
  { username: "duchess_of_dishes", displayName: "Duchess of Dishes", bio: "The sink is my courtroom.", avatar: { species: "cat", headwear: "bowler", accessory: "bowtie", backdrop: "teal" } },
  { username: "quiet_quokka", displayName: "Quiet Quokka", bio: "Smiles through every verdict.", avatar: { species: "hamster", headwear: "beret", accessory: "reading-glasses", backdrop: "teal" } },
  { username: "gavel_gremlin", displayName: "Gavel Gremlin", bio: "Bangs the gavel. Any gavel. Yours too.", avatar: { species: "raccoon", headwear: "none", accessory: "bowtie", backdrop: "gold" } },
  { username: "attorney_at_paw", displayName: "Attorney at Paw", bio: "Pet-related incidents only. Fee: one treat.", avatar: { species: "bulldog", headwear: "none", accessory: "bowtie", backdrop: "burgundy" } },
  { username: "mx_meowington", displayName: "Mx. Meowington", bio: "Professional side-eye. Amateur napper.", avatar: { species: "cat", headwear: "none", accessory: "monocle", backdrop: "charcoal" } },
  { username: "brief_encounter", displayName: "Brief Encounter", bio: "My legal briefs are very brief.", avatar: { species: "pigeon", headwear: "beret", accessory: "reading-glasses", backdrop: "plum" } },
  { username: "the_fry_witness", displayName: "The Fry Witness", bio: "I saw who took the last fry. I'll never tell.", avatar: { species: "owl", headwear: "bowler", accessory: "none", backdrop: "teal" } },
  { username: "judge_mental", displayName: "Judge Mental", bio: "Not a real judge. Very judgmental.", avatar: { species: "goose", headwear: "none", accessory: "monocle", backdrop: "burgundy" } },
  { username: "objection_otter", displayName: "Objection Otter", bio: "Holds hands with the jury. Metaphorically.", avatar: { species: "frog", headwear: "beret", accessory: "monocle", backdrop: "gold" } },
  { username: "petty_crimes_unit", displayName: "Petty Crimes Unit", bio: "We investigate the small stuff so you don't have to.", avatar: { species: "owl", headwear: "none", accessory: "bowtie", backdrop: "charcoal" } },
];

export interface SeedCase {
  accused: string;
  title: string;
  category: string;
  confession: string;
  context?: string;
  anonymous?: boolean;
  defense?: string;
  prosecution?: string;
  /** Probability each juror votes guilty. */
  guilt?: number;
  jurors?: number;
  /** Force an exact tally (guilty, not guilty). */
  tally?: [number, number];
  attorney?: string;
  prosecutor?: string;
  reactions?: Partial<Record<"HILARIOUS" | "OUTRAGEOUS" | "LEGENDARY" | "RELATABLE", number>>;
}

/** Fully tried cases that will end up in the archives. */
export const CLOSED_CASES: SeedCase[] = [
  {
    accused: "hammy_the_accused",
    title: "I ate my roommate's pizza and blamed his girlfriend",
    category: "food-crimes",
    confession:
      "There were two slices left in the box with his name on it. I ate both at 3am, then left the empty box next to her handbag so the evidence pointed elsewhere. They argued for an hour. I made popcorn.",
    context: "She doesn't even like pepperoni, which makes the frame job worse.",
    defense:
      "Your Honour, the box said his name, not 'do not eat.' My client merely interpreted the label as a dedication. As for the handbag: placing trash near a bag is a known act of tidiness. The real crime is leaving two slices unattended in a shared fridge.",
    prosecution:
      "The defense wants you to believe this was tidiness. Tidy people do not stage evidence next to a handbag. Tidy people do not make popcorn while a relationship crumbles. This was a premeditated pepperoni heist with a frame job on the side.",
    guilt: 0.85,
    jurors: 16,
    attorney: "counselor_coo",
    prosecutor: "da_rascal",
    reactions: { HILARIOUS: 14, OUTRAGEOUS: 9, LEGENDARY: 11, RELATABLE: 3 },
  },
  {
    accused: "pixel_paralegal",
    title: "I secretly unplugged my friend's controller so I could win",
    category: "gaming-offenses",
    confession:
      "Final round, sudden death. I pretended to stretch, nudged the cable loose with my foot, and won while he screamed at a frozen character. He blamed the console. He bought a new console.",
    defense:
      "The cable was already loose, Your Honour. My client's foot merely confirmed what fate had decided. Furthermore, the new console has better graphics. My client is not a cheater; he is a hardware upgrade consultant.",
    prosecution:
      "He 'stretched.' Members of the jury, nobody stretches during sudden death. He let his best friend spend money on a new console instead of confessing. That is not consulting. That is sabotage with a receipt.",
    guilt: 0.78,
    jurors: 14,
    attorney: "brief_encounter",
    prosecutor: "lady_overruled",
    reactions: { HILARIOUS: 8, OUTRAGEOUS: 6, RELATABLE: 5, LEGENDARY: 2 },
  },
  {
    accused: "sock_goblin",
    title: "I told my Discord I was asleep while playing another game",
    category: "group-chat-treason",
    confession:
      "Set my status to 'going to bed, goodnight legends.' Then I played four hours of a different game with different friends. Forgot to turn off activity status. They saw everything.",
    defense:
      "My client said 'going to bed.' He did not say 'going to sleep.' Many people game in bed. The defense rests on the precise and beautiful ambiguity of the English language.",
    prosecution:
      "'Goodnight legends.' He called them legends, members of the jury, and then betrayed them for a lesser game with lesser legends. The activity status is a sworn witness and it does not lie.",
    guilt: 0.62,
    jurors: 13,
    attorney: "litigious_llama",
    prosecutor: "judge_mental",
    reactions: { HILARIOUS: 6, RELATABLE: 12, LEGENDARY: 1 },
  },
  {
    accused: "sergeant_spoiler",
    title: "I spoiled an anime ending because my friend called it mid",
    category: "spoilers-hot-takes",
    confession:
      "He said the show I love was 'mid.' So I calmly explained the entire final arc to him, including the twist, during his commute, by voice memo. Eleven minutes long.",
    defense:
      "My client was provoked. 'Mid' is fighting words in at least three fandoms. And if the show was truly mid, as alleged, then nothing of value was spoiled. Either the show matters or it doesn't. Checkmate, prosecution.",
    prosecution:
      "An eleven-minute voice memo. Members of the jury, this was not a reaction; it was a podcast. He narrated the twist with dramatic pauses. Revenge served cold, through earbuds, on public transport.",
    guilt: 0.7,
    jurors: 15,
    attorney: "dame_drama",
    prosecutor: "da_rascal",
    reactions: { HILARIOUS: 10, OUTRAGEOUS: 13, LEGENDARY: 4 },
  },
  {
    accused: "the_fry_witness",
    title: "I stole one French fry from everyone at the table",
    category: "petty-theft",
    confession:
      "Group dinner, eight people. While everyone looked at the dessert menu, I took exactly one fry from each plate. Nobody noticed. I ate eight fries and ordered no fries.",
    defense:
      "One fry per person is not theft; it's a tax. My client redistributed potato wealth across the table so that no single diner was burdened by excess. Each victim lost one fry. Each victim lived.",
    prosecution:
      "He ordered no fries. Read that again. This was a coordinated, table-wide skimming operation, executed during the dessert menu, the most vulnerable moment of any meal. Call it what it is.",
    guilt: 0.45,
    jurors: 18,
    attorney: "counselor_coo",
    prosecutor: "gavel_gremlin",
    reactions: { HILARIOUS: 16, RELATABLE: 9, LEGENDARY: 12, OUTRAGEOUS: 2 },
  },
  {
    accused: "duchess_of_dishes",
    title: "I soaked one pan for nine days to win a chore standoff",
    category: "roommate-disputes",
    confession:
      "It was my turn to wash the lasagna pan. I put water in it and declared it 'soaking.' Day nine, my roommate washed it in silent fury. I said thank you. I have never felt more powerful.",
    defense:
      "Soaking is a legitimate cleaning technique endorsed by grandmothers everywhere. My client simply soaked with commitment. Is it a crime to be thorough? The pan has never been cleaner.",
    prosecution:
      "Nine days. Members of the jury, by day four that pan had developed its own ecosystem. 'Soaking' was a hostage situation, and the hostage was a lasagna pan. The defendant even said thank you. Monstrous.",
    guilt: 0.9,
    jurors: 12,
    attorney: "attorney_at_paw",
    prosecutor: "lady_overruled",
    reactions: { OUTRAGEOUS: 11, RELATABLE: 10, HILARIOUS: 7 },
  },
  {
    accused: "captain_crumbs",
    title: "I let the dog take the blame for the missing croissant",
    category: "pet-related",
    confession:
      "My partner bought a croissant for the morning. I ate it at midnight. In the morning I looked at the dog, then at the empty bag, then at my partner, and said nothing. The dog got no treats that day.",
    defense:
      "My client never accused the dog. Silence is not testimony. If the household jumped to conclusions about a good boy, that is a failure of the investigation, not of my client's character.",
    prosecution:
      "He LOOKED at the dog. Members of the jury, that look was an accusation as clear as any signed statement. A good boy lost his treats over a croissant he never touched. Justice for the dog.",
    guilt: 0.92,
    jurors: 17,
    attorney: "nachovsky",
    prosecutor: "da_rascal",
    reactions: { OUTRAGEOUS: 15, LEGENDARY: 10, HILARIOUS: 6 },
  },
  {
    accused: "baron_von_snack",
    title: "I labelled my office leftovers 'experimental sample' so nobody would eat them",
    category: "workplace-shenanigans",
    confession:
      "People kept stealing my lunch from the office fridge. So I put my curry in a jar labelled 'EXPERIMENTAL SAMPLE: DO NOT CONSUME' with a hand-drawn biohazard symbol. HR got involved.",
    defense:
      "My client was the victim of serial lunch theft. He did not lie: every curry is an experiment. HR's involvement proves only that the deterrent was effective. Nobody has stolen his lunch since.",
    prosecution:
      "A biohazard symbol, members of the jury. Facilities evacuated half of the fourth floor. Two people cried. The defendant ate his curry on the curb outside while the building was cleared. He was smiling.",
    guilt: 0.35,
    jurors: 14,
    attorney: "brief_encounter",
    prosecutor: "mister_mistrial",
    reactions: { HILARIOUS: 18, LEGENDARY: 13, OUTRAGEOUS: 4 },
  },
  {
    accused: "quiet_quokka",
    title: "I wore socks with sandals to a wedding on purpose",
    category: "fashion-crimes",
    confession:
      "The invitation said 'comfortable formal.' I took that literally: suit, tie, white socks, sandals. I am in every group photo. The bride has asked for the photos to be 'edited.'",
    defense:
      "'Comfortable formal' is not a dress code; it's a riddle. My client solved it. The suit was formal. The sandals were comfortable. Fault lies with the vague phrasing of the invitation.",
    prosecution:
      "He knew. Members of the jury, there is a version of this where he wears loafers. He chose violence in white cotton. Those photos are evidence and will be shown at every family gathering forever.",
    guilt: 0.5,
    jurors: 10,
    tally: [5, 5],
    attorney: "dame_drama",
    prosecutor: "gavel_gremlin",
    reactions: { HILARIOUS: 9, RELATABLE: 2, OUTRAGEOUS: 5 },
  },
  {
    accused: "nachovsky",
    title: "I replied 'on my way' while still in the shower",
    category: "social-misconduct",
    confession:
      "Friend texted 'are you close?' I replied 'on my way!' while shampooing. Arrived forty minutes late and blamed traffic. There was no traffic. I live four minutes away.",
    defense:
      "Philosophically, we are all on our way. My client was mentally committed and physically lathered. Traffic exists in many forms, including the traffic of one's own thoughts in the shower.",
    prosecution:
      "He lives four minutes away. FOUR. The defense calls it philosophy; I call it a forty-minute lie with conditioner in it. Everyone in this room has been on the receiving end of this crime.",
    guilt: 0.8,
    jurors: 15,
    attorney: "objection_otter",
    prosecutor: "judge_mental",
    reactions: { RELATABLE: 19, HILARIOUS: 8, LEGENDARY: 3 },
  },
  {
    accused: "litigious_llama",
    title: "I accidentally said 'love you' to my dentist and then committed to it",
    category: "romance-blunders",
    confession:
      "End of the appointment, autopilot kicked in: 'Thanks, love you.' Panicked, I doubled down and said 'and I mean that.' I have since switched dentists and also cities.",
    defense:
      "Gratitude is a form of love, Your Honour. My client simply expressed sincere appreciation for excellent dental care. The relocation was unrelated and also completely related.",
    prosecution:
      "He doubled down. Members of the jury, the first 'love you' was an accident. 'And I mean that' was a choice. He fled a city rather than face a hygienist. The prosecution asks only for honesty.",
    guilt: 0.25,
    jurors: 13,
    attorney: "counselor_coo",
    prosecutor: "lady_overruled",
    reactions: { HILARIOUS: 20, RELATABLE: 14, LEGENDARY: 9 },
  },
  {
    accused: "dame_drama",
    title: "I muted the family group chat for one full year",
    category: "group-chat-treason",
    confession:
      "Muted it last spring 'for an hour.' Never unmuted. Missed two birthdays, a surprise party I was supposed to organise, and the news that my cousin got a llama.",
    defense:
      "My client prioritised mental peace. The chat sent four hundred minion memes a week. Self-care is not a crime. Also the llama is doing great and nobody needed her input.",
    prosecution:
      "She was supposed to ORGANISE the surprise party. The guest of honour showed up to an empty room and a single balloon. And the llama, members of the jury, was named after her. She didn't know.",
    guilt: 0.83,
    jurors: 14,
    attorney: "attorney_at_paw",
    prosecutor: "da_rascal",
    reactions: { OUTRAGEOUS: 10, HILARIOUS: 11, RELATABLE: 7 },
  },
  {
    accused: "gavel_gremlin",
    title: "I 'borrowed' my sister's hoodie and it is now legally mine",
    category: "petty-theft",
    confession:
      "Borrowed it in 2021. Wore it so much it shaped itself to me. She asked for it back last week and I said it no longer recognises her. I then walked away wearing it.",
    defense:
      "Adverse possession, Your Honour. Open, notorious and continuous use of a hoodie for over two years transfers ownership in the court of sibling law. The hoodie has spoken: it has chosen.",
    prosecution:
      "'It no longer recognises her.' This is not property law; it's a custody battle, and the defendant is claiming the hoodie has Stockholm syndrome. Return the hoodie. Return it now.",
    guilt: 0.4,
    jurors: 16,
    attorney: "lady_overruled",
    prosecutor: "nachovsky",
    reactions: { HILARIOUS: 7, RELATABLE: 15, LEGENDARY: 5 },
  },
  {
    accused: "mx_meowington",
    title: "I reply-all'd my lunch order to the entire company",
    category: "workplace-shenanigans",
    confession:
      "Meant to reply to my desk neighbour: 'Burrito, extra guac, no beans, I'm begging.' Sent to all nine hundred employees, including the CEO. Three people replied with their own orders.",
    defense:
      "My client accidentally launched the most successful internal engagement campaign in company history. Three replies! The CEO now knows his preferences. That is called networking.",
    prosecution:
      "Nine hundred inboxes. 'I'm begging.' The defense calls it networking; IT calls it an incident. The defendant then sent a follow-up asking people to stop replying, which also went to everyone.",
    guilt: 0.55,
    jurors: 12,
    attorney: "brief_encounter",
    prosecutor: "the_honorable_toast",
    reactions: { HILARIOUS: 13, RELATABLE: 11, LEGENDARY: 6 },
  },
  {
    accused: "brief_encounter",
    title: "I pretended to know a band to impress someone and got invited to the concert",
    category: "romance-blunders",
    confession:
      "Claimed I was a huge fan of a band I'd never heard of. They bought two tickets. I spent the entire week memorising lyrics. At the concert I sang the wrong song, loudly, during a guitar solo.",
    defense:
      "My client demonstrated extraordinary commitment: a full week of study for love. Wrong song, right heart. Most people won't even learn the chorus. The defense asks for mercy and a playlist.",
    prosecution:
      "During a guitar solo, members of the jury. There are no words during a guitar solo. He sang into the silence like a lighthouse of lies. The relationship survived; the band's dignity did not.",
    guilt: 0.3,
    jurors: 11,
    attorney: "dame_drama",
    prosecutor: "sergeant_spoiler",
    reactions: { HILARIOUS: 12, RELATABLE: 8, LEGENDARY: 7 },
  },
  {
    accused: "objection_otter",
    title: "I kept the thermostat at my preferred temperature with a fake 'broken' sign",
    category: "roommate-disputes",
    confession:
      "Tired of thermostat wars, I taped a sign on it saying 'BROKEN: LANDLORD COMING TUESDAY.' It has been eleven Tuesdays. The temperature remains perfect. For me.",
    defense:
      "My client ended a war. Peace, Your Honour, has a temperature, and that temperature is the one my client chose. The landlord's schedule is outside my client's control.",
    prosecution:
      "Eleven Tuesdays! The defense calls this peace. Her roommate has been wearing gloves indoors since autumn. This is not a ceasefire; it is climate tyranny enforced by masking tape.",
    guilt: 0.88,
    jurors: 13,
    attorney: "attorney_at_paw",
    prosecutor: "judge_mental",
    reactions: { OUTRAGEOUS: 8, HILARIOUS: 9, LEGENDARY: 4 },
  },
  {
    accused: "fresh_intern",
    title: "I ate the last slice of cake labelled 'for Pat' and I am not Pat",
    category: "food-crimes",
    anonymous: true,
    confession:
      "Office birthday cake, one slice left, a sticky note reading 'for Pat.' I don't know a Pat. Nobody knows a Pat. I ate it. Pat has never come forward.",
    defense:
      "If Pat existed, Pat would have claimed the cake. My client acted to prevent food waste in a Pat-less universe. You cannot steal from a person who may be entirely fictional.",
    prosecution:
      "The note said 'for Pat.' Pat could be anyone. Pat could be in this courtroom. The defendant gambled on Pat's non-existence and won a slice of cake. We may never know the cost.",
    guilt: 0.38,
    jurors: 12,
    attorney: "counselor_coo",
    prosecutor: "da_rascal",
    reactions: { HILARIOUS: 15, LEGENDARY: 8, RELATABLE: 6 },
  },
  {
    accused: "lady_overruled",
    title: "I rage-quit a board game and flipped it 'accidentally'",
    category: "gaming-offenses",
    confession:
      "Losing badly at a property trading game. I stood up to 'get water' and caught the board with my sleeve. Hotels everywhere. I said 'oh no' in the least convincing voice ever recorded.",
    defense:
      "Sleeves are notoriously unpredictable. My client was hydrating, a medically recommended activity. The game was also three hours long, which itself should be a crime.",
    prosecution:
      "'Oh no,' delivered with the emotion of a parking meter. She stood up at the exact moment her opponent landed on her bankrupting square. The sleeve was an accomplice. Convict them both.",
    guilt: 0.93,
    jurors: 15,
    attorney: "objection_otter",
    prosecutor: "gavel_gremlin",
    reactions: { HILARIOUS: 9, RELATABLE: 13, OUTRAGEOUS: 3 },
  },
  {
    accused: "judge_mental",
    title: "I said I'd seen a movie everyone was quoting and just laughed along for a year",
    category: "spoilers-hot-takes",
    confession:
      "Everyone quotes this one movie. I've never seen it. I laugh at every reference. Last week someone asked my favourite scene and I described a scene from a different movie entirely.",
    defense:
      "My client contributed to every single conversation with joy and laughter. Is that not the purpose of cinema? The scene he described was, reportedly, very good.",
    prosecution:
      "A year of fake laughter. Members of the jury, he described a scene with a talking horse. There is no talking horse. There has never been a talking horse. His friends now question everything.",
    guilt: 0.66,
    jurors: 12,
    attorney: "brief_encounter",
    prosecutor: "lady_overruled",
    reactions: { RELATABLE: 16, HILARIOUS: 10 },
  },
  {
    accused: "petty_crimes_unit",
    title: "I took a cookie from the 'please take one' bowl. I took eleven.",
    category: "petty-theft",
    confession:
      "The sign said 'please take one.' I interpreted it as encouragement. I took eleven over the course of the afternoon in separate trips, wearing a different hat each time.",
    defense:
      "The sign said please, Your Honour. My client was being polite: he simply honoured the request eleven times. The hats show respect for the dress code of a bakery.",
    prosecution:
      "Different hats, members of the jury. That is not politeness; that is a disguise. A man who changes hats eleven times for cookies knows exactly what he is doing. The bowl was empty by three.",
    guilt: 0.75,
    jurors: 14,
    attorney: "nachovsky",
    prosecutor: "da_rascal",
    reactions: { HILARIOUS: 12, LEGENDARY: 10, OUTRAGEOUS: 3 },
  },
  {
    accused: "attorney_at_paw",
    title: "I trained my cat to sit on my partner's side of the bed",
    category: "pet-related",
    confession:
      "Used treats for two months to teach the cat to sleep exactly on my partner's pillow. Now every night they politely sleep on the edge rather than move the cat. I have the middle.",
    defense:
      "My client merely rewarded a cat for being comfortable. The cat chose the pillow; my client chose to encourage the cat's dreams. The partner could move the cat at any time and chooses not to.",
    prosecution:
      "Two months of treats, members of the jury. This was a long con with a furry accomplice. The partner sleeps on a ledge. The defendant sleeps like royalty. The cat is being paid. Follow the treats.",
    guilt: 0.72,
    jurors: 16,
    attorney: "dame_drama",
    prosecutor: "the_honorable_toast",
    reactions: { HILARIOUS: 14, LEGENDARY: 9, OUTRAGEOUS: 6 },
  },
  {
    accused: "the_honorable_toast",
    title: "I photoshopped myself into a friend's vacation photos",
    category: "miscellaneous-mischief",
    confession:
      "They went on a trip without me. So I edited myself into every single photo in their album, very badly, and sent them back. Grandma framed one. I am floating slightly above the beach.",
    defense:
      "My client was emotionally present on that vacation. He merely made the photos accurately reflect his spiritual attendance. Grandma is happy. Who here would deny Grandma?",
    prosecution:
      "He is floating, members of the jury. He is hovering over a beach with a shadow pointing the wrong way, and Grandma has hung it in the hallway. Every family dinner is now a crime scene.",
    guilt: 0.2,
    jurors: 15,
    attorney: "counselor_coo",
    prosecutor: "mister_mistrial",
    reactions: { HILARIOUS: 17, LEGENDARY: 15, RELATABLE: 2 },
  },
  {
    accused: "juror_whiskers",
    title: "I pretended my phone died to escape a group project call",
    category: "social-misconduct",
    confession:
      "Group call about our presentation was dragging. I said 'my battery is at one perc' and hung up mid-word. Then I posted a story from the same phone twenty minutes later.",
    defense:
      "Phones are complicated machines. Batteries recover. My client experienced a miracle of lithium, and like any miracle, chose to share it with the world via story.",
    prosecution:
      "'One perc.' He cut himself off mid-word for realism. That is method acting. And then, members of the jury, he posted a story. A dying phone does not post a story with a dog filter.",
    guilt: 0.86,
    jurors: 12,
    attorney: "litigious_llama",
    prosecutor: "sergeant_spoiler",
    reactions: { RELATABLE: 12, HILARIOUS: 9 },
  },
  {
    accused: "mister_mistrial",
    title: "I renamed the home wifi to guilt my roommates into cleaning",
    category: "roommate-disputes",
    confession:
      "Changed the wifi name to 'WHO LEFT THE PAN' and the password to 'washthepan'. It worked once. Now I can't change it back because I forgot the router login.",
    defense:
      "My client used a public notice system to resolve a community issue. Effective, transparent, and still broadcasting to the whole street. That's civic engagement.",
    prosecution:
      "The neighbours can see it, members of the jury. The entire building now associates this flat with a pan. The defendant has turned a domestic dispute into a permanent public broadcast.",
    guilt: 0.5,
    jurors: 4,
    attorney: "objection_otter",
    prosecutor: "gavel_gremlin",
    reactions: { HILARIOUS: 5, RELATABLE: 4 },
  },
  {
    accused: "counselor_coo",
    title: "I hid the last good mug behind the cereal so only I would find it",
    category: "roommate-disputes",
    confession:
      "There is one perfect mug in our flat: big, heavy, perfect handle. Every evening I wash it and hide it behind the cereal boxes. My housemates think it was broken months ago.",
    defense:
      "My client protects a national treasure from careless hands. The mug is safe, cherished and washed daily. If anything, this is a heritage preservation programme.",
    prosecution:
      "They think it's BROKEN. They held a little moment of silence, members of the jury. Meanwhile the defendant sips tea from it every night like a villain in a cardigan.",
    guilt: 0.8,
    jurors: 13,
    attorney: "attorney_at_paw",
    prosecutor: "da_rascal",
    reactions: { HILARIOUS: 8, OUTRAGEOUS: 7, RELATABLE: 9 },
  },
];

/** Cases currently with the jury (deliberation ends in the future). */
export const DELIBERATION_CASES: SeedCase[] = [
  {
    accused: "hammy_the_accused",
    title: "I said 'one more episode' and watched the whole season alone",
    category: "spoilers-hot-takes",
    confession:
      "My partner fell asleep during episode three. I said 'I'll just watch one more and rewatch it with you.' I watched seven more. I have been faking surprise for a week.",
    defense:
      "My client is protecting his partner from disappointment by pre-screening content. He will be the best surprised viewer of the season. That's a service.",
    prosecution:
      "Seven episodes, members of the jury, and a week of fake gasps. He gasped at a twist he'd already seen and then said 'I didn't see that coming.' The prosecution saw it coming.",
    jurors: 6,
    guilt: 0.7,
    attorney: "lady_overruled",
    prosecutor: "judge_mental",
  },
  {
    accused: "baron_von_snack",
    title: "I ate the decorative fruit at a fancy hotel",
    category: "food-crimes",
    confession:
      "The lobby had a gorgeous fruit sculpture. I assumed it was free. It was not food. It was art. I have eaten a pineapple that was part of an installation.",
    defense:
      "Art is meant to be consumed, Your Honour. My client simply engaged with the piece more deeply than most visitors. Critics would call it an interactive experience.",
    prosecution:
      "The plaque said 'Do Not Touch: Still Life in Citrus.' He ate the still life. He was asked to leave the lobby while holding the crown of the pineapple like a trophy.",
    jurors: 8,
    guilt: 0.6,
    attorney: "counselor_coo",
    prosecutor: "the_honorable_toast",
  },
  {
    accused: "sock_goblin",
    title: "I wore my roommate's slippers for a month without asking",
    category: "petty-theft",
    confession:
      "His slippers are better than mine. Every morning after he leaves I wear them, then put them back slightly warm. He thinks the house has excellent underfloor heating.",
    defense:
      "My client provides a slipper pre-warming service, free of charge. The roommate's feet have never been happier. No slipper has been harmed.",
    prosecution:
      "He has convinced a man his floor is heated. This is gaslighting through footwear, members of the jury, and the slippers are evidence that is still warm.",
    jurors: 3,
    guilt: 0.8,
    attorney: "nachovsky",
    prosecutor: "gavel_gremlin",
  },
  {
    accused: "captain_crumbs",
    title: "I used a fake name at the coffee shop for two years",
    category: "social-misconduct",
    confession:
      "Told the barista my name was 'Maximilian' as a joke. They remembered. Two years later they greet me by name and ask about Maximilian's mother. I have invented a whole family.",
    defense:
      "My client built a rich inner world for the joy of a hardworking barista. Maximilian's mother is recovering nicely, thank you. Kindness through fiction is still kindness.",
    prosecution:
      "He sent a postcard 'from Maximilian's holiday.' Members of the jury, the barista put it on the tip jar. This lie has a postcard. This lie has grown legs and a family tree.",
    jurors: 9,
    guilt: 0.5,
    attorney: "brief_encounter",
    prosecutor: "lady_overruled",
  },
  {
    accused: "duchess_of_dishes",
    title: "I took the window seat that wasn't mine and pretended to sleep",
    category: "social-misconduct",
    confession:
      "Long train ride. I sat in a window seat that belonged to someone else, put my hood up, and fake-snored when they arrived. They sat in the aisle seat. For six hours. I couldn't go to the bathroom.",
    defense:
      "My client suffered too, Your Honour. Six hours without a bathroom break is its own punishment. Justice has, in a sense, already been served by her bladder.",
    prosecution:
      "Fake snoring, members of the jury. Six hours of fake snoring. The victim offered her a mint at hour four. She pretended to sleep through the mint. Who refuses a mint?",
    jurors: 5,
    guilt: 0.85,
    attorney: "dame_drama",
    prosecutor: "da_rascal",
  },
  {
    accused: "quiet_quokka",
    title: "I blamed a phantom 'auto-correct' for a text I meant to send",
    category: "group-chat-treason",
    confession:
      "Texted the group chat that someone's new haircut 'looks like a broom.' When they replied, I said autocorrect changed 'bloom.' There is no autocorrect that does that.",
    defense:
      "Autocorrect is a chaotic force, unknowable to mortals. My client is a victim of predictive text, which predicted, accurately, how everyone felt.",
    prosecution:
      "'Looks like a bloom.' Members of the jury, nobody has ever complimented a haircut by comparing it to a flower in that sentence structure. He had a thesaurus and a getaway plan.",
    jurors: 7,
    guilt: 0.75,
    attorney: "objection_otter",
    prosecutor: "mister_mistrial",
  },
];

/** Defense filed, waiting for a prosecutor. */
export const AWAITING_PROSECUTION_CASES: SeedCase[] = [
  {
    accused: "pixel_paralegal",
    title: "I used my little brother as a human shield in a co-op game",
    category: "gaming-offenses",
    confession:
      "Zombie game, final wave. I told him 'go check that door, I've got you covered.' I did not have him covered. I escaped in the helicopter alone and played the victory music out loud.",
    defense:
      "My client made a strategic sacrifice that guaranteed a team victory. Every great general understands the cost of war. The little brother is a hero, and heroes don't need helicopters.",
    attorney: "counselor_coo",
  },
  {
    accused: "juror_whiskers",
    title: "I return library books one day late on purpose to feel alive",
    category: "miscellaneous-mischief",
    confession:
      "Every book I borrow, I return exactly one day late. I pay the tiny fine with exact change and a little bow. The librarian knows. The librarian has started bowing back.",
    defense:
      "My client funds the public library voluntarily, with ceremony. That is philanthropy with a bow on it. The librarian clearly enjoys the ritual, which makes this community theatre.",
    attorney: "lady_overruled",
  },
  {
    accused: "mx_meowington",
    title: "I clapped when the plane landed and encouraged others",
    category: "social-misconduct",
    confession:
      "Smooth landing. I started a slow clap. Nobody joined. I stood up and gestured to the cabin like a conductor. One child clapped. I bowed to the child.",
    defense:
      "My client celebrated the pilot, a skilled professional rarely thanked. The child understood. The child is the future. The rest of the cabin will be judged by history.",
    attorney: "brief_encounter",
  },
  {
    accused: "nachovsky",
    title: "I double-dipped at a party and made eye contact while doing it",
    category: "food-crimes",
    confession:
      "Guacamole, chip, dip, bite, dip again. Our host saw. I held eye contact and dipped a third time. Nobody touched the guacamole after that. I finished it alone.",
    defense:
      "My client claimed the guacamole fairly through a recognised ritual of dominance. The other guests had every opportunity. Hesitation is not a property right.",
    attorney: "attorney_at_paw",
  },
];

/** Freshly confessed, waiting for an attorney. */
export const AWAITING_DEFENSE_CASES: SeedCase[] = [
  {
    accused: "sergeant_spoiler",
    title: "I told the group chat the wrong time so I'd be the first one there",
    category: "group-chat-treason",
    confession:
      "I am always late. So I told everyone the dinner was at eight when it was really at seven-thirty. I arrived at seven-forty-five, the earliest I have ever been, and everyone thought I was early. I felt punctual.",
  },
  {
    accused: "petty_crimes_unit",
    title: "I've been pronouncing a coworker's name wrong for three years and now it's too late",
    category: "workplace-shenanigans",
    confession:
      "On day one I misheard her name. I've used the wrong one confidently ever since. She never corrected me. Now the whole office uses my version. She might have changed her name to match.",
  },
  {
    accused: "fresh_intern",
    title: "I ate the free sample, went around the store, and came back in sunglasses",
    category: "food-crimes",
    confession:
      "Grocery store, cheese samples. Took one. Did a lap. Came back wearing sunglasses and a different accent. Took another. Did this four times. The sample lady said 'nice to see you again, love.'",
    context: "The cheese was excellent. That is my only defense.",
  },
  {
    accused: "gavel_gremlin",
    title: "I let my friend believe a pigeon stole his sandwich. It was me.",
    category: "petty-theft",
    confession:
      "Park bench lunch. He went to the bin, I ate half his sandwich, and pointed at a pigeon. He chased the pigeon for a full minute. The pigeon has a criminal record now, in his mind.",
    anonymous: true,
  },
  {
    accused: "the_fry_witness",
    title: "I pretended to be asleep so I wouldn't have to help carry the shopping",
    category: "roommate-disputes",
    confession:
      "Heard the car pull up with the weekly shop. Lay on the sofa, closed my eyes, did one small fake snore. Woke up dramatically after the last bag came in and said 'oh! you should have woken me.'",
  },
  {
    accused: "litigious_llama",
    title: "I gave my houseplant a name and blamed it for the smell",
    category: "miscellaneous-mischief",
    confession:
      "Guests came over, the flat smelled like old soup. I said 'oh, that's Gerald,' pointing to a fern. Gerald is a fern. Ferns do not smell. Gerald has been taking the blame for months.",
  },
  {
    accused: "objection_otter",
    title: "I wore a borrowed suit to a job interview with the tag still on, and returned it",
    category: "fashion-crimes",
    confession:
      "Bought a suit, tucked the tag in, wore it to the interview, got the job, returned the suit. On my first day I wore a hoodie. They asked if I was the same person.",
  },
];
