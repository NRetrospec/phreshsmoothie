// Every tunable number lives here. window.CONFIG is exposed for live tuning.
export const CONFIG = {
  CANVAS_W: 960, CANVAS_H: 540,

  // --- movement (px, px/s) ---
  WALK_SPEED: 170,
  RUN_SPEED: 320,
  ACCEL_GROUND: 2600,
  ACCEL_AIR: 1500,
  FRICTION_GROUND: 2800,
  GRAVITY: 2500,
  FALL_GRAVITY_MULT: 1.35,
  MAX_FALL: 1050,
  JUMP_VELOCITY: 980,
  JUMP_CUT_MULT: 0.45,
  COYOTE_TIME: 0.12,
  JUMP_BUFFER: 0.10,
  APEX_THRESHOLD: 90,       // |vy| below this = apex, lighter gravity
  APEX_GRAVITY_MULT: 0.6,

  // --- dash ---
  DASH_SPEED: 640,
  DASH_TIME: 0.18,
  DASH_COOLDOWN: 0.55,

  // --- roll ---
  ROLL_SPEED: 430,
  ROLL_TIME: 0.38,
  ROLL_COOLDOWN: 0.5,       // invincible during roll

  // --- combat ---
  BULLET_SPEED: 820,
  BULLET_LIFE: 0.9,
  BULLET_DAMAGE: 1,
  ROLL_DAMAGE: 2,           // rolling through enemies hurts them
  HURT_INVULN: 1.1,
  KNOCKBACK_X: 360, KNOCKBACK_Y: 420,

  // --- squad: two swappable characters, each with their own health bar (hp in half-hearts) ---
  CHARACTERS: {
    phresh: {
      id: 'phresh', name: 'PHRESH', color: '#ff6b9d',
      maxHp: 6,
      shootCd: 0.17,          // fast single shots
      special: 'burp',        // AoE burp blast
    },
    que: {
      id: 'que', name: 'QUE', color: '#4dabf7',
      maxHp: 6,
      shootCd: 0.62,          // shotgun: slow, spread
      pellets: 5, spread: 0.34, pelletSpeed: 780, pelletLife: 0.34, pelletDamage: 1,
      recoil: 150,
      special: 'blast',       // big piercing slug blast
    },
  },
  SWAP_COOLDOWN: 0.35,
  SWAP_INVULN: 0.6,           // incoming character i-frames on a manual tag
  DEATH_SWAP_INVULN: 1.6,     // incoming character i-frames when the partner drops

  // --- player hitbox ---
  PLAYER_W: 40, PLAYER_H: 88, ROLL_H: 48,

  // --- smoothie / burp blast ---
  SMOOTHIE_MAX: 10,          // fruits needed for a full smoothie
  BURP_RADIUS: 340,
  BURP_DAMAGE: 6,
  BLAST_DAMAGE: 9, BLAST_SPEED: 640, BLAST_W: 150, BLAST_H: 120, BLAST_LIFE: 0.75,

  // --- enemies ---
  BANANA_HP: 2, BANANA_FLEE_SPEED: 240, BANANA_WANDER_SPEED: 90, BANANA_SIGHT: 330,
  RAISIN_HP: 3, RAISIN_RANGE: 460, RAISIN_FIRE_COOLDOWN: 1.6,
  SEED_SPEED: 380, SEED_GRAVITY: 700,
  MELON_HP: 12, MELON_SPEED: 130, MELON_CHARGE_SPEED: 420,
  ENEMY_TOUCH_DAMAGE: 1,

  // --- power-up drop table (chance rolls independently, first hit wins) ---
  DROPS: [
    { type: 'protein',   chance: 0.10 },  // damage x2 for 12s
    { type: 'sneakers',  chance: 0.10 },  // speed +35% for 12s
    { type: 'sunscreen', chance: 0.08 },  // shield: absorb 1 hit
    { type: 'icecube',   chance: 0.07 },  // freeze enemies 4s
  ],
  POWERUP_TIME: 12,
  FREEZE_TIME: 4,

  // --- roguelite: round N difficulty (round 1 = the hand-built level) ---
  ROUND: {
    hpPerRound: 0.22,          // enemy hp multiplier growth
    speedPerRound: 0.05, speedCap: 1.45,
    fireRatePerRound: 0.12,    // raisin shots/sec growth
    heavyTouchRound: 5,        // from this round enemy touch costs a full heart
    healBetweenRounds: 2,      // half-hearts restored to survivors
    reviveHp: 2,               // half-hearts a fallen partner returns with
  },

  // --- camera ---
  CAM_LERP: 5.5, CAM_LOOKAHEAD: 90, CAM_DEADZONE_Y: 60,

  // --- world ---
  TILE: 48,
};
