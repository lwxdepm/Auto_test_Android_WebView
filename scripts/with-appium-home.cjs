#!/usr/bin/env node
const { spawn } = require('node:child_process')
const path = require('node:path')

const [, , command, ...args] = process.argv

if (!command) {
  console.error('Usage: node scripts/with-appium-home.cjs <command> [...args]')
  process.exit(1)
}

const env = {
  ...process.env,
  APPIUM_HOME: process.env.APPIUM_HOME || path.resolve(process.cwd(), '.appium'),
}

const child = spawn(command, args, {
  stdio: 'inherit',
  env,
  // Windows needs a shell to run .cmd/.bat shims from node_modules/.bin.
  shell: process.platform === 'win32',
})

child.on('error', (error) => {
  console.error(`[with-appium-home] failed to start ${command}: ${error.message}`)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[with-appium-home] ${command} terminated by signal ${signal}`)
    process.exit(1)
  }
  process.exit(code ?? 0)
})
