const CHEST_RANGE = 55;

class ChestManager {

    constructor(scene) {
        this.scene = scene;

        this.chests    = [];
        this.arrows    = [];
        // track which parts of the equation the player has collected
        this.collected = { num1: false, op: false, num2: false };
        this.chestNum1 = null;
        this.chestOp   = null;
        this.chestNum2 = null;

        const kb = scene.input.keyboard;
        this.keyE     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.keyEPrev = false;
        kb.addCapture([Phaser.Input.Keyboard.KeyCodes.E]);
    }

    create() {
        if (this.scene.currentRoom === 'room1') {
            this.createMathChests();
        } else if (this.scene.currentRoom === 'answerRoom') {
            this.createAnswerChests();
        }
    }

    update() {
        const px = this.scene.player.x;
        const py = this.scene.player.y;
        let nearest  = null;
        let nearDist = CHEST_RANGE;

        // find the closest unopened chest
        for (const ch of this.chests) {
            if (!ch || ch.opened) continue;
            const d = Phaser.Math.Distance.Between(px, py, ch.x, ch.y);
            if (d < nearDist) { nearDist = d; nearest = ch; }
        }

        if (nearest) {
            this.scene.ui.showHint(nearest.x, nearest.y);
        } else {
            this.scene.ui.hideHint();
        }

        // open only on the frame E is pressed, not while held
        const eDown = this.keyE.isDown;
        if (eDown && !this.keyEPrev && nearest) this.openChest(nearest);
        this.keyEPrev = eDown;
    }

    createMathChests() {
        const p  = this.scene.chestPositions;
        const p0 = p[0] || { x: 730, y: 170 };
        const p1 = p[1] || { x:  50, y: 250 };
        const p2 = p[2] || { x: 550, y: 390 };

        this.chestNum1 = this.makeChest(p0.x, p0.y, 'box1', 0xffdd88);
        this.chestOp   = this.makeChest(p1.x, p1.y, 'box2', 0xaaddff);
        this.chestNum2 = this.makeChest(p2.x, p2.y, 'box3', 0xaaffaa);

        this.addArrow(p0.x, p0.y);
        this.addArrow(p1.x, p1.y);
        this.addArrow(p2.x, p2.y);
    }

    createAnswerChests() {
        const correct = this.scene.registry.get('correctAnswer');

        // generate 4 wrong answers close to the correct one
        const wrongs = new Set();
        while (wrongs.size < 4) {
            const w = correct + Phaser.Math.Between(-8, 8);
            if (w !== correct && w > 0) wrongs.add(w);
        }
        const answers   = Phaser.Utils.Array.Shuffle([correct, ...wrongs]);
        const positions = this.scene.chestPositions;

        for (let i = 0; i < Math.min(answers.length, positions.length); i++) {
            const pos = positions[i];
            const val = answers[i];
            const ch  = this.makeChest(pos.x, pos.y, 'box2', 0xffffff);
            ch.answerValue = val;
            this.addArrow(pos.x, pos.y);
            // label each chest with its value
            this.scene.add.text(pos.x, pos.y + 22, String(val), {
                fontSize: '14px', fill: '#ffffff',
                stroke: '#000000', strokeThickness: 3, fontFamily: 'monospace'
            }).setOrigin(0.5).setDepth(11);
        }
    }

    makeChest(x, y, boxKey, tint) {
        const ch = this.scene.physics.add.staticSprite(x, y, boxKey + '-idle', 0);
        ch.setTint(tint).setDepth(10);
        ch.boxKey = boxKey;
        ch.opened = false;
        ch.refreshBody();
        this.chests.push(ch);
        return ch;
    }

    addArrow(x, y) {
        const txt = this.scene.add.text(x, y - 34, '▼', {
            fontSize: '14px', fill: '#ffff88',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(12).setAlpha(0.85);
        // arrow bobs up and down
        this.scene.tweens.add({ targets: txt, y: y - 26, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        txt.chestX = x;
        this.arrows.push(txt);
    }

    openChest(ch) {
        if (ch.opened) return;
        ch.opened = true;
        ch.play(ch.boxKey + '-open');

        // hide the arrow above the chest that was just opened
        for (const arr of this.arrows) {
            if (Math.abs(arr.chestX - ch.x) < 5) { arr.setVisible(false); break; }
        }

        if (this.scene.currentRoom === 'room1') {
            const md = this.scene.mathData;
            if (ch === this.chestNum1) {
                this.collected.num1 = true;
                this.scene.registry.set('num1', md.num1);
                this.scene.ui.spawnPopText(ch.x, ch.y, String(md.num1), '#ffdd44');
            } else if (ch === this.chestOp) {
                this.collected.op = true;
                this.scene.registry.set('op', md.op);
                this.scene.ui.spawnPopText(ch.x, ch.y, md.op === '/' ? '÷' : md.op, '#aaddff');
            } else if (ch === this.chestNum2) {
                this.collected.num2 = true;
                this.scene.registry.set('num2', md.num2);
                this.scene.ui.spawnPopText(ch.x, ch.y, String(md.num2), '#aaffaa');
            }

            // once all three parts are collected move to the answer room
            if (this.collected.num1 && this.collected.op && this.collected.num2) {
                this.scene.registry.set('gamePhase', 'select_answer');
                this.scene.resultShown = true;
                this.scene.time.delayedCall(500, () => {
                    this.scene.ui.showGuideBanner('Expression complete! Moving on...');
                    this.scene.time.delayedCall(2400, () => this.scene.scene.start('GameScene', { room: 'answerRoom' }));
                });
            }

        } else if (this.scene.currentRoom === 'answerRoom') {
            this.scene.registry.set('playerAnswer', ch.answerValue);
            this.scene.resultShown = true;
            this.scene.ui.showGuideBanner('Transitioning to the boss...');
            this.scene.time.delayedCall(1800, () => this.scene.scene.start('GameScene', { room: 'bossRoom' }));
        }
    }
}
