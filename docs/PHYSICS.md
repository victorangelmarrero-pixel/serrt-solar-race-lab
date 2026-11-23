# The energy model

This is the model in `site/physics.js`. It is an educational model inspired by the Formula Sun Grand Prix format. It is not a race prediction and it has not been validated against track data.

SI units inside the model. Speeds and distances are converted to mph and miles only at the interface.

## The race

- Three track days: 10:00–18:00, then 09:00–17:00 twice.
- The car may charge from the sun from 07:00 to 20:00 each day.
- Time advances in 30-second steps.
- Score is whole laps completed each day, summed over the three days.
- Each driver swap parks the car in the pit for a set number of minutes (default: one swap of 5 minutes).

## Power the car uses

At speed `v` (m/s), with total mass `m` (car plus an 80 kg driver):

| Term | Formula | Notes |
| --- | --- | --- |
| Air drag | `P_drag = ½ · ρ · CdA · v³` | `ρ = 1.17 kg/m³` |
| Rolling resistance | `P_roll = m · g · C_rr · v` | `g = 9.81 m/s²` |
| Corner braking | `P_corner = ½ · m · (v² − v_c²) · n · 0.5 · v / L` | `v_c = min(v, 35 mph)`, `n` corners per lap, lap length `L`. Half of the kinetic energy shed into each corner is treated as lost. |
| Hills | `P_hill = m · g · h · 0.2 · v / L` | `h` metres climbed per lap. 20% of the climb energy is treated as not recovered. |
| Drivetrain | `P_batt = (P_drag + P_roll + P_corner + P_hill) / η_motor` | motor and controller efficiency |
| Electronics | `+ 25 W` | constant, also drawn when stopped |

`parts()` returns the same terms separately, and the tests check that they add up to `power()`.

## Geometry

Body size changes mass and drag:

- Panel area is capped at 78% of `length × width`.
- `carMass = chassis + (battery − 5.184)/0.18 + (area − 6)·3 + (length − 4.5)·8 + (width − 1.8)·10`, in kg. That is 180 Wh/kg for the pack and 3 kg/m² for the panel.
- `CdA = cda · (width/1.8) · (height/1.0) · (1 + 0.035·(length − 4.5))`.

For Pitirre 3 the game sets `chassis` and `cda` so that the result is exactly the documented mass and the assumed drag area at the documented dimensions.

## Power from the sun

Site: Gravois Mills, Missouri. Latitude 38.27°, solar declination 21.5°, solar noon at 13.29 h local time.

1. Sun altitude: `sin(alt) = sin(lat)·sin(decl) + cos(lat)·cos(decl)·cos(15°·(hour − 13.29))`.
2. Air mass (Kasten–Young): `AM = 1 / (sin(alt) + 0.50572·(elevation + 6.07995)^−1.6364)`.
3. Clear-sky direct beam: `DNI = 1353 · 0.7^(AM^0.678)` W/m².
4. Clear-sky global horizontal: `GHI = 1.1 · DNI · sin(alt)`.
5. Cloud (Kasten–Czeplak): `GHI_cloud = GHI · (1 − 0.75·c^3.4)` with cloud fraction `c`. Direct beam scales with `(1 − c)`. The rest is diffuse.
6. Driving: the panel lies flat, so it receives `direct·sin(alt) + diffuse`.
   Parked with a tilted array: it faces the sun, so it receives `DNI·(1 − c) + diffuse`.
7. `P_sun = area · η_cell · 0.93 · irradiance`. The 0.93 covers wiring, temperature and tracker losses.

## Battery

- Energy in and out both pay 97%: charging stores `0.97 ×` the surplus, discharging costs `1/0.97 ×` the deficit.
- The battery is clamped between empty and its nominal capacity. Sun that arrives with a full battery is wasted.
- With an empty battery the car drives at the speed the sun alone can sustain.
- If that speed is under 10 mph the car parks, tilts its array and charges until it reaches 15%.
- The car never spends energy that the battery and the current sunlight cannot supply within the step.

## What the optimiser does

`optimize()` simulates every constant speed from 15 to 65 mph and keeps the one with the most laps, breaking ties by distance. The per-day search is a coordinate search. It reports the best plan found, not a proven optimum.

## Documented data and assumptions

Every value with its source is in [`../data/pitirre3.json`](../data/pitirre3.json).

**Documented**

- Mechanical PVDR for FSGP 2027 (11 November 2026): length 5.03 m, width 2.12 m, height 1.40 m, wheelbase 3.25 m, tyre radius 10.68 in, cockpit 113 in from the nose, 1,000 lb design weight with driver, three-phase motor on the left-rear wheel. The report calls the 1,000 lb figure a deliberate overestimate, so the real car should be lighter than the game's.
- Electrical PVDR Report, FSGP 2027 (11 November 2026): 288 Samsung 50S cells in 32s9p, 115.2 V nominal, 45 Ah. That gives 5.184 kWh nominal, which is not measured usable energy.

**Assumed**

- Drag area `CdA = 0.14 m²`. The mechanical report does not give one. This is the number that moves the result most.
- Solar panel area 6 m², cell efficiency 24%, array derating 0.93.
- Drivetrain efficiency 94%, rolling resistance 0.0055, electronics 25 W, battery step efficiency 97%.
- Driver 80 kg, air density 1.17 kg/m³.
- Track: 3.97 miles per lap, 45 m climbed per lap, 5 braking corners per lap. The drawn circuit is illustrative.
- Weather: clear-sky model plus a cloud percentage. Live races add a seeded drift around the forecast.

**Fictional**

- The seven rival teams. Their cars and pace rules are invented in `site/logic.js`.

## Checking it

```bash
npm test
```

The test file prints two `PASS` lines and a reference result for the default car. Any change to `physics.js` that alters those numbers is a change to the model and should be explained in the changelog.
