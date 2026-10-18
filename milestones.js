/* Just a Baby: milestone catalog
 *
 * Each badge: key (stored in the database, never rename), name, icon, a typical
 * window in weeks [from, to] used only for ordering and a gentle "usually around"
 * hint, and a short blurb shown when it's unlocked.
 *
 * Windows are broad, friendly ranges, not medical guidance. Every baby has their
 * own timeline; the app never marks anything as late.
 */
window.JAB_MILESTONES = [
  // 0–3 months
  { key: 'home_sweet_home',   name: 'Home Sweet Home',      icon: 'house',   w: [0, 1],   blurb: 'Arrived home and took over the entire household within minutes. New roommate acquired.' },
  { key: 'first_bath',        name: 'Splash Debut',         icon: 'drop',    w: [0, 2],   blurb: 'First bath complete. Hygiene +100. Opinions about water: strong.' },
  { key: 'first_outing',      name: 'Out and About',        icon: 'stroller',w: [0, 6],   blurb: 'First big trip out of the house. The neighbourhood has been informed.' },
  { key: 'head_up',           name: 'Head of the House',    icon: 'up',      w: [4, 12],  blurb: 'Lifted their head during tummy time. Strength skill +1.' },
  { key: 'first_smile',       name: 'First Real Smile',     icon: 'smile',   w: [6, 8],   blurb: 'Unlocked a gummy grin. Everyone in the household gets the Heart Melted moodlet.' },
  { key: 'tracks_eyes',       name: 'Eagle Eye',            icon: 'eye',     w: [6, 12],  blurb: 'Followed a moving face across the room. Nothing escapes this one now.' },
  { key: 'coos',              name: 'First Coo',            icon: 'bubble',  w: [6, 12],  blurb: 'Started making cooing sounds. Fluent in Baby, conversational in Adorable.' },
  { key: 'hands_found',       name: 'Hand Discovery',       icon: 'hand',    w: [8, 16],  blurb: 'Found their own hands and stared in total awe. Best toy ever, and it was free.' },
  { key: 'sleeps_long',       name: 'Night Shift Off',      icon: 'moon',    w: [8, 26],  blurb: 'Slept a long stretch overnight. Energy restored for the whole household.' },

  // 3–6 months
  { key: 'laughs',            name: 'Giggle Unlocked',      icon: 'sparkle', w: [12, 18], blurb: 'First real laugh. The household mood just went straight to Very Happy.' },
  { key: 'grabs',             name: 'Grabby Hands',         icon: 'star',    w: [13, 22], blurb: 'Reached out and grabbed a toy on purpose. Nothing within arm\'s reach is safe.' },
  { key: 'rolls_tummy_back',  name: 'Barrel Roll',          icon: 'roll',    w: [16, 24], blurb: 'Rolled from tummy to back. Physics: defeated. Parents: slightly alarmed.' },
  { key: 'rolls_back_tummy',  name: 'Reverse Roll',         icon: 'roll',    w: [20, 30], blurb: 'Rolled from back to tummy. Now mobile in two directions. Supervision skill required.' },
  { key: 'recognizes_name',   name: 'That\'s Me!',          icon: 'tag',     w: [20, 30], blurb: 'Turned to look when they heard their name. Identity confirmed.' },
  { key: 'first_solids',      name: 'Taste Tester',         icon: 'spoon',   w: [22, 30], blurb: 'First taste of solid food. Reviews are mixed. The bib took most of it.' },

  // 6–9 months
  { key: 'sits_alone',        name: 'Sitting Pretty',       icon: 'up',      w: [26, 39], blurb: 'Sat up without any help. The world looks very different from up here.' },
  { key: 'babbles',           name: 'Babble Mode',          icon: 'bubble',  w: [26, 39], blurb: 'Said "ba-ba-ba" and "da-da-da" with great conviction. Charisma +1.' },
  { key: 'passes_toy',        name: 'The Hand-Off',         icon: 'star',    w: [26, 35], blurb: 'Passed a toy from one hand to the other. Coordination skill levelled up.' },
  { key: 'peekaboo',          name: 'Peekaboo Pro',         icon: 'peek',    w: [26, 44], blurb: 'Finds peekaboo hilarious every single time. You are now a professional entertainer.' },
  { key: 'first_tooth',       name: 'Tooth Fairy Inbound',  icon: 'tooth',   w: [26, 48], blurb: 'First tooth spotted. Chewing skill unlocked. Teething moodlet: very uncomfortable.' },
  { key: 'drinks_cup',        name: 'Cup Champion',         icon: 'cup',     w: [26, 52], blurb: 'Took a sip from a cup. Splash zone: moderate.' },
  { key: 'crawls',            name: 'On the Move',          icon: 'feet',    w: [30, 44], blurb: 'Started crawling. Baby-proofing urgency: critical.' },
  { key: 'finger_food',       name: 'Self-Serve',           icon: 'spoon',   w: [32, 44], blurb: 'Fed themselves a finger food. The floor also got fed.' },

  // 9–12 months
  { key: 'pulls_to_stand',    name: 'Stand-Up Comedian',    icon: 'up',      w: [35, 48], blurb: 'Pulled up to standing on the furniture. The coffee table is now a gym.' },
  { key: 'waves',             name: 'Hi and Bye',           icon: 'hand',    w: [35, 52], blurb: 'Waved hello. Or goodbye. Or at the ceiling fan. Friendly baby confirmed.' },
  { key: 'claps',             name: 'Round of Applause',    icon: 'sparkle', w: [35, 52], blurb: 'Clapped their hands, usually for themselves. Fair enough, honestly.' },
  { key: 'pincer',            name: 'Precision Pincer',     icon: 'star',    w: [39, 52], blurb: 'Picked up something tiny between thumb and finger. Usually lint. Still impressive.' },
  { key: 'cruises',           name: 'Furniture Cruiser',    icon: 'feet',    w: [39, 52], blurb: 'Walked along the furniture while holding on. Next stop: everywhere.' },
  { key: 'stands_alone',      name: 'Solo Stand',           icon: 'up',      w: [44, 56], blurb: 'Stood up with no hands for one glorious moment. The crowd went wild.' },
  { key: 'first_word',        name: 'First Word',           icon: 'bubble',  w: [44, 60], blurb: 'Said a real word on purpose. All household bets are now settled.' },
  { key: 'first_steps',       name: 'First Steps',          icon: 'feet',    w: [44, 65], blurb: 'Took their very first steps. Nothing will ever be where you left it again.' },
  { key: 'first_birthday',    name: 'Level 1 Complete',     icon: 'cake',    w: [52, 52], blurb: 'Happy first birthday! One full year of feeds, naps and diapers. Legendary parenting achieved.' }
];
