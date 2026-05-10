#!/bin/bash
cd /c/Users/khade/Documents/Me/Coding/Waynest/waynest-be
node ./node_modules/@nestjs/cli/bin/nest.js start > server.log 2>&1 &
echo "Server PID: $!"
sleep 5
curl -s http://localhost:3001/subscriptions/plans