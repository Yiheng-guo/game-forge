# game-ui-ux: acceptance scenarios

1. A first-time player can start, understand progress, finish and restart using the target input. Record the fixture, action, expected result and observed result.
2. Narrow screens, long labels and 200-percent text do not hide essential controls. Record the fixture, action, expected result and observed result.
3. Overlay focus returns to its trigger and background controls cannot fire. Record the fixture, action, expected result and observed result.

Run the smallest relevant scenario in the real engine/browser, then the neighboring lifecycle path.
For an existing project, compare before/after using the same fixture. A document validator or mocked API does not verify the engine behavior. Mark unavailable runtimes as untested; include the command or manual steps another developer can run.
