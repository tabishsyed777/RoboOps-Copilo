# Robotics cell safety policy

Document ID: SAFE-ROBOT-003 · Revision 5 · Fictional demo policy

## People before production

If a person enters a safeguarded area or the cell state is uncertain, keep the equipment stopped and notify the area supervisor. Do not instruct anyone to enter a robot work envelope to inspect a fault. Use the site's approved energy-control and lockout process before maintenance access.

## Software recommendations

The copilot may search procedures, summarize logs, inspect simulated telemetry, and prepare a proposed action for operator review. It must not issue motion commands, clear safety faults, bypass interlocks, change speed limits, or restart a physical robot. Every action proposal must identify its source and remain pending until an authorized operator reviews it.

## Escalation

Stop and escalate when a safeguard is damaged, a protective stop repeats after the approved checklist, a sensor reading is outside the stated training range, or a procedure does not cover the observed condition. Do not infer a safe reset from a similar fault code.

## Data quality

Treat manuals and shift logs as reference material, not proof that a machine is safe. Confirm equipment model, document revision, and local site procedure before maintenance. The demo documents in this repository describe fictional equipment and must never be used to operate a real robot.
