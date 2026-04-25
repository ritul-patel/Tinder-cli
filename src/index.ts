#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import { AgentBrowserControl } from './agentBrowser.js';
import { ProfileAnalyzer } from './analyze.js';
import {
  loadHistory, saveHistory, checkDailyLimit, recordSwipe,
  humanDelay, jitterScore, isHumanHours, maybeSessionBreak,
  DAILY_LIMIT
} from './human.js';

const program = new Command();

console.log(chalk.yellow('⚠️  BETA: Use in moderation. Excessive automation may get your Tinder account flagged or banned.\n'));

program
  .name('tinder-agent')
  .description('AI-powered Tinder swiping agent')
  .version('1.0.0');

program
  .command('swipe-right')
  .description('Swipe right (LIKE) on the current profile')
  .action(async () => {
    try {
      const browser = new AgentBrowserControl();
      console.log(chalk.cyan('👆 Swiping right...'));
      await browser.swipeRight();
      await browser.nextProfile();
      console.log(chalk.green('✅ Done!\n'));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}\n`));
      process.exit(1);
    }
  });

program
  .command('swipe-left')
  .description('Swipe left (NOPE) on the current profile')
  .action(async () => {
    try {
      const browser = new AgentBrowserControl();
      console.log(chalk.cyan('👆 Swiping left...'));
      await browser.swipeLeft();
      await browser.nextProfile();
      console.log(chalk.green('✅ Done!\n'));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}\n`));
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze the current profile without swiping')
  .action(async () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error(chalk.red('\n❌ Error: GROQ_API_KEY not set\n'));
      process.exit(1);
    }

    try {
      const browser = new AgentBrowserControl();
      const analyzer = new ProfileAnalyzer(apiKey);

      console.log(chalk.cyan('🔍 Analyzing current profile...\n'));

      const pageText = await browser.getPageText();
      const imageUrls = await browser.getProfileImages();

      console.log(chalk.gray(`📸 Found ${imageUrls.length} images`));

      const result = await analyzer.analyze(pageText, imageUrls);

      console.log('\n' + '='.repeat(60));
      console.log(chalk.bold.cyan(`\n${result.name}, ${result.age}`));
      console.log(chalk.white(result.bio || '(no bio)'));

      const scoreColor = result.score >= 7 ? chalk.green : result.score >= 5 ? chalk.yellow : chalk.red;
      console.log('\n' + chalk.bold('Score: ') + scoreColor(`${result.score}/10`));
      console.log(chalk.gray(`Reasoning: ${result.reasoning}`));

      if (result.action === 'RIGHT') {
        console.log(chalk.green.bold('\n✓ Recommendation: Swipe Right ❤️'));
      } else {
        console.log(chalk.red.bold('\n✗ Recommendation: Swipe Left ❌'));
      }

      console.log('='.repeat(60) + '\n');

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}\n`));
      process.exit(1);
    }
  });

program
  .command('auto-swipe')
  .description('Automatically swipe through profiles with AI analysis')
  .option('--limit <number>', 'Number of profiles to process', '20')
  .option('--min-score <number>', 'Minimum score to swipe right (1-10)', '7')
  .action(async (options) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error(chalk.red('\n❌ Error: GROQ_API_KEY not set\n'));
      console.log(chalk.yellow('Set it with: GROQ_API_KEY=your-key in .env file\n'));
      process.exit(1);
    }

    // Human-mode checks
    if (!isHumanHours()) {
      console.log(chalk.yellow('\n⏰ Outside human hours (9am–11pm). Run during normal hours.\n'));
      process.exit(0);
    }

    const history = loadHistory();
    if (checkDailyLimit(history)) {
      console.log(chalk.yellow(`\n🛑 Daily limit of ${DAILY_LIMIT} swipes reached. Try again tomorrow.\n`));
      process.exit(0);
    }

    const browser = new AgentBrowserControl();
    const analyzer = new ProfileAnalyzer(apiKey);
    const limit = Math.min(parseInt(options.limit), DAILY_LIMIT - history.count);
    const minScore = parseFloat(options.minScore);
    const seenProfiles = new Set<string>();
    let rightSwipes = 0;
    let leftSwipes = 0;
    let sessionSwipes = 0;
    let currentHistory = history;

    console.log(chalk.cyan('🌐 Opening Tinder...\n'));
    await browser.openTinder();
    console.log(chalk.magenta(`🔥 Auto-swipe started (limit: ${limit}, min score: ${minScore}, today: ${history.count}/${DAILY_LIMIT})\n`));

    for (let i = 0; i < limit; i++) {
      console.log(chalk.gray(`\n[${i + 1}/${limit}] Waiting for profile...`));

      // Session break every ~20 swipes
      await maybeSessionBreak(sessionSwipes);

      // Human hours check mid-session
      if (!isHumanHours()) {
        console.log(chalk.yellow('\n⏰ Late night — stopping for today.\n'));
        break;
      }

      // Wait for profile to load
      let loaded = false;
      for (let w = 0; w < 15000; w += 2000) {
        const state = await browser.getProfileState();
        if (state.outOfLikes) {
          console.log(chalk.yellow('\n💔 Out of likes — Tinder daily limit reached. Stopping.\n'));
          process.exit(0);
        }
        if (state.loaded) { loaded = true; break; }
        await new Promise(r => setTimeout(r, 2000));
      }
      if (!loaded) { console.log(chalk.yellow('\n⚠️  No more profiles\n')); break; }

      // Human pause: reading the profile (2–6 seconds)
      await humanDelay(2000, 6000);

      const pageText = await browser.getPageText();
      const imageUrls = await browser.getProfileImages();
      console.log(chalk.gray(`📸 Found ${imageUrls.length} images`));

      const result = await analyzer.analyze(pageText, imageUrls);

      // Age filter: 18–21 only
      if (result.age > 0 && (result.age < 18 || result.age > 21)) {
        console.log(chalk.gray(`⏭️  Age ${result.age} outside range (18–21), skipping`));
        await humanDelay(2000, 5000);
        await browser.swipeLeft();
        await browser.nextProfile(1000);
        leftSwipes++;
        currentHistory = recordSwipe(currentHistory);
        saveHistory(currentHistory);
        sessionSwipes++;
        continue;
      }

      // Skip duplicates
      const key = `${result.name}-${result.age}`;
      if (seenProfiles.has(key)) {
        console.log(chalk.yellow(`⚠️  Duplicate ${key}, skipping`));
        await humanDelay(3000, 8000);
        await browser.nextProfile(1000);
        continue;
      }
      seenProfiles.add(key);

      // Display result
      console.log('\n' + '='.repeat(60));
      console.log(chalk.bold.cyan(`\n${result.name}, ${result.age}`));
      console.log(chalk.white(result.bio || '(no bio)'));
      const scoreColor = result.score >= 7 ? chalk.green : result.score >= 5 ? chalk.yellow : chalk.red;
      console.log('\n' + chalk.bold('Score: ') + scoreColor(`${result.score}/10`));
      console.log(chalk.gray(`Reasoning: ${result.reasoning}`));

      // Jitter score slightly for more natural right-swipe ratio
      const effectiveScore = jitterScore(result.score);
      const action = effectiveScore >= minScore ? 'RIGHT' : 'LEFT';

      // Pause before swiping (thinking time: 1–4 seconds)
      await humanDelay(1000, 4000);

      if (action === 'RIGHT') {
        console.log(chalk.green.bold('\n✓ Swipe Right ❤️'));
        await browser.swipeRight();
        rightSwipes++;
      } else {
        console.log(chalk.red.bold('\n✗ Swipe Left ❌'));
        await browser.swipeLeft();
        leftSwipes++;
      }
      console.log('='.repeat(60));

      // Record swipe in daily history
      currentHistory = recordSwipe(currentHistory);
      saveHistory(currentHistory);
      sessionSwipes++;

      // Human pause between profiles (8–20 seconds)
      await humanDelay(8000, 20000);
      await browser.nextProfile(1000);
    }

    console.log('\n' + '='.repeat(60));
    console.log(chalk.bold.cyan('\n📊 Summary\n'));
    console.log(chalk.green(`❤️  Right: ${rightSwipes}`));
    console.log(chalk.red(`❌ Left: ${leftSwipes}`));
    console.log(chalk.gray(`📅 Today total: ${currentHistory.count}/${DAILY_LIMIT}`));
    console.log('='.repeat(60) + '\n');
  });

program.parse();
