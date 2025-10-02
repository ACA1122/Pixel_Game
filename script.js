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

    // Game State
    let selectedCharacterName = null;
    const characterImages = {};
    const obstacleImage = new Image();
    const bossImage = new Image();
    let player;
    let obstacles = []; // This will hold both goblins and bosses
    let frame = 0;
    let gameRunning = false;
    let lives = 3;
    let invincibilityFrames = 0;

    // Game Constants
    const GRAVITY = 0.6;
    const JUMP_FORCE = -15;
    const PLAYER_WIDTH = 80;
    const PLAYER_HEIGHT = 80;
    const OBJECT_SPEED = 5;
    const INVINCIBILITY_DURATION = 120; // 2 seconds at 60fps

    // Initial Setup
    gameOverScreen.classList.add('hidden');

    // Image Loading
    const characters = ['assassin', 'cleric', 'warrior', 'mage', 'idol'];
    let imagesLoaded = 0;
    const totalImages = characters.length + 2; // +2 for goblin and boss

    characters.forEach(char => {
        const img = new Image();
        img.src = `${char}.png`;
        characterImages[char] = img;
        img.onload = () => { imagesLoaded++; };
    });

    obstacleImage.src = 'goblen.png';
    obstacleImage.onload = () => { imagesLoaded++; };
    bossImage.src = 'boss.png';
    bossImage.onload = () => { imagesLoaded++; };

    // Player Class
    class Player {
        constructor(x, y, image) {
            this.x = x;
            this.y = y;
            this.dy = 0;
            this.image = image;
            this.onGround = false;
            this.jumps = 2;
        }

        draw() {
            if (invincibilityFrames > 0 && frame % 10 < 5) {
                return; // Blinking effect
            }
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
            } else {
                this.onGround = false;
            }
            this.draw();
        }

        jump() {
            if (this.jumps > 0) {
                this.dy = JUMP_FORCE;
                this.jumps--;
            }
        }

        attack() {
            // Attack logic is not used against obstacles, but kept for potential future use
        }
    }

    // Obstacle Classes
    class MovingObject {
        constructor(x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }
        update() {
            this.x -= OBJECT_SPEED;
        }
    }

    class Goblin extends MovingObject {
        constructor() {
            const width = 90;
            const height = 90;
            const y = canvas.height - height;
            super(canvas.width, y, width, height);
        }
        draw() {
            ctx.drawImage(obstacleImage, this.x, this.y, this.width, this.height);
        }
    }

    class Boss extends MovingObject {
        constructor() {
            const width = 150;
            const height = 150;
            const y = canvas.height - height;
            super(canvas.width, y, width, height);
        }
        draw() {
            ctx.drawImage(bossImage, this.x, this.y, this.width, this.height);
        }
    }

    // Game Logic
    function handleSpawning() {
        // Spawn something every 100 frames, but only if there are not too many obstacles on screen
        if (frame % 100 === 0 && obstacles.length < 5) {
            if (Math.random() < 0.2) { // 20% chance to spawn a boss
                obstacles.push(new Boss());
            } else { // 80% chance to spawn a goblin
                obstacles.push(new Goblin());
            }
        }
    }

    function handleObjects() {
        obstacles.forEach(obj => {
            obj.update();
            obj.draw();
        });
        obstacles = obstacles.filter(o => o.x + o.width > 0);
    }

    function checkCollisions() {
        if (invincibilityFrames > 0) {
            invincibilityFrames--;
            return;
        }

        for (let i = 0; i < obstacles.length; i++) {
            const obj = obstacles[i];
            if (
                player.x < obj.x + obj.width &&
                player.x + PLAYER_WIDTH > obj.x &&
                player.y < obj.y + obj.height &&
                player.y + PLAYER_HEIGHT > obj.y
            ) {
                lives--;
                updateHeartsDisplay();
                invincibilityFrames = INVINCIBILITY_DURATION;
                obstacles.splice(i, 1); // Remove the hit obstacle
                i--; // Adjust index after removal

                if (lives <= 0) {
                    gameOver();
                }
                return;
            }
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
        if (e.code === 'Space') {
            e.preventDefault();
            player.jump();
        }
    });

    retryButton.addEventListener('click', () => {
        gameOverScreen.classList.add('hidden');
        resetGame();
    });

    characterCards.forEach(card => {
        card.addEventListener('click', () => {
            characterCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedCharacterName = card.dataset.character;
            startButton.classList.remove('hidden');
        });
    });

    startButton.addEventListener('click', () => {
        if (selectedCharacterName) {
            // Wait for all images to load
            if (imagesLoaded >= totalImages) {
                startGame(selectedCharacterName);
            } else {
                const interval = setInterval(() => {
                    if (imagesLoaded >= totalImages) {
                        clearInterval(interval);
                        startGame(selectedCharactername);
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
        frame = 0;
        lives = 3;
        invincibilityFrames = 0;
    }

    function startGame(characterName) {
        selectedCharacterName = characterName;

        startScreen.classList.add('hidden');
        gameContainer.classList.remove('hidden');

        canvas.width = 1280;
        canvas.height = 720;

        const playerImage = characterImages[selectedCharacterName];
        player = new Player(100, canvas.height - PLAYER_HEIGHT, playerImage);
        
        lives = 3;
        updateHeartsDisplay();
        invincibilityFrames = 0;
        frame = 0;
        obstacles = [];

        gameRunning = true;
        gameLoop();
    }
});
