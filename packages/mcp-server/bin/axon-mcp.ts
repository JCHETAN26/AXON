#!/usr/bin/env node
import { runCli } from "../src/transport";

const exitCode = await runCli(process.argv.slice(2));
process.exitCode = exitCode;
