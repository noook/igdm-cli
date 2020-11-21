#! /usr/bin/env node
const { writeFileSync } = require('fs');
const { resolve } = require('path');

writeFileSync(resolve(process.cwd(), 'session.json'), '{}');
