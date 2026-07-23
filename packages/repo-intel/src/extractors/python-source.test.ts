import { describe, it, expect } from "vitest";
import { extractPythonSource } from "./python-source";

describe("extractPythonSource", () => {
  it("extracts frameworks and routes from python code", () => {
    const code = `
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}
`;
    const evidence = extractPythonSource("main.py", code);
    expect(evidence).toHaveLength(2);

    const fwEvidence = evidence.find(e => e.fact.technology === "FastAPI");
    expect(fwEvidence).toBeDefined();
    
    const routeEvidence = evidence.find(e => e.fact.name === "HTTP Route");
    expect(routeEvidence).toBeDefined();
  });
});
