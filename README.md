# Multiplayer Asteroids Game

A real-time multiplayer implementation of the classic Asteroids game using WebSocket technology. Players can join from different browsers and compete in the same game space.

## Features

- Real-time multiplayer gameplay
- Smooth ship movement and asteroid physics
- Player collision detection
- Score tracking
- Ship respawning
- Colorized players for easy identification
- Live scoreboard
- Asteroid splitting mechanics

## Prerequisites

- Python 3.7+
- Modern web browser with WebSocket support
- Basic understanding of terminal/command line usage

## Installation

1. Clone the repository:
   git clone https://github.com/yourusername/multiplayer-asteroids.git
   cd multiplayer-asteroids

2. Install Python dependencies:
   pip install websockets

## Running the Game

1. Start the server:
   python server.py

2. Open your web browser and navigate to:
   http://localhost:8000

3. To play with others, they can connect to your IP address:
   http://your-ip-address:8000

## Game Controls

- **Arrow Up**: Thrust
- **Arrow Left/Right**: Rotate ship
- **Spacebar**: Shoot
- **R**: Reset game
- **E**: Exit game

## Technical Architecture

### Client-Side
- Pure JavaScript implementation
- Canvas-based rendering
- WebSocket client for real-time communication
- Object-oriented design with separate classes for game entities

### Server-Side
- Python WebSocket server
- Simple HTTP server for serving static files
- Centralized game state management
- Physics calculations for asteroid movement

## Network Protocol

The game uses a simple JSON-based protocol for client-server communication:

- join: Player joining the game
- player_update: Position and state updates
- player_shot: Shooting events
- asteroid_destroyed: Asteroid destruction events
- game_reset: Game reset requests
- player_hit: Player collision events

## Development

### File Structure

multiplayer-asteroids/
├── index.html
├── js/
│   ├── asteroids.js
│   └── networking.js
├── server.py
└── README.md

### Key Components

- asteroids.js: Main game logic and rendering
- networking.js: WebSocket client implementation
- server.py: Game server and state management
- index.html: Game interface and initialization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Known Issues

- Occasional network latency can affect gameplay smoothness
- Multiple game resets in quick succession may cause synchronization issues

## Future Improvements

- Add authentication system
- Implement game rooms
- Add power-ups and special abilities
- Improve collision detection
- Add sound effects
- Add mobile support

## License

[Choose an appropriate license]

## Acknowledgments

- Original Asteroids game by Atari
- WebSocket protocol documentation
- [Add any other acknowledgments]
