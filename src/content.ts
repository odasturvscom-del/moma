export type Country = 'UK' | 'Canada' | 'US' | 'Nigeria' | 'Other';
export const COUNTRIES: Country[] = ['UK', 'Canada', 'US', 'Nigeria', 'Other'];
export const EM: Record<Country, { e: string; u: string; mh: string; tel: string; urgentTel?: string }> = {
  UK: { e: '999', u: 'your maternity triage line (or NHS 111)', mh: 'Samaritans on 116 123', tel: '999', urgentTel: '111' },
  Canada: { e: '911', u: 'your birthing unit (or Health Link 811)', mh: 'the 988 Suicide Crisis Helpline', tel: '911', urgentTel: '811' },
  US: { e: '911', u: 'your OB or labor & delivery unit', mh: 'the 988 Lifeline', tel: '911' },
  Nigeria: { e: '112', u: 'your antenatal clinic or nearest hospital', mh: 'your nearest hospital', tel: '112' },
  Other: { e: 'your local emergency number', u: 'your midwife or maternity unit', mh: 'a local crisis line', tel: '' },
};
// [size, baby, you]
export const WEEKS: Record<number, [string, string, string]> = {
  4: ['poppy seed', 'Implanting in the womb. The placenta and neural tube are starting to form.', 'A missed period, maybe tender breasts and tiredness.'],
  5: ['sesame seed', 'A tiny heart tube has begun to flicker.', 'Tiredness and needing to pee more often.'],
  6: ['lentil', 'Arm and leg buds appear, facial features begin.', 'Nausea often starts around now. Small, frequent snacks help.'],
  7: ['blueberry', 'The brain is growing fast.', 'Food aversions and a super-strong sense of smell.'],
  8: ['raspberry', 'Fingers and toes are forming.', 'Nausea may peak. Bloating is common.'],
  9: ['cherry', 'All the major organs have started developing.', 'Mood swings are normal. Be gentle with yourself.'],
  10: ['strawberry', 'Now officially a foetus, with vital organs working.', 'Veins more visible, waist starting to thicken.'],
  11: ['lime', 'Bones are beginning to harden.', 'Energy may start to come back.'],
  12: ['plum', 'Reflexes are developing. Baby can open and close their fingers.', 'Many people have their dating scan around now.'],
  13: ['lemon', 'Vocal cords are forming.', 'Nausea often eases as the second trimester begins.'],
  14: ['peach', 'Baby can squint and frown.', 'Appetite returns. Welcome to the second trimester.'],
  15: ['apple', 'Can sense light through closed eyelids.', 'A stuffy nose and nosebleeds are common.'],
  16: ['avocado', 'Facial muscles are working.', 'Some people feel first flutters from now.'],
  17: ['pear', 'Fat stores are starting to build.', 'Sharp twinges on the side of the bump (round ligament pain).'],
  18: ['bell pepper', 'Baby can hear sounds.', 'Backache, and dizziness if you stand up quickly.'],
  19: ['mango', 'A protective coating (vernix) covers the skin.', 'Skin changes, maybe a dark line down the bump.'],
  20: ['banana', 'Halfway there!', 'The anomaly scan happens around now. Movements get stronger.'],
  21: ['carrot', 'Baby is swallowing and practising digestion.', 'Leg cramps, especially at night.'],
  22: ['papaya', 'Looks like a newborn in miniature.', 'Stretch marks may appear.'],
  23: ['grapefruit', 'Can hear your voice.', 'Mild ankle swelling is common. Sudden swelling is not, so get it checked.'],
  24: ['ear of corn', 'Lungs are developing.', 'A glucose test may be offered between 24 and 28 weeks.'],
  25: ['cauliflower', 'Responds to your touch.', 'Heartburn. Smaller meals and staying upright after eating help.'],
  26: ['lettuce', 'Eyes begin to open.', 'Trouble sleeping. Try sleeping on your side with a pillow.'],
  27: ['cabbage', 'Has sleep and wake cycles.', 'Last week of the second trimester.'],
  28: ['aubergine', 'Can blink and has REM sleep.', "Third trimester. Get to know your baby's pattern of movements."],
  29: ['butternut squash', 'Muscles and lungs are maturing.', 'Breathlessness as baby pushes up.'],
  30: ['courgette', 'Brain is developing grooves.', 'Tiredness returns. Rest when you can.'],
  31: ['coconut', 'All five senses are working.', 'Practice contractions (Braxton Hicks) may start.'],
  32: ['squash', 'Practising breathing movements.', 'Pelvic pressure and more frequent peeing.'],
  33: ['pineapple', 'Bones hardening, skull stays soft for birth.', 'Feeling clumsy is normal as your balance shifts.'],
  34: ['cantaloupe', 'Nervous system maturing.', 'Start thinking about your birth preferences.'],
  35: ['honeydew melon', 'Kidneys fully developed.', 'Pack your hospital bag soon.'],
  36: ['romaine lettuce', 'May move head-down.', 'Bag packed? Car seat ready?'],
  37: ['bunch of chard', 'Considered early term.', 'Nesting urges are real.'],
  38: ['leek', 'Has a strong grasp reflex.', 'You might lose your mucus plug (a show).'],
  39: ['mini watermelon', 'Ready and building fat.', 'Restless and impatient. Totally normal.'],
  40: ['pumpkin', 'Due date week.', 'Only a small share of babies arrive on their due date.'],
  41: ['pumpkin', 'Overdue but fine.', 'Your midwife may discuss a membrane sweep or induction.'],
  42: ['watermelon', 'Very ready to meet you.', 'Stay in close contact with your maternity team.'],
};
export const MILESTONES: [number, string][] = [
  [8, 'First midwife (booking) appointment'], [11, 'Dating scan (around 10 to 14 weeks)'], [16, 'Routine antenatal check'],
  [19, 'Anomaly scan (around 18 to 21 weeks)'], [25, 'Glucose test, if offered (24 to 28 weeks)'],
  [28, "Blood tests, and anti-D if you're rhesus negative"], [31, 'Antenatal classes and birth preferences'],
  [36, "Hospital bag, birth plan, baby's position check"], [41, 'Plan for going overdue'],
];
export const POSTPARTUM: Record<number, [string, string]> = {
  0: ['The first days', 'Bleeding (lochia) is heavy, like a period. Rest, skin-to-skin, and feed 8 to 12 times a day. Baby blues around day 3 to 5 are common.'],
  1: ['Week 1', 'Midwife visits for you and baby. Bleeding lessens. Look after stitches or your C-section wound and watch for redness or smelly discharge.'],
  2: ['Week 2', "Baby blues should be lifting. If low mood or anxiety continues past two weeks, talk to your GP or health visitor. It's common and treatable."],
  3: ['Week 3', 'Growth spurts and cluster feeding. Gentle walks if you feel ready.'],
  4: ['Week 4', "Start gentle pelvic floor exercises if you haven't already."],
  6: ['Week 6', 'Postnatal check for you and baby (around 6 to 8 weeks): mood, recovery, contraception, pelvic floor.'],
  8: ['Week 8', "Baby's first vaccinations are usually around now."],
  12: ['Week 12', "Many babies settle into more predictable patterns. You're doing brilliantly."],
};
export const SYM_PREG = ['Nausea', 'Tired', 'Back pain', 'Headache', 'Heartburn', 'Swelling', 'Cramps', 'Spotting', 'Insomnia', 'Constipation', 'Anxious', 'Happy'];
export const SYM_PP = ['Bleeding', 'Sore', 'Exhausted', 'Low mood', 'Anxious', 'Breast pain', 'Constipation', 'Headache', 'Teary', 'Content'];
export const MOODS = ['😞', '😕', '😐', '🙂', '😊'];
export const weekInfo = (w: number) => WEEKS[Math.min(42, Math.max(4, w))];
export const ppInfo = (w: number) => {
  const ks = Object.keys(POSTPARTUM).map(Number).filter(k => k <= w);
  return POSTPARTUM[ks[ks.length - 1] ?? 0];
};
