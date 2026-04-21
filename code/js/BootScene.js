class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;
        const B = 'img/';

        // Player
        this.load.spritesheet('p-idle',  B + 'Main Characters/Ninja Frog/Idle (32x32).png',        { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('p-run',   B + 'Main Characters/Ninja Frog/Run (32x32).png',         { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('p-jump',  B + 'Main Characters/Ninja Frog/Jump (32x32).png',        { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('p-fall',  B + 'Main Characters/Ninja Frog/Fall (32x32).png',        { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('p-hit',   B + 'Main Characters/Ninja Frog/Hit (32x32).png',         { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('p-djump', B + 'Main Characters/Ninja Frog/Double Jump (32x32).png', { frameWidth: 32, frameHeight: 32 });

        // Chests / Boxes
        this.load.spritesheet('box1-idle', B + 'Items/Boxes/Box1/Idle.png',        { frameWidth: 28, frameHeight: 24 });
        this.load.spritesheet('box1-hit',  B + 'Items/Boxes/Box1/Hit (28x24).png', { frameWidth: 28, frameHeight: 24 });
        this.load.spritesheet('box2-idle', B + 'Items/Boxes/Box2/Idle.png',        { frameWidth: 28, frameHeight: 24 });
        this.load.spritesheet('box2-hit',  B + 'Items/Boxes/Box2/Hit (28x24).png', { frameWidth: 28, frameHeight: 24 });
        this.load.spritesheet('box3-idle', B + 'Items/Boxes/Box3/Idle.png',        { frameWidth: 28, frameHeight: 24 });
        this.load.spritesheet('box3-hit',  B + 'Items/Boxes/Box3/Hit (28x24).png', { frameWidth: 28, frameHeight: 24 });

        // Traps / Obstacles 
        this.load.image('spikes', B + 'Traps/Spikes/Idle.png');

        // Boss
        this.load.spritesheet('boss-idle',  B + 'Traps/Rock Head/Idle.png',               { frameWidth: 42, frameHeight: 42 });
        this.load.spritesheet('boss-blink', B + 'Traps/Rock Head/Blink (42x42).png',      { frameWidth: 42, frameHeight: 42 });
        this.load.spritesheet('boss-hit-b', B + 'Traps/Rock Head/Bottom Hit (42x42).png', { frameWidth: 42, frameHeight: 42 });
        this.load.spritesheet('boss-hit-t', B + 'Traps/Rock Head/Top Hit (42x42).png',    { frameWidth: 42, frameHeight: 42 });

        // Terrain
        this.load.image('terrain-tiles', B + 'Terrain/Terrain (16x16).png');


        // Tilemaps 
        this.load.tilemapTiledJSON('room1',      'js/levels/room1.json');
        this.load.tilemapTiledJSON('answerRoom', 'js/levels/answerRoom.json');
        this.load.tilemapTiledJSON('bossRoom',   'js/levels/bossRoom.json');

        // Background
        this.load.image('bg', B + 'Background/Pink.png');
    }

    create() {
        // Init shared registry
        this.registry.set('num1',          null);
        this.registry.set('op',            null);
        this.registry.set('num2',          null);
        this.registry.set('playerAnswer',  null);
        this.registry.set('correctAnswer', null);
        this.registry.set('gamePhase',     'collect_num1');
        this.registry.set('bossHP',        5);
        this.registry.set('playerHP',      3);
        this.registry.set('score',         0);
        this.registry.set('level',         1);

        this.scene.start('GameScene');
        this.scene.launch('UIScene');
    }
}
