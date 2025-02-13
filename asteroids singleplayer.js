class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    multiply(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }
}

class ShipDebris {
    constructor(pos, angle) {
        this.pos = pos;
        this.velocity = new Vector(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        );
        this.angle = angle;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.life = 60; // Debris disappears after 60 frames
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-5, -5);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.strokeStyle = 'white';
        ctx.stroke();
        
        ctx.restore();
    }

    update() {
        this.pos = this.pos.add(this.velocity);
        this.angle += this.rotationSpeed;
        this.life--;

        // Wrap around screen
        if (this.pos.x > canvas.width) this.pos.x = 0;
        if (this.pos.x < 0) this.pos.x = canvas.width;
        if (this.pos.y > canvas.height) this.pos.y = 0;
        if (this.pos.y < 0) this.pos.y = canvas.height;
    }
}

class Ship {
    constructor(pos) {
        this.pos = pos;
        this.velocity = new Vector(0, 0);
        this.angle = 0;
        this.size = 20; // Base size
        this.thrust = false;
        this.bullets = [];
        this.lives = 3;  // Add lives
        this.score = 0;  // Add score
        this.invulnerable = 0;  // Invulnerability frames after death
        this.debris = [];
        this.respawnTimer = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        
        // Draw ship (2:1 aspect ratio)
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size/2, -this.size/2);
        ctx.lineTo(-this.size/2, this.size/2);
        ctx.closePath();
        ctx.strokeStyle = 'white';
        ctx.stroke();

        // Draw thrust if active
        if (this.thrust) {
            ctx.beginPath();
            ctx.moveTo(-this.size/2, 0);
            ctx.lineTo(-this.size, -this.size/4);
            ctx.lineTo(-this.size, this.size/4);
            ctx.strokeStyle = 'orange';
            ctx.stroke();
        }
        
        ctx.restore();
    }

    update() {
        this.pos = this.pos.add(this.velocity);
        this.velocity = this.velocity.multiply(0.99); // Friction

        // Wrap around screen
        if (this.pos.x > canvas.width) this.pos.x = 0;
        if (this.pos.x < 0) this.pos.x = canvas.width;
        if (this.pos.y > canvas.height) this.pos.y = 0;
        if (this.pos.y < 0) this.pos.y = canvas.height;

        // Update bullets
        this.bullets = this.bullets.filter(bullet => bullet.life > 0);
        this.bullets.forEach(bullet => bullet.update());
    }

    shoot() {
        const direction = new Vector(Math.cos(this.angle), Math.sin(this.angle));
        const bulletPos = this.pos.add(direction.multiply(this.size));
        this.bullets.push(new Bullet(bulletPos, direction));
    }

    reset() {
        this.pos = new Vector(canvas.width/2, canvas.height/2);
        this.velocity = new Vector(0, 0);
        this.angle = 0;
        this.thrust = false;
        this.invulnerable = 60;  // 1 second of invulnerability
    }

    explode() {
        // Create 3 debris pieces
        for (let i = 0; i < 3; i++) {
            this.debris.push(new ShipDebris(this.pos, this.angle + (i * Math.PI * 2 / 3)));
        }
        this.respawnTimer = 120; // 2 seconds before respawning
    }
}

class Bullet {
    constructor(pos, direction) {
        this.pos = pos;
        this.velocity = direction.multiply(7);
        this.life = 60; // Frames until bullet disappears
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    update() {
        this.pos = this.pos.add(this.velocity);
        this.life--;

        // Wrap around screen
        if (this.pos.x > canvas.width) this.pos.x = 0;
        if (this.pos.x < 0) this.pos.x = canvas.width;
        if (this.pos.y > canvas.height) this.pos.y = 0;
        if (this.pos.y < 0) this.pos.y = canvas.height;
    }
}

class Asteroid {
    constructor(pos, size) {
        this.pos = pos;
        this.size = size;
        this.velocity = new Vector(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        );
        this.points = this.generatePoints();
    }

    generatePoints() {
        const points = [];
        const segments = 10;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const radius = this.size * (0.75 + Math.random() * 0.5);
            points.push(new Vector(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius
            ));
        }
        return points;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'white';
        ctx.stroke();
        
        ctx.restore();
    }

    update() {
        this.pos = this.pos.add(this.velocity);

        // Wrap around screen
        if (this.pos.x > canvas.width) this.pos.x = 0;
        if (this.pos.x < 0) this.pos.x = canvas.width;
        if (this.pos.y > canvas.height) this.pos.y = 0;
        if (this.pos.y < 0) this.pos.y = canvas.height;
    }

    split() {
        if (this.size < 20) return []; // Too small to split
        
        const newSize = this.size / 2;
        return [
            new Asteroid(this.pos, newSize),
            new Asteroid(this.pos, newSize)
        ];
    }

    checkCollision(point) {
        const distance = Math.sqrt(
            Math.pow(this.pos.x - point.x, 2) +
            Math.pow(this.pos.y - point.y, 2)
        );
        return distance < this.size;
    }
}

// Game setup and main loop
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;
document.body.appendChild(canvas);

const ship = new Ship(new Vector(canvas.width/2, canvas.height/2));
let asteroids = [];

// Create initial asteroids
for (let i = 0; i < 5; i++) {
    asteroids.push(new Asteroid(
        new Vector(Math.random() * canvas.width, Math.random() * canvas.height),
        50
    ));
}

// Input handling
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

function gameLoop() {
    // Clear screen
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw lives and score
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Lives: ${ship.lives}  Score: ${ship.score}`, 20, 30);

    if (ship.lives <= 0) {
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.fillText('GAME OVER - Press R to Restart', canvas.width/2 - 200, canvas.height/2);
        if (keys['r']) {
            ship.lives = 3;
            ship.score = 0;
            ship.reset();
            asteroids = [];
            for (let i = 0; i < 5; i++) {
                asteroids.push(new Asteroid(
                    new Vector(Math.random() * canvas.width, Math.random() * canvas.height),
                    50
                ));
            }
        }
        requestAnimationFrame(gameLoop);
        return;
    }

    // Handle input
    if (keys['ArrowLeft']) ship.angle -= 0.1;
    if (keys['ArrowRight']) ship.angle += 0.1;
    if (keys['ArrowUp']) {
        ship.thrust = true;
        const thrust = new Vector(Math.cos(ship.angle), Math.sin(ship.angle));
        ship.velocity = ship.velocity.add(thrust.multiply(0.2));
    } else {
        ship.thrust = false;
    }
    if (keys[' ']) {
        if (!keys.shootCooldown) {
            ship.shoot();
            keys.shootCooldown = true;
            setTimeout(() => keys.shootCooldown = false, 250);
        }
    }

    // Update game objects
    ship.update();
    if (ship.invulnerable > 0) ship.invulnerable--;
    asteroids.forEach(asteroid => asteroid.update());

    // Check collisions
    let newAsteroids = [];
    asteroids = asteroids.filter(asteroid => {
        let hit = false;
        ship.bullets = ship.bullets.filter(bullet => {
            if (asteroid.checkCollision(bullet.pos)) {
                hit = true;
                ship.score += 100;
                return false;
            }
            return true;
        });
        if (hit) {
            newAsteroids.push(...asteroid.split());
            return false;
        }
        // Check ship collision when not invulnerable
        if (!ship.invulnerable && !ship.respawnTimer && asteroid.checkCollision(ship.pos)) {
            ship.lives--;
            ship.explode();
            if (ship.lives <= 0) {
                ship.respawnTimer = 0; // Don't respawn if game over
            }
        }
        return true;
    });
    asteroids.push(...newAsteroids);

    // Update and draw debris
    ship.debris = ship.debris.filter(d => d.life > 0);
    ship.debris.forEach(d => {
        d.update();
        d.draw(ctx);
    });

    // Handle respawn timer
    if (ship.respawnTimer > 0) {
        ship.respawnTimer--;
        if (ship.respawnTimer === 0 && ship.lives > 0) {
            ship.reset();
        }
    }

    // Only draw ship if not waiting to respawn
    if (!ship.respawnTimer) {
        ship.draw(ctx);
    }

    // Draw bullets
    ship.bullets.forEach(bullet => bullet.draw(ctx));
    asteroids.forEach(asteroid => asteroid.draw(ctx));

    requestAnimationFrame(gameLoop);
}

gameLoop(); 