#!/usr/bin/env node
'use strict';

// NEXUS CLI entry point
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(__dirname, '../dist/cli/index.js');

await import(distEntry);
