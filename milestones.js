/* Just a Baby: milestone catalog
 *
 * Each badge: key (stored in the database, never rename), name, icon, a typical
 * window in weeks [from, to] used only for ordering and a gentle "usually around"
 * hint, a plain description of what the milestone means (always shown), and a
 * short game-style blurb shown once it's unlocked.
 *
 * Windows are broad, friendly ranges, not medical guidance. Every baby has their
 * own timeline; the app never marks anything as late.
 */
window.JAB_MILESTONES = [
  // 0–3 months
  { key: 'home_sweet_home',   name: 'Home Sweet Home',      icon: 'house',   w: [0, 1],   desc: 'Your first day at home together after the birth.', blurb: 'Arrived home and took over the entire household within minutes. New roommate acquired.' },
  { key: 'first_bath',        name: 'Splash Debut',         icon: 'drop',    w: [0, 2],   desc: 'Baby\'s first proper bath, in a tub or sink rather than a sponge bath.', blurb: 'First bath complete. Hygiene +100. Opinions about water: strong.' },
  { key: 'first_outing',      name: 'Out and About',        icon: 'stroller',w: [0, 6],   desc: 'The first trip out of the house, like a walk, a coffee run or a visit to family.', blurb: 'First big trip out of the house. The neighbourhood has been informed.' },
  { key: 'head_up',           name: 'Head of the House',    icon: 'up',      w: [4, 12],  desc: 'Lifts their head and holds it up for a few seconds while lying on their tummy.', blurb: 'Lifted their head during tummy time. Strength skill +1.' },
  { key: 'first_smile',       name: 'First Real Smile',     icon: 'smile',   w: [6, 8],   desc: 'The first smile in response to you, not just in their sleep.', blurb: 'Unlocked a gummy grin. Everyone in the household gets the Heart Melted moodlet.' },
  { key: 'tracks_eyes',       name: 'Eagle Eye',            icon: 'eye',     w: [6, 12],  desc: 'Follows a face or a toy with their eyes as it moves slowly from side to side.', blurb: 'Followed a moving face across the room. Nothing escapes this one now.' },
  { key: 'coos',              name: 'First Coo',            icon: 'bubble',  w: [6, 12],  desc: 'Makes soft vowel sounds like "ooh" and "aah", especially when you talk to them.', blurb: 'Started making cooing sounds. Fluent in Baby, conversational in Adorable.' },
  { key: 'hands_found',       name: 'Hand Discovery',       icon: 'hand',    w: [8, 16],  desc: 'Notices their own hands, then watches them, brings them together or sucks on them.', blurb: 'Found their own hands and stared in total awe. Best toy ever, and it was free.' },
  { key: 'sleeps_long',       name: 'Night Shift Off',      icon: 'moon',    w: [8, 26],  desc: 'Sleeps a long stretch at night, around 5 hours or more, without waking.', blurb: 'Slept a long stretch overnight. Energy restored for the whole household.' },

  // 3–6 months
  { key: 'laughs',            name: 'Giggle Unlocked',      icon: 'sparkle', w: [12, 18], desc: 'A real laugh out loud, not just a smile.', blurb: 'First real laugh. The household mood just went straight to Very Happy.' },
  { key: 'grabs',             name: 'Grabby Hands',         icon: 'star',    w: [13, 22], desc: 'Reaches out and grabs a toy or object on purpose.', blurb: 'Reached out and grabbed a toy on purpose. Nothing within arm\'s reach is safe.' },
  { key: 'rolls_tummy_back',  name: 'Barrel Roll',          icon: 'roll',    w: [16, 24], desc: 'Rolls over from their tummy onto their back.', blurb: 'Rolled from tummy to back. Physics: defeated. Parents: slightly alarmed.' },
  { key: 'rolls_back_tummy',  name: 'Reverse Roll',         icon: 'roll',    w: [20, 30], desc: 'Rolls over from their back onto their tummy.', blurb: 'Rolled from back to tummy. Now mobile in two directions. Supervision skill required.' },
  { key: 'recognizes_name',   name: 'That\'s Me!',          icon: 'tag',     w: [20, 30], desc: 'Turns to look at you when you say their name.', blurb: 'Turned to look when they heard their name. Identity confirmed.' },
  { key: 'first_solids',      name: 'Taste Tester',         icon: 'spoon',   w: [22, 30], desc: 'Tries solid food for the first time, like a purée or a soft mashed food.', blurb: 'First taste of solid food. Reviews are mixed. The bib took most of it.' },

  // 6–9 months
  { key: 'sits_alone',        name: 'Sitting Pretty',       icon: 'up',      w: [26, 39], desc: 'Sits up on their own for a few seconds without being propped up.', blurb: 'Sat up without any help. The world looks very different from up here.' },
  { key: 'babbles',           name: 'Babble Mode',          icon: 'bubble',  w: [26, 39], desc: 'Strings sounds together, like "ba-ba-ba" or "da-da-da".', blurb: 'Said "ba-ba-ba" and "da-da-da" with great conviction. Charisma +1.' },
  { key: 'passes_toy',        name: 'The Hand-Off',         icon: 'star',    w: [26, 35], desc: 'Moves a toy from one hand to the other.', blurb: 'Passed a toy from one hand to the other. Coordination skill levelled up.' },
  { key: 'peekaboo',          name: 'Peekaboo Pro',         icon: 'peek',    w: [26, 44], desc: 'Laughs or plays along when you play peekaboo.', blurb: 'Finds peekaboo hilarious every single time. You are now a professional entertainer.' },
  { key: 'first_tooth',       name: 'Tooth Fairy Inbound',  icon: 'tooth',   w: [26, 48], desc: 'The first tooth breaks through the gum.', blurb: 'First tooth spotted. Chewing skill unlocked. Teething moodlet: very uncomfortable.' },
  { key: 'drinks_cup',        name: 'Cup Champion',         icon: 'cup',     w: [26, 52], desc: 'Takes a sip from an open cup or a straw cup, with your help.', blurb: 'Took a sip from a cup. Splash zone: moderate.' },
  { key: 'crawls',            name: 'On the Move',          icon: 'feet',    w: [30, 44], desc: 'Moves across the floor on their own, by crawling, scooting or commando-crawling.', blurb: 'Started crawling. Baby-proofing urgency: critical.' },
  { key: 'finger_food',       name: 'Self-Serve',           icon: 'spoon',   w: [32, 44], desc: 'Picks up a piece of food and gets it into their own mouth.', blurb: 'Fed themselves a finger food. The floor also got fed.' },

  // 9–12 months
  { key: 'pulls_to_stand',    name: 'Stand-Up Comedian',    icon: 'up',      w: [35, 48], desc: 'Pulls themselves up to standing using furniture or your hands.', blurb: 'Pulled up to standing on the furniture. The coffee table is now a gym.' },
  { key: 'waves',             name: 'Hi and Bye',           icon: 'hand',    w: [35, 52], desc: 'Waves hello or bye-bye.', blurb: 'Waved hello. Or goodbye. Or at the ceiling fan. Friendly baby confirmed.' },
  { key: 'claps',             name: 'Round of Applause',    icon: 'sparkle', w: [35, 52], desc: 'Claps their hands together.', blurb: 'Clapped their hands, usually for themselves. Fair enough, honestly.' },
  { key: 'pincer',            name: 'Precision Pincer',     icon: 'star',    w: [39, 52], desc: 'Picks up something small between their thumb and pointer finger.', blurb: 'Picked up something tiny between thumb and finger. Usually lint. Still impressive.' },
  { key: 'cruises',           name: 'Furniture Cruiser',    icon: 'feet',    w: [39, 52], desc: 'Walks sideways while holding on to furniture.', blurb: 'Walked along the furniture while holding on. Next stop: everywhere.' },
  { key: 'stands_alone',      name: 'Solo Stand',           icon: 'up',      w: [44, 56], desc: 'Stands on their own for a moment without holding on to anything.', blurb: 'Stood up with no hands for one glorious moment. The crowd went wild.' },
  { key: 'first_word',        name: 'First Word',           icon: 'bubble',  w: [44, 60], desc: 'Says a real word on purpose and means it, like "mama", "dada" or "ball".', blurb: 'Said a real word on purpose. All household bets are now settled.' },
  { key: 'first_steps',       name: 'First Steps',          icon: 'feet',    w: [44, 65], desc: 'Takes a few steps on their own without holding on.', blurb: 'Took their very first steps. Nothing will ever be where you left it again.' },
  { key: 'first_birthday',    name: 'Level 1 Complete',     icon: 'cake',    w: [52, 52], desc: 'Their first birthday. One whole year!', blurb: 'Happy first birthday! One full year of feeds, naps and diapers. Legendary parenting achieved.' }
];
