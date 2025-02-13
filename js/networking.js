export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.connected = false;
        this.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
        this.updateCounter = 0;
        this.updateFrequency = 2; // Send updates every 2nd frame
        this.wsUrl = null; // store URL for reconnects
    }

    init(wsUrl) {
        this.wsUrl = wsUrl;
        console.log("Connecting to WebSocket server:", wsUrl);
        this.socket = new WebSocket(wsUrl);
        this.game.setNetworkManager(this); // Set reference back to game

        this.socket.onopen = () => {
            console.log("Connected to server");
            this.connected = true;
            
            // Send join message with initial position
            this.socket.send(JSON.stringify({
                type: "join",
                playerId: this.playerId,
                position: {
                    x: this.game.localShip.pos.x,
                    y: this.game.localShip.pos.y
                }
            }));

            // Request initial game state
            this.socket.send(JSON.stringify({
                type: "request_state"
            }));
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Received:", data.type);

            switch(data.type) {
                case "game_state":
                    console.log("Received game state:", data.asteroids);
                    this.game.syncAsteroids(data.asteroids);
                    break;

                case "asteroids_update":
                    console.log("Received asteroid update");
                    this.game.syncAsteroids(data.asteroids);
                    break;

                case "player_joined":
                    if (data.playerId !== this.playerId) {
                        console.log("Player joined:", data.playerId);
                        this.game.addPlayer(data.playerId, data.position);
                    }
                    break;

                case "player_left":
                    if (data.playerId !== this.playerId) {
                        console.log("Player left:", data.playerId);
                        this.game.removePlayer(data.playerId);
                    }
                    break;

                case "player_update":
                    if (data.playerId !== this.playerId) {
                        this.game.updatePlayerState(data.playerId, data.position);
                    }
                    break;

                case "player_shot":
                    if (data.playerId !== this.playerId) {
                        const ship = this.game.otherShips.get(data.playerId);
                        if (ship) {
                            ship.shoot();
                        }
                    }
                    break;

                case "asteroid_destroyed":
                    console.log("Asteroid destroyed:", data.asteroidId);
                    this.game.handleAsteroidDestruction(data.asteroidId, data.newAsteroids);
                    break;

                case "game_reset":
                    console.log("Game reset received");
                    this.game.reset();
                    break;

                case "player_hit":
                    // Just pass the hit event to the game
                    this.game.handlePlayerHit(data.targetId, data.shooterId);
                    break;
            }
        };

        this.socket.onclose = () => {
            console.log("Disconnected from server");
            this.connected = false;
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                console.log("Reconnecting to WebSocket server...");
                this.init(this.wsUrl);
            }, 3000);
        };

        this.socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
    }

    update() {
        if (!this.connected) return;

        this.updateCounter++;
        if (this.updateCounter % this.updateFrequency !== 0) return;

        const ship = this.game.localShip;
        this.socket.send(JSON.stringify({
            type: "player_update",
            playerId: this.playerId,
            position: {
                x: ship.pos.x,
                y: ship.pos.y,
                angle: ship.angle,
                thrust: ship.thrust,
                lives: ship.lives,
                score: ship.score
            }
        }));
    }

    sendShot() {
        if (!this.connected) return;
        
        this.socket.send(JSON.stringify({
            type: "player_shot",
            playerId: this.playerId
        }));
    }

    sendAsteroidDestroyed(asteroidId, newAsteroids = null) {
        if (!this.connected) return;
        this.socket.send(JSON.stringify({
            type: "asteroid_destroyed",
            asteroidId: asteroidId,
            newAsteroids: newAsteroids
        }));
    }

    sendReset() {
        if (!this.connected) return;
        this.socket.send(JSON.stringify({
            type: "request_reset"
        }));
    }

    sendPlayerHit(playerId) {
        if (!this.connected) return;
        this.socket.send(JSON.stringify({
            type: "player_hit",
            targetId: playerId
        }));
    }

    reconnect() {
        if (this.socket) {
            this.socket.close();
        }
        console.log("Reconnecting...");
        this.init(this.wsUrl);
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.connected = false;
        }
    }
} 