const BOSS_LEFT  = 70;
const BOSS_RIGHT = 740;

class Boss extends Phaser.Physics.Arcade.Sprite {

    constructor(scene, x, y) {
        super(scene, x, y, 'boss-idle');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.scene = scene;

        this.state  = 'idle';
        this.dir    = 1;   // 1 = right, -1 = left
        this.invuln = false;

        this.setScale(2.2);
        this.setDepth(12);
        this.body.setSize(28, 34);
        this.setCollideWorldBounds(false);
        this.play('boss-idle');
    }

    init() {
        this.scene.physics.add.collider(this, this.scene.tilemapLayer);

        // check every frame if the player is touching the boss
        this.scene.physics.add.overlap(this.scene.player, this, () => {
            if (this.scene.player.invuln || this.invuln || this.scene.resultShown) return;
            // if the player jumped on top it's a stomp, otherwise they take damage
            if (this.scene.player.y < this.y - 8 && this.scene.player.body.velocity.y > 30) {
                this.stomp();
            } else {
                this.scene.damagePlayer();
            }
        });

        this.scene.ui.showGuideBanner('Defeat the boss! Jump on top of him!');
        this.scene.time.delayedCall(400, () => this.startIdle());
    }

    startIdle() {
        this.state = 'idle';
        this.setVelocityX(0);
        this.play('boss-idle', true);
        // wait a random amount of time then charge
        this.scene.time.delayedCall(Phaser.Math.Between(700, 1400), () => {
            if (this.state === 'idle') this.startCharge();
        });
    }

    startCharge() {
        this.state = 'charging';
        // boss gets faster as it loses hp
        const speed = 340 + (5 - (this.scene.registry.get('bossHP') || 5)) * 30;
        this.setVelocityX(this.dir * speed);
        this.setFlipX(this.dir < 0);
    }

    update() {
        if (this.state !== 'charging') return;
        // check if the boss reached the edge of the arena
        if (this.dir === 1  && this.x >= BOSS_RIGHT) this.hitWall();
        if (this.dir === -1 && this.x <= BOSS_LEFT)  this.hitWall();
    }

    hitWall() {
        this.state = 'stunned';
        this.setVelocityX(0);
        // animation depends on which wall it hit
        const hitKey = this.dir === 1 ? 'boss-hit-b' : 'boss-hit-t';
        this.play(hitKey, true);
        this.scene.cameras.main.shake(200, 0.006);
        this.dir = this.dir * -1;
        this.scene.time.delayedCall(700, () => {
            if (this.state === 'stunned') this.startIdle();
        });
    }

    stomp() {
        this.invuln = true;

        this.play('boss-blink', true);
        this.once('animationcomplete', () => {
            if (this.state === 'charging') this.play('boss-idle', true);
        });

        // bounce the player upward after the stomp
        this.scene.player.body.setVelocityY(-380);

        let hp = (this.scene.registry.get('bossHP') || 5) - 1;
        if (hp < 0) hp = 0;
        this.scene.registry.set('bossHP', hp);
        this.scene.ui.spawnPopText(this.x, this.y - 30, '-1', '#ff6666');

        if (hp <= 0) {
            this.scene.time.delayedCall(300, () => this.scene.bossDefeated());
            return;
        }

        // after 600ms the boss can be stomped again
        this.scene.time.delayedCall(600, () => { this.invuln = false; });
    }
}
