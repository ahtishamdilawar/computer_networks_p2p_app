Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PORT=3001; node server.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PORT=3000; node server.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PORT=3002; node server.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node loadbalancer.js"
