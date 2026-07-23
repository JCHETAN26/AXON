import { describe, it, expect } from "vitest";
import { extractJsTsSource } from "./js-ts-source";

describe("extractJsTsSource", () => {
  it("extracts frameworks and clients from typescript source", () => {
    const code = `
import express from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const app = express();
const prisma = new PrismaClient();

app.get('/api/users', async (req, res) => {
  const data = await axios.get('https://api.example.com');
  res.json(data);
});
`;
    const evidence = extractJsTsSource("src/index.ts", code);
    
    // express(), new PrismaClient(), axios.get, app.get
    expect(evidence.length).toBeGreaterThanOrEqual(4);

    const expressEvidence = evidence.find(e => e.fact.technology === "Express");
    expect(expressEvidence).toBeDefined();

    const prismaEvidence = evidence.find(e => e.fact.technology === "Prisma");
    expect(prismaEvidence).toBeDefined();

    const axiosEvidence = evidence.find(e => e.fact.name === "HTTP client");
    expect(axiosEvidence).toBeDefined();

    const routeEvidence = evidence.find(e => e.fact.name === "HTTP Route");
    expect(routeEvidence).toBeDefined();
  });
});
