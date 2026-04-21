class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        const W = MAP_W;

        this.txtLevel = this.add.text(12, 10, 'LVL 1', {
            fontSize: '14px', fill: '#aaddff', fontFamily: 'monospace'
        }).setDepth(1);

        this.txtScore = this.add.text(12, 30, 'SCORE: 0', {
            fontSize: '14px', fill: '#aaddff', fontFamily: 'monospace'
        }).setDepth(1);

        // two styles — white for operators, yellow for numbers
        const exprStyle = { fontSize: '20px', fill: '#ffffff', fontFamily: 'monospace',
                            stroke: '#000000', strokeThickness: 4 };
        const boxStyle  = { fontSize: '20px', fill: '#ffdd44', fontFamily: 'monospace',
                            stroke: '#000000', strokeThickness: 4 };

        const cy = UI_H / 2 - 2;
        this.txtNum1   = this.add.text(W / 2 - 120, cy, '?', boxStyle) .setDepth(1).setOrigin(0.5);
        this.txtOp     = this.add.text(W / 2 -  60, cy, '?', exprStyle).setDepth(1).setOrigin(0.5);
        this.txtNum2   = this.add.text(W / 2 +   0, cy, '?', boxStyle) .setDepth(1).setOrigin(0.5);
        this.txtEquals = this.add.text(W / 2 +  52, cy, '=', exprStyle).setDepth(1).setOrigin(0.5);
        this.txtAnswer = this.add.text(W / 2 + 112, cy, '?', boxStyle) .setDepth(1).setOrigin(0.5);

        this.txtHP = this.add.text(W - 12, UI_H / 2, '♥ ♥ ♥', {
            fontSize: '18px', fill: '#ff4466', fontFamily: 'monospace'
        }).setDepth(1).setOrigin(1, 0.5);

        // boss bar is hidden until the boss phase starts
        this.bossHPContainer = this.add.container(W / 2, 50).setDepth(1).setVisible(false);
        const bossLabel  = this.add.text(0, 0, 'BOSS', {
            fontSize: '11px', fill: '#ff8888', fontFamily: 'monospace'
        }).setOrigin(0.5);
        this.bossBarBg   = this.add.rectangle(50, 0, 100, 10, 0x440000).setOrigin(0, 0.5);
        this.bossBarFill = this.add.rectangle(50, 0, 100, 10, 0xff2222).setOrigin(0, 0.5);
        this.bossHPContainer.add([bossLabel, this.bossBarBg, this.bossBarFill]);

        this.guideBanner = this.add.text(W / 2, UI_H + 40, '', {
            fontSize: '17px', fill: '#ffff88',
            stroke: '#000000', strokeThickness: 4
        }).setDepth(25).setOrigin(0.5).setVisible(false);

        this.hintText = this.add.text(0, 0, 'E – open', {
            fontSize: '11px', fill: '#ffffff',
            stroke: '#000000', strokeThickness: 3,
            backgroundColor: '#00000066', padding: { x: 4, y: 2 }
        }).setDepth(20).setOrigin(0.5, 1).setVisible(false);

        // listen for any registry change and refresh everything
        this.registry.events.on('changedata', this.onRegistryChange, this);
        this.events.on('shutdown', () => {
            this.registry.events.off('changedata', this.onRegistryChange, this);
        });

        this.refreshAll();
    }

    onRegistryChange() {
        this.refreshAll();
    }

    refreshAll() {
        const num1   = this.registry.get('num1');
        const op     = this.registry.get('op');
        const num2   = this.registry.get('num2');
        const ans    = this.registry.get('playerAnswer');
        const lvl    = this.registry.get('level')    || 1;
        const score  = this.registry.get('score')    || 0;
        const phase  = this.registry.get('gamePhase') || 'collect_num1';

        // cant use || here because 0 hp is valid and 0 || 3 would give 3
        let hp = this.registry.get('playerHP');
        if (hp === null || hp === undefined) hp = 3;

        let bossHP = this.registry.get('bossHP');
        if (bossHP === null || bossHP === undefined) bossHP = 5;

        this.txtLevel.setText('LVL ' + lvl);
        this.txtScore.setText('SCORE: ' + score);
        this.txtNum1.setText(num1 !== null ? String(num1) : '?');
        this.txtOp.setText(op !== null ? (op === '/' ? '÷' : op) : '?');
        this.txtNum2.setText(num2 !== null ? String(num2) : '?');
        this.txtAnswer.setText(ans !== null ? String(ans) : '?');

        let hearts = '';
        for (let i = 0; i < hp; i++) {
            hearts += '♥ ';
        }
        this.txtHP.setText(hearts.trim());

        const showBoss = (phase === 'boss');
        this.bossHPContainer.setVisible(showBoss);
        if (showBoss) {
            this.bossBarFill.width = 100 * (bossHP / 5);
        }
    }

    showGuideBanner(msg) {
        if (!this.guideBanner) return;
        this.guideBanner.setText(msg).setVisible(true).setAlpha(1);
        // kill any running tween first so it doesn't interfere
        this.tweens.killTweensOf(this.guideBanner);
        this.tweens.add({
            targets: this.guideBanner, alpha: 0,
            delay: 2500, duration: 500,
            onComplete: () => this.guideBanner.setVisible(false)
        });
    }

    showHint(worldX, worldY) {
        if (!this.hintText) return;
        this.hintText.setPosition(worldX, worldY + UI_H - 30).setVisible(true);
    }

    hideHint() {
        if (!this.hintText) return;
        this.hintText.setVisible(false);
    }

    spawnPopText(worldX, worldY, text, color) {
        if (!this.guideBanner) return;
        const sy = worldY + UI_H;
        const t = this.add.text(worldX, sy - 20, text, {
            fontSize: '20px', fill: color,
            stroke: '#000000', strokeThickness: 4, fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(25);
        // float upward and fade out then destroy so it doesn't pile up
        this.tweens.add({
            targets: t, y: sy - 70, alpha: 0, duration: 1200, ease: 'Cubic.Out',
            onComplete: () => t.destroy()
        });
    }

    showBossResult(line1, line2, isCorrect) {
        const cy = UI_H + MAP_H / 2;

        const t1 = this.add.text(MAP_W / 2, cy - 20, line1, {
            fontSize: '22px', fill: '#ffdd44',
            stroke: '#000000', strokeThickness: 5, fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(25).setAlpha(0);

        const color2 = isCorrect ? '#44ff88' : '#ff5555';
        const t2 = this.add.text(MAP_W / 2, cy + 20, line2, {
            fontSize: '22px', fill: color2,
            stroke: '#000000', strokeThickness: 5, fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(25).setAlpha(0);

        this.tweens.add({ targets: t1, alpha: 1, duration: 300, ease: 'Cubic.Out' });
        this.tweens.add({ targets: t2, alpha: 1, duration: 300, ease: 'Cubic.Out' });

        this.tweens.add({
            targets: t1, alpha: 0, delay: 4000, duration: 500, ease: 'Cubic.In',
            onComplete: () => t1.destroy()
        });
        this.tweens.add({
            targets: t2, alpha: 0, delay: 4000, duration: 500, ease: 'Cubic.In',
            onComplete: () => t2.destroy()
        });
    }
}
