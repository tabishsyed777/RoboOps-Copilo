# Aster-6 maintenance quick guide

Document ID: ROB-MNT-014 · Revision 3 · Fictional demo procedure

## Idle state and cycle interruption

When Aster-6 is idle, the operator should first check the cell status panel, the controller event log, and the physical work area. A paused cycle can be caused by a protective stop, an open guard, a gripper fault, or a request from the upstream conveyor. Record the displayed fault code before acknowledging it. Do not repeatedly clear a fault without finding its cause.

## Joint temperature

The simulated normal joint temperature range is 20–55 °C. At 56–65 °C, pause the next production cycle and inspect the joint load history, payload setting, and airflow around the controller. Above 65 °C, leave the cell in a safe stopped state and request maintenance review. These limits are examples for the fictional Aster-6 training cell and are not manufacturer limits.

## Restart checklist

Before a restart, confirm the work area is clear, the end effector is secure, the guard circuit is closed, and the controller shows no unresolved fault. Only a trained operator may reset a protective stop. Restart at reduced speed while watching the first motion. If the fault returns, stop the cell and escalate with the event-log entry.

## Preventive checks

At the start of each shift, inspect cables for abrasion, confirm the gripper fingers are secure, check that the cell floor is clear, and compare joint temperatures with the previous shift. Note unusual vibration or repeated protective stops in the shift log.
