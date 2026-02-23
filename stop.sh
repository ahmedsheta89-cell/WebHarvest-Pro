#!/bin/bash

# WebHarvest Pro - Stop Script

echo "🛑 Stopping WebHarvest Pro..."
docker-compose down

echo "✅ Container stopped."
echo ""
echo "To start again, run: ./start.sh"