#!/usr/bin/env node
/**
 * BitBites Admin CLI
 * Simple CLI for testing - set scores, tiers, etc.
 * 
 * Usage:
 *   node scripts/admin-cli.js list              - List all users
 *   node scripts/admin-cli.js score <user> <pts> - Add score to user
 *   node scripts/admin-cli.js tier <user> <tier> - Set user tier (0-10)
 *   node scripts/admin-cli.js tierup <user>      - Trigger tier-up check
 *   node scripts/admin-cli.js reset <user>       - Reset user to tier 0
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load env
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Colors for terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
}

const log = {
    info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`)
}

// === COMMANDS ===

async function listUsers() {
    const { data, error } = await supabase
        .from('leaderboard')
        .select('*')

    if (error) {
        log.error(`Failed to fetch users: ${error.message}`)
        return
    }

    console.log('\n🏆 BitBites Leaderboard\n')
    console.log('━'.repeat(60))

    for (const user of data) {
        const tierStars = '⭐'.repeat(Math.min(user.tier, 5))
        console.log(`#${user.rank} ${user.username}`)
        console.log(`   Tier: ${user.tier} ${tierStars} (${user.tier_name})`)
        console.log(`   Score: ${user.cycle_score.toLocaleString()} pts (${user.tier_progress}% to next)`)
        console.log(`   Multiplier: ${user.tier_multiplier}×`)
        console.log('─'.repeat(60))
    }
}

async function findUser(query) {
    // Try by username first
    let { data } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${query}%`)
        .limit(1)

    if (data && data.length > 0) return data[0]

    // Try by ID
    const { data: byId } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', query)
        .limit(1)

    return byId?.[0] || null
}

async function addScore(userQuery, points) {
    const user = await findUser(userQuery)
    if (!user) {
        log.error(`User not found: ${userQuery}`)
        return
    }

    points = parseInt(points)
    if (isNaN(points) || points <= 0) {
        log.error('Points must be a positive number')
        return
    }

    // Cap at 100 per meal (constraint)
    const mealsToAdd = Math.ceil(points / 100)
    const lastMealScore = points % 100 || 100

    log.info(`Adding ${points} points to ${user.username} via ${mealsToAdd} test meal(s)...`)

    for (let i = 0; i < mealsToAdd; i++) {
        const score = (i === mealsToAdd - 1) ? lastMealScore : 100

        const { error } = await supabase
            .from('meals')
            .insert({
                user_id: user.id,
                raw_score: score,
                food_type_id: 1, // 'home_cooked'
                analysis: `[TEST] Admin CLI added ${score} points`,
                image_before_url: 'https://placehold.co/100x100?text=TEST',
                image_after_url: 'https://placehold.co/100x100?text=TEST'
            })

        if (error) {
            log.error(`Failed to add meal: ${error.message}`)
            return
        }
    }

    log.success(`Added ${points} points to ${user.username}`)

    // Check for tier up
    await checkTierUp(user.id, user.username)
}

async function setTier(userQuery, tier) {
    const user = await findUser(userQuery)
    if (!user) {
        log.error(`User not found: ${userQuery}`)
        return
    }

    tier = parseInt(tier)
    if (isNaN(tier) || tier < 0 || tier > 10) {
        log.error('Tier must be 0-10')
        return
    }

    // Use admin RPC function to bypass RLS
    const { data, error } = await supabase.rpc('admin_set_tier', {
        p_user_id: user.id,
        p_tier: tier
    })

    if (error) {
        log.error(`Failed to set tier: ${error.message}`)
        return
    }

    const tierNames = ['Starter', 'Bronze', 'Silver', 'Gold', 'Platinum',
        'Diamond', 'Master', 'Grandmaster', 'Champion', 'Legend', 'Mythic']
    log.success(`Set ${user.username} to Tier ${tier} (${tierNames[tier]})`)
}

async function checkTierUp(userId, username) {
    const { data, error } = await supabase.rpc('check_tier_up', { p_user_id: userId })

    if (error) {
        log.error(`Tier check failed: ${error.message}`)
        return
    }

    if (data && data[0]?.tiered_up) {
        log.success(`🎉 ${username} tiered up! Now Tier ${data[0].new_tier} (${data[0].tier_name})`)
    } else {
        log.info(`${username} - no tier change`)
    }
}

async function triggerTierUp(userQuery) {
    const user = await findUser(userQuery)
    if (!user) {
        log.error(`User not found: ${userQuery}`)
        return
    }

    await checkTierUp(user.id, user.username)
}

async function resetUser(userQuery) {
    const user = await findUser(userQuery)
    if (!user) {
        log.error(`User not found: ${userQuery}`)
        return
    }

    // Use admin RPC function to bypass RLS
    const { data, error } = await supabase.rpc('admin_reset_tier', {
        p_user_id: user.id
    })

    if (error) {
        log.error(`Failed to reset: ${error.message}`)
        return
    }

    log.success(`Reset ${user.username} to Tier 0 (Starter)`)
}

async function setScore(userQuery, targetScore) {
    const user = await findUser(userQuery)
    if (!user) {
        log.error(`User not found: ${userQuery}`)
        return
    }

    targetScore = parseInt(targetScore)
    if (isNaN(targetScore) || targetScore < 0) {
        log.error('Score must be a non-negative number')
        return
    }

    // Get current meal-based score
    const { data: stats } = await supabase
        .from('user_stats')
        .select('total_score, score_adjustment')
        .eq('user_id', user.id)
        .single()

    if (!stats) {
        log.error('Could not fetch user stats')
        return
    }

    // Calculate needed adjustment
    const mealScore = stats.total_score - (stats.score_adjustment || 0)
    const newAdjustment = targetScore - mealScore

    const { error } = await supabase.rpc('admin_set_score_adjustment', {
        p_user_id: user.id,
        p_adjustment: newAdjustment
    })

    if (error) {
        log.error(`Failed to set score: ${error.message}`)
        return
    }

    log.success(`Set ${user.username}'s score to ${targetScore.toLocaleString()} (adjustment: ${newAdjustment >= 0 ? '+' : ''}${newAdjustment})`)
}

async function clearTests(userQuery) {
    const user = await findUser(userQuery)
    if (!user) {
        log.error(`User not found: ${userQuery}`)
        return
    }

    const { data, error } = await supabase.rpc('admin_clear_test_meals', {
        p_user_id: user.id
    })

    if (error) {
        log.error(`Failed to clear tests: ${error.message}`)
        return
    }

    log.success(`Cleared ${data} test meal(s) for ${user.username}`)
}

// === MAIN ===

function showHelp() {
    console.log(`
${colors.bright}🎮 BitBites Admin CLI${colors.reset}

${colors.cyan}Usage:${colors.reset}
  npm run admin <command> [args]

${colors.cyan}Commands:${colors.reset}
  list                      List all users with their stats
  score <user> <points>     Add points to a user (creates test meals)
  setscore <user> <total>   Set user's total score directly
  tier <user> <0-10>        Set user's tier directly
  tierup <user>             Check and trigger tier-up for user
  reset <user>              Reset user to Tier 0
  cleartests <user>         Delete all test meals for user

${colors.cyan}Examples:${colors.reset}
  npm run admin list
  npm run admin score aomsin 500        # Add 500 points
  npm run admin setscore aomsin 5000    # Set total to 5000
  npm run admin tier hootoo 3           # Set to Gold tier
  npm run admin tierup aomsin           # Trigger tier-up
  npm run admin reset hootoo            # Reset to Tier 0
  npm run admin cleartests aomsin       # Remove test meals
`)
}

async function main() {
    const [, , command, ...args] = process.argv

    switch (command) {
        case 'list':
            await listUsers()
            break
        case 'score':
            if (args.length < 2) {
                log.error('Usage: score <user> <points>')
                return
            }
            await addScore(args[0], args[1])
            break
        case 'setscore':
            if (args.length < 2) {
                log.error('Usage: setscore <user> <total>')
                return
            }
            await setScore(args[0], args[1])
            break
        case 'tier':
            if (args.length < 2) {
                log.error('Usage: tier <user> <0-10>')
                return
            }
            await setTier(args[0], args[1])
            break
        case 'tierup':
            if (args.length < 1) {
                log.error('Usage: tierup <user>')
                return
            }
            await triggerTierUp(args[0])
            break
        case 'reset':
            if (args.length < 1) {
                log.error('Usage: reset <user>')
                return
            }
            await resetUser(args[0])
            break
        case 'cleartests':
            if (args.length < 1) {
                log.error('Usage: cleartests <user>')
                return
            }
            await clearTests(args[0])
            break
        case 'help':
        case '--help':
        case '-h':
        default:
            showHelp()
    }
}

main().catch(console.error)
