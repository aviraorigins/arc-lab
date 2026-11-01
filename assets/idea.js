// "Try it with your own idea": fills a small sample of the skill's first two steps (a series bible and how episode 1
// ends) from fixed templates, picked by the kind of story the idea sounds like. Nothing leaves the page and no AI runs
// here; the skill writes the real ones. Text goes in with textContent, never as HTML. The templates are original and
// stay clear of Day 23's own story, posted or not.
(() => {
  const box = document.getElementById('idea');
  if (!box) return;
  const form = box.querySelector('.idea-form'), input = box.querySelector('#idea-in');
  const err = box.querySelector('.idea-err'), out = box.querySelector('.idea-out'), status = box.querySelector('#idea-status');

  // [words that point to the kind, the people around "you", the episode 1 endings, the votes]. Checked in this order,
  // so a space-station crew is space, not a heist. Endings and votes name nobody, so they always fit the cast shown.
  const KINDS = [
    [/\b(?:space|planets?|alien\w*|robots?|androids?|starships?|spaceships?|mars|moon|galax\w*|space station|time travel\w*|ai)\b/i,
      [['Tock', 'the ship\'s robot, loyal and too honest'], ['Captain Reyes', 'who hides an order from you'], ['Lio', 'a stowaway who knows the way home']],
      [['The Signal', 'it is learning your language'], ['The Fleet', 'they want what you carry'], ['The Hull', 'twelve hours of air left']],
      ['The distress call you are answering is in your own voice.',
        'You wake from deep sleep. The crew is gone, and the ship is still moving.',
        'The planet below is your home town, a thousand years from now.'],
      [['Answer the signal', 'Run silent', 'Wake the captain'], ['Land', 'Keep flying', 'Turn back']]],
    [/\b(?:zombies?|undead|apocalyp\w*|outbreaks?|infect\w*|surviv\w*|wasteland|stranded|blizzard|floods?)\b|end of the world|world (?:has )?ended|after the world/i,
      [['Pell', 'a mechanic who trusts no one'], ['Juno', 'a scout who never says where she found the food'], ['The Twins', 'two kids who know every rooftop route']],
      [['The Swarm', 'it follows noise'], ['The Takers', 'survivors who strip every camp they find'], ['The Cold', 'three nights left before it kills']],
      ['The last safe place on the map is lit up, and nobody you know lit it.',
        'The rescue boat finally comes. Every seat is empty, and the engine is still running.',
        'Your supplies are gone, and fresh tracks lead toward your own camp.'],
      [['Go to the light', 'Stay hidden', 'Split up'], ['Board the boat', 'Wait on shore', 'Burn the dock']]],
    [/\b(?:heists?|steal\w*|stole|rob|robs|robbed|robber(?:y|ies|s)?|vaults?|casinos?|thie(?:f|ves)|loot\w*|smuggl\w*)\b|con artist|heist crew/i,
      [['Vix', 'a safecracker who never takes the easy way'], ['Moss', 'the driver who owes the wrong people'], ['Pip', 'the inside contact, too nervous to trust']],
      [['Inspector Hale', 'one step behind you, and closing'], ['The Owner', 'who knew you were coming'], ['The Double', 'someone in the crew is lying']],
      ['The vault opens, and it is already empty.',
        'Your inside contact walks in, wearing the guard\'s uniform.',
        'Every alarm in the building goes quiet at once. Then the lights go out.'],
      [['Take the money and run', 'Go back for the crew', 'Walk away clean'], ['Trust the crew', 'Trust the contact', 'Trust no one']]],
    [/\b(?:murder\w*|detectives?|myster\w*|missing|clues?|killers?|suspects?|vanish\w*|disappear\w*|witness\w*)\b/i,
      [['June', 'your sharp-eyed partner'], ['Mr. Grey', 'the neighbour who sees everything'], ['Theo', 'the last person to see them alive']],
      [['The Writer', 'who leaves a note before every crime'], ['The Family', 'all of them hiding the same thing'], ['The Clock', '48 hours before the trail goes cold']],
      ['The missing person\'s phone rings in your own pocket.',
        'You find the last clue, and it is in your handwriting.',
        'The only witness points at you.'],
      [['Question the neighbour', 'Search the house', 'Follow the car'], ['Tell the police', 'Keep it secret', 'Confront the family']]],
    [/\b(?:ghosts?|haunt\w*|curse\w*|demons?|monsters?|witch\w*|creatures?|possess\w*|mirrors?|basement|attic|ritual\w*)\b/i,
      [['Ivy', 'a skeptic who keeps filming'], ['Father Amos', 'who has seen this once before'], ['Noor', 'a child who talks to someone you can\'t see']],
      [['The Visitor', 'it only moves when the lights are off'], ['The House', 'its rooms change at night'], ['The Mark', 'a symbol that spreads to whoever looks at it']],
      ['The thing in the mirror stops copying you.',
        'Every photo from last night shows a figure standing right behind you.',
        'The lights come back on, and everyone else in the house is gone.'],
      [['Unlock the room', 'Burn the house', 'Stay until morning'], ['Run', 'Hide', 'Say its name']]],
    [/\b(?:dragons?|magic\w*|kingdoms?|wizards?|swords?|quests?|elf|elves|spells?|castles?|potions?|princes?|princess\w*|knights?|realms?)\b/i,
      [['Bramble', 'a talking fox with a bad memory'], ['Sir Edda', 'a knight who lost her kingdom'], ['Wren', 'an apprentice who breaks every spell']],
      [['The Ash King', 'who wants your name, not your life'], ['The Mist', 'it swallows the roads at dusk'], ['The Bargain', 'the price you agreed to without reading']],
      ['The dragon you came to stop bows to you.',
        'The spell works, but the wrong person disappears.',
        'The map burns itself, and only you can read the ashes.'],
      [['Take the sword', 'Break the spell', 'Make the bargain'], ['Cross the bridge', 'Enter the forest', 'Wait for the moon']]],
    [/\b(?:schools?|class(?:es|mates?)?|teachers?|exams?|college|campus|prom|dorms?|students?|lockers?)\b/i,
      [['Sam', 'your best friend, who just stopped talking to you'], ['Ms. Kade', 'the teacher who knows too much'], ['Riley', 'the new kid with a secret']],
      [['The Account', 'an anonymous page posting everyone\'s secrets'], ['The Test', 'one exam that decides everything'], ['The Rumour', 'about you, and spreading']],
      ['The anonymous account posts a photo only you could have taken.',
        'Your name is the only one missing from the final list.',
        'The person you trusted most sits at the other table.'],
      [['Tell a teacher', 'Find who runs the account', 'Post the truth'], ['Forgive them', 'Follow the new kid', 'Skip the party']]],
    [/\b(?:love[drs]?|loving|crush\w*|date|dating|wedding|marr(?:y|ied|iage)|valentine|heart)\b|(?<![\w-])ex(?:-(?:girlfriend|boyfriend|wife|husband|partner))?(?![\w-])/i,
      [['Alex', 'who was supposed to be a one-time favour'], ['Jo', 'your best friend, who sees it before you do'], ['Mae', 'the ex who just came back to town']],
      [['The Deadline', 'one week before the wedding'], ['The Letter', 'never sent, and now found'], ['The Lie', 'it was small at first']],
      ['They say the one thing you hoped they wouldn\'t.',
        'The letter you never sent arrives at their door.',
        'You both get the same job offer, in different cities.'],
      [['Say it now', 'Wait one more day', 'Walk away'], ['Answer the call', 'Read the letter', 'Book the ticket']]],
    [/\b(?:races?|racing|matches|tournaments?|teams?|game show|champion\w*|boxing|leagues?|competitions?|contests?)\b/i,
      [['Coach Ruiz', 'who bet everything on you'], ['Tia', 'your rival, and the only one who believes in you'], ['Dex', 'the teammate who wants your spot']],
      [['The Champion', 'undefeated, and watching you'], ['The Rule', 'one mistake and you\'re out'], ['The Injury', 'you hid it from everyone']],
      ['You win the round, and the judges call your name for the wrong reason.',
        'Your rival offers to throw the final.',
        'The scoreboard flips. Someone changed the result.'],
      [['Play fair', 'Take the deal', 'Walk out'], ['Trust your rival', 'Trust your coach', 'Go alone']]],
  ];
  const DEFAULT = [null,
    [['Nell', 'a friend who shows up exactly when you need help'], ['The Stranger', 'who knows more than they say'], ['Your reflection', 'it has started giving advice']],
    [['The Clock', 'something ends at midnight'], ['The Other Side', 'they want the same thing you do'], ['The Secret', 'the one you never told anyone']],
    ['Everything goes to plan, until a stranger calls you by your old name.',
      'You get exactly what you wanted, and it costs someone else everything.',
      'The one person you trusted hands you a note: "Don\'t look back."'],
    [['Follow the stranger', 'Stay where you are', 'Tell the truth'], ['Open the note', 'Burn it', 'Give it back']]];

  // the same idea always gives the same sample (a tiny string hash picks each part)
  const hash = (s, salt) => { let h = 2166136261 ^ salt; for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return h >>> 0; };
  const pick = (list, s, salt) => list[hash(s, salt) % list.length];
  const tidy = (s) => {
    let t = s.replace(/\s+/g, ' ').trim().replace(/^["“]([^"“”]*)["”]$/, '$1');
    t = t.charAt(0).toUpperCase() + t.slice(1);
    return /[.!?]$/.test(t) ? t : `${t}.`;
  };
  const li = (text) => { const el = document.createElement('li'); el.textContent = text; return el; };
  const fail = (msg) => {
    err.textContent = msg;
    input.setAttribute('aria-invalid', 'true');
    out.hidden = true;
    input.focus();
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    const words = raw.split(/\s+/).filter(Boolean).length;
    if (words < 3 && !(/[฀-๿぀-ヿ㐀-鿿]/.test(raw) && [...raw].length >= 6)) {
      fail('Type a few words first, like "A cat runs a heist crew."');
      return;
    }
    err.textContent = '';
    input.removeAttribute('aria-invalid');
    const key = raw.toLowerCase();
    const [, friends, threats, cliffs, votes] = KINDS.find((k) => k[0].test(raw)) || DEFAULT;
    const [fName, fDesc] = pick(friends, key, 1), [tName, tDesc] = pick(threats, key, 2);
    out.querySelector('[data-f="premise"]').textContent = `${tidy(raw)} Told to "you", one short part at a time, and every part ends on a vote.`;
    out.querySelector('[data-f="cast"]').replaceChildren(li('You: the hero. The audience decides what you do.'), li(`${fName}: ${fDesc}.`), li(`${tName}: ${tDesc}.`));
    out.querySelector('[data-f="cliff"]').textContent = pick(cliffs, key, 3);
    out.querySelector('[data-f="vote"]').replaceChildren(...pick(votes, key, 4).map(li));
    out.hidden = false;
    out.classList.remove('fresh'); void out.offsetWidth; out.classList.add('fresh');
    if (status) status.textContent = 'Sample ready below: the premise, the cast, how episode 1 ends, and the vote.';
  });
})();
