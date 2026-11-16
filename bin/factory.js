#!/usr/bin/env node
'use strict';

// Single entry point for the portable installer. All logic lives in lib/ so
// the packed artifact stays dependency-free and easy to audit.
require('../lib/cli').main(process.argv.slice(2));
