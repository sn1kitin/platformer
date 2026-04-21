const MAP_SCALE = 1.25;
const MAP_W     = 40 * 16 * MAP_SCALE;
const MAP_H     = 23 * 16 * MAP_SCALE;
const UI_H      = 60;

const BG_SCROLL_SPEED = 40;

// settings for each room — where the player spawns, which tiles are spikes/chests/ground
const ROOM_CONFIG = {
    room1:      { terrainStart: 3, terrainEnd: 244, spikeGID: 1,    chestGID: 2,    spawnX: 80,  spawnY: 350 },
    answerRoom: { terrainStart: 2, terrainEnd: 243, spikeGID: null, chestGID: 1,    spawnX: 100, spawnY: 200 },
    bossRoom:   { terrainStart: 1, terrainEnd: 242, spikeGID: null, chestGID: null, spawnX: 80,  spawnY: 280 },
};

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        // check which room we should load, default to room1
        if (data && data.room) {
            this.currentRoom = data.room;
        } else {
            this.currentRoom = 'room1';
        }
    }

    create() {
        this.physics.world.setBounds(0, 0, MAP_W, MAP_H + 200);
        this.registry.set('playerHP', 3);
        this.createAnimations();

        // grab a reference to UIScene so I can show text and banners later
        this.ui          = this.scene.get('UIScene');
        this.resultShown = false;

        this.createBackground();
        this.createTilemap();

        // math is only generated in room1, the other rooms reuse the same values
        if (this.currentRoom === 'room1') {
            this.generateMath();
        }

        this.chests = new ChestManager(this);
        this.chests.create();

        const cfg = ROOM_CONFIG[this.currentRoom];
        this.player = new Player(this, cfg.spawnX, cfg.spawnY);
        this.physics.add.collider(this.player, this.tilemapLayer);

        // camera only takes up the bottom part of the screen, UI sits above it
        this.cameras.main.setViewport(0, UI_H, MAP_W, MAP_H);
        this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);

        this.time.delayedCall(100, () => {
            if (this.currentRoom === 'room1') {
                this.ui.showGuideBanner('Open all three chests!');
            }
        });

        if (this.currentRoom === 'bossRoom') {
            this.registry.set('bossHP', this.registry.get('bossHP') || 5);
            this.registry.set('gamePhase', 'boss');
            this.createBoss();
        }
    }

    createBackground() {
        // scrollFactor(0) means the background doesn't move with the camera
        this.bg = this.add.tileSprite(0, 0, MAP_W, MAP_H, 'bg')
            .setOrigin(0).setDepth(-3).setScrollFactor(0);
    }

    createTilemap() {
        const cfg = ROOM_CONFIG[this.currentRoom];
        this.roomCfg = cfg;

        const map = this.make.tilemap({ key: this.currentRoom });

        // scan all tiles to find chest positions before the layer is created
        // then clear them so they don't get drawn as tiles
        this.chestPositions = [];
        if (cfg.chestGID) {
            const layerData = map.getLayer('Tile Layer 1').data;
            for (let row = 0; row < map.height; row++) {
                for (let col = 0; col < map.width; col++) {
                    if (layerData[row][col].index === cfg.chestGID) {
                        this.chestPositions.push({
                            x: (col + 0.5) * map.tileWidth  * MAP_SCALE,
                            y: (row + 0.5) * map.tileHeight * MAP_SCALE,
                        });
                        layerData[row][col].index = 0;
                    }
                }
            }
            this.chestPositions.sort((a, b) => a.y - b.y || a.x - b.x);
        }

        // room1 has spikes so it needs an extra tileset
        let tilesets;
        if (this.currentRoom === 'room1') {
            tilesets = [
                map.addTilesetImage('spikes',          'spikes'),
                map.addTilesetImage('Terrain (16x16)', 'terrain-tiles'),
            ];
        } else {
            tilesets = [map.addTilesetImage('Terrain (16x16)', 'terrain-tiles')];
        }

        this.tilemapLayer = map.createLayer('Tile Layer 1', tilesets, 0, 0);
        this.tilemapLayer.setScale(MAP_SCALE);
        this.tilemapLayer.setCollisionBetween(cfg.terrainStart, cfg.terrainEnd);
    }

    generateMath() {
        const level  = this.registry.get('level') || 1;
        // numbers get bigger as the level increases but cap at 30
        const maxNum = Math.min(5 + level * 4, 30);
        const ops    = ['+', '-', '*', '/'];
        const op     = ops[Phaser.Math.Between(0, 3)];
        let num1, num2, answer;

        if (op === '+') {
            num1   = Phaser.Math.Between(1, maxNum);
            num2   = Phaser.Math.Between(1, maxNum);
            answer = num1 + num2;
        } else if (op === '-') {
            num1   = Phaser.Math.Between(5, maxNum + 5);
            num2   = Phaser.Math.Between(1, num1);
            answer = num1 - num2;
        } else if (op === '*') {
            num1   = Phaser.Math.Between(2, Math.min(12, maxNum));
            num2   = Phaser.Math.Between(2, Math.min(12, maxNum));
            answer = num1 * num2;
        } else {
            // for division I pick the answer first so there's no remainder
            num2   = Phaser.Math.Between(2, 10);
            answer = Phaser.Math.Between(1, 10);
            num1   = num2 * answer;
        }

        this.mathData = { num1, op, num2, answer };

        // reset old values in the registry, UIScene will pick them up
        this.registry.set('num1',          null);
        this.registry.set('op',            null);
        this.registry.set('num2',          null);
        this.registry.set('playerAnswer',  null);
        this.registry.set('correctAnswer', answer);
        this.registry.set('gamePhase',     'collect_num1');
    }

    checkSpikeDeath() {
        if (!this.tilemapLayer || this.player.invuln) return;
        if (!this.roomCfg || !this.roomCfg.spikeGID) return;

        // check a few points around the player instead of just the center
        const p   = this.player;
        const pts = [
            { x: p.x - 6, y: p.y + 13 }, { x: p.x + 6, y: p.y + 13 },
            { x: p.x,     y: p.y      }, { x: p.x,     y: p.y - 13 },
        ];
        for (const pt of pts) {
            const tile = this.tilemapLayer.getTileAtWorldXY(pt.x, pt.y);
            if (tile && tile.index === this.roomCfg.spikeGID) {
                this.damagePlayer();
                return;
            }
        }
    }

    createAnimations() {
        const A = this.anims;
        // guard so animations aren't recreated every time the scene restarts
        if (A.exists('p-idle')) return;

        A.create({ key: 'p-idle',  frames: A.generateFrameNumbers('p-idle',  { start:0, end:10 }), frameRate:20, repeat:-1 });
        A.create({ key: 'p-run',   frames: A.generateFrameNumbers('p-run',   { start:0, end:11 }), frameRate:20, repeat:-1 });
        A.create({ key: 'p-jump',  frames: [{ key:'p-jump', frame:0 }],                            frameRate:20, repeat:0  });
        A.create({ key: 'p-fall',  frames: [{ key:'p-fall', frame:0 }],                            frameRate:20, repeat:0  });
        A.create({ key: 'p-hit',   frames: A.generateFrameNumbers('p-hit',   { start:0, end:6  }), frameRate:20, repeat:0  });
        A.create({ key: 'p-djump', frames: A.generateFrameNumbers('p-djump', { start:0, end:5  }), frameRate:20, repeat:0  });

        A.create({ key: 'box1-open', frames: A.generateFrameNumbers('box1-hit', { start:0, end:2 }), frameRate:20, repeat:0 });
        A.create({ key: 'box2-open', frames: A.generateFrameNumbers('box2-hit', { start:0, end:3 }), frameRate:20, repeat:0 });
        A.create({ key: 'box3-open', frames: A.generateFrameNumbers('box3-hit', { start:0, end:1 }), frameRate:20, repeat:0 });

        A.create({ key: 'boss-idle',  frames: [{ key: 'boss-idle', frame: 0 }],                         frameRate:20, repeat:-1 });
        A.create({ key: 'boss-blink', frames: A.generateFrameNumbers('boss-blink', { start:0, end:3 }), frameRate:20, repeat:0  });
        A.create({ key: 'boss-hit-b', frames: A.generateFrameNumbers('boss-hit-b', { start:0, end:3 }), frameRate:20, repeat:0  });
        A.create({ key: 'boss-hit-t', frames: A.generateFrameNumbers('boss-hit-t', { start:0, end:3 }), frameRate:20, repeat:0  });
    }

    update(time, delta) {
        const dt = delta / 1000;
        this.bg.tilePositionX += BG_SCROLL_SPEED * dt;
        this.bg.tilePositionY += BG_SCROLL_SPEED * 0.4 * dt;

        // don't update the game while a result screen is showing
        if (this.resultShown) return;
        this.player.update();
        this.chests.update();
        this.checkSpikeDeath();
        if (this.currentRoom === 'bossRoom' && this.boss) this.boss.update();
    }

    damagePlayer() {
        if (this.resultShown) return;
        this.player.damage(() => this.scene.start('GameScene', { room: 'room1' }));
    }

    createBoss() {
        this.boss = new Boss(this, 320, 280);
        this.boss.init();
    }

    bossDefeated() {
        if (!this.boss) return;
        this.resultShown = true;

        // boss flashes and disappears
        this.tweens.add({
            targets: this.boss, alpha: 0, duration: 120,
            yoyo: true, repeat: 4,
            onComplete: () => {
                if (this.boss) { this.boss.destroy(); this.boss = null; }
            }
        });

        const num1          = this.registry.get('num1');
        const op            = this.registry.get('op');
        const num2          = this.registry.get('num2');
        const playerAnswer  = this.registry.get('playerAnswer');
        const correctAnswer = this.registry.get('correctAnswer');
        const isCorrect     = playerAnswer === correctAnswer;

        // only add score and increase level if the answer was correct
        const score = (this.registry.get('score') || 0) + (isCorrect ? 100 : 0);
        const level = (this.registry.get('level') || 1) + (isCorrect ? 1 : 0);
        this.registry.set('score', score);
        this.registry.set('level', level);
        this.registry.set('bossHP', 5);
        this.registry.set('gamePhase', 'collect_num1');

        const opSym = op === '/' ? '÷' : op;
        const line1 = num1 + ' ' + opSym + ' ' + num2 + ' = ' + correctAnswer;
        const line2 = isCorrect ? 'Correct!  +100 pts' : 'Wrong!  The answer was ' + correctAnswer;

        this.ui.showBossResult(line1, line2, isCorrect);

        this.time.delayedCall(4600, () => {
            this.scene.start('GameScene', { room: 'room1' });
        });
    }
}
