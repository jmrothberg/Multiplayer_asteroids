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
    constructor(pos, angle, game) {
        this.pos = pos;
        this.angle = angle;
        this.game = game;
        this.velocity = new Vector((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.life = 60;
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
        if (this.pos.x > this.game.canvas.width) this.pos.x = 0;
        if (this.pos.x < 0) this.pos.x = this.game.canvas.width;
        if (this.pos.y > this.game.canvas.height) this.pos.y = 0;
        if (this.pos.y < 0) this.pos.y = this.game.canvas.height;
    }
}

class Ship {
    constructor(pos, game, isLocal = false) {
        this.pos = pos;
        this.game = game;
        this.velocity = new Vector(0, 0);
        this.angle = 0;
        this.size = 20;
        this.thrust = false;
        this.bullets = [];
        this.lives = 3;
        this.score = 0;
        this.invulnerable = 0;
        this.debris = [];
        this.respawnTimer = 0;
        this.isLocal = isLocal;
        this.id = null;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    }

    draw(ctx) {
        // If the ship is exploding, draw the debris and do not draw the ship.
        if (this.respawnTimer > 0) {
            this.debris.forEach(piece => piece.draw(ctx));
            return;
        }
    
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        
        // Draw the ship using the player's color.
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size/2, -this.size/2);
        ctx.lineTo(-this.size/2, this.size/2);
        ctx.closePath();
        ctx.strokeStyle = this.color;
        ctx.stroke();
    
        // Draw thrust if activated.
        if (this.thrust) {
            ctx.beginPath();
            ctx.moveTo(-this.size/2, 0);
            ctx.lineTo(-this.size, -this.size/4);
            ctx.lineTo(-this.size, this.size/4);
            ctx.strokeStyle = 'orange';
            ctx.stroke();
        }
        
        ctx.restore();
    
        // Draw player ID above the ship (only for non-local players). Use only first two letters.
        if (!this.isLocal && this.id) {
            ctx.fillStyle = this.color;
            ctx.font = '12px Arial';
            const shortId = this.id.toString().substring(0, 2);
            ctx.fillText(shortId, this.pos.x - 20, this.pos.y - 30);
        }
    
        // Draw bullets.
        this.bullets.forEach(bullet => bullet.draw(ctx));
    }

    update() {
        // For the local ship, if lives reach zero, simply stop updating.
        if (this.isLocal && this.lives <= 0) {
            return;
        }
    
        if (this.respawnTimer > 0) {
            this.respawnTimer--;
            this.debris.forEach(piece => piece.update());
            this.debris = this.debris.filter(piece => piece.life > 0);
            if (this.respawnTimer === 0 && this.lives > 0) {
                this.reset();
            }
            return; // Skip other updates while exploding.
        }

            if (this.invulnerable > 0) {
                this.invulnerable--;
            }

            // Regular movement and collision updates.
            this.pos = this.pos.add(this.velocity);
            this.velocity = this.velocity.multiply(0.99);

            if (this.pos.x > this.game.canvas.width) this.pos.x = 0;
            if (this.pos.x < 0) this.pos.x = this.game.canvas.width;
            if (this.pos.y > this.game.canvas.height) this.pos.y = 0;
            if (this.pos.y < 0) this.pos.y = this.game.canvas.height;

        this.bullets = this.bullets.filter(bullet => bullet.life > 0);
        this.bullets.forEach(bullet => bullet.update());
    }

    shoot() {
        const direction = new Vector(Math.cos(this.angle), Math.sin(this.angle));
        const bulletPos = this.pos.add(direction.multiply(this.size));
        this.bullets.push(new Bullet(bulletPos, direction, this.game));
    }

    reset() {
        this.pos = new Vector(this.game.canvas.width/2, this.game.canvas.height/2);
        this.velocity = new Vector(0, 0);
        this.angle = 0;
        this.thrust = false;
        this.invulnerable = 60;  // 1 second of invulnerability
    }

    explode() {
        // Create 3 debris pieces
        for (let i = 0; i < 3; i++) {
            this.debris.push(new ShipDebris(this.pos, this.angle + (i * Math.PI * 2 / 3), this.game));
        }
        this.respawnTimer = 120; // 2 seconds before respawning
    }
}

class Bullet {
    constructor(pos, direction, game) {
        this.pos = pos;
        this.game = game;
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
        if (this.pos.x > this.game.canvas.width) this.pos.x = 0;
        if (this.pos.x < 0) this.pos.x = this.game.canvas.width;
        if (this.pos.y > this.game.canvas.height) this.pos.y = 0;
        if (this.pos.y < 0) this.pos.y = this.game.canvas.height;
    }
}

class Asteroid {
    constructor(pos, size, game, seed) {
        this.pos = pos;                 // current (displayed) position
        this.targetPos = new Vector(pos.x, pos.y); // target position from server
        this.size = size;
        this.game = game;
        this.seed = seed;               // for deterministic shape generation
        this.velocity = new Vector(0, 0); // will be updated from server
        this.points = this.generateDeterministicPoints();
        this.id = null;
        this.hit = false;
        this.lastUpdateTime = performance.now();
        this.updateInterval = 50; // Assuming 50ms between server updates
        this.prevPos = new Vector(pos.x, pos.y); // Added for interpolation
    }

    // Called every frame on the client to smoothly move toward the target position.
    update(dt) {
        let now = performance.now();
        // Compute how far along we are between server updates (updateInterval is 50ms)
        let alpha = (now - this.lastUpdateTime) / this.updateInterval;
        if (alpha > 1) alpha = 1;  // Clamp

        // Calculate differences, but adjust for wrap-around.
        let dx = this.targetPos.x - this.prevPos.x;
        if (Math.abs(dx) > 400) { // if difference exceeds half the screen width (800/2)
            if (dx > 0) {
                dx -= 800;
            } else {
                dx += 800;
            }
        }
        
        let dy = this.targetPos.y - this.prevPos.y;
        if (Math.abs(dy) > 300) { // if difference exceeds half the screen height (600/2)
            if (dy > 0) {
                dy -= 600;
            } else {
                dy += 600;
            }
        }

        // Interpolate between previous and target positions
        let interpolatedX = this.prevPos.x + dx * alpha;
        let interpolatedY = this.prevPos.y + dy * alpha;

        // Wrap the interpolated value to remain within bounds.
        interpolatedX = ((interpolatedX % 800) + 800) % 800;
        interpolatedY = ((interpolatedY % 600) + 600) % 600;

        this.pos.x = interpolatedX;
        this.pos.y = interpolatedY;
    }

    // Generate shape deterministically (using the seed) instead of random values.
    generateDeterministicPoints() {
        const points = [];
        const segments = 10;
        // Using a simple seeded random generator (could be improved if needed)
        const random = this.seededRandom(this.seed);
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const factor = 0.75 + 0.5 * random();
            const radius = this.size * factor;
            points.push(new Vector(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius
            ));
        }
        return points;
    }

    // Trivial seeded random generator function.
    seededRandom(seed) {
        const a = 1664525, c = 1013904223, m = 4294967296;
        return function() {
            seed = (a * seed + c) % m;
            return seed / m;
        };
    }

    // Create an asteroid from server data.
    static fromServer(data, game) {
        const asteroid = new Asteroid(new Vector(data.x, data.y), data.size, game, data.seed);
        asteroid.id = data.id;
        asteroid.velocity = new Vector(data.velocity.x, data.velocity.y);
        asteroid.targetPos = new Vector(data.x, data.y);
        return asteroid;
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

    split() {
        if (this.size < 20) return []; // Too small to split
        
        const newSize = this.size / 2;
        return [
            new Asteroid(this.pos, newSize, this.game),
            new Asteroid(this.pos, newSize, this.game)
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

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.localShip = new Ship(new Vector(this.canvas.width/2, this.canvas.height/2), this, true);
        this.otherShips = new Map();
        this.asteroids = [];
        this.keys = {};
        this.networkManager = null;
        
        this.setupInputs();
    }

    setupInputs() {
        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            // Add reset handler
            if (e.key === 'r' || e.key === 'R') {
                if (this.networkManager) {
                    this.networkManager.sendReset();
                }
            }
            // Add leave game handler
            if (e.key === 'e' || e.key === 'E') {
                if (this.networkManager) {
                    this.networkManager.disconnect();
                }
            }
        });
        window.addEventListener('keyup', e => this.keys[e.key] = false);
    }

    setNetworkManager(networkManager) {
        this.networkManager = networkManager;
    }

    syncAsteroids(serverAsteroids) {
        const serverMap = {};
        serverAsteroids.forEach(ast => {
            serverMap[ast.id] = ast;
        });
        
        // Remove any local asteroids that the server no longer reports:
        this.asteroids = this.asteroids.filter(localAst => serverMap[localAst.id]);

        // For each asteroid received from server:
        serverAsteroids.forEach(serverAst => {
            const localAst = this.asteroids.find(a => a.id === serverAst.id);
            if (localAst) {
                // Shift the old target to become the previous position:
                localAst.prevPos.x = localAst.targetPos.x;
                localAst.prevPos.y = localAst.targetPos.y;
                // Update the target position from the server:
                localAst.targetPos.x = serverAst.x;
                localAst.targetPos.y = serverAst.y;
                // Also update velocity, if needed:
                localAst.velocity.x = serverAst.velocity.x;
                localAst.velocity.y = serverAst.velocity.y;
                // Reset the timestamp so interpolation starts anew:
                localAst.lastUpdateTime = performance.now();
            } else {
                // New asteroid from the server:
                this.asteroids.push(Asteroid.fromServer(serverAst, this));
            }
        });
    }

    handleAsteroidDestruction(asteroidId, newAsteroids = null) {
        this.asteroids = this.asteroids.filter(a => a.id !== asteroidId);
        if (newAsteroids && Array.isArray(newAsteroids)) {
            newAsteroids.forEach(ast => {
                this.asteroids.push(Asteroid.fromServer(ast, this));
            });
        }
    }

    update() {
        // If the local ship is dead, simply stop the game loop.
        if (this.localShip.lives <= 0) {
            console.log("Game Over!");
            return;
        }

        // Handle local ship input.
        if (this.keys['ArrowLeft']) this.localShip.angle -= 0.1;
        if (this.keys['ArrowRight']) this.localShip.angle += 0.1;
        if (this.keys['ArrowUp']) {
            this.localShip.thrust = true;
            const thrust = new Vector(Math.cos(this.localShip.angle), Math.sin(this.localShip.angle));
            this.localShip.velocity = this.localShip.velocity.add(thrust.multiply(0.2));
        } else {
            this.localShip.thrust = false;
        }
        if (this.keys[' ']) {
            if (!this.keys.shootCooldown) {
                this.localShip.shoot();
                if (this.networkManager) {
                    this.networkManager.sendShot();
                }
                this.keys.shootCooldown = true;
                setTimeout(() => this.keys.shootCooldown = false, 250);
            }
        }

        // Update all game objects
        this.localShip.update();
        this.otherShips.forEach(ship => ship.update());
        this.asteroids.forEach(asteroid => asteroid.update());

        // Existing bullet-asteroid collisions...
        this.checkCollisions();

        // --- Ship vs. Asteroid Collision Detection ---
        if (this.localShip.invulnerable <= 0 && this.localShip.respawnTimer === 0) {
            this.asteroids.forEach(asteroid => {
                if (asteroid.checkCollision(this.localShip.pos)) {
                    this.localShip.lives--;
                    this.localShip.explode();
                    this.localShip.invulnerable = 60; // 1 second of invulnerability after explosion
                    // TRIVIAL FIX: Force an immediate network update when lives change
                    if (this.networkManager) {
                        this.networkManager.update(); // Force immediate update to sync lives
                    }
                }
            });
        }

        // --- Remote ship collisions ---
        // 1. Check if the local ship's bullets hit remote ships.
        this.otherShips.forEach(ship => {
            this.localShip.bullets = this.localShip.bullets.filter(bullet => {
                const dx = bullet.pos.x - ship.pos.x;
                const dy = bullet.pos.y - ship.pos.y;
                if (Math.sqrt(dx * dx + dy * dy) < ship.size) {
                    if (ship.respawnTimer === 0 && ship.invulnerable <= 0) {
                        // Send hit to server instead of directly modifying lives
                        if (this.networkManager) {
                            this.networkManager.sendPlayerHit(ship.id);
                        }
                        return false; // Remove bullet
                    }
                }
                return true;
            });
        });
    }

    checkCollisions() {
        // Check bullet-asteroid collisions for the local ship
        this.asteroids.forEach(asteroid => {
            if (!asteroid.hit) { // Only process if not already hit
                let collided = false;
                this.localShip.bullets = this.localShip.bullets.filter(bullet => {
                    if (asteroid.checkCollision(bullet.pos)) {
                        collided = true;
                        return false;  // Remove bullet on collision
                    }
                    return true;
                });
                if (collided) {
                    // TRIVIAL FIX: Add score when destroying an asteroid
                    this.localShip.score += 100;
                    asteroid.hit = true;
                    if (this.networkManager) {
                        this.networkManager.sendAsteroidDestroyed(asteroid.id);
                    }
                }
            }
        });

        // For other ships' bullets, similar logic can be applied if needed.
        this.otherShips.forEach(ship => {
            ship.bullets = ship.bullets.filter(bullet => {
                // (Additional collision logic for other ships could go here)
                return true;
            });
        });
    }

    render() {
        // Clear screen
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw all game objects
        this.localShip.draw(this.ctx);
        this.otherShips.forEach(ship => ship.draw(this.ctx));
        this.asteroids.forEach(asteroid => asteroid.draw(this.ctx));

        // Draw all bullets
        this.localShip.bullets.forEach(bullet => bullet.draw(this.ctx));
        this.otherShips.forEach(ship => {
            ship.bullets.forEach(bullet => bullet.draw(this.ctx));
        });

        // Draw scores
        this.drawScoreboard();
    }

    drawScoreboard() {
        const scoreboard = document.getElementById("scoreboard");
        if (scoreboard) {
            // For the local ship, if an id exists, use only the first two letters.
            const localId = this.localShip.id ? this.localShip.id.toString().substring(0, 2) : "LO";
            let html = `Local (${localId}): ${this.localShip.lives} Lives, ${this.localShip.score} Score<br>`;
            this.otherShips.forEach((ship, id) => {
                const shortId = id.toString().substring(0, 2);
                html += `${shortId}: ${ship.lives} Lives, ${ship.score} Score<br>`;
            });
            scoreboard.innerHTML = html;
        }
    }

    addPlayer(id, position) {
        console.log("Adding player:", id, position);
        const ship = new Ship(new Vector(position.x, position.y), this);
        ship.id = id;
        this.otherShips.set(id, ship);
    }

    removePlayer(id) {
        this.otherShips.delete(id);
    }

    updatePlayerState(id, position) {
        const ship = this.otherShips.get(id);
        if (ship) {
            ship.pos = new Vector(position.x, position.y);
            ship.angle = position.angle;
            ship.thrust = position.thrust;
            if (position.lives !== undefined && position.lives < ship.lives && ship.respawnTimer === 0) {
                ship.explode();
                ship.invulnerable = 60; // 1 second of invulnerability
            }
            if (position.lives !== undefined) {
                ship.lives = position.lives;
            }
            if (position.score !== undefined) {
                ship.score = position.score;
            }
        }
    }


    reset() {
        // Reset local ship
        this.localShip.lives = 3;
        this.localShip.score = 0;
        this.localShip.reset();
        
        // Reset other ships
        this.otherShips.forEach(ship => {
            ship.lives = 3;
            ship.score = 0;
            ship.reset();
        });
        
        // Clear asteroids (server will send new ones)
        this.asteroids = [];
    }

    handlePlayerHit(targetId, shooterId) {
        if (targetId === this.networkManager.playerId) {
            // I was hit
            if (this.localShip.respawnTimer === 0) {  // Only if not already exploding
                this.localShip.lives--;
                this.localShip.explode();
                if (this.networkManager) {
                    this.networkManager.update(); // Force immediate update to sync lives
                }
            }
        } else if (shooterId === this.networkManager.playerId) {
            // We hit someone else, show explosion on our screen
            const targetShip = this.otherShips.get(targetId);
            if (targetShip) {
                targetShip.explode();
            }
        }
    }
}

export default Game; 