#!/bin/bash
set -e

pnpm install

pnpm --filter @workspace/api-server run build

pnpm --filter @workspace/mobile run build
