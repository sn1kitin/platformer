const config = {
    type: Phaser.AUTO,
    width:  800,
    height: 520,           // 60px UI zone + 460px map (40×23 tiles × 16px × 1.25)
    backgroundColor: '#211f30',
    pixelArt: true,
    antialias: false,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 900 },
            debug: false
        }
    },
    scene: [BootScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);
