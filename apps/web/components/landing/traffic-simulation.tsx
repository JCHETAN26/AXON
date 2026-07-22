"use client";

import { useState } from "react";

import { ScenarioSelector } from "./scenario-selector";
import { SimulationCanvas } from "./simulation-canvas";
import { SimulationControls } from "./simulation-controls";
import { SimulationResult } from "./simulation-result";
import {
  BASELINE_RPS,
  DEFAULT_ASSUMPTIONS,
  SIMULATION_SCENARIOS,
  computeSimulation,
} from "@/data/simulation";

export function TrafficSimulation() {
  const [rps, setRps] = useState(BASELINE_RPS);
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const outcome = computeSimulation(rps, assumptions);
  const activeScenarioId =
    SIMULATION_SCENARIOS.find((scenario) => scenario.rps === rps)?.id ?? null;

  return (
    <section
      id="simulation"
      aria-labelledby="simulation-heading"
      className="scroll-mt-14 border-t border-border px-5 py-16 md:px-8 lg:px-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <h2 id="simulation-heading" className="type-headline-lg max-w-2xl text-balance">
          See how the system behaves before users do.
        </h2>
        <p className="type-body-lg mt-4 max-w-2xl text-foreground-muted">
          Change traffic and infrastructure assumptions to identify the first projected constraint
          before deployment.
        </p>
        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-12">
          <div className="flex flex-col gap-8 border-2 border-border-strong bg-surface p-5">
            <ScenarioSelector activeScenarioId={activeScenarioId} onSelect={setRps} />
            <SimulationControls
              rps={rps}
              assumptions={assumptions}
              onRpsChange={setRps}
              onAssumptionsChange={setAssumptions}
            />
          </div>
          <div className="flex flex-col gap-6">
            <SimulationCanvas outcome={outcome} />
            <SimulationResult outcome={outcome} />
          </div>
        </div>
      </div>
    </section>
  );
}
