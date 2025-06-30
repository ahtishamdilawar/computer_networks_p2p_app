# Run PeerJS server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "peerjs --port 9000 --key peerjs --path /myapp"

# Run servers in the "server" folder
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; `$env:PORT=3001; node server.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; `$env:PORT=3000; node server.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; `$env:PORT=3002; node server.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; `$env:PORT=4000; node server.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; node loadbalancer.js"

# Run client in the "client" folder
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"
