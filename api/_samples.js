// Starter conversations so Community isn't empty at launch. Every row is stored with sample = true,
// and the admin Community page has one button that removes them all.
// [group slug, nickname, title, body, hours ago, hugs, replies: [nickname, body, hours ago, hugs][]]
module.exports = [
  ['ttc', 'Moma team', 'Welcome to Trying to conceive 💜', 'This is a kind space for anyone trying for a baby, whether it is your first month or your second year. Share what is working, ask anything, and be gentle with each other. Please no selling, no links and no phone numbers. If you have heavy bleeding or severe pain, call 999 or NHS 111.', 96, 31, []],
  ['ttc', 'Ellie_B', 'Month 7 of trying. How do you all stay positive?', 'We have been trying since March. Every time my period turns up I have a little cry. Family keep asking "any news?" at every gathering. How are you coping?', 52, 24, [
    ['Priya.K', 'Big hugs. It took us 14 months for our first. What helped was not telling everyone we were trying, so the questions stopped. One month I just stopped tracking and rested.', 49, 12],
    ['Sophie_M', 'Same here, month 5. I am on folic acid and my partner cut down on drinking. Holding on together 🤞', 44, 8],
    ['Hannah_J', 'The NHS says see your GP after a year of trying if you are under 36, sooner if you are older or have a known issue. Getting basic tests early helped my anxiety.', 30, 15],
  ]],
  ['ttc', 'Megan_L', 'Ovulation tests: worth it?', 'My cycle is 26 to 33 days so the app dates move around. Has anyone used ovulation tests? Which ones did you get?', 30, 9, [
    ['Aisha_R', 'Yes, with irregular cycles they helped a lot. I test once a day from day 10, twice a day when the line gets darker. Supermarket own-brand strips are fine.', 27, 6],
  ]],
  ['first-baby', 'Chloe_T', 'Morning sickness is morning, afternoon and night 😩', 'Week 9. I can only keep down crackers and cold water. Ginger tea helps a bit. Is this normal?', 20, 14, [
    ['Grace_W', 'Little and often, every couple of hours, and dry toast before getting up. If you can not keep fluids down for a day, call your midwife or 111. I had hyperemesis and medicine really helped.', 18, 9],
    ['Chloe_T', 'Thank you. Trying the toast and watching my water. ❤️', 12, 3],
  ]],
  ['first-baby', 'Amara.O', 'What did you actually use from your hospital bag?', 'Packing mine at 34 weeks and the lists online are endless. What did you really use?', 60, 18, [
    ['Laura_P', 'Big comfy knickers, maternity pads, a long phone charger, lip balm, snacks and a going-home outfit for baby. Barely touched the rest.', 55, 11],
  ]],
  ['due-soon', 'Rosie_H', 'When did you call maternity triage?', 'First baby, 37 weeks. How did you know it was time to ring the unit?', 40, 10, [
    ['Kate_S', 'They told me 3 contractions in 10 minutes lasting about a minute, or if waters break, bleeding, or baby moves less. I rang early just to check and they were lovely.', 36, 9],
  ]],
  ['postpartum', 'Fatima_A', 'Nobody warned me about the night sweats', 'Two weeks postpartum and I wake up soaked. Is this normal?', 70, 16, [
    ['Beth_C', 'Very normal in the first few weeks as hormones settle. If you have a temperature or feel unwell, call your GP or 111 though.', 66, 10],
  ]],
  ['breastfeeding', 'Zara_N', 'Going back to work, expressing tips?', 'Back at work in 3 weeks. How do you manage expressing at the office?', 80, 12, [
    ['Ellie_B', 'Your employer has to give you somewhere suitable to rest. I asked HR for a private room and kept milk in a cool bag with ice packs.', 76, 9],
  ]],
  ['london-mums', 'Jess_LDN', 'NCT or NHS antenatal classes?', 'Is NCT worth the money or are the free NHS classes enough?', 44, 10, [
    ['Priya.K', 'We did the free hospital classes and found our mum friends at a local baby group after. Both are fine, pick what suits your budget.', 41, 8],
  ]],
  ['midlands-mums', 'Leanne_W', 'Baby groups around Dudley and Tipton?', 'Any recommendations for baby groups or family hubs in the Black Country?', 120, 5, [
    ['Hannah_J', 'Check your local family hub and the library rhyme times. Free and a nice way to get out of the house.', 115, 4],
  ]],
  ['money-and-leave', 'Sophie_M', 'When do you get the MATB1?', 'My HR asked for a MATB1. When can the midwife give it?', 90, 11, [
    ['Kate_S', 'From 20 weeks. Ask at your next appointment, and check GOV.UK for maternity pay rules.', 86, 9],
  ]],
  ['dads-and-partners', 'Tom_D', 'How can I actually help in the first weeks?', 'Baby due in March. What helped your partner most?', 100, 13, [
    ['Laura_P', 'Take over nappies, food and visitors so she can rest and feed. And keep asking how she is really doing.', 95, 12],
  ]],
];
