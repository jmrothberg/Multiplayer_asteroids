import asyncio
import websockets
import json
import logging
import signal
import socket
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading
import random
import subprocess

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('websockets')

# Global state
clients = {}  # Store client websockets
asteroids = []  # Store asteroid states
generated_asteroids = False  # Flag to generate the asteroid field only once

DEBUG = False
if not DEBUG:
    def no_op(*args, **kwargs):
        pass
    print = no_op  # Override print to do nothing.

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('', port))
            return False
        except socket.error:
            return True

def kill_process_on_port(port):
    if sys.platform.startswith('win'):
        try:
            # Get output from netstat, then extract unique PIDs.
            output = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True).decode()
            # Each matched line should contain the PID as the last column.
            pids = {line.split()[-1] for line in output.strip().splitlines() if line}
            for pid in pids:
                print(f"Killing process {pid} on port {port} (Windows)")
                subprocess.call(f"taskkill /F /PID {pid}", shell=True)
        except subprocess.CalledProcessError:
            # Either no process was found or the command failed.
            print(f"No process found on port {port} (Windows)")
            pass
    else:
        try:
            # Get the PID(s) listening on the port.
            output = subprocess.check_output(["lsof", "-ti", f":{port}"]).decode().strip()
            if output:
                for pid in output.splitlines():
                    print(f"Killing process {pid} on port {port} (Unix)")
                    os.kill(int(pid), 9)
            else:
                print(f"No process found on port {port} (Unix)")
        except subprocess.CalledProcessError:
            # lsof returns a nonzero exit code if nothing is found.
            print(f"No process found on port {port} (Unix)")
            pass

# Signal handler for graceful shutdown
def signal_handler(sig, frame):
    print("\nShutting down servers...")
    if 'httpd' in globals():
        httpd.shutdown()
    asyncio.get_event_loop().stop()
    print("Servers stopped")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

# HTTP Server for static files
def run_http_server():
    global httpd
    httpd = HTTPServer(('0.0.0.0', 8000), SimpleHTTPRequestHandler)
    print("HTTP server running on http://0.0.0.0:8000")
    httpd.serve_forever()

async def broadcast_message(message, exclude=None):
    """Broadcast a message to all clients except the excluded one."""
    for client_id, websocket in clients.items():
        if client_id != exclude:
            try:
                await websocket.send(json.dumps(message))
            except websockets.exceptions.ConnectionClosed:
                pass

async def broadcast_asteroids_periodically():
    global asteroids
    dt = 0.05  # seconds per update (20 updates per second)
    speed_multiplier = 50  # Increase speed so asteroids move noticeably
    while True:
        # Check if the asteroid count is low and spawn new large asteroids if needed
        if clients and len(asteroids) < 4:
            missing = 10 - len(asteroids)
            spawn_new_large_asteroids(missing)
        
        # Update each asteroid's position using dt and the speed multiplier
        for a in asteroids:
            a['x'] = (a['x'] + a['velocity']['x'] * dt * speed_multiplier) % 800
            a['y'] = (a['y'] + a['velocity']['y'] * dt * speed_multiplier) % 600
        
        message = {"type": "asteroids_update", "asteroids": asteroids}
        await broadcast_message(message)
        await asyncio.sleep(dt)

def spawn_new_large_asteroids(count):
    """
    Spawn 'count' number of new large asteroids at the edges of the screen.
    They appear on an edge (top, bottom, left, or right) with a position
    along that edge, and their velocity is set to move them into the playing field.
    Each new asteroid is given a size of 50.
    """
    global asteroids
    for _ in range(count):
        temp_id = random.randint(10000, 99999)
        # Choose an edge at random
        edge = random.choice(["top", "bottom", "left", "right"])
        
        if edge == "top":
            # Spawn along the top edge
            x = random.random() * 800
            y = 0
            vx = random.uniform(-2, 2)
            # Force vy to be positive so it moves downward into the field
            vy = random.uniform(1, 3)
        elif edge == "bottom":
            # Spawn along the bottom edge
            x = random.random() * 800
            y = 600
            vx = random.uniform(-2, 2)
            # Force vy to be negative so it moves upward into the field
            vy = -random.uniform(1, 3)
        elif edge == "left":
            # Spawn along the left edge
            x = 0
            y = random.random() * 600
            # Force vx to be positive so it moves rightward into the field
            vx = random.uniform(1, 3)
            vy = random.uniform(-2, 2)
        else:  # edge == "right"
            # Spawn along the right edge
            x = 800
            y = random.random() * 600
            # Force vx to be negative so it moves leftward into the field
            vx = -random.uniform(1, 3)
            vy = random.uniform(-2, 2)
        
        new_asteroid = {
            'id': f'asteroid_{temp_id}',
            'x': x,
            'y': y,
            'size': 50,  # Large asteroid size
            'seed': temp_id,
            'velocity': {
                'x': vx,
                'y': vy
            }
        }
        asteroids.append(new_asteroid)
        print(f"Spawning new large asteroid: {new_asteroid['id']} on {edge} edge at ({x:.2f}, {y:.2f}) with velocity ({vx:.2f}, {vy:.2f})")


def spawn_new_large_asteroids_random(count):
    """
    Spawn 'count' number of new large asteroids and add them to the global asteroid list.
    Each new asteroid is given a size of 50.
    """
    global asteroids
    for _ in range(count):
        temp_id = random.randint(10000, 99999)
        new_asteroid = {
            'id': f'asteroid_{temp_id}',
            'x': random.random() * 800,
            'y': random.random() * 600,
            'size': 50,  # Large asteroid size
            'seed': temp_id,
            'velocity': {
                'x': (random.random() - 0.5) * 4,
                'y': (random.random() - 0.5) * 4
            }
        }
        asteroids.append(new_asteroid)
        print(f"Spawning new large asteroid: {new_asteroid['id']}")

async def handler(websocket):
    global generated_asteroids, asteroids, clients
    client_id = None
    
    try:
        async for message in websocket:
            data = json.loads(message)
            print(f"Received message: {data}")
            
            if data["type"] == "join":
                client_id = data["playerId"]
                clients[client_id] = websocket
                print(f"Client {client_id} joined. Total clients: {len(clients)}")

                global generated_asteroids
                # Generate the asteroid field only once (by the very first client)
                if not generated_asteroids:
                    spawn_new_large_asteroids(5)
                    generated_asteroids = True

                # Send current game state to new player
                await websocket.send(json.dumps({
                    "type": "game_state",
                    "asteroids": asteroids
                }))
                
                # Notify about existing players
                for existing_id, _ in clients.items():
                    if existing_id != client_id:
                        await websocket.send(json.dumps({
                            "type": "player_joined",
                            "playerId": existing_id,
                            "position": data["position"]
                        }))
                
                # Notify others about new player
                await broadcast_message({
                    "type": "player_joined",
                    "playerId": client_id,
                    "position": data["position"]
                }, client_id)
                
            elif data["type"] == "request_state":
                await websocket.send(json.dumps({
                    "type": "game_state",
                    "asteroids": asteroids
                }))
                
            elif data["type"] == "player_update":
                await broadcast_message(data, client_id)
                
            elif data["type"] == "player_shot":
                print(f"Broadcasting shot from {client_id}")
                await broadcast_message(data, client_id)
            
            elif data["type"] == "player_exploded":
                print(f"Broadcasting explosion for player {data['playerId']}")
                await broadcast_message(data, client_id)
            
            elif data["type"] == "asteroid_destroyed":
                asteroid_to_destroy = None
                for a in asteroids:
                    if a['id'] == data['asteroidId']:
                        asteroid_to_destroy = a
                        break
                # Only process if the asteroid was actually found.
                if not asteroid_to_destroy:
                    # Already processed—ignore duplicate messages.
                    continue

                # Remove the destroyed asteroid from the field.
                asteroids = [a for a in asteroids if a['id'] != data['asteroidId']]

                message = {
                    "type": "asteroid_destroyed",
                    "asteroidId": data["asteroidId"]
                }

                # If its size is large enough, split it and include the new asteroids.
                if asteroid_to_destroy['size'] >= 20:
                    newSize = asteroid_to_destroy['size'] / 2
                    new_id_num1 = random.randint(10000, 99999)
                    new_id_num2 = random.randint(10000, 99999)
                    newAsteroid1 = {
                        'id': f'asteroid_{new_id_num1}',
                        'x': asteroid_to_destroy['x'],
                        'y': asteroid_to_destroy['y'],
                        'size': newSize,
                        'seed': new_id_num1,  # Use new_id_num1 as the seed
                        'velocity': {
                            'x': (random.random() - 0.5) * 4,
                            'y': (random.random() - 0.5) * 4
                        }
                    }
                    newAsteroid2 = {
                        'id': f'asteroid_{new_id_num2}',
                        'x': asteroid_to_destroy['x'],
                        'y': asteroid_to_destroy['y'],
                        'size': newSize,
                        'seed': new_id_num2,  # Use new_id_num2 as the seed
                        'velocity': {
                            'x': (random.random() - 0.5) * 4,
                            'y': (random.random() - 0.5) * 4
                        }
                    }
                    asteroids.append(newAsteroid1)
                    asteroids.append(newAsteroid2)
                    message["newAsteroids"] = [newAsteroid1, newAsteroid2]

                await broadcast_message(message)
                
            elif data["type"] == "request_reset":
                print("Game reset requested")
                # Reset asteroid field
                asteroids.clear()
                generated_asteroids = False
                spawn_new_large_asteroids(5)
                # Broadcast reset command to all clients
                await broadcast_message({
                    "type": "game_reset"
                })
                
            elif data["type"] == "player_hit":
                target_id = data["targetId"]
                if target_id in clients:
                    # Broadcast the hit to all clients
                    await broadcast_message({
                        "type": "player_hit",
                        "targetId": target_id,
                        "shooterId": client_id
                    })
                
    except websockets.exceptions.ConnectionClosed:
        print(f"Client {client_id} disconnected normally")
    except Exception as e:
        print(f"Error handling client {client_id}: {e}")
    finally:
        # When a client disconnects, remove it from the global state 
        # and notify everyone to remove that player (avoiding ghost players).
        if client_id:
            if client_id in clients:
                del clients[client_id]
            await broadcast_message({
                "type": "player_left",
                "playerId": client_id
            })
            print(f"Client {client_id} removed. Total clients: {len(clients)}")

async def main():
    # Check and kill existing processes if needed
    if is_port_in_use(8000):
        print("Port 8000 in use, attempting to free it...")
        kill_process_on_port(8000)

    # Start HTTP server in a separate thread
    print("Starting HTTP server...")
    http_thread = threading.Thread(target=run_http_server)
    http_thread.daemon = True
    http_thread.start()

    # Start periodic asteroid updates
    asyncio.create_task(broadcast_asteroids_periodically())

    # Start WebSocket server
    print("Starting WebSocket server...")
    async with websockets.serve(handler, "0.0.0.0", 8765):
        print("WebSocket server running on ws://0.0.0.0:8765")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    print("Initializing servers...")
    asyncio.run(main()) 