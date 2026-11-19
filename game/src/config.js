// Palm City Heat — tuning, layout, story and palette. One place for every number
export const WORLD = {
  half: 220,
  roadWidth: 14,
  roadPos: [-180, -120, -60, 0, 60, 120, 180], // avenues (x) and streets (z)
  blockGap: 46, // building ground between two roads
  groundY: 0,
};
export const PALETTE = {
  sky: 0x8fb8e0, fog: 0xe8c9a0, sun: 0xffd9a8, hemiSky: 0xbfd9f2, hemiGround: 0x8a7a5a,
  asphalt: 0x2e3138, asphaltLine: 0xd8d3a0, sidewalk: 0x9aa0a3, curb: 0x7d8287,
  sand: 0xe8d29a, water: 0x2a7fa8c9, grass: 0x5da24a, plaza: 0xb8b0a0,
  building: [0xc9b8a3, 0xa8b8c9, 0xc9a8a8, 0x9ab8a8, 0xb8a8c9, 0xd8c9a8, 0x8aa0b8, 0xc9c9c9],
  glass: 0x3a5a78, roof: 0x6b5a4a,
  palmTrunk: 0x7a5a38, palmLeaf: 0x3f8f4f,
  playerShirt: 0xe05038, playerPants: 0x2a3a5a, playerSkin: 0xc98a5a,
  police: 0x1a2a4a, policeLight: [0xff2a2a, 0x2a6aff],
  marker: 0xffd23f, beacon: 0xffd23f,
};
export const PLAYER = {
  walkSpeed: 6, runSpeed: 10.5, accel: 40, radius: 0.55, health: 100,
  jumpSpeed: 7.5, gravity: 22, eyeHeight: 1.7,
};
export const CAR = {
  accel: 16, brake: 34, reverseMax: 11, maxSpeed: 27, sportsMax: 35,
  steer: 0.62, grip: 6.5, radius: 1.7, length: 4.4, width: 1.9,
};
export const WANTED = {
  max: 6, decaySeconds: 22, stealHeat: 1, hitPedHeat: 1, shootHeat: 1, killCopHeat: 2,
  bustDistance: 3.2, bustSeconds: 2.0, bustFine: 0.15, wastedFine: 0.1,
};
export const TRAFFIC = { cars: 16, peds: 22, spawnRadius: 90, despawnRadius: 130 };
export const WEAPONS = [
  { name: 'Pistol', damage: 34, mag: 12, range: 90, fire: 0.16, reload: 1.4 },
  { name: 'Shotgun', damage: 70, mag: 6, range: 35, fire: 0.7, reload: 2.0 },
  { name: 'Fists', damage: 50, mag: 0, range: 2.6, fire: 0.45, reload: 0 },
];
export const PLACES = {
  bar: { name: "Marco's Bar", x: -150, z: -150 },
  garage: { name: 'City Garage', x: 150, z: 150 },
  bank: { name: 'Harbor Bank', x: 60, z: -60 },
  pier: { name: 'Sunset Pier', x: 120, z: 196 },
  marina: { name: 'Marina', x: 196, z: 60 },
  safehouse: { name: 'Safehouse', x: -150, z: 150 },
  hospital: { name: 'General Hospital', x: -60, z: 60 },
  policeStation: { name: 'Police HQ', x: 60, z: 120 },
  plaza: { name: 'Palm Plaza', x: 0, z: 0 },
  store: { name: '24H Store', x: -60, z: -120 },
  ocean: { name: 'Ocean Drive', x: 180, z: 120 },
  swamp: { name: 'Grassrivers', x: -90, z: -150 },
  club: { name: 'Club Nine', x: 72, z: 150 },
};
export const MISSIONS = [
  {
    id: 'wheels', title: '1. Wheels', giver: 'Marco',
    brief: "Welcome home, Lucia. Steal any car and bring it to the City Garage. The cops here notice everything.",
    kind: 'drive', target: 'garage', reward: 250,
    objective: 'Steal a car (E) and drive it to the City Garage',
  },
  {
    id: 'pickup', title: '2. The Pickup', giver: 'Marco',
    brief: "A package waits at the end of Sunset Pier. Walk it back to my bar, nice and quiet. If anyone asks, you're a tourist.",
    kind: 'goto', target: 'pier', then: 'bar', reward: 400,
    objective: 'Collect the package at Sunset Pier, then return to Marco\'s Bar',
  },
  {
    id: 'heat', title: '3. Heat', giver: 'Marco',
    brief: "The deal went sideways — two stars and climbing. Survive 60 seconds, shake them off, reach the Safehouse.",
    kind: 'survive', target: 'safehouse', seconds: 60, startStars: 2, reward: 600,
    objective: 'Survive 60s with the cops on you, then lose them and reach the Safehouse',
  },
  {
    id: 'late', title: '4. Running Late', giver: 'Marco',
    brief: "Three drops, 150 seconds, the whole city between them. Drive like your rent depends on it.",
    kind: 'checkpoints', seconds: 150, reward: 800,
    objective: 'Hit all 3 drop points in 150s',
    points: [{ x: -120, z: 120 }, { x: 120, z: -120 }, { x: -60, z: -180 }],
  },
  {
    id: 'score', title: '5. The Big Score', giver: 'Marco',
    brief: "Harbor Bank. Ten seconds inside and the vault is ours — but the alarm brings the whole department. Grab the cash, run for the Marina boat.",
    kind: 'heist', target: 'bank', then: 'marina', holdSeconds: 10, startStars: 3, reward: 2000,
    objective: 'Rob Harbor Bank (hold 10s inside), then escape to the Marina boat',
  },
  {
    id: 'store', title: '6. Store Hit', giver: 'Lucia',
    brief: "Quick and loud: the 24H Store. Hold the register five seconds, shake the heat, get to the Safehouse.",
    kind: 'heist', target: 'store', then: 'safehouse', holdSeconds: 5, startStars: 1, reward: 900,
    objective: 'Rob the 24H Store (hold 5s), then lose the cops and reach the Safehouse',
  },
  {
    id: 'race', title: '7. Ocean Drive Rush', giver: 'Jason',
    brief: "Street race down Ocean Drive: three checkpoints, two minutes. Win it and the city knows our names.",
    kind: 'checkpoints', seconds: 120, reward: 1200,
    objective: 'Win the street race: hit all 3 checkpoints in 120s',
    points: [{ x: 180, z: -120 }, { x: 180, z: 120 }, { x: -180, z: 120 }],
  },
  {
    id: 'swamp', title: '8. Swamp Run', giver: 'Jason',
    brief: "Grassrivers — take the airboat through the sawgrass, hit all three markers. Mind the gators. They mind you.",
    kind: 'checkpoints', seconds: 90, reward: 1000,
    objective: 'Airboat run: hit all 3 checkpoints in 90s',
    points: [{ x: -102, z: -138 }, { x: -78, z: -158 }, { x: -92, z: -168 }],
  },
  {
    id: 'keys', title: '9. The Keys Job', giver: 'Raul',
    brief: "The Keys Job: the boat waits at the pier. Three markers across the bay, three stars on your tail.",
    kind: 'checkpoints', seconds: 150, startStars: 3, reward: 1800,
    objective: 'Boat chase: hit all 3 bay markers in 150s',
    points: [{ x: 123, z: 214 }, { x: 190, z: 250 }, { x: 170, z: 300 }],
  },
  {
    id: 'club', title: '10. The Club Job', giver: 'Raul',
    brief: "Club Nine. Raul's crew hits the safe at midnight — hold the back room eight seconds, then vanish.",
    kind: 'heist', target: 'club', then: 'safehouse', holdSeconds: 8, startStars: 2, reward: 2500,
    objective: 'Rob Club Nine (hold 8s inside), then escape to the Safehouse',
  },
  {
    id: 'vault', title: '11. The Vault', giver: 'Raul',
    brief: "The Vault: Harbor Bank again, but bigger. Drive up like you own it, crack the vault in twelve seconds, run for the Marina boat with four stars on you.",
    kind: 'heist', target: 'bank', then: 'marina', holdSeconds: 12, startStars: 4, reward: 3500, approachCar: true,
    objective: 'Drive to Harbor Bank, crack the vault (12s), escape to the Marina',
  },
];
export const SAVE_KEY = 'palmcityheat.save.v1';
export const BEST_KEY = 'palmcityheat.best.v1';
export const KEYS = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  sprint: 'ShiftLeft', jump: 'Space', enterCar: 'KeyE', reload: 'KeyR',
  pause: 'KeyP', escape: 'Escape', mute: 'KeyM', mission: 'KeyM',
  swap: 'Tab', phone: 'KeyQ', radio: 'KeyG', night: 'KeyN',
};
export const POSTS = [
  ['@floridaman', 'Gator stole my jetski. Again. #OnlyInLeonida', '12.4K'],
  ['@lucia_leonida', "Back on the outside. Leonida, I'm home.", '45.1K'],
  ['@jason_duval', 'Lowriders at the meet tonight. Bring cash.', '9.2K'],
  ['@vicecitypd', 'WANTED: two idiots in a yellow sports car.', '8.1K'],
  ['@palmcitynews', 'FLORIDA MAN fights pelican, loses.', '33.0K'],
  ['@marco_saloon', 'The Big Score is on. No questions.', '3.3K'],
  ['@clubnine', 'Midnight at NINE. The line is around the block.', '28.9K'],
];
export const CHAOS = [
  'FLORIDA MAN: gator steals a jetski!',
  'FLORIDA MAN: man fights a pelican — loses.',
  'FLORIDA MAN: lowrider parade blocks Ocean Drive!',
  'FLORIDA MAN: gator found in a hot tub.',
  'FLORIDA MAN: fare paid in gator teeth.',
];
