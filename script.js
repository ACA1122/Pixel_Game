document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const characterCards = document.querySelectorAll('.character-card');
    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.getElementById('game-container');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const heartsContainer = document.getElementById('hearts-container');
    const gameOverScreen = document.getElementById('game-over-screen');
    const retryButton = document.getElementById('retry-button');
    const startButton = document.getElementById('start-button');
    const bgm = document.getElementById('bgm');

    // Game State
    let selectedCharacterName = null;
    let isMusicPlaying = false;
    const characterImages = {};
    const obstacleImage = new Image();
    const bossImage = new Image();
    const itemImage = new Image();
    const mapImages = { 2: new Image(), 3: new Image(), 4: new Image() };
    let player;
    let obstacles = [];
    let items = [];
    let frame = 0;
    let gameRunning = false;
    let lives = 3;
    let score = 0;
    let level = 1;
    let invincibilityFrames = 0;

    // Game Constants
    const GRAVITY = 0.5;
    const JUMP_FORCE = -15;
    const FAST_FALL_GRAVITY = 20;
    const PLAYER_WIDTH = 80;
    const PLAYER_HEIGHT = 80;
    const OBJECT_SPEED = 5;
    const INVINCIBILITY_DURATION = 120;
    const MAX_LIVES = 5;

    // Initial Setup
    gameOverScreen.classList.add('hidden');

    // Image Loading
    const characters = ['assassin', 'cleric', 'warrior', 'mage', 'idol'];
    let imagesLoaded = 0;
    const totalImages = characters.length + 6; // goblin, boss, item, map2, map3, map4

    const onImageLoad = () => { imagesLoaded++; };
    characters.forEach(char => {
        const img = new Image();
        img.src = `${char}.png`;
        characterImages[char] = img;
        img.onload = onImageLoad;
    });

    obstacleImage.src = 'goblen.png';
    obstacleImage.onload = onImageLoad;
    bossImage.src = 'boss.png';
    bossImage.onload = onImageLoad;
    itemImage.src = 'item.png';
    itemImage.onload = onImageLoad;
    mapImages[2].src = 'map2.jpg';
    mapImages[2].onload = onImageLoad;
    mapImages[3].src = 'map3.jpg';
    mapImages[3].onload = onImageLoad;
    mapImages[4].src = 'map4.jpg';
    mapImages[4].onload = onImageLoad;

    // Player Class
    class Player {
        constructor(x, y, image) {
            this.x = x; this.y = y; this.dy = 0; this.image = image; this.onGround = false; this.jumps = 2;
        }
        draw() {
            if (invincibilityFrames > 0 && frame % 10 < 5) { return; }
            ctx.drawImage(this.image, this.x, this.y, PLAYER_WIDTH, PLAYER_HEIGHT);
        }
        update() {
            this.dy += GRAVITY;
            this.y += this.dy;
            if (this.y + PLAYER_HEIGHT > canvas.height) {
                this.y = canvas.height - PLAYER_HEIGHT;
                this.dy = 0;
                if (!this.onGround) this.jumps = 2;
                this.onGround = true;
            } else { this.onGround = false; }
            this.draw();
        }
        jump() { if (this.jumps > 0) { this.dy = JUMP_FORCE; this.jumps--; } }
        fastFall() { if (!this.onGround) { this.dy = FAST_FALL_GRAVITY; } }
    }

    // Moving Object Classes
    class MovingObject {
        constructor(x, y, width, height) {
            this.x = x; this.y = y; this.width = width; this.height = height;
        }
        update() { this.x -= OBJECT_SPEED; }
    }

    class Goblin extends MovingObject {
        constructor(x = canvas.width, y = null) {
            const size = 90;
            const finalY = y === null ? canvas.height - size : y;
            super(x, finalY, size, size);
            this.scored = false;
        }
        draw() { ctx.drawImage(obstacleImage, this.x, this.y, this.width, this.height); }
    }

    class Boss extends MovingObject {
        constructor(x = canvas.width, y = null) {
            const size = 150;
            const finalY = y === null ? canvas.height - size : y;
            super(x, finalY, size, size);
            this.scored = false;
        }
        draw() { ctx.drawImage(bossImage, this.x, this.y, this.width, this.height); }
    }

    class Item extends MovingObject {
        constructor() {
            const size = 50;
            const y = canvas.height - size - (Math.random() * 200 + 50);
            super(canvas.width, y, size, size);
        }
        draw() { ctx.drawImage(itemImage, this.x, this.y, this.width, this.height); }
    }

    // Game Logic
    function handleSpawning() {
        if (frame % 130 !== 0 || obstacles.length > 4) return;
        const spawnChoice = Math.random();
        if (spawnChoice < 0.15) {
            const y1 = canvas.height - 90 - 180;
            const obs1 = new Goblin(canvas.width, y1);
            obstacles.push(obs1);
            const x2 = obs1.x + obs1.width + 60;
            obstacles.push(new Goblin(x2));
        } else if (spawnChoice < 0.35) {
            const obs1 = new Goblin();
            obstacles.push(obs1);
            const x2 = obs1.x + obs1.width + 80;
            const y2 = canvas.height - obs1.height - 120;
            obstacles.push(new Goblin(x2, y2));
        } else if (spawnChoice < 0.55) {
            const obs1 = new Goblin();
            obstacles.push(obs1);
            const gap = 120;
            const obs2X = obs1.x + obs1.width + gap;
            obstacles.push(new Goblin(obs2X));
        } else if (spawnChoice < 0.70) {
            obstacles.push(new Boss());
        } else {
            obstacles.push(new Goblin());
        }
        if (frame > 500 && frame % 300 === 0) {
            if (Math.random() < 0.38) { // 38% chance
                items.push(new Item());
            }
        }
    }

    function handleObjects() {
        [...obstacles, ...items].forEach(obj => { obj.update(); obj.draw(); });
        obstacles.forEach(obj => {
            if (!obj.scored && obj.x + obj.width < player.x) {
                score++;
                obj.scored = true;
            }
        });
        obstacles = obstacles.filter(o => o.x + o.width > 0);
        items = items.filter(i => i.x + i.width > 0);
    }

    function checkCollisions() {
        const hitboxPadding = selectedCharacterName === 'idol' ? 15 : 0;
        if (invincibilityFrames > 0) {
            invincibilityFrames--;
        } else {
            for (let i = 0; i < obstacles.length; i++) {
                const obj = obstacles[i];
                if (player.x + hitboxPadding < obj.x + obj.width &&
                    player.x + PLAYER_WIDTH - hitboxPadding > obj.x &&
                    player.y + hitboxPadding < obj.y + obj.height &&
                    player.y + PLAYER_HEIGHT - hitboxPadding > obj.y) {
                    lives--;
                    updateHeartsDisplay();
                    invincibilityFrames = INVINCIBILITY_DURATION;
                    obstacles.splice(i, 1);
                    i--;
                    if (lives <= 0) gameOver();
                    return;
                }
            }
        }
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (player.x < item.x + item.width && player.x + PLAYER_WIDTH > item.x &&
                player.y < item.y + item.height && player.y + PLAYER_HEIGHT > item.y) {
                if (lives < MAX_LIVES) {
                    lives++;
                    updateHeartsDisplay();
                }
                items.splice(i, 1);
                i--;
            }
        }
    }

    function handleLevelProgression() {
        const scoreThreshold = 20;
        if (level === 1 && score >= scoreThreshold) {
            level++;
            canvas.style.backgroundImage = `url('map2.jpg')`;
        } else if (level === 2 && score >= scoreThreshold * 2) {
            level++;
            canvas.style.backgroundImage = `url('map3.jpg')`;
        } else if (level === 3 && score >= scoreThreshold * 3) {
            level++;
            canvas.style.backgroundImage = `url('map4.jpg')`;
        }
    }

    function updateHeartsDisplay() {
        heartsContainer.innerHTML = '';
        for (let i = 0; i < lives; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart';
            heartsContainer.appendChild(heart);
        }
    }

    function gameOver() {
        gameRunning = false;
        gameOverScreen.classList.remove('hidden');
    }

    // Event Listeners
    window.addEventListener('keydown', (e) => {
        if (!gameRunning || !player) return;
        if (e.code === 'Space') { e.preventDefault(); player.jump(); }
        if (e.code === 'ArrowDown') { e.preventDefault(); player.fastFall(); }
    });
    retryButton.addEventListener('click', () => {
        gameOverScreen.classList.add('hidden');
        resetGame();
    });
    characterCards.forEach(card => {
        card.addEventListener('click', () => {
            if (!isMusicPlaying) {
                bgm.volume = 0.5;
                bgm.play().catch(e => console.error("BGM play failed:", e));
                isMusicPlaying = true;
            }
            characterCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedCharacterName = card.dataset.character;
            startButton.classList.remove('hidden');
        });
    });
    startButton.addEventListener('click', () => {
        if (selectedCharacterName) {
            if (imagesLoaded >= totalImages) {
                startGame(selectedCharacterName);
            } else {
                const interval = setInterval(() => {
                    if (imagesLoaded >= totalImages) {
                        clearInterval(interval);
                        startGame(selectedCharacterName);
                    }
                }, 100);
            }
        }
    });

    // Game Loop
    function gameLoop() {
        if (!gameRunning) return;
        requestAnimationFrame(gameLoop);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        frame++;
        handleSpawning();
        handleObjects();
        player.update();
        checkCollisions();
        handleLevelProgression();
    }

    // Game Start/Reset
    function resetGame() {
        startScreen.classList.remove('hidden');
        gameContainer.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        startButton.classList.add('hidden');
        characterCards.forEach(c => c.classList.remove('selected'));
        selectedCharacterName = null;
        gameRunning = false;
        obstacles = [];
        items = [];
        frame = 0;
        lives = 3;
        score = 0;
        level = 1;
        invincibilityFrames = 0;
        canvas.style.backgroundImage = `url('forest.png')`;
    }

    function startGame(characterName) {
        resetGame();
        startScreen.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        selectedCharacterName = characterName;
        canvas.width = 1280;
        canvas.height = 720;
        const playerImage = characterImages[selectedCharacterName];
        player = new Player(100, canvas.height - PLAYER_HEIGHT, playerImage);
        updateHeartsDisplay();
        gameRunning = true;
        gameLoop();
    }
});
