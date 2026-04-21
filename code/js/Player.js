class Player extends Phaser.Physics.Arcade.Sprite {

    constructor(scene, x, y) {
        super(scene, x, y, 'p-idle');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.scene = scene;

        // scaled up a bit so it's easier to see
        this.setScale(1.7);
        this.body.setSize(16, 26);
        this.setDepth(15);
        this.setCollideWorldBounds(false);
        this.play('p-idle');

        this.hasDoubleJump = true;
        this.jumpPrev      = false;

        const kb = scene.input.keyboard;
        this.cursors = kb.createCursorKeys();
        // wasd as an alternative to arrow keys
        this.keyW    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        // without this the browser scrolls the page when you press arrow keys
        kb.addCapture([
            Phaser.Input.Keyboard.KeyCodes.UP,    Phaser.Input.Keyboard.KeyCodes.DOWN,
            Phaser.Input.Keyboard.KeyCodes.LEFT,  Phaser.Input.Keyboard.KeyCodes.RIGHT,
            Phaser.Input.Keyboard.KeyCodes.SPACE, Phaser.Input.Keyboard.KeyCodes.W,
            Phaser.Input.Keyboard.KeyCodes.A,     Phaser.Input.Keyboard.KeyCodes.S,
            Phaser.Input.Keyboard.KeyCodes.D,
        ]);
    }

    update() {
        const body    = this.body;
        const left    = this.cursors.left.isDown  || this.keyA.isDown;
        const right   = this.cursors.right.isDown || this.keyD.isDown;
        const onFloor = body.blocked.down;

        // jump only fires on the frame the key is pressed, not while held
        const jumpHeld = this.cursors.up.isDown || this.keyW.isDown || this.cursors.space.isDown;
        const jump     = jumpHeld && !this.jumpPrev;
        this.jumpPrev  = jumpHeld;

        if (left)       { body.setVelocityX(-260); this.setFlipX(true);  }
        else if (right) { body.setVelocityX( 260); this.setFlipX(false); }
        else            { body.setVelocityX(0); }

        if (jump) {
            if (onFloor) {
                body.setVelocityY(-447);
                // reset double jump when landing
                this.hasDoubleJump = true;
            } else if (this.hasDoubleJump) {
                body.setVelocityY(-399);
                this.hasDoubleJump = false;
                this.play('p-djump', true);
            }
        }

        // restore double jump whenever on the ground
        if (onFloor) this.hasDoubleJump = true;

        // pick the right animation based on what's happening
        if (!onFloor) {
            const djumpPlaying = this.anims.isPlaying && this.anims.currentAnim && this.anims.currentAnim.key === 'p-djump';
            if      (body.velocity.y < -10 && !djumpPlaying) this.play('p-jump', true);
            else if (body.velocity.y >  10)                   this.play('p-fall', true);
        } else if (left || right) {
            this.play('p-run', true);
        } else {
            this.play('p-idle', true);
        }
    }

    damage(onDead) {
        if (this.invuln) return;
        this.invuln = true;

        let hp = (this.scene.registry.get('playerHP') || 3) - 1;
        if (hp < 0) hp = 0;
        this.scene.registry.set('playerHP', hp);
        this.play('p-hit', true);

        // flash the player to show they got hit
        this.scene.tweens.add({
            targets: this, alpha: 0.3, duration: 80,
            yoyo: true, repeat: 6,
            onComplete: () => { this.setAlpha(1); this.invuln = false; }
        });

        if (hp <= 0) {
            this.scene.time.delayedCall(300, onDead);
        }
    }
}
