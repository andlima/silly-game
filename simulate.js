import { runGame } from './src/simulator.js';

// Parse CLI args
const args = process.argv.slice(2);
let runs = 100;
let jsonOutput = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--runs' && args[i + 1]) {
    runs = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--json') {
    jsonOutput = true;
  }
}

// Run simulations
const results = [];
for (let i = 0; i < runs; i++) {
  results.push(runGame());
}

function aggregateStats(results) {
  const n = results.length;
  const wins = results.filter(r => r.won).length;
  const losses = results.filter(r => !r.won);
  const timeouts = results.filter(r => r.stats.causeOfDeath === 'timeout').length;

  // Deaths by level
  const deathsByLevel = {};
  for (const r of losses) {
    const lvl = r.level;
    deathsByLevel[lvl] = (deathsByLevel[lvl] || 0) + 1;
  }
  for (const k of Object.keys(deathsByLevel)) {
    deathsByLevel[k] = deathsByLevel[k] / n;
  }

  // Deaths by monster
  const deathsByMonster = {};
  for (const r of losses) {
    const cause = r.stats.causeOfDeath;
    if (cause && cause !== 'timeout') {
      const key = cause.toLowerCase();
      deathsByMonster[key] = (deathsByMonster[key] || 0) + 1;
    }
  }
  for (const k of Object.keys(deathsByMonster)) {
    deathsByMonster[k] = deathsByMonster[k] / n;
  }

  // Combat averages
  const avgDamageDealt = results.reduce((s, r) => s + r.stats.damageDealt, 0) / n;
  const avgDamageTaken = results.reduce((s, r) => s + r.stats.damageTaken, 0) / n;
  const avgMonstersKilled = results.reduce((s, r) => s + r.stats.monstersKilled, 0) / n;

  // Items
  const avgFoodFound = results.reduce((s, r) => s + r.foodFound, 0) / n;
  const avgFoodUsed = results.reduce((s, r) => s + r.stats.foodUsed, 0) / n;

  // Equipment frequency
  const equipCounts = { dagger: 0, sword: 0, helmet: 0, shield: 0 };
  for (const r of results) {
    if (r.equipment.weapon === 'Knife') equipCounts.dagger++;
    if (r.equipment.weapon === 'Sword') equipCounts.sword++;
    if (r.equipment.helmet === 'Helmet') equipCounts.helmet++;
    if (r.equipment.shield === 'Shield') equipCounts.shield++;
  }
  const equipment = {};
  for (const [k, v] of Object.entries(equipCounts)) {
    equipment[k] = v / n;
  }

  // Equipment impact on win rate
  const hadWeapon = results.filter(r => r.equipment.weapon !== null);
  const noWeapon = results.filter(r => r.equipment.weapon === null);
  const hadShield = results.filter(r => r.equipment.shield !== null);
  const noShield = results.filter(r => r.equipment.shield === null);

  const equipmentWinRate = {
    hadWeapon: hadWeapon.length > 0 ? hadWeapon.filter(r => r.won).length / hadWeapon.length : 0,
    noWeapon: noWeapon.length > 0 ? noWeapon.filter(r => r.won).length / noWeapon.length : 0,
    hadShield: hadShield.length > 0 ? hadShield.filter(r => r.won).length / hadShield.length : 0,
    noShield: noShield.length > 0 ? noShield.filter(r => r.won).length / noShield.length : 0,
  };

  // Economy
  const avgGoldCollected = results.reduce((s, r) => s + (r.stats.goldCollected || 0), 0) / n;
  const avgIdolOfferings = results.reduce((s, r) => s + (r.stats.idolOfferings || 0), 0) / n;

  // Idol impact on win rate
  const usedIdol = results.filter(r => (r.stats.idolOfferings || 0) > 0);
  const noIdol = results.filter(r => (r.stats.idolOfferings || 0) === 0);
  const idolWinRate = {
    usedIdol: usedIdol.length > 0 ? usedIdol.filter(r => r.won).length / usedIdol.length : 0,
    noIdol: noIdol.length > 0 ? noIdol.filter(r => r.won).length / noIdol.length : 0,
  };

  return {
    runs: n,
    summary: {
      winRate: wins / n,
      avgLevel: results.reduce((s, r) => s + r.level, 0) / n,
      avgTurns: Math.round(results.reduce((s, r) => s + r.turns, 0) / n),
      timeouts,
    },
    deathsByLevel,
    deathsByMonster,
    combat: {
      avgDamageDealt: +avgDamageDealt.toFixed(1),
      avgDamageTaken: +avgDamageTaken.toFixed(1),
      avgMonstersKilled: +avgMonstersKilled.toFixed(1),
    },
    items: {
      avgFoodFound: +avgFoodFound.toFixed(1),
      avgFoodUsed: +avgFoodUsed.toFixed(1),
    },
    economy: {
      avgGoldCollected: +avgGoldCollected.toFixed(1),
      avgIdolOfferings: +avgIdolOfferings.toFixed(2),
    },
    equipment,
    equipmentWinRate,
    idolWinRate,
  };
}

function printReport(agg) {
  const pct = (v) => (v * 100).toFixed(1) + '%';

  console.log(`\n=== Silly Game Simulator — ${agg.runs} runs ===\n`);

  console.log('Overall');
  console.log(`  Win rate:          ${pct(agg.summary.winRate)}`);
  console.log(`  Avg level reached: ${agg.summary.avgLevel.toFixed(1)}`);
  console.log(`  Avg turns/game:    ${agg.summary.avgTurns}`);
  console.log(`  Timeouts:          ${agg.summary.timeouts} (${pct(agg.summary.timeouts / agg.runs)})`);

  console.log('\nDeaths by level');
  const levelKeys = Object.keys(agg.deathsByLevel).sort((a, b) => a - b);
  for (const k of levelKeys) {
    console.log(`  Level ${k}:  ${pct(agg.deathsByLevel[k]).padStart(5)}`);
  }

  console.log('\nDeaths by monster');
  const monsterKeys = Object.keys(agg.deathsByMonster).sort();
  for (const k of monsterKeys) {
    const label = k.charAt(0).toUpperCase() + k.slice(1);
    console.log(`  ${label.padEnd(10)} ${pct(agg.deathsByMonster[k]).padStart(5)}`);
  }

  console.log('\nCombat');
  console.log(`  Avg damage dealt:  ${agg.combat.avgDamageDealt}`);
  console.log(`  Avg damage taken:  ${agg.combat.avgDamageTaken}`);
  console.log(`  Avg monsters killed: ${agg.combat.avgMonstersKilled}`);

  console.log('\nItems');
  console.log(`  Avg food found:    ${agg.items.avgFoodFound}`);
  console.log(`  Avg food used:     ${agg.items.avgFoodUsed}`);

  console.log('\nEconomy');
  console.log(`  Avg gold collected:  ${agg.economy.avgGoldCollected}`);
  console.log(`  Avg idol offerings:  ${agg.economy.avgIdolOfferings}`);

  console.log('\nEquipment (% of games where found)');
  console.log(`  Knife:   ${pct(agg.equipment.dagger).padStart(4)}`);
  console.log(`  Sword:   ${pct(agg.equipment.sword).padStart(4)}`);
  console.log(`  Helmet:  ${pct(agg.equipment.helmet).padStart(4)}`);
  console.log(`  Shield:  ${pct(agg.equipment.shield).padStart(4)}`);

  console.log('\nEquipment impact on win rate');
  console.log(`  Had weapon:   ${pct(agg.equipmentWinRate.hadWeapon)} win rate`);
  console.log(`  No weapon:    ${pct(agg.equipmentWinRate.noWeapon)} win rate`);
  console.log(`  Had shield:   ${pct(agg.equipmentWinRate.hadShield)} win rate`);
  console.log(`  No shield:    ${pct(agg.equipmentWinRate.noShield)} win rate`);

  console.log('\nIdol impact on win rate');
  console.log(`  Used idol:    ${pct(agg.idolWinRate.usedIdol)} win rate`);
  console.log(`  No idol:      ${pct(agg.idolWinRate.noIdol)} win rate`);

  console.log('');
}

function printJson(agg, results) {
  const output = {
    ...agg,
    raw: results,
  };
  console.log(JSON.stringify(output, null, 2));
}

const aggregated = aggregateStats(results);

if (jsonOutput) {
  printJson(aggregated, results);
} else {
  printReport(aggregated);
}
