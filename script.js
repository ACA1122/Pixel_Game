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
    let player;
    let obstacles = [];
    let monsters = [];
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
    const totalImages = characters.length + 1; // +1 for the goblin

    characters.forEach(char => {
        const img = new Image();
        img.src = `${char}.png`;
        characterImages[char] = img;
        img.onload = () => { imagesLoaded++; };
    });

    obstacleImage.src = 'goblen.png';
    obstacleImage.onload = () => { imagesLoaded++; };

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
            const attackX = this.x + PLAYER_WIDTH / 2;
            const attackY = this.y + PLAYER_HEIGHT / 2;
            const attackRadius = 50;

            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(attackX, attackY, attackRadius, 0, Math.PI * 2);
            ctx.fill();

            monsters = monsters.filter(monster => {
                const distance = Math.sqrt(Math.pow(monster.x - attackX, 2) + Math.pow(monster.y - attackY, 2));
                return distance > attackRadius;
            });
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

    class Obstacle extends MovingObject {
        constructor() {
            const width = 60;
            const height = 60;
            const y = canvas.height - height;
            super(canvas.width, y, width, height);
        }
        draw() {
            ctx.drawImage(obstacleImage, this.x, this.y, this.width, this.height);
        }
    }

    // Game Logic
    function handleSpawning() {
        if (frame % 100 === 0) {
            obstacles.push(new Obstacle());
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
        if (e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            player.attack();
        }
    });

    retryButton.addEventListener('click', () => {
        gameOverScreen.classList.add('hidden');
        resetGame();
    });

    characterCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove 'selected' from all cards
            characterCards.forEach(c => c.classList.remove('selected'));
            // Add 'selected' to the clicked card
            card.classList.add('selected');
            selectedCharacterName = card.dataset.character;
            // Show the start button
            startButton.classList.remove('hidden');
        });
    });

    startButton.addEventListener('click', () => {
        if (selectedCharacterName) {
            if (imagesLoaded === totalImages) {
                startGame(selectedCharacterName);
            } else {
                // Fallback if images are still loading
                const interval = setInterval(() => {
                    if (imagesLoaded === totalImages) {
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
        monsters = [];
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
        monsters = [];

        gameRunning = true;
        gameLoop();
    }
});