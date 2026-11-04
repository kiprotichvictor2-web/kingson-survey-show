import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  currentQuestion,
  initialState,
  loadState,
  reducer,
  STORAGE_KEY,
  winner,
  type Action,
  type GameState,
  type Question,
  type Team,
} from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KINGSON SURVEY SHOW — Live Game Show" },
      { name: "description", content: "Host a family survey game show live: reveal answers, track strikes and team scores from one tab." },
      { property: "og:title", content: "KINGSON SURVEY SHOW" },
      { property: "og:description", content: "A one-host survey game show built for TikTok LIVE." },
    ],
  }),
  component: Game,
});

type Wrapped = { s: GameState; hydrated: boolean };
function wrapped(w: Wrapped, a: Action | { type: "__load"; s: GameState }): Wrapped {
  if (a.type === "__load") return { s: a.s, hydrated: true };
  return { ...w, s: reducer(w.s, a) };
}

const btn = "rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-35 disabled:cursor-not-allowed";
const btnGold = `${btn} bg-primary text-primary-foreground hover:brightness-110`;
const btnBlue = `${btn} bg-secondary text-secondary-foreground hover:brightness-110`;
const btnGhost = `${btn} border border-border bg-muted text-foreground hover:bg-card`;
const btnDanger = `${btn} bg-destructive text-destructive-foreground hover:brightness-110`;
type TimerState = { duration: number; remaining: number; running: boolean; endsAt: number | null };
const TIMER_KEY = "kingson-survey-show-timer-v1";
const ROUND_KEY = "kingson-survey-show-round-v1";
type RoundMode = "classic" | "double" | "triple" | "bonus";
type BonusAnswer = { text: string; points: number };
type BonusQuestion = { prompt: string; answers: BonusAnswer[] };
const bonusQuestion = (prompt: string, answers: [string,string,string,string,string]): BonusQuestion => ({
  prompt, answers: answers.map((text, i) => ({ text, points: [64,51,37,27,21][i] })),
});
// A separate, large bonus bank. These prompts are not reused from the regular survey bank.
const BONUS_DEFAULTS: BonusQuestion[] = [
  bonusQuestion("Name something people do when they hear surprising news.", ["Ask if it is true","Tell someone else","Gasp or shout","Check their phone","Laugh"]),
  bonusQuestion("What might you see at a traditional celebration?", ["Dancing","Special clothes","Music","Food","Speeches"]),
  bonusQuestion("Name something people do to cheer up a friend.", ["Make them laugh","Give advice","Buy them a treat","Listen to them","Take them out"]),
  bonusQuestion("What is something people do when they win a prize?", ["Celebrate","Thank people","Take photos","Tell family","Share online"]),
  bonusQuestion("Name something you would find backstage at a concert.", ["Microphones","Musical instruments","Speakers","Dressing room","Stage crew"]),
  bonusQuestion("What might make someone cancel a party?", ["Bad weather","Illness","Not enough money","Venue problem","Few guests"]),
  bonusQuestion("Name something people collect as a hobby.", ["Coins","Stamps","Shoes","Action figures","Sports cards"]),
  bonusQuestion("What is something you might see in a beauty salon?", ["Hair dryers","Mirrors","Chairs","Nail polish","Hair products"]),
  bonusQuestion("Name something people do before taking a group photo.", ["Smile","Arrange themselves","Fix their hair","Choose a pose","Check the camera"]),
  bonusQuestion("What might a person do after receiving a love message?", ["Smile","Reply quickly","Read it again","Show a friend","Feel shy"]),
  bonusQuestion("Name something that makes a live show exciting.", ["Audience reactions","Funny moments","Surprise guests","Music","Competition"]),
  bonusQuestion("What might people do during a blackout at a party?", ["Use phone lights","Sing together","Tell stories","Light candles","Go outside"]),
  bonusQuestion("Name something people do when they meet a celebrity.", ["Ask for a photo","Say hello","Ask for an autograph","Get excited","Record a video"]),
  bonusQuestion("What is something you might see at a street festival?", ["Food stalls","Live music","Dancers","Crowds","Decorations"]),
  bonusQuestion("Name something people do to prepare for a big performance.", ["Rehearse","Choose an outfit","Practice lines","Warm up","Calm their nerves"]),
  bonusQuestion("What might make a person laugh during a serious moment?", ["A funny face","A silly noise","An unexpected comment","Remembering a joke","Someone stumbling"]),
  bonusQuestion("Name something people do when they cannot find their way.", ["Ask for directions","Use a map","Check GPS","Call someone","Look for signs"]),
  bonusQuestion("What is something a good team needs to succeed?", ["Teamwork","Communication","Practice","Trust","A good leader"]),
  bonusQuestion("Name something people do after a long day.", ["Rest","Take a shower","Eat","Watch something","Talk to family"]),
  bonusQuestion("What might you find at a community talent show?", ["Singers","Dancers","Comedians","Poets","Musicians"]),
  bonusQuestion("Name something people do to make a guest feel welcome.", ["Greet them warmly","Offer a seat","Serve refreshments","Introduce everyone","Show them around"]),
  bonusQuestion("What is something that can spoil a live broadcast?", ["Poor internet","Power outage","Bad sound","Technical problems","Background noise"]),
  bonusQuestion("Name something people do when their favorite song plays.", ["Sing along","Dance","Turn it louder","Record a video","Call a friend"]),
  bonusQuestion("What might people bring to a picnic besides food?", ["Blanket","Drinks","Games","Music speaker","Camera"]),
  bonusQuestion("Name something that makes a great host.", ["Sense of humor","Confidence","Good listening","Energy","Quick thinking"]),
  bonusQuestion("What might someone do to celebrate a personal achievement?", ["Treat themselves","Tell family","Take photos","Go out","Give thanks"]),
  bonusQuestion("Name something people do while waiting for an important announcement.", ["Check the time","Talk quietly","Pray","Look at the speaker","Use their phone"]),
  bonusQuestion("What is something you might see at a school prize-giving day?", ["Trophies","Certificates","Students","Parents","Speeches"]),
  bonusQuestion("Name something people do when they feel embarrassed.", ["Blush","Laugh nervously","Look away","Apologize","Cover their face"]),
  bonusQuestion("Name something people pack for a weekend trip.", ["Clothes","Toothbrush","Phone charger","Shoes","Travel documents"]),
  bonusQuestion("What might make someone late for work?", ["Traffic","Oversleeping","Public transport delay","Bad weather","Looking for keys"]),
  bonusQuestion("Name something people do to relax on a day off.", ["Sleep in","Watch movies","Visit friends","Go for a walk","Listen to music"]),
  bonusQuestion("What might you find in a busy restaurant?", ["Tables","Waiters","Menus","Food","Customers"]),
  bonusQuestion("Name something people often forget when leaving home.", ["Keys","Phone","Wallet","Lunch","Umbrella"]),
  bonusQuestion("What do people do when they receive unexpected visitors?", ["Welcome them","Offer a seat","Make tea","Tidy up","Prepare food"]),
  bonusQuestion("Name something you might see at a wedding.", ["Bride and groom","Wedding cake","Flowers","Dancing","Photographer"]),
  bonusQuestion("What might people do during a power cut at home?", ["Light candles","Use a torch","Check the fuse","Use phone light","Go outside"]),
  bonusQuestion("Name something people enjoy doing with friends.", ["Chatting","Eating together","Playing games","Going out","Watching films"]),
  bonusQuestion("What might you buy at a supermarket?", ["Food","Drinks","Cleaning products","Toiletries","Snacks"]),
  bonusQuestion("Name something that helps people wake up in the morning.", ["Alarm clock","Coffee","Shower","Sunlight","Someone calling"]),
  bonusQuestion("What might you hear at a football match?", ["Crowd cheering","Whistle","Commentary","Singing","Booing"]),
  bonusQuestion("Name something people do before going to bed.", ["Brush teeth","Set alarm","Pray","Check phone","Change clothes"]),
  bonusQuestion("What might someone do after making a mistake?", ["Apologize","Correct it","Explain what happened","Ask for help","Learn from it"]),
  bonusQuestion("Name something you would take to the beach.", ["Towel","Sunscreen","Swimwear","Sunglasses","Water"]),
  bonusQuestion("What can make a family gathering memorable?", ["Funny stories","Good food","Games","Music","Family photos"]),
  bonusQuestion("Name something people do when they are nervous.", ["Fidget","Pace around","Bite nails","Talk quickly","Take deep breaths"]),
  bonusQuestion("What might you find inside a school bag?", ["Books","Pens","Notebooks","Lunch","Water bottle"]),
  bonusQuestion("Name something people do to celebrate a birthday.", ["Eat cake","Sing","Give presents","Have a party","Take photos"]),
  bonusQuestion("Name something people do when they hear their favorite song.", ["Sing along","Dance","Smile","Turn up the volume","Share it with a friend"]),
  bonusQuestion("What might you see at an airport?", ["Airplanes","Luggage","Passengers","Security staff","Departure screens"]),
  bonusQuestion("Name something people do to prepare for a job interview.", ["Research company","Choose smart clothes","Practice answers","Update résumé","Plan journey"]),
  bonusQuestion("What might you see at a farmers market.", ["Fresh vegetables","Fruit stalls","Farmers","Flowers","Homemade goods"]),
  bonusQuestion("Name something people do when they get good news.", ["Celebrate","Call family","Share online","Smile","Treat themselves"]),
  bonusQuestion("What might you find in a hotel room.", ["Bed","Television","Towels","Mini fridge","Room service menu"]),
  bonusQuestion("Name something people do on a rainy afternoon.", ["Watch a movie","Read a book","Take a nap","Play games","Bake something"]),
  bonusQuestion("What might people take on a road trip.", ["Snacks","Water","Music playlist","Phone charger","Travel pillow"]),
  bonusQuestion("Name something that makes a classroom lively.", ["Class discussion","Funny stories","Group activities","Questions","Games"]),
  bonusQuestion("What might you see at a baby shower.", ["Gifts","Balloons","Baby clothes","Cake","Games"]),
  bonusQuestion("Name something people do to stay healthy.", ["Exercise","Eat vegetables","Drink water","Sleep well","Visit a doctor"]),
  bonusQuestion("What might you find in a kitchen drawer.", ["Cutlery","Bottle opener","Scissors","Measuring spoons","Tea towels"]),
  bonusQuestion("Name something people do when they miss someone.", ["Call them","Send a message","Look at photos","Plan a visit","Think of memories"]),
  bonusQuestion("What might you see at a music festival.", ["Main stage","Food trucks","Crowd dancing","Wristbands","Merchandise stalls"]),
  bonusQuestion("Name something people do before guests arrive.", ["Clean the house","Prepare food","Set the table","Get dressed","Arrange decorations"]),
  bonusQuestion("What might someone do with a surprise gift.", ["Open it","Say thank you","Hug the giver","Take a photo","Guess what it is"]),
  bonusQuestion("Name something you might see on a farm.", ["Cows","Chickens","Tractor","Barn","Crops"]),
  bonusQuestion("What do people often do during a long journey.", ["Listen to music","Sleep","Look out the window","Chat","Play games"]),
  bonusQuestion("Name something people do when they are proud of a child.", ["Take photos","Praise them","Tell relatives","Give a hug","Celebrate effort"]),
  bonusQuestion("What might you find at a sports club.", ["Training equipment","Coaches","Changing rooms","Team uniforms","Water bottles"]),
  bonusQuestion("Name something that can make a phone battery run out quickly.", ["Watching videos","Playing games","Using GPS","Video calls","Bright screen"]),
  bonusQuestion("What might people do at a family reunion.", ["Share stories","Take group photos","Eat together","Dance","Catch up"]),
  bonusQuestion("Name something people do when they move into a new home.", ["Unpack boxes","Arrange furniture","Clean rooms","Meet neighbours","Decorate"]),
  bonusQuestion("What might you see at a cinema.", ["Big screen","Popcorn","Ticket counter","Movie posters","Rows of seats"]),
  bonusQuestion("Name something people do to save money.", ["Make a budget","Cook at home","Compare prices","Use public transport","Avoid impulse buys"]),
  bonusQuestion("What might you find in a first-aid kit.", ["Bandages","Antiseptic wipes","Plasters","Gauze","Medical tape"]),
  bonusQuestion("Name something people do when they are stuck in traffic.", ["Listen to radio","Check the time","Call someone","Play music","Take another route"]),
  bonusQuestion("What might you see at a graduation ceremony.", ["Graduation gowns","Certificates","Speeches","Family photos","Graduation caps"]),
  bonusQuestion("Name something people do to make a birthday special.", ["Bake a cake","Decorate a room","Give presents","Plan a party","Sing happy birthday"]),
  bonusQuestion("What might you find in a handbag.", ["Wallet","Keys","Phone","Tissues","Lip balm"]),
  bonusQuestion("Name something people do when they feel cold.", ["Wear a jacket","Drink something hot","Use a blanket","Turn on heating","Rub their hands"]),
  bonusQuestion("What might you see at a bus station.", ["Buses","Passengers","Ticket booth","Timetable","Luggage"]),
  bonusQuestion("Name something people do after finishing a big project.", ["Celebrate","Rest","Share the result","Thank the team","Start something new"]),
  bonusQuestion("What might you find at a camping site.", ["Tent","Campfire","Sleeping bag","Torch","Picnic table"]),
  bonusQuestion("Name something people do when they have a free weekend.", ["Visit friends","Go shopping","Watch sports","Travel","Relax at home"]),
  bonusQuestion("What might you see at a hospital reception.", ["Reception desk","Waiting chairs","Registration forms","Nurses","Appointment board"]),
  bonusQuestion("Name something people do to show appreciation.", ["Say thank you","Give a gift","Write a note","Offer help","Give a compliment"]),
  bonusQuestion("What might you find in a toolbox.", ["Hammer","Screwdriver","Pliers","Spanner","Measuring tape"]),
  bonusQuestion("Name something people do when they hear a strange noise at night.", ["Check the door","Turn on lights","Listen carefully","Call someone","Look outside"]),
  bonusQuestion("What might you see at a swimming pool.", ["Lifeguard","Pool lanes","Pool noodles","Changing rooms","Swimming caps"]),
  bonusQuestion("Name something people do before a big match.", ["Warm up","Practice","Listen to coach","Stretch","Get focused"]),
  bonusQuestion("What might you buy at a bakery.", ["Bread","Cakes","Doughnuts","Cookies","Pies"]),
  bonusQuestion("Name something that helps make a meeting successful.", ["Clear agenda","Good preparation","Everyone participates","Timekeeping","Useful notes"]),
  bonusQuestion("What might people do when they visit a new city.", ["Visit landmarks","Try local food","Take photos","Use a map","Buy souvenirs"]),
  bonusQuestion("Name something people do when celebrating a promotion.", ["Tell colleagues","Dinner out","Share the news","Thank their boss","Buy a treat"]),
  bonusQuestion("What might you find in a garden shed.", ["Garden tools","Watering can","Lawn mower","Plant pots","Compost bags"]),
  bonusQuestion("Name something people do to welcome a new neighbour.", ["Introduce themselves","Bring food","Offer help","Give directions","Invite them over"]),
  bonusQuestion("What might you see at a fashion show.", ["Models","Runway","Designer clothes","Photographers","Audience"]),
  bonusQuestion("Name something people do when a recipe goes wrong.", ["Try again","Check instructions","Add ingredients","Ask for help","Order takeaway"]),
  bonusQuestion("What might you find in a school playground.", ["Swings","Slides","Football pitch","Benches","Climbing frame"]),
  bonusQuestion("Name something people do to prepare for a holiday.", ["Pack clothes","Book tickets","Arrange accommodation","Check documents","Plan activities"]),
  bonusQuestion("What might you see at a busy market.", ["Fruit sellers","Clothing stalls","Shoppers","Bargaining","Food vendors"]),
  bonusQuestion("Name something people do when they receive a compliment.", ["Say thank you","Smile","Feel shy","Return compliment","Laugh"]),
  bonusQuestion("What might you find in a living room.", ["Sofa","Television","Coffee table","Rug","Bookshelf"]),
  bonusQuestion("Name something people do during a family game night.", ["Play board games","Keep score","Laugh together","Share snacks","Cheer for a winner"]),
  bonusQuestion("What might you see at a train station.", ["Platforms","Train tracks","Departure board","Passengers","Ticket machines"]),
  bonusQuestion("Name something people do when trying to concentrate.", ["Find quiet place","Turn off phone","Take notes","Close the door","Listen carefully"]),
  bonusQuestion("What might you find at a pet shop.", ["Dog food","Cat toys","Fish tanks","Pet beds","Leashes"]),
  bonusQuestion("Name something people do to make a long queue feel shorter.", ["Check phone","Chat with someone","Listen to music","Read messages","Look around"]),
  bonusQuestion("What might you see during a national celebration.", ["Flags","Parade","Music","Fireworks","Traditional clothes"]),
  bonusQuestion("Name something people do when caught in a downpour.", ["Run for shelter","Open umbrella","Call for a ride","Cover their head","Find a shop"]),
  bonusQuestion("What might you find in a refrigerator.", ["Milk","Vegetables","Leftovers","Juice","Eggs"]),
  bonusQuestion("Name something people do before starting a workout.", ["Stretch","Warm up","Drink water","Choose music","Put on trainers"]),
  bonusQuestion("What might you see at a charity event.", ["Donation boxes","Volunteers","Speeches","Auction items","Information tables"]),
  bonusQuestion("Name something people do when feeling homesick.", ["Call home","Talk to family","Cook familiar food","Look at photos","Plan a visit"]),
  bonusQuestion("What might you find in an office break room.", ["Coffee machine","Microwave","Fridge","Mugs","Snack cupboard"]),
  bonusQuestion("Name something people do when their name is called on stage.", ["Walk forward","Smile","Wave","Say thank you","Shake hands"]),
  bonusQuestion("What might you see at a wildlife park.", ["Giraffes","Lions","Elephants","Tour guides","Viewing areas"]),
  bonusQuestion("Name something people do to keep a friendship strong.", ["Stay in touch","Listen","Celebrate together","Offer support","Be honest"]),
  bonusQuestion("What might you find in a travel suitcase.", ["Clothes","Shoes","Toiletries","Passport","Chargers"]),
  bonusQuestion("Name something people do when preparing a special meal.", ["Shop for ingredients","Chop vegetables","Set the table","Follow recipe","Play music"]),
  bonusQuestion("What might you see at a construction site.", ["Hard hats","Cranes","Builders","Safety signs","Building materials"]),
  bonusQuestion("Name something people do while waiting for a call.", ["Check phone","Keep it nearby","Watch the screen","Stay quiet","Call back later"]),
  bonusQuestion("What might you find at a roadside food stall.", ["Grilled meat","Fresh fruit","Snacks","Cold drinks","Plastic chairs"]),
  bonusQuestion("Name something people do to make a guest laugh.", ["Tell a joke","Share funny story","Make a funny face","Do an impression","Play a prank"]),
  bonusQuestion("What might you see at a community clean-up.", ["Rubbish bags","Gloves","Volunteers","Brooms","Collection truck"]),
  bonusQuestion("Name something people do after achieving a goal.", ["Celebrate","Set a new goal","Tell friends","Reward themselves","Reflect on progress"]),
  bonusQuestion("What might you find in a music classroom.", ["Piano","Guitars","Music stands","Drums","Sheet music"]),
  bonusQuestion("Name something people do when getting ready for a wedding.", ["Choose outfit","Visit a salon","Buy a gift","Arrange transport","Practice a speech"]),
  bonusQuestion("What might you see at a fishing spot.", ["Fishing rods","Boats","Bait","Cooler box","People waiting"]),
  bonusQuestion("Name something people do to cheer themselves up.", ["Listen to music","Call a friend","Go for a walk","Watch comedy","Eat favourite snack"]),
  bonusQuestion("What might you find at a restaurant table.", ["Menu","Glasses","Cutlery","Napkins","Condiments"]),
  bonusQuestion("Name something people do when surprised by a visit.", ["Open the door","Welcome guest","Offer a seat","Prepare refreshments","Ask what brought them"]),
  bonusQuestion("What might you see at a children's party.", ["Balloons","Party hats","Birthday cake","Bouncy castle","Party games"]),
  bonusQuestion("Name something people do when learning a new skill.", ["Watch tutorials","Take a class","Practice daily","Find a mentor","Read a guide"]),
  bonusQuestion("What might you find in a garage.", ["Toolbox","Bicycle","Spare tyre","Cleaning supplies","Car accessories"]),
  bonusQuestion("Name something people do to celebrate the weekend.", ["Meet friends","Go dancing","Watch a match","Have a barbecue","Sleep in"]),
  bonusQuestion("What might you see in a doctor's waiting room.", ["Magazines","Receptionist","Waiting chairs","Health posters","Appointment list"]),
  bonusQuestion("Name something people do when they lose something important.", ["Retrace steps","Search the house","Call a friend","Check their bag","Report it missing"]),
  bonusQuestion("What might you find at a beach picnic.", ["Sandwiches","Fruit","Cooler","Beach blanket","Umbrella"]),
  bonusQuestion("Name something people do to make a team feel united.", ["Choose team name","Set shared goals","Encourage each other","Practice together","Celebrate wins"]),
  bonusQuestion("What might you see at a local art exhibition.", ["Paintings","Sculptures","Artists","Visitors","Information labels"]),
  bonusQuestion("Name something people do when feeling sleepy.", ["Yawn","Make coffee","Take a nap","Wash their face","Go to bed"]),
  bonusQuestion("What might you find in a school science lab.", ["Microscope","Test tubes","Safety goggles","Lab coats","Beakers"]),
  bonusQuestion("Name something people do when they hear a funny rumour.", ["Ask for details","Laugh","Check if true","Tell a friend","Ignore it"]),
  bonusQuestion("What might you see at a traditional food festival.", ["Local dishes","Cooking demonstrations","Food competitions","Music","Craft stalls"]),
  bonusQuestion("Name something people do before a long flight.", ["Check in","Print boarding pass","Charge devices","Pack snacks","Check passport"]),
  bonusQuestion("What might you find in a laundry room.", ["Washing machine","Detergent","Laundry basket","Iron","Clothes pegs"]),
  bonusQuestion("Name something people do to make a good first impression.", ["Smile","Dress neatly","Make eye contact","Arrive on time","Speak politely"]),
  bonusQuestion("What might you see at a charity fun run.", ["Runners","Race numbers","Water stations","Medals","Spectators"]),
  bonusQuestion("Name something people do when their favourite team wins.", ["Shout with joy","Wave a flag","Celebrate with friends","Post online","Sing team song"]),
  bonusQuestion("What might you find at a hair salon reception.", ["Appointment book","Waiting chairs","Product display","Magazines","Price list"]),
];
const BONUS_USED_KEY = "kingson-survey-show-bonus-used-v1";
const BONUS_LAST_KEY = "kingson-survey-show-bonus-last-set-v1";
const SURVEY_USED_KEY = "kingson-survey-show-survey-used-v1";
function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
function drawBonusQuestions(): BonusQuestion[] {
  const uniqueQuestions = [...new Map(BONUS_DEFAULTS.map((question) => [question.prompt, question])).values()];
  if (!uniqueQuestions.length) return [];

  let used: string[] = [];
  let previous: string[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(BONUS_USED_KEY) ?? "[]");
    if (Array.isArray(parsed)) used = parsed.filter((prompt): prompt is string => typeof prompt === "string");
  } catch { used = []; }
  try {
    const parsed = JSON.parse(localStorage.getItem(BONUS_LAST_KEY) ?? "[]");
    if (Array.isArray(parsed)) previous = parsed.filter((prompt): prompt is string => typeof prompt === "string");
  } catch { previous = []; }

  const validPrompts = new Set(uniqueQuestions.map((question) => question.prompt));
  used = used.filter((prompt) => validPrompts.has(prompt));
  previous = previous.filter((prompt) => validPrompts.has(prompt));

  // Shuffle the full bank and use every prompt once before beginning a new cycle.
  let picked = shuffled(uniqueQuestions.filter((question) => !used.includes(question.prompt)))
    .slice(0, Math.min(5, uniqueQuestions.length));
  let nextUsed = [...used, ...picked.map((question) => question.prompt)];

  // If fewer than five remain in this cycle, complete the set from a fresh shuffle.
  if (picked.length < Math.min(5, uniqueQuestions.length)) {
    const refill = shuffled(uniqueQuestions.filter((question) => !picked.some((item) => item.prompt === question.prompt)));
    picked = [...picked, ...refill.slice(0, Math.min(5, uniqueQuestions.length) - picked.length)];
    nextUsed = picked.map((question) => question.prompt);
  }

  // Avoid showing the exact same five-question set in consecutive games.
  const previousSet = [...previous].sort().join("|");
  const pickedSet = picked.map((question) => question.prompt).sort().join("|");
  if (picked.length > 1 && pickedSet === previousSet) {
    const alternatives = shuffled(uniqueQuestions.filter((question) => !picked.some((item) => item.prompt === question.prompt)));
    if (alternatives.length) {
      const replaced = picked[picked.length - 1];
      picked[picked.length - 1] = alternatives[0];
      // Keep the replacement marked as used so it cannot reappear in this cycle.
      if (!nextUsed.includes(alternatives[0].prompt)) nextUsed.push(alternatives[0].prompt);
      if (!used.includes(replaced.prompt) && !nextUsed.includes(replaced.prompt)) nextUsed.push(replaced.prompt);
    }
  }

  localStorage.setItem(BONUS_USED_KEY, JSON.stringify(nextUsed));
  localStorage.setItem(BONUS_LAST_KEY, JSON.stringify(picked.map((question) => question.prompt)));
  return picked;
}
function normalizeBonusQuestions(value: unknown): BonusQuestion[] {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: 5 }, (_, index) => {
    const fallback = BONUS_DEFAULTS[index % BONUS_DEFAULTS.length] ?? BONUS_DEFAULTS[0];
    const candidate = source[index] as Partial<BonusQuestion> | undefined;
    if (!candidate || typeof candidate.prompt !== "string" || !candidate.prompt.trim() || !Array.isArray(candidate.answers)) return structuredClone(fallback);
    const answers = Array.from({ length: 5 }, (_, answerIndex) => {
      const raw = candidate.answers?.[answerIndex] as Partial<BonusAnswer> | string | undefined;
      const defaultAnswer = fallback.answers[answerIndex];
      if (typeof raw === "string") return { text: raw, points: defaultAnswer.points };
      if (!raw || typeof raw.text !== "string") return { ...defaultAnswer };
      return { text: raw.text, points: Number.isFinite(raw.points) ? Number(raw.points) : defaultAnswer.points };
    });
    return { prompt: candidate.prompt, answers };
  });
}
const SURVEY_LAST_KEY = "kingson-survey-show-survey-last-set-v1";
function drawSurveyIds(questions: Question[]): string[] {
  const uniqueQuestions = [...new Map(questions.map((question) => [question.id, question])).values()];
  if (!uniqueQuestions.length) return [];

  let used: string[] = [];
  let previous: string[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SURVEY_USED_KEY) ?? "[]");
    if (Array.isArray(parsed)) used = parsed.filter((id): id is string => typeof id === "string");
  } catch { used = []; }
  try {
    const parsed = JSON.parse(localStorage.getItem(SURVEY_LAST_KEY) ?? "[]");
    if (Array.isArray(parsed)) previous = parsed.filter((id): id is string => typeof id === "string");
  } catch { previous = []; }

  const validIds = new Set(uniqueQuestions.map((question) => question.id));
  used = used.filter((id) => validIds.has(id));
  previous = previous.filter((id) => validIds.has(id));

  // Draw six distinct questions, using every question once before starting a new cycle.
  let available = shuffled(uniqueQuestions.filter((question) => !used.includes(question.id)));
  let picked = available.slice(0, Math.min(6, uniqueQuestions.length));
  let nextUsed = [...used, ...picked.map((question) => question.id)];

  if (picked.length < Math.min(6, uniqueQuestions.length)) {
    const refill = shuffled(uniqueQuestions.filter((question) => !picked.some((item) => item.id === question.id)));
    picked = [...picked, ...refill.slice(0, Math.min(6, uniqueQuestions.length) - picked.length)];
    nextUsed = picked.map((question) => question.id);
  }

  // Never repeat the exact same six-question match on consecutive host openings.
  const previousSet = [...previous].sort().join("|");
  const pickedSet = picked.map((question) => question.id).sort().join("|");
  if (picked.length > 1 && pickedSet === previousSet) {
    const alternatives = shuffled(uniqueQuestions.filter((question) => !picked.some((item) => item.id === question.id)));
    if (alternatives.length) {
      picked[picked.length - 1] = alternatives[0];
      if (nextUsed.includes(alternatives[0].id)) {
        nextUsed = [...new Set([...nextUsed, alternatives[0].id])];
      } else {
        nextUsed.push(alternatives[0].id);
      }
    }
  }

  const ids = picked.map((question) => question.id);
  localStorage.setItem(SURVEY_USED_KEY, JSON.stringify(nextUsed));
  localStorage.setItem(SURVEY_LAST_KEY, JSON.stringify(ids));
  return ids;
}
type BonusState = { questions: BonusQuestion[]; index: number; accepted: string[]; total: number; responses: string[]; correctCount: number; pendingAnswers?: string[]; revealed?: boolean };
const BONUS_STORAGE_KEY = "kingson-survey-show-bonus-v1";
const ROUND_QUESTIONS_KEY = "kingson-survey-show-round-questions-v1";
const RESULT_KEY = "kingson-survey-show-round-result-v1";
const GAME_STARTED_KEY = "kingson-survey-show-game-started-v1";
type RoundQuestions = { classic: string; double: string; triple: string };
type RoundQuestionsByTeam = Record<Team, RoundQuestions>;
type CountdownTarget = RoundMode | "handover";
type TeamBreakdown = { classic: number; double: number; triple: number; bonus: number; bonusExtra: number };
type FinalResults = { team: Team; breakdown: TeamBreakdown; total: number; finalMatch: boolean; revealCombined?: boolean; champion: Team | "tie" | null; teams?: Record<Team, { breakdown: TeamBreakdown; total: number }> };
type RoundResult = { mode: Exclude<RoundMode, "bonus">; team: Team; points: number; nextTarget: RoundMode; countdownSeconds: number };


function Game() {
  const [{ s, hydrated }, dispatch] = useReducer(wrapped, null, () => ({ s: initialState(), hydrated: false }));
  const [stageOnly, setStageOnly] = useState(false);
  const [audienceGameStarted, setAudienceGameStarted] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [themePlayerActive, setThemePlayerActive] = useState(false);
  const [gameplayMusicActive, setGameplayMusicActive] = useState(false);
  const [help, setHelp] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [strikeFlash, setStrikeFlash] = useState(0);
  const [timer, setTimer] = useState<TimerState>({ duration: 60, remaining: 60, running: false, endsAt: null });
  const [roundMode, setRoundMode] = useState<RoundMode>("classic");
  const [roundQuestions, setRoundQuestions] = useState<RoundQuestionsByTeam | null>(null);
  const [bonus, setBonus] = useState<BonusState>({ questions: BONUS_DEFAULTS, index: 0, accepted: [], total: 0, responses: ["", "", "", "", ""], correctCount: 0, pendingAnswers: ["", "", "", "", ""], revealed: false });
  const [bonusGuess, setBonusGuess] = useState("");
  const [bonusFeedback, setBonusFeedback] = useState("");
  const [showCountdown, setShowCountdown] = useState<{ remaining: number; target: CountdownTarget } | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [finalResults, setFinalResults] = useState<FinalResults | null>(null);
  const [teamLeg, setTeamLeg] = useState<1 | 2>(1);
  const [roundPoints, setRoundPoints] = useState<Record<Team, TeamBreakdown>>({
    A: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 },
    B: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 },
  });
  const roundStartScoresRef = useRef<Record<Team, number>>({ A: 0, B: 0 });
  const transitionLockRef = useRef(false);
  const bonusFinishLockRef = useRef(false);

  useEffect(() => {
    const isStage = new URLSearchParams(window.location.search).get("stage") === "1";
    setStageOnly(isStage);
    if (isStage) setWelcomeOpen(false);
    const startedFlag = localStorage.getItem(GAME_STARTED_KEY) === "true";
    setAudienceGameStarted(startedFlag);
    if (!isStage) localStorage.setItem(GAME_STARTED_KEY, "false");
    const saved = loadState();

    // The audience stage tab must join the host's current match. Opening the
    // host page, however, always starts a clean match with fresh questions.
    if (!isStage) {
      localStorage.setItem(GAME_STARTED_KEY, "false");
      setAudienceGameStarted(false);
      const fresh = initialState(saved?.questions);
      if (saved?.teamNames) fresh.teamNames = saved.teamNames;
      const drawnIds = drawSurveyIds(fresh.questions);
      const assignments: RoundQuestionsByTeam = {
        A: { classic: drawnIds[0] ?? fresh.currentId, double: drawnIds[1] ?? fresh.currentId, triple: drawnIds[2] ?? fresh.currentId },
        B: { classic: drawnIds[3] ?? fresh.currentId, double: drawnIds[4] ?? fresh.currentId, triple: drawnIds[5] ?? fresh.currentId },
      };
      const started = reducer({ ...fresh, usedIds: [] }, { type: "next", id: assignments.A.classic });
      dispatch({ type: "__load", s: started });
      setRoundQuestions(assignments);
      localStorage.setItem(ROUND_QUESTIONS_KEY, JSON.stringify(assignments));
      setRoundMode("classic");
      localStorage.setItem(ROUND_KEY, "classic");
      const freshTimer = { duration: 60, remaining: 60, running: false, endsAt: null };
      setTimer(freshTimer);
      localStorage.setItem(TIMER_KEY, JSON.stringify(freshTimer));
      setRoundResult(null);
      localStorage.removeItem(RESULT_KEY);
      setFinalResults(null);
      localStorage.removeItem("kingson-survey-show-final-results-v1");
      setShowCountdown(null);
      localStorage.removeItem("kingson-survey-show-countdown-v1");
      setTeamLeg(1);
      setRoundPoints({
        A: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 },
        B: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 },
      });
      setAutoPlay(false);
      transitionLockRef.current = false;
      const freshBonus = { ...bonus, questions: drawBonusQuestions(), index: 0, accepted: [], total: 0, responses: ["", "", "", "", ""], correctCount: 0, pendingAnswers: ["", "", "", "", ""], revealed: false };
      setBonus(freshBonus);
      localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(freshBonus));
      return;
    }

    const loadedGame = saved ?? initialState();
    dispatch({ type: "__load", s: loadedGame });
    try {
      const storedRounds = localStorage.getItem(ROUND_QUESTIONS_KEY);
      const parsed = storedRounds ? JSON.parse(storedRounds) as RoundQuestionsByTeam | RoundQuestions : null;
      const validIds = new Set(loadedGame.questions.map((question) => question.id));
      const pool = [...loadedGame.questions.filter((question) => question.id !== loadedGame.currentId)].sort(() => Math.random() - 0.5);
      const legacyA = parsed && "classic" in parsed ? parsed as RoundQuestions : null;
      const validSet = (set: RoundQuestions | undefined) => Boolean(set && validIds.has(set.classic) && validIds.has(set.double) && validIds.has(set.triple) && new Set([set.classic,set.double,set.triple]).size === 3);
      const assignments: RoundQuestionsByTeam = parsed && "A" in parsed && validSet(parsed.A) && validSet(parsed.B)
        ? parsed as RoundQuestionsByTeam
        : {
            A: legacyA && validSet(legacyA) ? legacyA : { classic: loadedGame.currentId, double: pool[0]?.id ?? loadedGame.currentId, triple: pool[1]?.id ?? pool[0]?.id ?? loadedGame.currentId },
            B: { classic: pool[2]?.id ?? pool[0]?.id ?? loadedGame.currentId, double: pool[3]?.id ?? pool[1]?.id ?? loadedGame.currentId, triple: pool[4]?.id ?? pool[2]?.id ?? loadedGame.currentId },
          };
      setRoundQuestions(assignments);
      localStorage.setItem(ROUND_QUESTIONS_KEY, JSON.stringify(assignments));
    } catch {
      const available = loadedGame.questions.filter((question) => question.id !== loadedGame.currentId);
      const assignments = { A: { classic: loadedGame.currentId, double: available[0]?.id ?? loadedGame.currentId, triple: available[1]?.id ?? available[0]?.id ?? loadedGame.currentId }, B: { classic: available[2]?.id ?? loadedGame.currentId, double: available[3]?.id ?? loadedGame.currentId, triple: available[4]?.id ?? loadedGame.currentId } };
      setRoundQuestions(assignments);
      localStorage.setItem(ROUND_QUESTIONS_KEY, JSON.stringify(assignments));
    }
    try { const savedTimer = localStorage.getItem(TIMER_KEY); if (savedTimer) setTimer(JSON.parse(savedTimer) as TimerState); } catch { /* Keep defaults. */ }
    try { const savedRound = localStorage.getItem(ROUND_KEY); if (savedRound) setRoundMode(savedRound as RoundMode); } catch { /* Keep default. */ }
    try { const savedResult = localStorage.getItem(RESULT_KEY); if (savedResult) setRoundResult(JSON.parse(savedResult) as RoundResult); } catch { /* Keep default. */ }
    try { const savedFinal = localStorage.getItem("kingson-survey-show-final-results-v1"); if (savedFinal) setFinalResults(JSON.parse(savedFinal) as FinalResults); } catch { /* Keep default. */ }
    try {
      const savedBonus = localStorage.getItem(BONUS_STORAGE_KEY);
      if (savedBonus) {
        const parsed = JSON.parse(savedBonus) as Partial<BonusState>;
        const questions = normalizeBonusQuestions(parsed.questions);
        const index = Number.isInteger(parsed.index) ? Math.min(4, Math.max(0, Number(parsed.index))) : 0;
        const safeBonus: BonusState = {
          questions, index,
          accepted: Array.isArray(parsed.accepted) ? parsed.accepted.filter((x): x is string => typeof x === "string") : [],
          total: Number.isFinite(parsed.total) ? Number(parsed.total) : 0,
          responses: Array.isArray(parsed.responses) ? Array.from({length:5},(_,i)=>typeof parsed.responses?.[i]==="string"?parsed.responses[i] as string:"") : ["","","","",""],
          pendingAnswers: Array.isArray(parsed.pendingAnswers) ? Array.from({length:5},(_,i)=>typeof parsed.pendingAnswers?.[i]==="string"?parsed.pendingAnswers[i] as string:"") : ["","","","",""],
          revealed: Boolean(parsed.revealed),
          correctCount: Number.isFinite(parsed.correctCount) ? Number(parsed.correctCount) : 0,
        };
        setBonus(safeBonus);
        localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(safeBonus));
      }
    } catch {
      const safeBonus = { ...bonus, questions: normalizeBonusQuestions(null), index: 0, accepted: [], total: 0, responses: ["","","","",""], pendingAnswers: ["","","","",""], revealed: false, correctCount: 0 };
      setBonus(safeBonus);
      localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(safeBonus));
    }
  }, []);
  // Synchronize the host tab and audience stage tab on the same computer.
  useEffect(() => {
    const syncFromOtherTab = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue) as GameState;
        if (next && Array.isArray(next.questions)) dispatch({ type: "__load", s: next });
      } catch {
        // Ignore invalid storage updates.
      }
    };
    const syncTimer = (event: StorageEvent) => { if (event.key === TIMER_KEY && event.newValue) { try { setTimer(JSON.parse(event.newValue) as TimerState); } catch { /* Ignore invalid updates. */ } } };
    const syncRound = (event: StorageEvent) => { if (event.key === ROUND_KEY && event.newValue) setRoundMode(event.newValue as RoundMode); };
    const syncBonus = (event: StorageEvent) => { if (event.key === BONUS_STORAGE_KEY && event.newValue) { try { setBonus(JSON.parse(event.newValue) as BonusState); } catch { /* Ignore invalid updates. */ } } };
    const syncCountdown = (event: StorageEvent) => { if (event.key === "kingson-survey-show-countdown-v1") { try { setShowCountdown(event.newValue ? JSON.parse(event.newValue) : null); } catch { /* Ignore invalid updates. */ } } };
    const syncGameStarted = (event: StorageEvent) => { if (event.key === GAME_STARTED_KEY) setAudienceGameStarted(event.newValue === "true"); };
    const syncResult = (event: StorageEvent) => { if (event.key === RESULT_KEY) { try { setRoundResult(event.newValue ? JSON.parse(event.newValue) as RoundResult : null); } catch { /* Ignore invalid updates. */ } } };
    const syncFinal = (event: StorageEvent) => { if (event.key === "kingson-survey-show-final-results-v1") { try { setFinalResults(event.newValue ? JSON.parse(event.newValue) as FinalResults : null); } catch { /* Ignore invalid updates. */ } } };
    window.addEventListener("storage", syncFromOtherTab);
    window.addEventListener("storage", syncTimer);
    window.addEventListener("storage", syncRound);
    window.addEventListener("storage", syncBonus);
    window.addEventListener("storage", syncCountdown);
    window.addEventListener("storage", syncGameStarted);
    window.addEventListener("storage", syncResult);
    window.addEventListener("storage", syncFinal);
    return () => {
      window.removeEventListener("storage", syncFromOtherTab);
      window.removeEventListener("storage", syncTimer);
      window.removeEventListener("storage", syncRound);
      window.removeEventListener("storage", syncBonus);
      window.removeEventListener("storage", syncCountdown);
      window.removeEventListener("storage", syncGameStarted);
      window.removeEventListener("storage", syncResult);
      window.removeEventListener("storage", syncFinal);
    };
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }, [s, hydrated]);
  const changeRound = (mode: RoundMode) => {
    if (mode === roundMode) return;
    // Keep one assigned survey question for each main round throughout this match.
    // Returning to Classic/Double/Triple restores that exact question with a clean board.
    if (mode !== "bonus" && roundQuestions) {
      const questionId = roundQuestions[s.active][mode];
      const freshGame = reducer(s, { type: "next", id: questionId });
      dispatch({ type: "__load", s: { ...freshGame, active: s.active, controlTeam: s.active } });
    }
    setRoundMode(mode);
    localStorage.setItem(ROUND_KEY, mode);
    if (mode === "bonus") {
      bonusFinishLockRef.current = false;
      // Team A uses the five questions drawn when the host opened this match.
      // Team B receives a new set when its own Bonus Mission begins.
      const missionQuestions = teamLeg === 2 ? drawBonusQuestions() : bonus.questions;
      const freshBonus = { ...bonus, questions: missionQuestions, index: 0, accepted: [], total: 0, responses: ["", "", "", "", ""], correctCount: 0, pendingAnswers: ["", "", "", "", ""], revealed: false };
      setBonus(freshBonus);
      localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(freshBonus));
      setBonusGuess("");
      setBonusFeedback("");
    }
    const freshTimer = { duration: 60, remaining: 60, running: false, endsAt: null };
    setTimer(freshTimer);
    localStorage.setItem(TIMER_KEY, JSON.stringify(freshTimer));
  };
  const updateBonus = (next: BonusState) => { setBonus(next); localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(next)); };
  const submitBonusGuess = () => {
    const guess = bonusGuess.trim();
    if (!guess) return;
    const pendingAnswers = [...(bonus.pendingAnswers ?? ["", "", "", "", ""])];
    const questionIndex = bonus.index;
    if (!timer.running || bonus.revealed) { setBonusFeedback("The Bonus Mission timer has finished."); return; }
    if (pendingAnswers[questionIndex]) { setBonusFeedback("An answer has already been recorded for this question."); setBonusGuess(""); return; }
    pendingAnswers[questionIndex] = guess;
    const nextIndex = pendingAnswers.findIndex((answer) => !answer);
    updateBonus({ ...bonus, pendingAnswers, index: nextIndex < 0 ? 4 : nextIndex });
    setBonusFeedback("Answer recorded privately. The answer and points will be revealed when time is up.");
    setBonusGuess("");
    if (pendingAnswers.every((answer) => answer.trim().length > 0)) {
      finishBonusMission(pendingAnswers);
    }
  };
  const finishBonusMission = (answersOverride?: string[]) => {
    if (bonus.revealed || bonusFinishLockRef.current) return;
    bonusFinishLockRef.current = true;
    const pendingAnswers = answersOverride ?? bonus.pendingAnswers ?? ["", "", "", "", ""];
    // Stop and persist the clock immediately, whether the team finishes early or runs out of time.
    const stoppedTimer = { ...timer, running: false, endsAt: null };
    setTimer(stoppedTimer);
    localStorage.setItem(TIMER_KEY, JSON.stringify(stoppedTimer));
    let correctCount = 0;
    let total = 0;
    const responses = bonus.questions.map((question, index) => {
      const guess = pendingAnswers[index]?.trim();
      if (!guess) return "No answer";
      const match = question.answers.find((answer) => bonusAnswerMatches(guess, answer.text));
      if (!match) return "No answer";
      correctCount += 1; total += match.points; return match.text;
    });
    const extraBonus = correctCount >= 3 ? 500 : 0;
    const team = s.active;
    const pointsEarned = total + extraBonus;
    const accepted = bonus.questions.flatMap((question, index) => {
      const guess = pendingAnswers[index]?.trim();
      const match = guess ? question.answers.find((answer) => bonusAnswerMatches(guess, answer.text)) : undefined;
      return match ? [index + ":" + normText(match.text)] : [];
    });
    updateBonus({ ...bonus, index: 4, pendingAnswers, responses, accepted, total, correctCount, revealed: true });
    if (pointsEarned > 0) actRef.current({ type: "adjustScore", team, delta: pointsEarned });
    setBonusFeedback("Bonus Mission complete: " + correctCount + "/5 correct. " + total + " points" + (extraBonus ? " + 500 bonus points." : "."));
    if (correctCount > 0) playAudienceApplause();
    if (extraBonus) playRoundWinFanfare();
    const breakdown = { ...(roundPoints[team] ?? { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 }), bonus: total, bonusExtra: extraBonus };
    const finalMatch = teamLeg === 2;
    const totalScore = s.scores[team] + pointsEarned;
    const opponent: Team = team === "A" ? "B" : "A";
    const teams = finalMatch ? { [team]: { breakdown, total: totalScore }, [opponent]: { breakdown: roundPoints[opponent] ?? { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 }, total: s.scores[opponent] } } as Record<Team, { breakdown: TeamBreakdown; total: number }> : undefined;
    const final = { team, breakdown, total: totalScore, finalMatch, revealCombined: false, champion: finalMatch ? (totalScore > s.scores[opponent] ? team : totalScore < s.scores[opponent] ? opponent : "tie") : null, ...(teams ? { teams } : {}) };
    if (finalMatch) setGameplayMusicActive(false);
    setFinalResults(final);
    localStorage.setItem("kingson-survey-show-final-results-v1", JSON.stringify(final));
    setAutoPlay(false);
    if (finalMatch) playRoundWinFanfare();
  };
  const updateTimer = (next: TimerState) => {
    setTimer(next);
    localStorage.setItem(TIMER_KEY, JSON.stringify(next));
  };

  const beginCountdown = (target: CountdownTarget, seconds: number) => {
    transitionLockRef.current = true;
    const next = { remaining: seconds, target };
    setShowCountdown(next);
    localStorage.setItem("kingson-survey-show-countdown-v1", JSON.stringify(next));
  };
  const playNow = () => {
    setThemePlayerActive(false);
    setGameplayMusicActive(true);
    setAudienceGameStarted(true);
    localStorage.setItem(GAME_STARTED_KEY, "true");
    roundStartScoresRef.current = { ...s.scores };
    setRoundResult(null);
    setFinalResults(null);
    setTeamLeg(1);
    setRoundPoints({ A: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 }, B: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 } });
    setAutoPlay(true);
    beginCountdown(roundMode === "bonus" ? "classic" : roundMode, 3);
  };
  const finishMainRound = (mode: Exclude<RoundMode, "bonus">, nextTarget: RoundMode, countdownSeconds: number) => {
    const scoringTeam = s.phase === "steal" ? s.controlTeam : s.active;
    const settled = s.phase === "awarded" ? s : reducer(s, { type: "award", team: scoringTeam });
    if (settled !== s) dispatch({ type: "__load", s: settled });
    const team = scoringTeam;
    const points = Math.max(0, settled.scores[team] - roundStartScoresRef.current[team]);
    setRoundPoints((previous) => ({ ...previous, [team]: { ...previous[team], [mode]: points } }));
    setTimer((current) => ({ ...current, running: false, endsAt: null }));
    localStorage.setItem(TIMER_KEY, JSON.stringify({ ...timer, running: false, endsAt: null }));
    const result = { mode, team, points, nextTarget, countdownSeconds };
    setRoundResult(result);
    localStorage.setItem(RESULT_KEY, JSON.stringify(result));
    playRoundWinFanfare();
    playAudienceApplause();
  };
  useEffect(() => {
    if (!roundResult || stageOnly) return;
    const timeout = window.setTimeout(() => {
      const next = roundResult.nextTarget;
      const seconds = roundResult.countdownSeconds;
      setRoundResult(null);
      localStorage.removeItem(RESULT_KEY);
      beginCountdown(next, seconds);
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [roundResult, stageOnly]);
  useEffect(() => {
    if (!finalResults || stageOnly || showCountdown) return;
    if (finalResults.finalMatch && !finalResults.revealCombined) {
      const timeout = window.setTimeout(() => {
        setFinalResults((current) => {
          if (!current || !current.finalMatch) return current;
          const next = { ...current, revealCombined: true };
          localStorage.setItem("kingson-survey-show-final-results-v1", JSON.stringify(next));
          return next;
        });
      }, 5000);
      return () => window.clearTimeout(timeout);
    }
    if (!finalResults.finalMatch) {
      const timeout = window.setTimeout(() => beginCountdown("handover", 30), 3000);
      return () => window.clearTimeout(timeout);
    }
  }, [finalResults, stageOnly, showCountdown]);
  useEffect(() => {
    if (!showCountdown || stageOnly) return;
    const interval = window.setInterval(() => {
      setShowCountdown((current) => {
        if (!current) return null;
        if (current.remaining > 1) {
          const next = { ...current, remaining: current.remaining - 1 };
          localStorage.setItem("kingson-survey-show-countdown-v1", JSON.stringify(next));
          return next;
        }
        localStorage.removeItem("kingson-survey-show-countdown-v1");
        if (current.target === "handover") {
          const nextTeam: Team = stateRef.current.active === "A" ? "B" : "A";
          const currentState = stateRef.current;
          const questionId = roundQuestions?.[nextTeam].classic;
          const switched = questionId ? reducer({ ...currentState, active: nextTeam, controlTeam: nextTeam, phase: "play" }, { type: "next", id: questionId }) : { ...currentState, active: nextTeam, controlTeam: nextTeam, phase: "play" as const };
          dispatch({ type: "__load", s: switched });
          setRoundMode("classic");
          localStorage.setItem(ROUND_KEY, "classic");
          setTeamLeg(2);
          setFinalResults(null);
          localStorage.removeItem("kingson-survey-show-final-results-v1");
          setRoundPoints((previous) => ({ ...previous, [nextTeam]: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 } }));
          bonusFinishLockRef.current = false;
           const freshBonus = { ...bonus, index: 0, accepted: [], total: 0, responses: ["", "", "", "", ""], correctCount: 0, pendingAnswers: ["", "", "", "", ""], revealed: false };
          setBonus(freshBonus);
          localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(freshBonus));
          setAutoPlay(true);
          roundStartScoresRef.current = { ...switched.scores };
          const started = { duration: 60, remaining: 60, running: true, endsAt: Date.now() + 60000 };
          updateTimer(started);
        } else if (current.target === "bonus") {
          changeRound("bonus");
          setAutoPlay(false);
          roundStartScoresRef.current = { ...stateRef.current.scores };
          updateTimer({ duration: 60, remaining: 60, running: true, endsAt: Date.now() + 60000 });
        } else {
          if (current.target !== roundMode) changeRound(current.target);
          roundStartScoresRef.current = { ...stateRef.current.scores };
          const started = { duration: 60, remaining: 60, running: true, endsAt: Date.now() + 60000 };
          updateTimer(started);
        }
        transitionLockRef.current = false;
        return null;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [showCountdown, stageOnly, roundMode]);
  useEffect(() => {
    if (!autoPlay || stageOnly || showCountdown || roundResult || transitionLockRef.current || roundMode === "bonus") return;

    const timeExpired = !timer.running && timer.remaining === 0;
    // When the clock expires, bank the playing team's points first. The
    // awarded phase then drives the same orderly reveal used after 3 strikes.
    if (timeExpired && s.phase !== "awarded") {
      actRef.current({ type: "award", team: s.active });
      return;
    }

    const nextHidden = s.tiles.findIndex((tile) => tile === "hidden");
    if (s.phase === "awarded" && nextHidden >= 0) {
      const revealTimer = window.setTimeout(() => {
        actRef.current({ type: "reveal", index: nextHidden });
      }, 2000);
      return () => window.clearTimeout(revealTimer);
    }

    const allRevealed = s.tiles.length > 0 && s.tiles.every((tile) => tile !== "hidden");
    if (s.phase === "awarded" && allRevealed) {
      transitionLockRef.current = true;
      const postRevealPause = window.setTimeout(() => {
        transitionLockRef.current = false;
        if (roundMode === "classic") finishMainRound("classic", "double", 3);
        else if (roundMode === "double") finishMainRound("double", "triple", 3);
        else if (roundMode === "triple") finishMainRound("triple", "bonus", 5);
      }, 2000);
      return () => {
        window.clearTimeout(postRevealPause);
        transitionLockRef.current = false;
      };
    }
    if (allRevealed) {
      if (roundMode === "classic") finishMainRound("classic", "double", 3);
      else if (roundMode === "double") finishMainRound("double", "triple", 3);
      else if (roundMode === "triple") finishMainRound("triple", "bonus", 5);
    }
  }, [s, s.tiles, timer.running, timer.remaining, autoPlay, showCountdown, roundResult, roundMode, stageOnly]);  useEffect(() => {
    if (stageOnly || roundMode !== "bonus" || timer.running || timer.remaining !== 0 || bonus.revealed) return;
    finishBonusMission();
  }, [stageOnly, roundMode, timer.running, timer.remaining, bonus, teamLeg]);
  // Both tabs count down from the same end time, so background-tab throttling
  // cannot pause the audience display.
  useEffect(() => {
    if (!timer.running || !timer.endsAt) return;
    const tick = () => setTimer((current) => {
      if (!current.running || !current.endsAt) return current;
      const remaining = Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000));
      return { ...current, remaining, running: remaining > 0, endsAt: remaining > 0 ? current.endsAt : null };
    });
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [timer.running, timer.endsAt]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playCorrectBell = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      [880, 1174.66].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42 + index * 0.08);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + index * 0.08);
        oscillator.stop(now + 0.55 + index * 0.08);
      });
    } catch {
      // Sound is optional; the game should still work if audio is unavailable.
    }
  };

  const playWrongBuzzer = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(145, now);
      oscillator.frequency.exponentialRampToValueAtTime(85, now + 0.38);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      gain.gain.setValueAtTime(0.22, now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } catch {
      // Sound is optional; the game should still work if audio is unavailable.
    }
  };

  const playRoundWinFanfare = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        const start = now + index * 0.13;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.18, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.45);
      });
    } catch {
      // Sound is optional; the game should still work if audio is unavailable.
    }
  };

  const playGrandWinnerFanfare = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      // A bold rising brass-like chord followed by a bright high note.
      const notes = [
        { frequency: 392, start: 0, duration: 0.72 },
        { frequency: 493.88, start: 0, duration: 0.72 },
        { frequency: 587.33, start: 0, duration: 0.72 },
        { frequency: 783.99, start: 0.48, duration: 1.05 },
        { frequency: 1046.5, start: 0.82, duration: 1.25 },
      ];
      notes.forEach(({ frequency, start, duration }) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, now + start);
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.19, now + start + 0.04);
        gain.gain.setValueAtTime(0.19, now + start + duration * 0.55);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + start);
        oscillator.stop(now + start + duration + 0.03);
      });
    } catch {
      // Sound is optional; the game should still work if audio is unavailable.
    }
  };

  const playAudienceApplause = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;

      // A short synthetic crowd swell with many crisp applause claps.
      const crowdLength = 2.4;
      const crowdBuffer = context.createBuffer(1, Math.floor(context.sampleRate * crowdLength), context.sampleRate);
      const crowdData = crowdBuffer.getChannelData(0);
      for (let i = 0; i < crowdData.length; i++) {
        const fadeIn = Math.min(1, i / (context.sampleRate * 0.18));
        const fadeOut = Math.min(1, (crowdData.length - i) / (context.sampleRate * 0.45));
        crowdData[i] = (Math.random() * 2 - 1) * fadeIn * fadeOut;
      }
      const crowd = context.createBufferSource();
      const crowdFilter = context.createBiquadFilter();
      const crowdGain = context.createGain();
      crowd.buffer = crowdBuffer;
      crowdFilter.type = "bandpass";
      crowdFilter.frequency.setValueAtTime(720, now);
      crowdFilter.Q.setValueAtTime(0.65, now);
      crowdGain.gain.setValueAtTime(0.0001, now);
      crowdGain.gain.exponentialRampToValueAtTime(0.075, now + 0.35);
      crowdGain.gain.exponentialRampToValueAtTime(0.0001, now + crowdLength);
      crowd.connect(crowdFilter);
      crowdFilter.connect(crowdGain);
      crowdGain.connect(context.destination);
      crowd.start(now);
      crowd.stop(now + crowdLength);

      for (let i = 0; i < 34; i++) {
        const start = now + Math.random() * 1.9;
        const duration = 0.035 + Math.random() * 0.045;
        const length = Math.floor(context.sampleRate * duration);
        const buffer = context.createBuffer(1, length, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < length; j++) {
          data[j] = (Math.random() * 2 - 1) * (1 - j / length);
        }
        const clap = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        clap.buffer = buffer;
        filter.type = "highpass";
        filter.frequency.setValueAtTime(1100 + Math.random() * 1500, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12 + Math.random() * 0.1, start + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        clap.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        clap.start(start);
        clap.stop(start + duration);
      }
    } catch {
      // Sound is optional; the game should still work if audio is unavailable.
    }
  };

  const playShowIntro = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;

      // Original royal game-show instrumental: bright melody, warm chords and a rising drum pulse.
      const melody = [
        [392,0,.55],[523.25,.42,.55],[659.25,.84,.55],[783.99,1.26,.72],
        [659.25,2.05,.42],[783.99,2.42,.42],[880,2.79,.42],[1046.5,3.18,1.05],
        [783.99,4.35,.38],[880,4.72,.38],[1046.5,5.09,1.25],
      ] as [number,number,number][];
      melody.forEach(([frequency,start,duration]) => {
        const oscillator=context.createOscillator(); const gain=context.createGain();
        oscillator.type="triangle"; oscillator.frequency.setValueAtTime(frequency,now+start);
        gain.gain.setValueAtTime(.0001,now+start); gain.gain.exponentialRampToValueAtTime(.105,now+start+.035);
        gain.gain.exponentialRampToValueAtTime(.0001,now+start+duration);
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(now+start); oscillator.stop(now+start+duration+.02);
      });
      // Layered royal chords give the intro a fuller, song-like sound.
      const chords=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]];
      chords.forEach((chord,ci)=>chord.forEach((frequency)=>{
        const start=now+ci*1.45+.08; const oscillator=context.createOscillator(); const gain=context.createGain();
        oscillator.type="sine"; oscillator.frequency.setValueAtTime(frequency,start);
        gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(.045,start+.12);
        gain.gain.exponentialRampToValueAtTime(.0001,start+1.32);
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start+1.34);
      }));
      // A steady cinematic low pulse builds toward the final flourish.
      for(let i=0;i<18;i++){
        const start=now+.25+i*.31; const oscillator=context.createOscillator(); const gain=context.createGain();
        oscillator.type="sine"; oscillator.frequency.setValueAtTime(i>12?82:65,start);
        gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(i>12?.12:.075,start+.012);
        gain.gain.exponentialRampToValueAtTime(.0001,start+.16);
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start+.17);
      }
      [392,493.88,587.33,783.99,987.77].forEach((frequency)=>{
        const start=now+6.05; const oscillator=context.createOscillator(); const gain=context.createGain();
        oscillator.type="triangle"; oscillator.frequency.setValueAtTime(frequency,start);
        gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(.14,start+.07);
        gain.gain.exponentialRampToValueAtTime(.0001,start+1.35);
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start+1.38);
      });
      window.setTimeout(()=>playAudienceApplause(),6500);
    } catch {
      // The show can still begin if audio is unavailable.
    }
  };

  // Keep the same Suno player mounted behind preparation after the welcome screen closes.
  // PLAY NOW removes the player to stop the music.
  const enterShow = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setThemePlayerActive(true);
    setWelcomeOpen(false);
  };

  const playTeamEntranceSound = (team: Team) => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      // A short, layered game-show fanfare with a melody and supporting harmony.
      const melody = team === "A"
        ? [523.25, 659.25, 783.99, 1046.5, 783.99]
        : [587.33, 739.99, 880, 1174.66, 880];
      melody.forEach((frequency, index) => {
        const start = now + index * 0.14;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.13, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.36);
      });
      // Add a warm musical chord beneath the final note.
      const chord = team === "A" ? [261.63, 329.63, 392] : [293.66, 369.99, 440];
      chord.forEach((frequency) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now + 0.48);
        gain.gain.setValueAtTime(0.0001, now + 0.48);
        gain.gain.exponentialRampToValueAtTime(0.055, now + 0.54);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + 0.48);
        oscillator.stop(now + 1.18);
      });
    } catch {
      // Sound is optional; team selection must always work without audio.
    }
  };

  const playCountdownTick = (secondsLeft: number) => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(620 + (5 - secondsLeft) * 75, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.11);
    } catch {
      // Sound is optional; the countdown remains visible if audio is unavailable.
    }
  };

  const playTimeUpSound = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      [0, 0.2].forEach((offset) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(190, now + offset);
        oscillator.frequency.exponentialRampToValueAtTime(95, now + offset + 0.28);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.32);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.34);
      });
    } catch {
      // Sound is optional; the timer still ends normally if audio is unavailable.
    }
  };

  // Play countdown sounds only in the host tab, avoiding duplicate audio on the stage tab.
  const previousTimerRef = useRef({ remaining: timer.remaining, running: timer.running });
  useEffect(() => {
    const previous = previousTimerRef.current;
    if (!stageOnly) {
      if (timer.running && timer.remaining > 0 && timer.remaining <= 5 && timer.remaining !== previous.remaining) {
        playCountdownTick(timer.remaining);
      }
      if (previous.running && !timer.running && timer.remaining === 0 && previous.remaining > 0) {
        playTimeUpSound();
      }
    }
    previousTimerRef.current = { remaining: timer.remaining, running: timer.running };
  }, [timer.remaining, timer.running, stageOnly]);

  const act = (a: Action) => {
    if (a.type === "setActive" && s.active !== a.team && !stageOnly) {
      playTeamEntranceSound(a.team);
      playAudienceApplause();
    }
    if (a.type === "strike" && s.phase !== "awarded") {
      setStrikeFlash((n) => n + 1);
      playWrongBuzzer();
    }
    if (a.type === "reveal" && s.tiles[a.index] === "hidden") {
      playCorrectBell();
    }
    const nextState = reducer(s, a);
    if (a.type === "strike" && nextState.strikes >= 3 && nextState.phase === "awarded") {
      // Freeze the round clock while the revealed answers remain on screen.
      updateTimer({ ...timer, running: false, endsAt: null });
    }
    if (s.phase !== "awarded" && nextState.phase === "awarded") {
      playRoundWinFanfare();
      playAudienceApplause();
    }
    if (a.type === "endGame" && !s.gameOver && nextState.gameOver) {
      playGrandWinnerFanfare();
      playAudienceApplause();
    }
    if (a.type === "reveal" && roundMode !== "classic" && roundMode !== "bonus" && s.tiles[a.index] === "hidden" && s.phase !== "awarded") {
      const multiplier = roundMode === "double" ? 2 : 3;
      const extra = (q.answers[a.index]?.points ?? 0) * (multiplier - 1);
      if (s.phase === "steal" && nextState.lastAward) {
        dispatch({ type: "__load", s: { ...nextState, scores: { ...nextState.scores, [s.active]: nextState.scores[s.active] + extra }, lastAward: { ...nextState.lastAward, points: nextState.lastAward.points + extra } } });
      } else {
        dispatch({ type: "__load", s: { ...nextState, bank: nextState.bank + extra } });
      }
    } else dispatch(a);
  };
  const actRef = useRef(act);
  actRef.current = act;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      const k = e.key.toLowerCase();
      if (/^[1-6]$/.test(k)) actRef.current({ type: "reveal", index: Number(k) - 1 });
      else if (k === "n") actRef.current({ type: "next" });
      else if (k === "r") actRef.current({ type: "next", random: true });
 else if (k === "s") setStageOnly((v) => !v);
      else if (k === "escape") { setStageOnly(false); setHelp(false); setEditing(false); }
      else if (k === "h" || k === "?") setHelp((v) => !v);
      else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // helper to read latest state inside the key handler
  const stateRef = useRef(s);
  stateRef.current = s;

  const q = currentQuestion(s);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {!stageOnly && gameplayMusicActive && (
        <iframe
          title="Kingson Survey Show gameplay background music"
          src="https://suno.com/embed/67769172-521c-46da-98fe-5c9964ef3724?autoplay=1"
          className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
          allow="autoplay; encrypted-media"
          loading="eager"
          aria-hidden="true"
        />
      )}
      {!stageOnly && (
        <div className={(welcomeOpen ? "fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden bg-[#090411] px-5 py-10 text-center" : "pointer-events-none fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden bg-[#090411] px-5 py-10 text-center opacity-0")}>
          {themePlayerActive && (
            <iframe
              title="Kingson Survey Show background theme"
              src="https://suno.com/embed/10c14861-bbd4-45d8-a940-31e366f88733?autoplay=1"
              className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
              allow="autoplay; encrypted-media"
              loading="eager"
              aria-hidden="true"
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(91,33,132,0.48),transparent_58%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(234,179,8,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(192,132,252,.12) 1px, transparent 1px)", backgroundSize: "54px 54px" }} />
          <div className="relative z-10 mx-auto w-full max-w-3xl">
            <div className="mx-auto mb-5 flex h-36 w-36 items-center justify-center rounded-full border-2 border-yellow-300/80 bg-gradient-to-br from-purple-950 via-black to-purple-900 shadow-[0_0_65px_rgba(168,85,247,.38)]">
              <LionCrest className="h-28 w-28" />
            </div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.45em] text-purple-200">The ultimate live game show</p>
            <h1 className="font-display text-4xl font-black uppercase leading-tight tracking-wider text-white drop-shadow-[0_0_24px_rgba(234,179,8,.35)] sm:text-6xl">
              Welcome to <span className="text-gold">Kingson</span><br />Survey Show
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Think fast. Guess big. Bring your team and get ready for the battle of the answers!
            </p>
            <button
              type="button"
              onClick={enterShow}
              className="mt-10 inline-flex min-w-52 items-center justify-center gap-3 rounded-full border border-yellow-200/70 bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-600 px-12 py-5 text-xl font-black uppercase tracking-[0.22em] text-slate-950 shadow-[0_0_35px_rgba(234,179,8,.42)] transition duration-300 hover:scale-105 hover:shadow-[0_0_55px_rgba(234,179,8,.65)] active:scale-95"
            >
              <span>▶</span> Play
            </button>
            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">One stage · Two teams · One champion</p>
          </div>
        </div>
      )}
      <div className={stageOnly ? "flex h-screen items-center justify-center bg-background" : "mx-auto flex flex-col gap-4 p-3 sm:max-w-[1500px] sm:flex-row sm:items-start lg:p-5"}>
        <div className={(stageOnly ? "aspect-[9/16] w-[min(100vw,56.25vh)] max-h-screen" : "mx-auto aspect-[9/16] w-full max-w-[560px] sm:mx-0 sm:w-[min(32vw,320px)] sm:flex-none lg:w-[min(38vw,440px)]") + " relative"}>
          {(!stageOnly && !audienceGameStarted) ? (
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-yellow-300/60 bg-[#090411] px-6 text-center shadow-[0_0_45px_rgba(234,179,8,.2)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(91,33,132,0.5),transparent_62%)]" />
              <div className="relative z-10 flex flex-col items-center">
                <LionCrest className="mb-5 h-28 w-28" />
                <p className="text-xs font-black uppercase tracking-[0.35em] text-purple-200">Kingson Survey Show</p>
                <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-wide text-white">Are you ready?</h2>
                <p className="mt-3 max-w-xs text-sm text-slate-300">Press below when your teams and audience are ready to begin.</p>
                <button type="button" className={btnGold + " mt-8 min-w-56 px-8 py-5 text-xl shadow-[0_0_30px_rgba(234,179,8,.35)]"} onClick={playNow}>▶ PLAY NOW</button>
              </div>
            </div>
          ) : (
            <Stage audienceWaiting={stageOnly && !audienceGameStarted} s={s} q={q} strikeFlash={strikeFlash} timer={timer} onReveal={(i) => act({ type: "reveal", index: i })} roundMode={roundMode} bonus={bonus} roundResult={roundResult} finalResults={finalResults} showCountdown={showCountdown} />
          )}
          {showCountdown && showCountdown.target !== "handover" && <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"><div className="font-display text-[min(24vw,24cqh)] font-black leading-none text-gold drop-shadow-[0_0_35px_rgba(245,190,82,.7)]">{showCountdown.remaining}</div><div className="mt-3 font-display text-[min(4vw,4cqh)] tracking-[.3em] text-white">{showCountdown.target === "bonus" ? "GET READY FOR THE KINGSON BONUS ROUND" : "GET READY!"}</div></div>}
        </div>
        {stageOnly ? (
          <button onClick={() => setStageOnly(false)} className="fixed bottom-2 right-2 rounded bg-muted/40 px-2 py-1 text-xs text-muted-foreground opacity-30 hover:opacity-100">
            Exit stage view (Esc) · Host controls are in the other tab
          </button>
        ) : (
          <HostPanel
            s={s}
            q={q}
            act={act}
            onStage={() => window.open(`${window.location.pathname}?stage=1`, "_blank", "noopener,noreferrer")}
            onHelp={() => setHelp(true)}
            onNewMatch={() => setConfirmNew(true)}
            isFinalMatch={Boolean(finalResults?.finalMatch && finalResults?.revealCombined)}
            onPlayNow={playNow}
            roundMode={roundMode}
            onRoundChange={changeRound}
            timer={timer}
            bonus={bonus}
            onBonusChange={updateBonus}
            bonusGuess={bonusGuess}
            setBonusGuess={setBonusGuess}
            bonusFeedback={bonusFeedback}
            submitBonusGuess={submitBonusGuess}
          />
        )}
      </div>

      {help && <HelpOverlay onClose={() => setHelp(false)} />}
      {confirmNew && (
        <Modal onClose={() => setConfirmNew(false)} title="Start a new match?">
          <p className="text-muted-foreground">Both team scores go back to 0 and all questions become unused. Your edited questions are kept.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setConfirmNew(false)}>Cancel</button>
            <button className={btnDanger} onClick={() => { const fresh = reducer(s, { type: "newMatch" }); const drawnIds = drawSurveyIds(fresh.questions); const assignments: RoundQuestionsByTeam = { A: { classic: drawnIds[0] ?? fresh.currentId, double: drawnIds[1] ?? fresh.currentId, triple: drawnIds[2] ?? fresh.currentId }, B: { classic: drawnIds[3] ?? fresh.currentId, double: drawnIds[4] ?? fresh.currentId, triple: drawnIds[5] ?? fresh.currentId } }; const started = reducer({ ...fresh, usedIds: [] }, { type: "next", id: assignments.A.classic }); dispatch({ type: "__load", s: started }); setRoundQuestions(assignments); localStorage.setItem(ROUND_QUESTIONS_KEY, JSON.stringify(assignments)); setTeamLeg(1); setFinalResults(null); localStorage.setItem(GAME_STARTED_KEY, "false"); setAudienceGameStarted(false); localStorage.removeItem("kingson-survey-show-final-results-v1"); setRoundPoints({ A: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 }, B: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 } }); setAutoPlay(false); setRoundResult(null); setShowCountdown(null); setRoundMode("classic"); localStorage.setItem(ROUND_KEY, "classic"); const freshBonus = { ...bonus, questions: drawBonusQuestions(), index: 0, accepted: [], total: 0, responses: ["", "", "", "", ""], correctCount: 0, pendingAnswers: ["", "", "", "", ""], revealed: false }; setBonus(freshBonus); localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(freshBonus)); setTimer({ duration: 60, remaining: 60, running: false, endsAt: null }); localStorage.setItem(TIMER_KEY, JSON.stringify({ duration: 60, remaining: 60, running: false, endsAt: null })); setGameplayMusicActive(false); setThemePlayerActive(true); setWelcomeOpen(false); setConfirmNew(false); }}>Yes, new match</button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function LionCrest({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 160 160" role="img" aria-label="Golden crowned lion mascot" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="lionGold" x1="30" y1="18" x2="130" y2="145" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF1A8"/><stop offset=".38" stopColor="#F5C451"/><stop offset=".72" stopColor="#B87919"/><stop offset="1" stopColor="#FFE08A"/></linearGradient></defs>
    <path d="M80 29 94 17 105 31 121 25 124 43 140 51 130 68 140 84 125 96 128 115 108 116 98 135 80 126 62 135 52 116 32 115 35 96 20 84 30 68 20 51 36 43 39 25 55 31 66 17 80 29Z" fill="url(#lionGold)" stroke="#FFF0B0" strokeWidth="2.5"/>
    <path d="M49 35 56 14 68 29 80 8 92 29 105 14 111 36 80 43 49 35Z" fill="url(#lionGold)" stroke="#FFE7A0" strokeWidth="2.5"/>
    <path d="M44 57 58 43 80 39 102 43 116 57 110 94 98 116 80 127 62 116 50 94Z" fill="#2B153C" stroke="url(#lionGold)" strokeWidth="4"/>
    <path d="M55 66 69 61 76 68 69 73 57 72M105 66 91 61 84 68 91 73 103 72" stroke="#FFE29A" strokeWidth="4" strokeLinecap="round"/>
    <path d="M65 86 80 78 95 86 91 98 80 104 69 98Z" fill="url(#lionGold)" stroke="#FFF0B0" strokeWidth="2"/>
    <path d="M80 104v8M66 112q14 10 28 0" stroke="#FFE29A" strokeWidth="3" strokeLinecap="round"/>
    <path d="M45 80 31 94 47 101M115 80 129 94 113 101" stroke="#F5C451" strokeWidth="5" strokeLinecap="round"/>
  </svg>;
}

/* ---------------- STAGE ---------------- */

function Stage({ audienceWaiting, s, q, strikeFlash, timer, onReveal, roundMode, bonus, roundResult, finalResults, showCountdown }: { audienceWaiting: boolean; s: GameState; q: Question; strikeFlash: number; timer: TimerState; onReveal: (i: number) => void; roundMode: RoundMode; bonus: BonusState; roundResult: RoundResult | null; finalResults: FinalResults | null; showCountdown: { remaining: number; target: CountdownTarget } | null }) {
  const [flash, setFlash] = useState(false);
  const [showBonusResults, setShowBonusResults] = useState(false);
  const safeBonusQuestions = normalizeBonusQuestions(bonus.questions);
  useEffect(() => {
    if (!bonus.revealed) {
      setShowBonusResults(false);
      return;
    }
    setShowBonusResults(true);
    const timeout = window.setTimeout(() => setShowBonusResults(false), 10000);
    return () => window.clearTimeout(timeout);
  }, [bonus.revealed, bonus.questions]);
  const activeBonusQuestion = safeBonusQuestions[Math.min(4, Math.max(0, bonus.index))] ?? BONUS_DEFAULTS[0];
  useEffect(() => {
    if (!strikeFlash) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [strikeFlash]);

  const w = winner(s);
  return (
    <section className="stage-bg kingson-arena relative h-full w-full overflow-hidden rounded-2xl border border-border select-none" style={{ containerType: "size" }}>
      {audienceWaiting && <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_38%,rgba(126,34,206,.45),transparent_58%),linear-gradient(145deg,#090411,#170b25_55%,#08050e)] px-6 text-center">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage:"linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)",backgroundSize:"34px 34px"}} />
        <div className="relative z-10 mb-5 flex h-36 w-36 items-center justify-center rounded-full border-2 border-yellow-300/80 bg-black/50 shadow-[0_0_65px_rgba(168,85,247,.38)]"><LionCrest className="h-28 w-28" /></div>
        <div className="relative z-10 font-display font-black uppercase tracking-[.12em] text-white" style={{fontSize:"clamp(2rem,7cqh,4rem)",lineHeight:1.08}}>GET READY<br/><span className="gold-text">FOR THE GAME!</span></div>
        <div className="relative z-10 mt-5 max-w-[85%] font-display uppercase tracking-[.16em] text-purple-200" style={{fontSize:"clamp(.8rem,2.5cqh,1.2rem)"}}>Kingson Survey Show is about to begin</div>
        <div className="relative z-10 mt-8 flex items-center gap-2 text-yellow-200/80" style={{fontSize:"clamp(.65rem,2cqh,.9rem)"}}><span className="h-2 w-2 animate-pulse rounded-full bg-yellow-300"/> STAY TUNED</div>
      </div>}
      <style>{`
@keyframes ks-drift{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(2%,-3%,0) scale(1.08)}}
@keyframes ks-sweep{0%{transform:translateX(-120%) rotate(18deg);opacity:0}15%{opacity:.6}100%{transform:translateX(240%) rotate(18deg);opacity:0}}
@keyframes ks-tile-in{0%{transform:rotateX(70deg) scale(.88);opacity:.2}70%{transform:rotateX(-5deg) scale(1.02);opacity:1}100%{transform:rotateX(0) scale(1);opacity:1}}
@keyframes ks-glow{0%,100%{box-shadow:0 0 14px rgba(245,185,66,.16)}50%{box-shadow:0 0 28px rgba(245,185,66,.4)}}
@keyframes ks-title{0%,100%{text-shadow:0 0 10px rgba(245,185,66,.25)}50%{text-shadow:0 0 22px rgba(50,190,255,.55),0 0 34px rgba(245,185,66,.3)}}
.kingson-arena{isolation:isolate;background:radial-gradient(ellipse at 50% 42%,rgba(91,33,132,.48),transparent 48%),radial-gradient(ellipse at 8% 8%,rgba(176,112,26,.22),transparent 34%),linear-gradient(135deg,#05070d,#101827 48%,#07090f)}
.kingson-arena:before{content:'';position:absolute;inset:0;pointer-events:none;z-index:0;opacity:.14;background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:42px 42px}
.kingson-arena:after{content:'';position:absolute;top:-35%;bottom:-35%;left:-35%;width:20%;pointer-events:none;z-index:1;background:linear-gradient(90deg,transparent,rgba(192,132,252,.16),rgba(255,210,120,.16),transparent);filter:blur(12px);animation:ks-sweep 12s ease-in-out infinite}
.ks-orb{position:absolute;width:24cqh;aspect-ratio:1;border-radius:50%;pointer-events:none;filter:blur(34px);opacity:.17;animation:ks-drift 9s ease-in-out infinite}
.ks-title-glow{animation:ks-title 4s ease-in-out infinite}
.ks-question{border:1px solid rgba(245,190,82,.62);background:linear-gradient(110deg,rgba(12,19,31,.92),rgba(65,32,94,.88),rgba(29,22,39,.92));box-shadow:0 10px 35px rgba(0,0,0,.3),0 0 24px rgba(245,185,66,.11),inset 0 1px rgba(255,255,255,.12);backdrop-filter:blur(12px)}
.ks-tile{position:relative;overflow:hidden;border:1px solid rgba(245,190,82,.45);box-shadow:0 8px 18px rgba(0,0,0,.3),inset 0 1px rgba(255,255,255,.12);transition:transform .28s ease,filter .28s ease,box-shadow .28s ease;transform-style:preserve-3d}
.ks-tile:hover:not(:disabled){transform:translateY(-3px) scale(1.015);filter:brightness(1.2);box-shadow:0 12px 28px rgba(0,0,0,.4),0 0 18px rgba(180,110,255,.22)}
.ks-tile.tile-closed{background:#050505}
.ks-tile.tile-open{background:#050505;animation:ks-tile-in .55s cubic-bezier(.2,.8,.2,1) both,ks-glow 3.2s ease-in-out infinite .55s}
.ks-tile.tile-shown{background:#050505;opacity:.94;animation:ks-tile-in .45s ease-out both}
.ks-podium{position:relative;overflow:hidden;background:linear-gradient(155deg,rgba(24,36,53,.92),rgba(7,12,22,.86));box-shadow:0 12px 30px rgba(0,0,0,.28),inset 0 1px rgba(255,255,255,.08);backdrop-filter:blur(8px);transition:transform .35s ease,box-shadow .35s ease}
.ks-podium-active{transform:translateY(-3px);box-shadow:0 0 26px rgba(168,85,247,.25),0 14px 32px rgba(0,0,0,.35),inset 0 0 22px rgba(168,85,247,.10)}
.ks-winner-screen{background:radial-gradient(ellipse at 50% 42%,rgba(91,33,132,.48),transparent 55%),rgba(3,6,13,.94);backdrop-filter:blur(14px)}
@keyframes ks-final-enter{0%{opacity:0;transform:scale(.92) translateY(18px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes ks-final-pulse{0%,100%{text-shadow:0 0 12px rgba(255,220,90,.35),0 0 26px rgba(30,190,255,.22)}50%{text-shadow:0 0 24px rgba(255,220,90,.8),0 0 48px rgba(30,190,255,.6)}}
@keyframes ks-final-rays{0%{transform:rotate(0deg) scale(1.2)}100%{transform:rotate(360deg) scale(1.2)}}
@keyframes ks-final-row{0%{opacity:0;transform:translateX(-24px) scale(.97)}100%{opacity:1;transform:translateX(0) scale(1)}}
.ks-final-show{isolation:isolate;background:radial-gradient(ellipse at 50% 0%,rgba(20,190,255,.42),transparent 48%),radial-gradient(ellipse at 5% 100%,rgba(168,85,247,.34),transparent 42%),radial-gradient(ellipse at 100% 90%,rgba(236,72,153,.28),transparent 40%),linear-gradient(135deg,#070b2b 0%,#111044 45%,#071b35 100%);overflow:hidden}
.ks-final-rays{z-index:0;opacity:.28;background:repeating-conic-gradient(from 0deg at 50% 45%,rgba(255,255,255,.13) 0deg 2deg,transparent 2deg 12deg);animation:ks-final-rays 55s linear infinite;mask-image:radial-gradient(ellipse at center,#000 0%,transparent 75%)}
.ks-final-kicker,.ks-final-heading,.ks-final-team,.ks-final-total,.ks-final-champion{animation:ks-final-enter .55s cubic-bezier(.2,.8,.2,1) both}
.ks-final-heading,.ks-final-total>div:last-child{animation:ks-final-pulse 2.6s ease-in-out infinite}
.ks-final-team{background:linear-gradient(100deg,rgba(234,179,8,.2),rgba(236,72,153,.2),rgba(14,165,233,.2));box-shadow:0 0 24px rgba(250,204,21,.2)}
.ks-final-row{animation:ks-final-row .45s ease-out both;box-shadow:0 5px 16px rgba(0,0,0,.28),inset 0 1px rgba(255,255,255,.16)}
.ks-final-total{background:linear-gradient(100deg,rgba(234,179,8,.28),rgba(236,72,153,.18),rgba(14,165,233,.24));box-shadow:0 0 28px rgba(250,204,21,.28),inset 0 0 20px rgba(255,255,255,.06)}
.ks-final-champion{text-shadow:0 0 22px rgba(250,204,21,.65),0 0 44px rgba(236,72,153,.35)}

@media(prefers-reduced-motion:reduce){.kingson-arena *,.kingson-arena:after{animation:none!important;transition:none!important}}
`}</style>
      <div className="ks-orb bg-cyan-400" style={{ top: "8%", left: "-7%" }} />
      <div className="ks-orb bg-amber-400" style={{ bottom: "-8%", right: "-5%", animationDelay: "-4s" }} />
      <div className="spotlight pointer-events-none absolute -top-[10%] left-[8%] h-[120%] w-[30%]" />
      <div className="spotlight pointer-events-none absolute -top-[10%] right-[8%] h-[120%] w-[30%]" style={{ animationDelay: "-4.5s" }} />

      <div className="relative flex h-full flex-col px-[2.5cqw] py-[1.2cqh]">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="ks-title-glow font-display tracking-wide leading-none" style={{ fontSize: "3.4cqh" }}>
            <LionCrest className="mr-[1cqw] inline-block h-[5cqh] w-[5cqh] align-middle" /> <span className="gold-text">KINGSON</span> <span className="text-electric">SURVEY SHOW</span>
          </div>
          <div className="flex items-center gap-[1.5cqw] font-display text-muted-foreground" style={{ fontSize: "2.6cqh" }}>
            <span>{roundMode === "bonus" ? "KINGSON BONUS ROUND" : roundMode === "triple" ? "TRIPLE POINT ROUND" : roundMode === "double" ? "DOUBLE POINT ROUND" : "CLASSIC ROUND"}</span>
            <span className={timer.remaining <= 5 && timer.running ? "text-destructive" : "text-gold"}>TIME {timer.remaining}s</span>
            
          </div>
        </div>

        {/* question */}
        <div className="ks-question mt-[1cqh] rounded-xl px-[2cqw] py-[1cqh] text-center">
          <h1 className="font-display uppercase leading-tight tracking-wide" style={{ fontSize: "4.1cqh" }}>{roundMode === "bonus" ? activeBonusQuestion.prompt : q.prompt}</h1>
        </div>

        {/* body */}
        <div className="mt-[1cqh] flex flex-1 min-h-0 flex-col gap-[.65cqh]">
          <div className="grid grid-cols-2 gap-[1.5cqw]">
            <Podium s={s} team="A" />
            <Podium s={s} team="B" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {roundMode === "bonus" ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-gold/60 bg-background/55 p-[1.5cqw] text-center">
                <div className="font-display text-gold" style={{fontSize:"3.5cqh"}}>BONUS QUESTION {bonus.index + 1} / 5</div>
                <div className="mt-[1cqh] font-display text-electric" style={{fontSize:"2.5cqh"}}>UP TO 200 POINTS AVAILABLE</div>
                <div className="mt-[1.2cqh] grid w-full flex-1 min-h-0 grid-cols-1 grid-rows-5 gap-[.7cqh]">
                  {Array.from({ length: 5 }, (_, i) => {
                    const submitted = bonus.pendingAnswers?.[i]?.trim() ?? "";
                    const matched = submitted ? safeBonusQuestions[i].answers.find(a => bonusAnswerMatches(submitted, a.text)) : undefined;
                    const expected = [...safeBonusQuestions[i].answers].sort((a, b) => b.points - a.points)[0];
                    const showExpected = bonus.revealed && submitted && (!matched || (expected && matched.text !== expected.text));
                    const points = bonus.revealed && matched ? matched.points : 0;
                    return <div key={i} className="flex min-h-0 items-center gap-[2cqw] rounded-xl border-2 border-gold/50 bg-slate-950/75 px-[2cqw] py-[.45cqh]">
                      <span className="flex h-[6.2cqh] aspect-square shrink-0 items-center justify-center rounded-full bg-amber-400/15 font-mono font-semibold tabular-nums text-gold" style={{fontSize:"3.2cqh"}}>{i + 1}</span>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="break-words font-sans font-medium tracking-wide text-white" style={{fontSize:"2.8cqh",lineHeight:1.08}}>{submitted || "WAITING FOR ANSWER"}</div>
                        {showExpected && expected && <div className="mt-[.25cqh] break-words font-sans font-semibold tracking-wide text-emerald-300" style={{fontSize:"2.45cqh",lineHeight:1.05}}>CORRECT ANSWER: {expected.text}</div>}
                      </div>
                      <span className="shrink-0 rounded-lg bg-amber-400/15 px-[2cqw] py-[.5cqh] font-display font-black text-gold" style={{fontSize:"3.2cqh"}}>{bonus.revealed && matched ? "+" + points : "—"}</span>
                    </div>;
                  })}
                </div>
                <div className="mt-[1.5cqh] text-muted-foreground" style={{fontSize:"2.3cqh"}}>{bonus.revealed ? "BONUS MISSION COMPLETE · " + bonus.correctCount + "/5 CORRECT" + (bonus.correctCount >= 3 ? " · +500 BONUS POINTS" : "") : "ANSWERS REVEAL WHEN THE 60-SECOND TIMER ENDS"}</div>
              </div>
            ) : <>
            {roundResult && (
              <div className="mb-[1cqh] flex shrink-0 items-center justify-center gap-[1.2cqw] rounded-xl border-2 border-gold/70 bg-black/85 px-[2cqw] py-[.7cqh] text-center">
                <span className="font-display text-white" style={{fontSize:"2.8cqh"}}>{s.teamNames[roundResult.team]} · ROUND SCORE</span>
                <span className="font-display gold-text" style={{fontSize:"5.2cqh",lineHeight:1}}>+{roundResult.points}</span>
                <span className="font-display text-gold" style={{fontSize:"2.3cqh"}}>{roundResult.mode.toUpperCase()} {roundResult.mode === "classic" ? "×1" : roundResult.mode === "double" ? "×2" : "×3"}</span>
              </div>
            )}
            <div className="mb-[.7cqh] flex items-center justify-center gap-[1cqw]">
              <span className="font-display text-muted-foreground" style={{ fontSize: "2.4cqh" }}>ROUND BANK</span>
              <span key={s.bank} className="pop font-display gold-text" style={{ fontSize: "5cqh", lineHeight: 1 }}>{s.bank}</span>
            </div>
            <div className="grid flex-1 min-h-0 grid-cols-1 grid-rows-6 gap-[1.1cqh]" style={{ perspective: 800 }}>
              {q.answers.map((ans, i) => {
                const t = s.tiles[i];
                return (
                  <button
                    key={`${q.id}-${i}-${t}`}
                    onClick={() => onReveal(i)}
                    disabled={t !== "hidden"}
                    className={`ks-tile flex min-h-0 items-center rounded-xl px-[1.2cqw] py-[1cqh] text-left ${t === "hidden" ? "tile-closed cursor-pointer hover:brightness-125" : t === "scored" ? "tile-open" : "tile-shown"}`}
                    aria-label={t === "hidden" ? `Reveal answer ${i + 1}` : `${ans.text} ${ans.points}`}
                  >
                    {t === "hidden" ? (
                      <span className="mx-auto flex aspect-square h-[70%] items-center justify-center rounded-full bg-background/70 font-mono font-semibold tabular-nums text-gold" style={{ fontSize: "6cqh", border: "2px solid var(--gold)" }}>{i + 1}</span>
                    ) : (
                      <>
                        <span className="mr-[1cqw] flex h-[5.2cqh] aspect-square shrink-0 items-center justify-center rounded-full bg-amber-400/15 font-mono font-semibold tabular-nums text-gold" style={{ fontSize: "3.5cqh" }}>{i + 1}</span>
                        <FittedAnswerText text={ans.text} />
                        <span className={`ml-[1cqw] flex h-[5.8cqh] min-w-[5.8cqh] shrink-0 items-center justify-center rounded-lg px-[0.5cqw] font-display font-black ${t === "scored" ? "bg-primary-foreground text-primary" : "bg-slate-950/70 text-gold"}`} style={{ fontSize: "3.7cqh" }}>{ans.points}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            {/* strikes */}
            <div className="mt-[.4cqh] flex h-[3.5cqh] shrink-0 items-center justify-center gap-[1.5cqw]">
              {!s.lastAward && [0, 1, 2].map((i) => (
                <div key={i} className={`flex aspect-square h-full items-center justify-center rounded-lg border-2 font-display ${i < s.strikes ? "pop border-destructive bg-destructive/20 text-destructive" : "border-border text-border"}`} style={{ fontSize: "7cqh", lineHeight: 1 }}>✕</div>
              ))}
            </div>
            </>}
          </div>
        </div>

        {s.lastAward && !s.gameOver && (
          <div key={s.round + s.lastAward.reason} className="pop absolute bottom-[3.5cqh] left-1/2 -translate-x-1/2 rounded-full gold-frame bg-background/90 px-[3cqw] py-[1cqh] font-display" style={{ fontSize: "3cqh" }}>
            <span className="text-muted-foreground">{s.lastAward.reason.toUpperCase()} · </span>
            <span className="gold-text">+{s.lastAward.points} {s.teamNames[s.lastAward.team]}</span>
          </div>
        )}
      </div>

      {showCountdown?.target === "handover" && (
        <div className="ks-final-show absolute inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden px-5 py-4 text-center">
          <div className="ks-final-rays pointer-events-none absolute inset-0" />
          <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
            <div className="mx-auto mb-5 flex items-center justify-center"><LionCrest className="h-[15cqh] w-[15cqh]" /></div>
            <div className="font-display font-black uppercase tracking-[.12em] text-white" style={{fontSize:"clamp(2rem,7cqh,4rem)",lineHeight:1.08}}>NEXT TEAM,<br/><span className="gold-text">GET READY!</span></div>
            <div className="mt-5 font-display uppercase tracking-[.16em] text-purple-200" style={{fontSize:"clamp(1rem,3cqh,1.6rem)"}}>{s.teamNames[s.active === "A" ? "B" : "A"]}</div>
            <div className="mt-7 font-display font-black leading-none text-gold drop-shadow-[0_0_35px_rgba(245,190,82,.7)]" style={{fontSize:"clamp(5rem,24cqh,11rem)"}}>{showCountdown.remaining}</div>
            <div className="mt-4 font-display uppercase tracking-[.22em] text-white" style={{fontSize:"clamp(.8rem,2.8cqh,1.3rem)"}}>SECONDS TO TAKE THE STAGE</div>
          </div>
        </div>
      )}
      {showBonusResults && bonus.revealed && (
        <div className="ks-final-show absolute inset-0 z-[70] overflow-hidden px-[2.5cqw] py-[1.5cqh] text-center">
          <div className="ks-final-rays pointer-events-none absolute inset-0" />
          <div className="relative z-10 mx-auto flex h-full w-full max-w-4xl flex-col items-stretch gap-[.8cqh]">
            <div className="flex shrink-0 items-center justify-center gap-[2cqw]">
              <LionCrest className="h-[5.5cqh] w-[5.5cqh]" />
              <div className="min-w-0 text-left">
                <div className="font-sans text-[1.5cqh] font-normal tracking-[.16em] text-purple-100">KINGSON SURVEY SHOW</div>
                <div className="font-sans text-[3.2cqh] font-semibold leading-tight tracking-wide text-white">BONUS MISSION RESULTS</div>
                <div className="font-sans text-[2cqh] font-medium text-yellow-200">{s.teamNames[finalResults?.team ?? s.active]}</div>
              </div>
            </div>
            <div className="grid min-h-0 flex-1 grid-rows-5 gap-[.65cqh]">
              {safeBonusQuestions.map((question,index) => {
                const submitted = bonus.pendingAnswers?.[index]?.trim() ?? "";
                const matched = submitted ? question.answers.find(answer => bonusAnswerMatches(submitted, answer.text)) : undefined;
                const topAnswer = [...question.answers].sort((a,b) => b.points-a.points)[0];
                const surveyAnswer = matched?.text ?? topAnswer?.text ?? "No survey answer";
                return (
                  <div key={index} className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[1.5cqw] rounded-xl border border-white/20 bg-slate-950/90 px-[2cqw] py-[.45cqh] text-left shadow-lg">
                    <div className="flex h-[5.5cqh] aspect-square items-center justify-center rounded-full bg-white/10 font-sans text-[2.2cqh] font-medium text-yellow-200">{index+1}</div>
                    <div className="min-w-0">
                      <div className="truncate font-sans text-[1.65cqh] font-medium leading-tight text-purple-200">{question.prompt}</div>
                      <div className="break-words font-sans text-[2.05cqh] font-medium leading-tight text-white">{submitted || "No answer submitted"}</div>
                      <div className="break-words font-sans text-[1.65cqh] font-normal leading-tight text-emerald-300">{matched ? "SURVEY ANSWER: " : "TOP SURVEY ANSWER: "}{surveyAnswer}</div>
                    </div>
                    <div className="min-w-[4cqw] text-right">
                      <div className={`font-sans text-[2.7cqh] font-semibold tabular-nums ${matched ? "text-yellow-200" : "text-white/60"}`}>{matched ? "+"+matched.points : "0"}</div>
                      <div className="font-sans text-[1.25cqh] font-normal tracking-wide text-white/60">POINTS</div>
                      <div className={`font-sans text-[1.35cqh] font-medium ${matched ? "text-emerald-300" : "text-rose-300"}`}>{matched ? "CORRECT" : submitted ? "NOT MATCHED" : "UNANSWERED"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-[1.5cqw]">
              <div className="rounded-xl border border-white/20 bg-black/55 px-2 py-[.8cqh]">
                <div className="font-sans text-[1.5cqh] font-normal tracking-wide text-white/70">CORRECT ANSWERS</div>
                <div className="font-sans text-[3cqh] font-semibold leading-tight text-emerald-300">{bonus.correctCount} / 5</div>
              </div>
              <div className="rounded-xl border border-yellow-300/50 bg-yellow-300/10 px-2 py-[.8cqh]">
                <div className="font-sans text-[1.5cqh] font-normal tracking-wide text-yellow-100/80">MISSION POINTS</div>
                <div className="font-sans text-[3cqh] font-semibold leading-tight text-yellow-200">{bonus.total.toLocaleString()}</div>
              </div>
            </div>
            {bonus.correctCount >= 3 && (
              <div className="shrink-0 rounded-xl border border-yellow-300 bg-gradient-to-r from-yellow-500/20 via-amber-300/20 to-yellow-500/20 px-3 py-[.55cqh]">
                <span className="font-sans text-[1.7cqh] font-medium text-yellow-100">BONUS REWARD UNLOCKED · </span>
                <span className="font-sans text-[2.5cqh] font-semibold text-yellow-200">+500 POINTS</span>
              </div>
            )}
          </div>
        </div>
      )}
      {finalResults && showCountdown?.target !== "handover" && (
        <div className="ks-final-show absolute inset-0 z-50 overflow-y-auto px-3 py-4 text-center sm:px-6 sm:py-6">
          <div className="ks-final-rays pointer-events-none absolute inset-0" />
          <div className="relative z-10 mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-start gap-3 sm:justify-center sm:gap-4">
            <div className="mx-auto flex items-center justify-center"><LionCrest className="h-12 w-12 sm:h-16 sm:w-16" /></div>
            <div className="ks-final-kicker font-display font-bold tracking-[.16em] text-purple-100" style={{fontSize:"clamp(.9rem,2.2vw,1.35rem)"}}>✦ KINGSON SURVEY SHOW ✦</div>
            <div className="ks-final-heading font-display font-black tracking-wide text-white drop-shadow-lg" style={{fontSize:"clamp(1.8rem,5vw,3.5rem)",lineHeight:1.05}}>{finalResults.finalMatch && finalResults.revealCombined ? "FINAL SCOREBOARD" : (s.teamNames[finalResults.team] + " · TEAM RESULTS")}</div>
            {finalResults.finalMatch && finalResults.revealCombined && finalResults.teams ? (
              <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border-4 border-yellow-300 bg-black/95 text-center shadow-2xl">
                <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] items-stretch border-b-2 border-yellow-300/70 bg-purple-950/90">
                  <div className="flex items-center px-3 py-3 text-left font-display font-bold text-purple-100" style={{fontSize:"clamp(.8rem,1.8vw,1.05rem)"}}>SCORING ROUND</div>
                  {(["A","B"] as Team[]).map((team)=>(
                    <div key={team} className="flex flex-col items-center justify-center border-l border-white/20 px-2 py-3">
                      <div className="font-display font-black text-white" style={{fontSize:"clamp(.9rem,2vw,1.2rem)"}}>{s.teamNames[team]}</div>
                      <div className="mt-1 font-display font-bold text-yellow-200" style={{fontSize:"clamp(.65rem,1.3vw,.85rem)"}}>{finalResults.champion === "tie" ? "TIED" : finalResults.champion === team ? "🏆 WINNER" : "RUNNER-UP"}</div>
                    </div>
                  ))}
                </div>
                {([[ "CLASSIC ROUND", "classic" ],[ "DOUBLE POINT ROUND", "double" ],[ "TRIPLE POINT ROUND", "triple" ],[ "BONUS MISSION", "bonus" ],[ "BONUS REWARD", "bonusExtra" ]] as [string,keyof TeamBreakdown][]).map(([label,key],index)=>(
                  <div key={key} className={"grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] items-center "+(index%2===0?"bg-white/[0.07]":"bg-transparent")}>
                    <div className="px-3 py-3 text-left font-display font-semibold text-white" style={{fontSize:"clamp(.78rem,1.8vw,1.08rem)"}}>{label}</div>
                    {(["A","B"] as Team[]).map(team=>(
                      <div key={team} className="border-l border-white/15 px-2 py-3 font-display font-bold tabular-nums text-yellow-100" style={{fontSize:"clamp(1rem,2.2vw,1.4rem)"}}>{finalResults.teams![team].breakdown[key].toLocaleString()}</div>
                    ))}
                  </div>
                ))}
                <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] items-center border-t-4 border-yellow-300 bg-gradient-to-r from-yellow-950 via-yellow-900/70 to-yellow-950">
                  <div className="px-3 py-4 text-left font-display font-black tracking-wide text-white" style={{fontSize:"clamp(.9rem,2vw,1.25rem)"}}>GRAND TOTAL</div>
                  {(["A","B"] as Team[]).map(team=>(
                    <div key={team} className="border-l border-yellow-200/30 px-2 py-4 font-display font-black tabular-nums text-yellow-200" style={{fontSize:"clamp(1.45rem,3.5vw,2.5rem)"}}>{finalResults.teams![team].total.toLocaleString()}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-3 sm:gap-4">
                <div className="min-w-0 rounded-2xl border-4 border-purple-300 bg-gradient-to-br from-purple-700/90 via-purple-950/95 to-black p-4 text-left shadow-2xl sm:p-5">
                  <div className="mb-2 text-center font-display font-black tracking-wider text-yellow-200" style={{fontSize:"clamp(1rem,2.5vw,1.5rem)"}}>TEAM RESULTS</div>
                  <div className="break-words text-center font-display font-black leading-tight text-white" style={{fontSize:"clamp(1.5rem,4vw,2.5rem)"}}>{s.teamNames[finalResults.team]}</div>
                  <div className="my-3 space-y-1.5">
                    {([[ "CLASSIC",finalResults.breakdown.classic ],[ "DOUBLE ×2",finalResults.breakdown.double ],[ "TRIPLE ×3",finalResults.breakdown.triple ],[ "BONUS MISSION",finalResults.breakdown.bonus ],[ "500-POINT REWARD",finalResults.breakdown.bonusExtra ]] as [string,number][]).map(([label,points])=>(
                      <div key={label} className="flex items-center justify-between gap-3 border-b border-white/25 py-2">
                        <div className="font-display font-semibold text-white" style={{fontSize:"clamp(.95rem,2vw,1.2rem)"}}>{label}</div>
                        <div className="shrink-0 font-display font-bold text-yellow-200 tabular-nums" style={{fontSize:"clamp(1.1rem,2.5vw,1.55rem)"}}>{points.toLocaleString()} <span className="text-yellow-100" style={{fontSize:"clamp(.75rem,1.4vw,.95rem)"}}>PTS</span></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border-2 border-yellow-300 bg-black px-3 py-3 sm:px-4">
                    <div className="font-display font-black tracking-wider text-white" style={{fontSize:"clamp(1.1rem,2.4vw,1.5rem)"}}>TOTAL SCORE</div>
                    <div className="font-display font-black leading-none text-yellow-200 tabular-nums" style={{fontSize:"clamp(2rem,5vw,3.5rem)"}}>{finalResults.total.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}
            {finalResults.finalMatch && finalResults.revealCombined ? <div className="ks-final-champion mt-1 rounded-xl border-2 border-yellow-300 bg-black/90 px-4 py-3 font-display font-black text-yellow-200 shadow-xl sm:px-8" style={{fontSize:"clamp(1.35rem,3.5vw,2.7rem)"}}>{finalResults.champion === "tie" ? "🏆 IT'S A TIE! 🏆" : "🏆 CHAMPION: " + s.teamNames[finalResults.champion as Team] + " 🏆"}</div> : finalResults.finalMatch ? <div className="rounded-xl border-2 border-purple-200 bg-purple-950 px-5 py-2 font-display font-bold text-white" style={{fontSize:"clamp(1rem,2.2vw,1.4rem)"}}>FINAL SCORES COMING UP…</div> : <div className="inline-flex items-center gap-2 rounded-full border-2 border-purple-200 bg-purple-950 px-5 py-2 font-display font-bold text-white" style={{fontSize:"clamp(1rem,2.2vw,1.4rem)"}}>TEAM B PREPARES IN <span className="font-black text-yellow-300">{showCountdown?.target === "handover" ? showCountdown.remaining : 30}</span> SECONDS</div>}
          </div>
        </div>
      )}
      {flash && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-destructive/15">
          <span className="pop font-display text-destructive" style={{ fontSize: "40cqh", lineHeight: 1, textShadow: "0 0 40px var(--destructive)" }}>✕</span>
        </div>
      )}

      {s.gameOver && (
        <div className="ks-winner-screen absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="font-display text-electric" style={{ fontSize: "4cqh" }}>THE LION CROWN GOES TO…</div>
          <div className="pop font-display gold-text mt-[2cqh]" style={{ fontSize: "14cqh", lineHeight: 1 }}>
            {w === "tie" ? "IT'S A TIE!" : s.teamNames[w]}
          </div>
          <div className="mt-[3cqh] font-display" style={{ fontSize: "5cqh" }}>
            {s.teamNames.A} <span className="text-gold">{s.scores.A}</span>
            <span className="mx-[2cqw] text-muted-foreground">—</span>
            <span className="text-gold">{s.scores.B}</span> {s.teamNames.B}
          </div>
        </div>
      )}
    </section>
  );
}

function Podium({ s, team }: { s: GameState; team: Team }) {
  const active = s.active === team && !s.gameOver;
  return (
    <div className={`ks-podium flex min-h-0 flex-row items-center justify-center gap-[2cqw] rounded-xl border-2 px-[2cqw] py-[.5cqh] ${active ? "ks-podium-active glow-active border-electric" : "border-border opacity-80"}`}>
      <div className="font-display text-center uppercase tracking-wide" style={{ fontSize: "2.5cqh" }}>{s.teamNames[team]}</div>
      <div key={s.scores[team]} className="pop font-mono font-bold tabular-nums gold-text" style={{ fontSize: "4.6cqh", lineHeight: 1 }}>{s.scores[team]}</div>
      <div className={`rounded-full px-[1cqw] font-display ${active ? "bg-electric text-accent-foreground" : "text-transparent"}`} style={{ fontSize: "1.8cqh" }}>
        {active ? "PLAYING" : ""}
      </div>
    </div>
  );
}

/* ---------------- HOST ---------------- */

function HostPanel({ s, q, act, onStage, onHelp, onNewMatch, isFinalMatch, onPlayNow, roundMode, onRoundChange, bonus, onBonusChange, bonusGuess, setBonusGuess, bonusFeedback, submitBonusGuess, timer }: {
  s: GameState; q: Question; act: (a: Action) => void; onStage: () => void; onHelp: () => void; onNewMatch: () => void; isFinalMatch: boolean; onPlayNow: () => void;
  roundMode: RoundMode; onRoundChange: (mode: RoundMode) => void; timer: TimerState; bonus: BonusState; onBonusChange: (next: BonusState) => void; bonusGuess: string; setBonusGuess: (value: string) => void; bonusFeedback: string; submitBonusGuess: () => void;
}) {
  const safeBonusQuestions = normalizeBonusQuestions(bonus.questions);
  const safeBonusIndex = Math.min(4, Math.max(0, Number.isInteger(bonus.index) ? bonus.index : 0));
  const activeBonusQuestion = safeBonusQuestions[safeBonusIndex] ?? BONUS_DEFAULTS[0];
  return (
    <section className="mt-0 min-w-0 rounded-2xl border-2 border-dashed border-border bg-card p-3 sm:max-h-[calc(100vh-2.5rem)] sm:flex-1 sm:overflow-y-auto lg:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl tracking-wide text-gold">HOST CONTROLS <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">not part of the show — open Stage view in a second tab when streaming</span></h2>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={onHelp}>How to play (H)</button>
          <button className={btnBlue} onClick={onStage}>Stage view (S)</button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-electric/40 bg-muted p-3">
        <h3 className="mb-2 font-display text-lg text-gold">SHOW ROUNDS</h3>
        <div className="flex flex-wrap gap-2">
          {([["classic","Round 1 · Classic ×1"],["double","Round 2 · Double ×2"],["triple","Round 3 · Triple ×3"],["bonus","Kingson Bonus Round"]] as [RoundMode,string][]).map(([mode,label]) => <button key={mode} className={roundMode===mode?btnGold:btnGhost} onClick={()=>onRoundChange(mode)}>{label}</button>)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{roundMode==="classic"?"Normal survey points.":roundMode==="double"?"Every correct board answer earns double points.":roundMode==="triple"?"Every correct board answer earns triple points.":"Five host-checked questions. Each answer has a different value; five answers total 200 points."}</p>
        <div className="mt-3 rounded-lg border border-gold/40 bg-card px-3 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current question · Host view</div>
          <div className="mt-1 font-semibold leading-relaxed text-foreground">{roundMode === "bonus" ? activeBonusQuestion.prompt : q.prompt}</div>
          <div className="mt-1 text-xs text-muted-foreground">{roundMode === "bonus" ? `Bonus question ${safeBonusIndex + 1} of 5` : "This is the question currently shown to the audience."}</div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Round */}
        <div className="rounded-xl bg-muted p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Automatic team & strikes</h3>
          <div className="text-sm">
            <p>Playing team: <b className="text-electric">{s.teamNames[s.active]}</b></p>
            {s.phase === "play" && <p className="mt-2">Strikes: <b className="text-destructive">{s.strikes}/3</b> · Wrong answers add strikes automatically. Three strikes end the round.</p>}
            {s.phase === "awarded" && <p className="mt-2 text-muted-foreground">Round finished. The remaining answers are revealed automatically before the next round.</p>}
          </div>
          
        </div>

        {/* Bank */}
        <div className="rounded-xl bg-muted p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Round bank: <span className="text-gold text-base">{s.bank}</span></h3>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button className={btnGhost} disabled={s.tiles.every((t) => t !== "hidden")} onClick={() => act({ type: "showAll" })}>Show remaining answers</button>
            <button className={btnGhost} onClick={() => act({ type: "resetRound" })}>Reset this round</button>
          </div>
          <h3 className="mb-2 mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Scores (manual fix)</h3>
          {(["A", "B"] as Team[]).map((t) => (
            <div key={t} className="mb-2 flex items-center gap-2">
              <input aria-label={`Team ${t} name`} className="w-28 flex-1 rounded-md border border-input bg-card px-2 py-1 text-sm" value={s.teamNames[t]}
                onChange={(e) => act({ type: "renameTeam", team: t, name: e.target.value.toUpperCase() })} />
              <span className="w-12 text-right font-display text-gold">{s.scores[t]}</span>
              <button className={btnGhost} onClick={() => act({ type: "adjustScore", team: t, delta: -5 })}>−5</button>
              <button className={btnGhost} onClick={() => act({ type: "adjustScore", team: t, delta: 5 })}>+5</button>
            </div>
          ))}
        </div>

        {/* Match actions — question selection is automatic */}
        <div className="rounded-xl bg-muted p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Match controls</h3>
          {s.bank > 0 && s.phase !== "awarded" && <p className="mb-3 text-xs text-destructive">Bank has {s.bank} unbanked points — moving on discards them.</p>}
          <div className="grid grid-cols-1 gap-2">
            {s.gameOver
              ? <button className={btnGhost} onClick={() => act({ type: "resumeGame" })}>Hide winner</button>
              : <button className={btnGold} onClick={() => act({ type: "endGame" })}>End game · show winner</button>}
            <button className={isFinalMatch ? btnGold : btnDanger} onClick={onNewMatch}>{isFinalMatch ? "▶ NEXT GAME" : "New match…"}</button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Questions are selected and shuffled automatically for every new match.</p>
        </div>
      </div>

      {roundMode === "bonus" && (
        <div className="mt-4 rounded-xl border-2 border-gold/60 bg-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-xl text-gold">KINGSON BONUS ROUND · HOST ONLY</h3><b className="text-gold">BONUS TOTAL: {bonus.total} pts · {bonus.correctCount}/5 CORRECT</b></div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gold">Question {Math.min(safeBonusIndex + 1, 5)} of 5</span>
            <span className="text-xs text-muted-foreground">A correct answer automatically opens the next question.</span>
            <button className={btnGhost} onClick={()=>onBonusChange({...bonus,index:0,accepted:[],total:0,responses:["","","","",""],pendingAnswers:["","","","",""],revealed:false,correctCount:0})}>Reset bonus round</button>
          </div>
          <label className="mt-3 block text-xs font-bold uppercase text-muted-foreground">Question shown to viewers</label>
          <input className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2" value={activeBonusQuestion.prompt} onChange={e=>{const questions=[...safeBonusQuestions];questions[safeBonusIndex]={...questions[safeBonusIndex],prompt:e.target.value};onBonusChange({...bonus,questions});}} />
          <label className="mt-3 block text-xs font-bold uppercase text-muted-foreground">Private accepted answers · edit these before the show</label>
          <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {(activeBonusQuestion ?? BONUS_DEFAULTS[0]).answers.map((answer,i)=><div key={i} className="flex min-w-0 gap-1"><input aria-label={"Bonus accepted answer "+(i+1)} className="min-w-0 flex-1 rounded-md border border-input bg-card px-2 py-2 text-sm" value={answer.text} onChange={e=>{const questions=[...safeBonusQuestions];const answers=[...questions[safeBonusIndex].answers];answers[i]={...answer,text:e.target.value};questions[safeBonusIndex]={...questions[safeBonusIndex],answers};onBonusChange({...bonus,questions});}} /><span className="flex w-16 items-center justify-center rounded-md border border-border bg-card px-1 py-2 text-sm font-semibold text-gold">{answer.points}</span></div>)}
          </div>
          <p className={"mt-2 text-xs font-semibold " + (activeBonusQuestion.answers.reduce((sum,a)=>sum+a.points,0)===200?"text-gold":"text-destructive")}>Answer points total: {activeBonusQuestion.answers.reduce((sum,a)=>sum+a.points,0)} / 200</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input className="min-w-0 flex-1 rounded-md border border-input bg-card px-3 py-2" placeholder="Type the viewer's answer…" value={bonusGuess} disabled={Boolean(bonus.pendingAnswers?.[safeBonusIndex]) || bonus.revealed || !timer.running} onChange={e=>setBonusGuess(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();submitBonusGuess();}}} />
            <button className={btnGold} disabled={!bonusGuess.trim() || Boolean(bonus.pendingAnswers?.[safeBonusIndex]) || bonus.revealed || !timer.running} onClick={submitBonusGuess}>Record answer</button>
          </div>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">60-second mission timer: {timer.remaining}s · {(bonus.pendingAnswers ?? []).filter(Boolean).length} / 5 answers recorded privately</p>
          {bonusFeedback && <p className="mt-2 text-sm font-semibold text-gold">{bonusFeedback}</p>}
          <p className="mt-2 text-xs text-muted-foreground">Current team: {s.teamNames[s.active]}. The audience never sees this answer key. Each question's five answer values should total exactly 200 points.</p>
        </div>
      )}
      {roundMode !== "bonus" && <AnswerKey s={s} q={q} act={act} />}
    </section>
  );
}

/* Fit audience answer text to the actual width available on each board tile. */
function FittedAnswerText({ text }: { text: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontPx, setFontPx] = useState<number | null>(null);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const node = textRef.current;
        if (!node) return;
        const available = node.clientWidth;
        const natural = node.scrollWidth;
        const current = Number.parseFloat(getComputedStyle(node).fontSize);
        if (!available || !natural || !current) return;
        if (natural > available + 1) {
          const next = Math.max(10, current * (available / natural) * 0.96);
          setFontPx((previous) => previous === null || next < previous - 0.5 ? next : previous);
        }
      });
    };

    const observer = new ResizeObserver(fit);
    observer.observe(element);
    fit();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [text]);

  return (
    <span
      ref={textRef}
      className="min-w-0 flex-1 overflow-hidden whitespace-nowrap font-sans font-medium tracking-normal uppercase text-white"
      style={{ fontSize: fontPx ? `${fontPx}px` : `${Math.max(1.1, Math.min(3.6, 90 / Math.max(1, text.length)))}cqh`, lineHeight: 1, textOverflow: "clip" }}
    >
      {text}
    </span>
  );
}

/* ---------------- HOST ANSWER KEY (private) ---------------- */

const normText = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
// Bonus Mission scoring is deliberately conservative: punctuation, spacing and
// capitalization do not matter, but partial words and fuzzy subsequences never score.
function bonusAnswerMatches(query: string, answer: string): boolean {
  const q = normText(query);
  const a = normText(answer);
  return q.length > 0 && q === a;
}
const isSubseq = (needle: string, hay: string) => {
  let i = 0;
  for (const c of hay) if (c === needle[i]) i++;
  return i >= needle.length;
};
function answerMatches(query: string, answer: string): boolean {
  const q = normText(query);
  const a = normText(answer);
  if (!q) return false;
  if (a.includes(q) || q.includes(a)) return true;
  const qw = q.split(" ");
  const aw = a.split(" ");
  if (qw.some((w) => w.length > 2 && aw.some((x) => x.includes(w) || w.includes(x)))) return true;
  const qc = q.replace(/ /g, "");
  const ac = a.replace(/ /g, "");
  return qc.length >= 3 && isSubseq(qc, ac);
}

function AnswerKey({ s, q, act }: { s: GameState; q: Question; act: (a: Action) => void }) {
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState("");
  const checking = normText(guess).length > 0;
  const hits = q.answers.map((a) => answerMatches(guess, a.text));
  const hitCount = hits.filter(Boolean).length;

  const submitGuess = () => {
    const answer = guess.trim();
    if (!answer) return;

    const matchingIndexes = q.answers
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => answerMatches(answer, a.text))
      .map(({ i }) => i);
    const hiddenMatches = matchingIndexes.filter((i) => s.tiles[i] === "hidden");

    if (hiddenMatches.length === 1) {
      act({ type: "reveal", index: hiddenMatches[0] });
      setFeedback(`Correct! “${q.answers[hiddenMatches[0]].text}” is on the board.`);
      setGuess("");
      return;
    }

    if (hiddenMatches.length > 1) {
      setFeedback("This answer could match more than one tile. Please tap the correct highlighted answer.");
      return;
    }

    if (matchingIndexes.length > 0) {
      setFeedback("That answer is already on the board. Try another answer.");
      setGuess("");
      return;
    }

    act({ type: "strike" });
    setFeedback("Not on the board — strike added.");
    setGuess("");
  };

  return (
    <div className="mt-4 rounded-xl border-2 border-dashed border-destructive/60 bg-muted/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg tracking-wide text-gold">
          HOST ANSWER KEY <span className="ml-1 rounded bg-destructive px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-widest text-destructive-foreground">Private</span>
        </h3>
        <span className="text-xs text-muted-foreground">Hidden in Stage view — viewers never see this.</span>
      </div>

      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground" htmlFor="viewer-guess">
        Type a viewer's answer, then press Enter
      </label>
      <div className="flex gap-2">
        <input
          id="viewer-guess"
          type="text"
          value={guess}
          onChange={(e) => { setGuess(e.target.value); setFeedback(""); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitGuess();
            }
          }}
          placeholder="Type or paste what a viewer said…"
          className="min-w-0 flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!checking}
          onClick={submitGuess}
          className={btnGold}
        >
          Check answer
        </button>
      </div>
      {feedback && (
        <p className="mt-2 text-sm font-semibold" role="status">
          {feedback}
        </p>
      )}
      {!feedback && checking && (
        <p className="mt-1 text-xs text-muted-foreground">
          {hitCount > 0 ? `${hitCount} possible board match${hitCount > 1 ? "es" : ""} highlighted — press Enter to check.` : "No board match found yet — press Enter to check."}
        </p>
      )}

      <ol className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {q.answers.map((a, i) => {
          const revealed = s.tiles[i] !== "hidden";
          const hit = checking && hits[i];
          return (
            <li key={i}>
              <button
                disabled={revealed}
                onClick={() => act({ type: "reveal", index: i })}
                className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition ${
                  hit
                    ? "border-gold bg-primary/15 ring-2 ring-gold"
                    : checking
                      ? "border-border opacity-45"
                      : "border-border bg-card hover:bg-secondary/40"
                } disabled:opacity-40`}
              >
                <span className="font-display text-gold">{i + 1}</span>
                <span className="flex-1 truncate font-semibold">{a.text}</span>
                <span className="font-display text-gold">{a.points}</span>
                {revealed && <span className="text-xs text-muted-foreground">✓ shown</span>}
                {hit && !revealed && <span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">match?</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">
        Press Enter or Check answer to submit. A single match reveals automatically; an unmatched answer adds a strike. Ambiguous matches are left for you to confirm.
      </p>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={onClose}>
      <div role="dialog" aria-label={title} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl gold-frame bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 font-display text-2xl tracking-wide text-gold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  const keys: [string, string][] = [
    ["1 – 6", "Reveal answer tiles 1 to 6"],
    ["N", "Move to the next unused question (host control)"],
    ["R", "Choose a random question (host control)"],
    ["S", "Open or close Stage view"],
    ["H / ?", "Open or close these rules"],
    ["Esc", "Close this panel / leave Stage view"],
  ];
  return (
    <Modal title="How to Play · Official Game Rules" onClose={onClose}>
      <div className="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 className="mb-1 font-display text-base text-gold">1. Start the show</h3>
          <p>The audience sees “GET READY” until the host presses <b>PLAY NOW</b>. A 3-second countdown starts the match. Keep the Host Controls open in one tab and the Stage view in another tab on the same browser/device.</p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-base text-gold">2. Team order and match format</h3>
          <p>The starting team plays all four stages first: <b>Classic → Double → Triple → Kingson Bonus Mission</b>. After its results, the other team gets a <b>30-second handover</b> and then plays its own four stages. The scores from both team turns are compared on the final scoreboard.</p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-base text-gold">3. Classic, Double and Triple rounds</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Each round has one survey question with six hidden answer tiles and a 60-second timer.</li>
            <li>The host reads the question. Viewers suggest answers in the live comments.</li>
            <li>When an answer matches a tile, the host reveals it. Its survey points go into the round bank.</li>
            <li>Classic awards normal points; Double multiplies the points by 2; Triple multiplies them by 3.</li>
            <li>The round ends when all six answers are revealed or the 60-second timer runs out. A short results screen and countdown lead into the next stage.</li>
          </ul>
        </section>
        <section>
          <h3 className="mb-1 font-display text-base text-gold">4. Strikes and automatic answer reveal</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>A wrong answer earns a strike. After three strikes, the round automatically ends and the playing team keeps its round bank.</li>
            <li>All remaining hidden answers automatically reveal so the audience can see the complete board.</li>
            <li>The round results appear briefly, then the automatic countdown starts the next round.</li>
          </ul>
        </section>
        <section>
          <h3 className="mb-1 font-display text-base text-gold">5. Kingson Bonus Mission</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>This is five questions in a row, not a six-tile board. The host types and checks one viewer answer for each question.</li>
            <li>Each question has five accepted answers with different point values adding up to 200. A matched answer earns its listed value; a wrong answer earns zero.</li>
            <li>Answer at least three of the five bonus questions correctly to earn an extra 500 points.</li>
            <li>The host-only answer key stays hidden from the audience. The next bonus question opens after each answer is checked.</li>
          </ul>
        </section>
        <section>
          <h3 className="mb-1 font-display text-base text-gold">6. Winner</h3>
          <p>After both teams have completed all four stages, the final scoreboard shows each team's round breakdown, total points and the champion. The highest total wins; equal totals are a tie.</p>
        </section>
        <p className="rounded-lg border border-gold/40 bg-muted p-3 text-xs text-muted-foreground"><b className="text-gold">Host reminder:</b> The host manages answers and scoring from Host Controls. Viewers play along by suggesting answers in the live comments; they do not need to press game buttons.</p>
      </div>
      <h3 className="mt-5 mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Keyboard shortcuts · Host controls</h3>
      <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        {keys.map(([k, d]) => <div key={k}><kbd className="rounded bg-muted px-2 py-0.5 font-mono text-gold">{k}</kbd> {d}</div>)}
      </div>
      <div className="mt-5 text-right"><button className={btnGold} onClick={onClose}>Got it</button></div>
    </Modal>
  );
}

function EditDialog({ q, onClose, onSave }: { q: Question; onClose: () => void; onSave: (q: Question) => void }) {
  const [draft, setDraft] = useState<Question>(() => structuredClone(q));
  const total = draft.answers.reduce((a, b) => a + (Number(b.points) || 0), 0);
  return (
    <Modal title="Edit question" onClose={onClose}>
      <label className="text-xs font-bold uppercase text-muted-foreground">Question</label>
      <textarea className="mt-1 w-full rounded-md border border-input bg-muted p-2" rows={2} value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} />
      <div className="mt-3 space-y-2">
        {draft.answers.map((a, i) => (
          <div key={i} className="flex gap-2">
            <span className="w-5 pt-1.5 text-muted-foreground">{i + 1}</span>
            <input aria-label={`Answer ${i + 1}`} className="flex-1 rounded-md border border-input bg-muted px-2 py-1" value={a.text}
              onChange={(e) => { const answers = [...draft.answers]; answers[i] = { ...a, text: e.target.value }; setDraft({ ...draft, answers }); }} />
            <input aria-label={`Points ${i + 1}`} type="number" min={0} className="w-20 rounded-md border border-input bg-muted px-2 py-1" value={a.points}
              onChange={(e) => { const answers = [...draft.answers]; answers[i] = { ...a, points: Math.max(0, Number(e.target.value) || 0) }; setDraft({ ...draft, answers }); }} />
          </div>
        ))}
      </div>
      <p className={`mt-2 text-sm ${total === 100 ? "text-muted-foreground" : "text-destructive"}`}>Total: {total} {total !== 100 && "(surveys usually total 100)"}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnGold} onClick={() => onSave(draft)}>Save</button>
      </div>
    </Modal>
  );
}

