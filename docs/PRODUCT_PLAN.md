# Tiny Universe

## 1. Product Vision

Build a mobile-first idle/exploration/strategy/simulation game called **Tiny Universe**.

The player begins with a single tiny planet and gradually grows from:

**Planet → Planetary System → Star System → Cluster → Galaxy → Galaxy Cluster → Universe**

The game combines:

- Idle progression
- Incremental economy
- Procedural exploration
- Physics-inspired celestial simulation
- Planet development
- Civilization simulation
- Technology progression
- Resource discovery
- Strategic intervention
- Long-term meta progression
- Emergent events and stories

The central fantasy is:

> **Start with one tiny world and eventually become the architect of an entire living universe.**

The player should feel that the universe is continuously evolving even when they are not actively playing.

---

# 2. Design Principles

## 2.1 Simple to understand

The first few minutes should require almost no explanation.

The player should immediately understand:

1. I have a planet.
2. My planet produces resources.
3. I can improve it.
4. I can discover space.
5. I can create/find other celestial objects.
6. Life can emerge.
7. Civilizations can develop.
8. I can influence them.
9. My universe keeps progressing.

---

## 2.2 Extremely deep underneath

The interface should remain simple while the simulation becomes increasingly sophisticated.

Early game:

> Planet → resources → upgrades

Mid game:

> Planets → moons → stars → systems → civilizations

Late game:

> Multiple systems → civilizations → diplomacy → technology → megastructures → galactic events

Endgame:

> Manage an evolving universe containing thousands/millions of simulated entities using scalable abstraction.

---

# 3. Core Gameplay Loop

The fundamental loop is:

```text
OBSERVE
    ↓
EXPLORE
    ↓
DISCOVER
    ↓
DEVELOP
    ↓
ACCELERATE
    ↓
UNLOCK
    ↓
EXPAND
    ↓
SIMULATE
    ↓
INTERVENE
    ↓
DISCOVER CONSEQUENCES
    ↓
EXPAND FURTHER
```

The player should constantly alternate between:

### Active gameplay

- Explore
- Select objects
- Manipulate celestial bodies
- Activate discoveries
- Research technologies
- Guide civilizations
- Complete objectives
- Resolve events

### Passive gameplay

- Resource production
- Civilization growth
- Research
- Population growth
- Planet evolution
- Exploration
- Trade
- Construction
- Cosmic events

---

# 4. Camera / Scale

The game should support seamless conceptual scale transitions.

## Scale levels

```text
Planet
  ↓
Orbit
  ↓
Planetary System
  ↓
Star System
  ↓
Sector
  ↓
Galaxy
  ↓
Galaxy Cluster
  ↓
Universe
```

Do not attempt literal rendering of every object simultaneously.

Use different simulation/rendering levels.

For example:

```text
Focused object
    = high-detail simulation

Nearby objects
    = medium-detail simulation

Distant objects
    = statistical simulation

Extremely distant universe
    = aggregate simulation
```

This is essential for mobile performance.

---

# 5. Game Start

The player starts with:

```text
1 Planet
1 Star
Basic atmosphere
Primitive ecosystem
Small resource production
No civilization
No exploration technology
```

The first objective:

> Make your world capable of sustaining complex life.

Initial resources:

- Energy
- Matter
- Minerals
- Biological potential

---

# 6. Planet System

Each planet should have a collection of properties.

## Planet statistics

```text
Mass
Radius
Gravity
Temperature
Atmosphere
Atmospheric pressure
Water
Oxygen
Carbon
Minerals
Energy availability
Magnetic field
Radiation
Habitability
Biodiversity
Age
Population
Technology
Civilization level
```

Not every statistic needs to be shown immediately.

Use progressive disclosure.

---

# 7. Planet Development

Players can improve planets through upgrades.

Example categories:

### Environment

- Atmosphere Stabilization
- Climate Control
- Ocean Expansion
- Magnetic Shield
- Radiation Shield
- Artificial Seasons

### Energy

- Solar Collection
- Geothermal Extraction
- Fusion
- Orbital Solar Arrays

### Resources

- Deep Mining
- Rare Mineral Extraction
- Asteroid Mining
- Automated Industry

### Biology

- Biodiversity Enhancement
- Genetic Adaptation
- Ecosystem Stabilization

### Civilization

- Education
- Infrastructure
- Scientific Institutions
- Automation
- Space Program

---

# 8. Resources

Use multiple resource layers.

## Tier 1

Immediately understandable:

- Energy
- Minerals
- Food
- Matter

## Tier 2

Advanced:

- Rare Minerals
- Organic Matter
- Exotic Matter
- Dark Matter
- Stellar Energy

## Tier 3

Endgame:

- Quantum Energy
- Singularity Matter
- Cosmic Information
- Spacetime
- Entropy Control

Avoid excessive resources early.

Unlock complexity gradually.

---

# 9. Resource Generation

Every object can produce resources.

Example:

### Planet

```text
Energy: +10/s
Minerals: +5/s
Food: +20/s
```

### Star

```text
Energy: +10,000/s
```

### Asteroid field

```text
Minerals: +500/s
```

### Black hole

Potentially:

```text
Exotic Matter
Quantum Energy
Spacetime
```

---

# 10. Idle System

Implement a robust offline progression system.

When the player leaves:

```text
LastSimulationTimestamp
```

When returning:

```text
elapsed = currentTime - lastSimulationTimestamp
```

Apply simulation using scalable time steps.

Support:

- Offline production
- Civilization research
- Population changes
- Exploration
- Construction
- Events
- Discoveries

Use maximum offline simulation caps initially.

Example:

```text
Maximum offline progression = 24 hours
```

Later unlock:

```text
48h
72h
7 days
```

Do not simulate every individual entity during offline progression.

Use aggregated calculations.

---

# 11. Celestial Object System

Create a generic celestial-object architecture.

Base type:

```text
CelestialObject
```

Possible types:

```text
Planet
Moon
Star
Asteroid
Comet
Nebula
BlackHole
GasGiant
DwarfPlanet
ArtificialObject
```

Each object has:

```text
Id
Type
Name
Mass
Position
Velocity
Radius
Age
ParentObjectId
ChildObjectIds
Properties
Resources
SimulationState
```

---

# 12. Orbits

Implement simplified orbital simulation.

Do NOT begin with expensive N-body physics.

Use:

- Keplerian orbits
- Parent-child relationships
- Simplified gravitational influence

Later introduce:

- Multi-body perturbation
- Orbital instability
- Collisions
- Slingshots
- Resonance
- Black-hole effects

This keeps early development performant.

---

# 13. Gravity Manipulation

Gravity should eventually become one of the game's signature mechanics.

Players can unlock abilities such as:

### Gravity Boost

Increase gravitational attraction.

### Gravity Reduction

Reduce gravity.

### Orbital Push

Alter orbital velocity.

### Gravity Well

Create temporary gravitational anomalies.

### Orbital Capture

Capture an asteroid/moon.

### Gravity Slingshot

Accelerate objects.

### Artificial Gravity

Create artificial gravitational structures.

These should have costs and cooldowns.

---

# 14. Stars

Stars are strategic objects.

Properties:

```text
Mass
Temperature
Age
Luminosity
Metallicity
Fuel
Lifespan
Type
```

Star classes:

```text
Red Dwarf
Orange
Yellow
White
Blue
Giant
Supergiant
```

Later:

```text
Neutron Star
White Dwarf
Black Hole
```

Stars affect:

- Planet temperature
- Energy production
- Civilization development
- Habitability
- Resource availability
- Cosmic events

---

# 15. Stellar Lifecycle

Stars should evolve.

Example:

```text
Nebula
 ↓
Protostar
 ↓
Main Sequence
 ↓
Red Giant
 ↓
White Dwarf / Supernova / Black Hole
```

Different star masses produce different paths.

This creates long-term simulation.

---

# 16. Moons

Moons are not decorative.

They can influence:

- Tides
- Climate stability
- Night cycle
- Resources
- Civilization development
- Orbital stability

Rare moon configurations can create discoveries.

---

# 17. Asteroids

Asteroids should provide exploration and resource opportunities.

Types:

```text
Rocky
Metallic
Ice
Rare Mineral
Organic
Exotic
Ancient Artifact
```

Players can:

- Mine
- Capture
- Redirect
- Destroy
- Study
- Turn into habitats

---

# 18. Black Holes

Black holes should be late-game objects.

Properties:

```text
Mass
Spin
Accretion
Event Horizon
Energy Output
```

Possible mechanics:

- Gravity wells
- Accretion energy
- Exotic matter
- Time dilation
- Wormhole research
- Civilization danger
- Megastructure opportunities

---

# 19. Exploration

Exploration should be one of the major long-term loops.

The player gradually unlocks:

```text
Planetary Exploration
Orbital Exploration
Deep Space
Nearby Systems
Interstellar Space
Galactic Exploration
Intergalactic Exploration
Cosmic Exploration
```

Exploration discovers:

- Planets
- Resources
- Life
- Civilizations
- Ruins
- Anomalies
- Rare celestial objects
- Ancient structures
- Strange physics

---

# 20. Procedural Universe Generation

The universe must be procedurally generated.

Use deterministic seeds.

Example:

```text
UniverseSeed
GalaxySeed
SystemSeed
PlanetSeed
CivilizationSeed
```

The same seed should generate the same universe.

This allows:

- Save/load
- Sharing universes
- Reproducibility
- Debugging
- Procedural exploration

---

# 21. Civilization System

Civilizations are one of the most important systems.

Civilizations should NOT simply be another resource generator.

They should behave like independent systems.

Each civilization has:

```text
Population
Culture
Knowledge
Technology
Economy
Energy
Military
Diplomacy
Stability
Expansion
Science
Faith/Philosophy
Government
Values
```

Avoid hardcoding every civilization.

Use simulation rules.

---

# 22. Civilization Development

Example progression:

```text
Primitive Life
 ↓
Sentient Life
 ↓
Tribal Civilization
 ↓
Agricultural Civilization
 ↓
Industrial Civilization
 ↓
Scientific Civilization
 ↓
Planetary Civilization
 ↓
Interplanetary Civilization
 ↓
Interstellar Civilization
 ↓
Galactic Civilization
 ↓
Post-Singularity Civilization
```

Civilizations do not need to follow the exact path.

Some can stagnate.

Some can collapse.

Some can destroy themselves.

Some can accelerate dramatically.

---

# 23. Civilization Simulation

Every civilization should have variables influencing growth.

Example:

```text
GrowthRate =
Habitability
× FoodAvailability
× EnergyAvailability
× Stability
× Knowledge
× Infrastructure
```

Technology growth:

```text
ResearchRate =
Population
× Education
× ScientificCulture
× Energy
× Infrastructure
```

Expansion:

```text
ExpansionRate =
Technology
× Population
× Energy
× Stability
```

Keep formulas configurable.

Do not hardcode constants throughout the codebase.

---

# 24. Player Influence

The player should not directly control civilizations at first.

Instead, the player influences the environment.

Examples:

### Increase solar energy

Civilization develops faster.

### Introduce rare mineral

New technology becomes possible.

### Stabilize climate

Population grows.

### Create moon

Tidal effects alter civilization.

### Destroy asteroid

Prevent extinction event.

### Introduce biological organism

New ecosystem emerges.

### Alter gravity

Civilization must adapt.

This creates the core fantasy:

> **You are powerful, but indirect.**

---

# 25. Civilization Interaction

Later allow direct interaction.

Possible actions:

- Send knowledge
- Send resources
- Reveal technology
- Hide technology
- Observe
- Communicate
- Establish contact
- Create alliance
- Create challenge
- Protect civilization
- Manipulate environment

These should have consequences.

---

# 26. Emergent Civilization Stories

Create a procedural event system.

Examples:

```text
"Your civilization discovered fire."

"An asteroid nearly destroyed the eastern continent."

"Scientists discovered an unknown mineral."

"Two nations entered a technological race."

"The civilization has begun exploring its moon."

"A scientific breakthrough changed the energy economy."

"A war has reduced population by 18%."

"The civilization detected an artificial signal."

```

Events should be generated from simulation state.

Do not rely exclusively on manually scripted stories.

---

# 27. Civilization Collapse

Civilizations can fail.

Potential causes:

- Resource exhaustion
- War
- Climate instability
- Asteroid impact
- Star instability
- Overpopulation
- Technological catastrophe
- Energy collapse
- Planetary destruction

But collapse should create new gameplay.

A dead civilization may leave:

- Ruins
- Artifacts
- Knowledge
- Terraforming scars
- Abandoned cities
- Satellites
- Ancient technologies

---

# 28. Technology Tree

Create a deep technology tree.

Early:

```text
Agriculture
Writing
Engineering
Astronomy
```

Middle:

```text
Electricity
Computing
Nuclear Energy
Robotics
Spaceflight
```

Advanced:

```text
Fusion
AI
Terraforming
Nanotechnology
Dyson Structures
FTL
```

Late:

```text
Matter Manipulation
Gravity Engineering
Wormholes
Stellar Engineering
Black Hole Engineering
Spacetime Manipulation
```

Endgame:

```text
Reality Engineering
Universe Simulation
Entropy Manipulation
Dimensional Engineering
```

---

# 29. Civilization Technology Should Be Emergent

Do not make every civilization research exactly the same tree.

Use technology domains:

```text
Biology
Physics
Energy
Computing
Materials
Space
AI
Gravity
Quantum
Social Science
```

Civilizations develop different strengths.

Example:

```text
Civilization A:
Energy specialization

Civilization B:
Biological specialization

Civilization C:
AI specialization
```

This makes civilizations feel different.

---

# 30. Civilization Traits

Generate several traits.

Examples:

```text
Curious
Aggressive
Cooperative
Industrial
Spiritual
Scientific
Adaptive
Expansionist
Conservative
Risk-taking
Isolationist
```

Traits influence simulation behavior.

---

# 31. Life System

Before civilizations, planets can develop life.

Stages:

```text
Chemistry
 ↓
Simple Organisms
 ↓
Complex Organisms
 ↓
Intelligent Life
 ↓
Civilization
```

Life emergence depends on:

- Temperature
- Water
- Chemistry
- Energy
- Time
- Stability
- Randomness

Use deterministic randomness.

---

# 32. Ecosystem Simulation

Do not simulate every organism.

Use aggregate ecosystem categories:

```text
Plants
Herbivores
Predators
Microorganisms
Aquatic Life
Flying Life
Intelligent Life
```

Represent population using statistical values.

This provides depth without massive CPU cost.

---

# 33. Planet Events

Generate events based on planetary conditions.

Examples:

```text
Volcanic eruption
Ice age
Climate shift
Meteor impact
Superstorm
Ocean expansion
Mass extinction
New species
Evolutionary explosion
```

Events can permanently change planets.

---

# 34. Anomalies

Add mysterious discoveries.

Examples:

- Impossible planet
- Artificial moon
- Ancient structure
- Strange signal
- Rogue planet
- Time anomaly
- Self-moving asteroid
- Unknown energy source
- Civilization older than expected
- Artificial star

These should create exploration objectives.

---

# 35. Discoveries

Create a permanent Discovery Codex.

Categories:

```text
Celestial
Biological
Civilization
Technology
Anomaly
Cosmic
Historical
```

Every discovery should be collectible.

Example:

```text
First Black Hole
First Civilization
First Extinct Civilization
First Dyson Structure
First Rogue Planet
First Artificial Moon
```

---

# 36. Achievements

Create hundreds of achievements.

Examples:

```text
Create your first moon.

Discover life.

Discover intelligent life.

Witness your first civilization.

Save a civilization.

Witness a civilization collapse.

Discover a black hole.

Build a Dyson structure.

Reach another star.

Discover an ancient civilization.

Create a galaxy.

```

Achievements should reward meaningful progression.

---

# 37. Universe Milestones

Major milestones unlock new simulation layers.

Example:

```text
Milestone 1
Planetary civilization

Milestone 2
First moon

Milestone 3
First additional planet

Milestone 4
First star system

Milestone 5
Interstellar travel

Milestone 6
First galaxy

Milestone 7
Galactic civilization

Milestone 8
Black-hole engineering

Milestone 9
Universe engineering
```

---

# 38. Meta Progression

After major progression, unlock permanent systems.

Examples:

### Cosmic Knowledge

Permanent research currency.

### Universal Laws

Permanent modifiers.

### Ancient Knowledge

Unlocks rare technologies.

### Cosmic Artifacts

Special permanent effects.

### Universe Seeds

Allow players to begin new universes with modifiers.

---

# 39. Prestige System

Implement prestige only after the base game is fun.

Possible concept:

## Big Bang / Rebirth

The player can reset a universe.

They lose:

- Celestial development
- Civilizations
- Local resources

They retain:

- Cosmic Knowledge
- Discoveries
- Permanent upgrades
- Certain artifacts

They gain:

- Faster progression
- New universe modifiers
- New starting conditions
- New anomalies

The prestige system should feel like:

> Create another universe with everything you learned from the previous one.

---

# 40. Universe Modifiers

Prestige can unlock modifiers.

Examples:

```text
Abundant Minerals
Fast Evolution
Unstable Stars
Rare Civilizations
High Gravity
Ancient Universe
Extreme Life
Dark Universe
Fast Time
Chaotic Physics
```

These can create alternate playstyles.

---

# 41. Automation

Late-game players should automate management.

Examples:

```text
Automatic exploration
Automatic asteroid mining
Automatic planet development
Automatic civilization assistance
Automatic research
Automatic resource balancing
```

Automation itself should be progression.

---

# 42. Player Powers

Create an ability system.

Categories:

### Planetary

- Terraform
- Climate Shift
- Increase Fertility
- Stabilize Atmosphere

### Orbital

- Push Object
- Pull Object
- Change Orbit
- Capture Object

### Stellar

- Increase Energy
- Suppress Flare
- Accelerate Evolution

### Civilization

- Inspire
- Gift Knowledge
- Gift Resources
- Protect
- Observe

### Cosmic

- Wormhole
- Gravity Well
- Time Acceleration
- Dimensional Rift

Abilities consume energy/currency and have cooldowns.

---

# 43. Time Controls

The player can eventually unlock:

```text
1x
2x
5x
10x
25x
100x
```

Late-game:

```text
Simulation Burst
```

which advances selected systems rapidly.

Never allow time acceleration to break simulation consistency.

---

# 44. Offline Simulation Architecture

Separate:

```text
RealTimeSimulation
OfflineSimulation
```

Both should use the same underlying rules where practical.

For large elapsed periods:

Use analytical/aggregated calculations instead of iterating every simulation tick.

Example:

Instead of:

```text
simulate 86,400 individual seconds
```

use:

```text
simulate production analytically
simulate civilization growth using growth curves
simulate research using accumulated research points
```

---

# 45. Simulation Architecture

Use deterministic simulation.

Suggested structure:

```text
Game
 ├── Universe
 │    ├── Galaxy
 │    │    ├── StarSystem
 │    │    │    ├── Star
 │    │    │    ├── Planet
 │    │    │    └── Moon
 │    │    └── ...
 │    └── ...
 │
 ├── CivilizationSystem
 ├── EconomySystem
 ├── ExplorationSystem
 ├── TechnologySystem
 ├── EventSystem
 ├── AchievementSystem
 ├── DiscoverySystem
 └── SaveSystem
```

Use clear boundaries.

---

# 46. Simulation Tiers

Implement three simulation tiers.

## Tier 1 — Active

Objects currently visible.

High detail.

## Tier 2 — Nearby

Objects near the player.

Medium detail.

## Tier 3 — Background

Distant objects.

Statistical simulation.

This architecture is critical.

---

# 47. Entity Lifecycle

Objects should be able to transition between:

```text
Generated
Active
Inactive
Aggregated
Destroyed
Archived
```

Destroyed civilizations should remain available in historical records without requiring active simulation.

---

# 48. Data-Oriented Design

Avoid creating huge numbers of heavyweight objects unnecessarily.

Prefer:

```text
IDs
struct-like state
compact collections
component-oriented data
```

Use object references carefully.

The simulation must eventually support very large universes.

---

# 49. Rendering

The visual style should be:

**Simple, beautiful, atmospheric, polished.**

Do not attempt photorealism.

Prioritize:

- Glow
- Particle effects
- Smooth transitions
- Orbital trails
- Beautiful stars
- Planet shading
- Atmospheric effects
- Explosions
- Civilization lights
- Nebulae

The game should look impressive despite simple underlying geometry.

---

# 50. Camera Experience

The camera should make scale changes feel magical.

Example:

```text
Planet
↓ zoom out
Moon
↓
Planetary system
↓
Star
↓
Nearby systems
↓
Galaxy
↓
Universe
```

Use smooth camera interpolation.

Never abruptly teleport unless necessary.

---

# 51. UI

Primary screens:

```text
Universe
Planet
Civilization
Research
Exploration
Discoveries
Events
Achievements
Upgrades
Statistics
Settings
```

The UI should avoid overwhelming the player.

Use contextual panels.

---

# 52. Main Screen

The main screen should focus on the universe.

Top:

```text
Energy
Matter
Knowledge
Cosmic Energy
```

Center:

```text
Interactive celestial scene
```

Bottom:

```text
Explore
Develop
Research
Civilizations
Discoveries
```

---

# 53. Planet Screen

Show:

```text
Planet
Population
Habitability
Energy
Resources
Life
Civilization
```

Actions:

```text
Develop
Terraform
Explore
Observe
Influence
```

---

# 54. Civilization Screen

Show:

```text
Civilization name
Population
Age
Technology
Energy
Stability
Culture
Expansion
```

Timeline:

```text
Founded
First agriculture
First city
Industrial revolution
First computer
First spacecraft
...
```

This timeline is important emotionally.

---

# 55. Civilization History

Every civilization should have a history.

Example:

```text
Year 0 — Civilization emerged
Year 142 — First city
Year 870 — Written language
Year 1,200 — Scientific revolution
Year 2,100 — Nuclear energy
Year 2,900 — Spaceflight
Year 3,400 — First moon colony
Year 4,200 — First interstellar mission
```

The player should be able to inspect it.

---

# 56. Event Feed

Create an event feed:

```text
New discovery
Civilization breakthrough
Planetary event
Cosmic event
Exploration result
Rare anomaly
```

Important events should remain in history.

---

# 57. Notifications

Avoid excessive notifications.

Only notify for:

- Major discovery
- Civilization breakthrough
- Important danger
- Completed research
- Rare anomaly
- Major unlock

Allow notification settings.

---

# 58. Economy Balancing

Avoid runaway exponential numbers becoming meaningless.

Use layered scaling.

Early:

```text
1 → 10 → 100 → 1,000
```

Mid:

```text
1K → 1M → 1B
```

Late:

```text
Scientific notation
```

Use human-readable formatting.

---

# 59. Anti-Boredom Systems

Avoid making progression purely:

> Wait → collect → upgrade → wait.

Add decisions.

Examples:

```text
Which planet should receive resources?

Should I accelerate this civilization?

Should I protect it from an asteroid?

Should I exploit a rare mineral?

Should I let natural evolution continue?

Should I interfere?
```

Player choices should produce different outcomes.

---

# 60. Long-Term Goals

Always give the player a visible next goal.

Examples:

```text
Discover life
Discover intelligent life
Create a second planet
Discover a new star
Reach another system
Witness first civilization
Unlock interstellar travel
Discover a black hole
Build a megastructure
Create a galaxy
Reach universe-scale simulation
```

---

# 61. Endgame

The game should never truly end.

Eventually players can manage:

```text
Thousands of civilizations
Thousands of star systems
Multiple galaxies
Cosmic structures
Advanced technologies
```

Endgame progression becomes:

```text
Optimize
Discover
Experiment
Collect
Observe
Influence
Create
Prestige
Repeat
```

---

# 62. Infinite Endgame

Generate increasingly rare phenomena.

Examples:

```text
Impossible civilizations
Ancient civilizations
Rare cosmic events
Artificial universes
Unknown physics
Dimensional anomalies
Self-replicating civilizations
Universe-scale structures
```

The game should continually provide something new to discover.

---

# 63. Simulation Events

Create a generic event framework.

Example:

```csharp
SimulationEvent
{
    Id
    Type
    Timestamp
    TargetEntityId
    Severity
    Data
}
```

Event types:

```text
CivilizationFounded
CivilizationCollapse
TechnologyDiscovered
PlanetDestroyed
PlanetCreated
LifeEmerged
AsteroidImpact
StarBorn
StarDied
AnomalyDiscovered
FirstContact
MegastructureBuilt
```

---

# 64. Save System

The save system is critical.

Save:

```text
Universe seed
Simulation timestamp
Player progression
Unlocked systems
Celestial modifications
Civilization state
Discoveries
Achievements
Meta progression
Settings
```

Use versioned save files.

Example:

```text
SaveVersion = 1
```

Future versions must migrate old saves.

---

# 65. Deterministic Randomness

Never use uncontrolled random behavior for persistent simulation.

Use seeded RNG:

```text
UniverseSeed
EntitySeed
EventSeed
```

This makes debugging and reproducibility possible.

---

# 66. Performance Requirements

Target:

```text
60 FPS
```

on capable mobile devices.

The game must degrade gracefully.

Implement:

- Object pooling
- Level of detail
- Simulation tiers
- Batched updates
- Lazy generation
- Cached calculations
- Spatial partitioning where needed
- Background aggregation
- Limited active entities

Never render millions of objects individually.

---

# 67. Mobile UX

Design for:

- One-handed operation
- Large touch targets
- Portrait mode initially
- Short sessions
- Long sessions
- Offline play
- Fast resume

Every important action should require minimal taps.

---

# 68. Accessibility

Support:

- Large text
- High contrast
- Color-independent indicators
- Reduced motion
- Haptic toggle
- Sound toggle
- Music toggle
- Screen-reader-friendly labels where applicable

Do not rely exclusively on color.

---

# 69. Audio

Use subtle ambient audio.

Different scale levels should have different soundscapes.

Planet:

```text
Nature / atmosphere
```

Star system:

```text
Deep ambient
```

Galaxy:

```text
Large cosmic ambience
```

Major discovery:

```text
Distinct discovery sound
```

---

# 70. Monetization Architecture

Do not make the simulation dependent on aggressive monetization.

Possible future monetization:

- Cosmetic planet styles
- UI themes
- Music packs
- Optional rewarded acceleration
- Expansion packs
- Premium edition

Avoid:

- Forced ads
- Energy timers
- Pay-to-win civilization manipulation
- Blocking basic gameplay behind payments

Implement monetization as a replaceable service layer.

---

# 71. Analytics

Track anonymous gameplay metrics where appropriate.

Examples:

```text
Session duration
First planet upgrade
First discovery
First civilization
First prestige
Most-used abilities
Drop-off points
```

Do not hardwire analytics throughout gameplay code.

Create:

```text
IAnalyticsService
```

---

# 72. Architecture

Prefer a clean architecture such as:

```text
TinyUniverse.Core
TinyUniverse.Simulation
TinyUniverse.Gameplay
TinyUniverse.Rendering
TinyUniverse.UI
TinyUniverse.Persistence
TinyUniverse.Audio
TinyUniverse.Platform
TinyUniverse.Tests
```

Keep simulation independent from rendering.

The simulation should be testable without launching the game.

---

# 73. Core Interfaces

Create interfaces around major systems.

Examples:

```csharp
IUniverseSimulation
ICelestialObjectSystem
ICivilizationSystem
IEconomySystem
IExplorationSystem
ITechnologySystem
IEventSystem
IDiscoverySystem
IAchievementSystem
ISaveService
IOfflineProgressionService
```

Avoid giant god classes.

---

# 74. Configuration

Game balance must be data-driven.

Store configurable values for:

```text
Resource generation
Upgrade costs
Civilization growth
Technology costs
Event probabilities
Planet generation
Star generation
Prestige rewards
Offline caps
```

Do not scatter magic numbers through source code.

---

# 75. Debug Tools

Build an internal debug panel.

It should allow developers to:

```text
Spawn planet
Spawn star
Spawn civilization
Advance time
Add resources
Unlock technology
Trigger event
Kill civilization
Create anomaly
Change gravity
Change simulation speed
Reset universe
```

This will dramatically accelerate development.

---

# 76. Simulation Inspector

Create a developer-only inspector showing:

```text
Entity ID
Entity Type
Position
Mass
Population
Resources
Technology
Simulation tier
Last update
Next event
```

Allow inspection of any selected object.

---

# 77. Automated Testing

Create unit tests for:

### Economy

- Resource production
- Upgrade costs
- Offline rewards

### Physics

- Orbit calculations
- Gravity
- Object capture
- Collision rules

### Civilization

- Population growth
- Technology research
- Collapse
- Expansion

### Generation

- Deterministic seeds
- Valid planets
- Valid star systems

### Persistence

- Save
- Load
- Migration
- Corrupted-save handling

---

# 78. Simulation Invariants

Create explicit invariants.

Examples:

```text
Population >= 0
Mass > 0
Planet radius > 0
Resources >= 0
Technology level >= 0
Civilization age >= 0
```

Run invariant validation in development builds.

---

# 79. Development Phases

Do NOT implement everything at once.

Build vertically.

---

## Phase 1 — Core Prototype

Implement:

- One planet
- One star
- Resource generation
- Basic upgrades
- Idle progression
- Save/load
- Basic camera
- Basic UI

Goal:

> A fun 5-minute prototype.

---

## Phase 2 — Celestial Expansion

Add:

- Moons
- Multiple planets
- Orbits
- Asteroids
- Planet selection
- Basic exploration

Goal:

> Planetary-system sandbox.

---

## Phase 3 — Life

Add:

- Ecosystems
- Life emergence
- Biodiversity
- Evolution
- Planetary events

Goal:

> Worlds feel alive.

---

## Phase 4 — Civilization

Add:

- Intelligent life
- Population
- Civilization statistics
- Technology
- Civilization timeline
- Civilization events

Goal:

> The player becomes emotionally interested in individual worlds.

---

## Phase 5 — Player Influence

Add:

- Planet manipulation
- Gravity manipulation
- Resource gifts
- Technology influence
- Civilization intervention

Goal:

> The player becomes the unseen architect.

---

## Phase 6 — Star Systems

Add:

- Multiple stars
- Star lifecycle
- Interstellar exploration
- Advanced celestial objects

Goal:

> Expand beyond one planetary system.

---

## Phase 7 — Galaxy

Add:

- Procedural star systems
- Galaxy generation
- Large-scale simulation
- Civilization expansion

Goal:

> The game becomes a true universe simulator.

---

## Phase 8 — Advanced Civilizations

Add:

- Diplomacy
- Multiple civilization archetypes
- Interstellar civilization
- Megastructures
- Advanced technology

Goal:

> Civilizations become independent actors.

---

## Phase 9 — Anomalies and Discovery

Add:

- Rare events
- Ancient civilizations
- Cosmic mysteries
- Discovery Codex
- Exploration chains

Goal:

> Give players reasons to explore indefinitely.

---

## Phase 10 — Prestige / Infinite Endgame

Add:

- Universe reset
- Cosmic Knowledge
- Universe modifiers
- New starting conditions
- Infinite progression

Goal:

> Endless replayability.

---

# 80. MVP Definition

The first playable MVP must contain ONLY:

```text
1 planet
1 star
Basic resources
Basic upgrades
Idle production
Offline progression
Planet development
Simple exploration
Save/load
Basic procedural generation
```

Do NOT implement:

- Galaxy
- Complex civilizations
- Black holes
- Multiplayer
- Monetization
- Advanced physics

until the MVP is enjoyable.

---

# 81. First Play Session

Design the first 10 minutes deliberately.

### Minute 0–1

Player sees planet.

Gets resources.

Purchases first upgrade.

### Minute 1–3

Planet improves.

Player discovers first moon.

### Minute 3–5

Unlocks exploration.

Discovers another celestial body.

### Minute 5–7

Life begins appearing.

### Minute 7–10

First intelligent species appears.

Player realizes:

> "I created a world that is developing by itself."

This is the first major emotional hook.

---

# 82. Emotional Design

The game should create moments such as:

> "This civilization started on my planet."

> "I remember when this world had no life."

> "I gave them this resource and they invented something unexpected."

> "I saved this civilization from extinction."

> "This civilization existed for 20,000 years."

> "I discovered their ruins after their star died."

These moments differentiate the game from ordinary idle games.

---

# 83. Emergent Narrative

The game should automatically generate stories.

Example:

```text
A planet develops intelligent life.

The civilization discovers a rare mineral.

The player does nothing.

The civilization develops advanced energy technology.

They colonize their moon.

Later they discover interstellar travel.

They encounter another civilization.

A conflict begins.

The player intervenes by supplying energy.

The civilization survives.

Thousands of years later the civilization builds a Dyson structure.

```

The player should feel like they witnessed a history rather than completed quests.

---

# 84. Statistics

Add a universe statistics screen.

Examples:

```text
Total planets
Total stars
Total civilizations
Total civilizations extinct
Total discoveries
Total species
Oldest civilization
Largest civilization
Most advanced civilization
Longest-lived civilization
Largest galaxy
Number of black holes
```

These statistics create long-term goals.

---

# 85. Records

Create personal universe records.

Examples:

```text
Oldest civilization
Largest population
Fastest technological advancement
Largest empire
Longest peaceful civilization
Most technologically advanced civilization
Most destructive event
Largest star
Largest black hole
```

Do not rank the player against other players initially.

Make records personal.

---

# 86. Procedural Naming

Generate names for:

```text
Planets
Stars
Civilizations
Species
Galaxies
Anomalies
Technologies
Artifacts
```

Names should use deterministic seeds.

Allow players to rename important objects.

---

# 87. Favorite Objects

Allow players to favorite:

- Planets
- Civilizations
- Systems
- Stars

Add:

```text
My Worlds
My Civilizations
My Discoveries
```

This encourages emotional attachment.

---

# 88. Civilization Following

Allow the player to "follow" a civilization.

When followed:

```text
Major events
Technology breakthroughs
Population milestones
Expansion
Collapse
```

appear in a dedicated feed.

This creates a relationship between player and simulation.

---

# 89. Story Arcs

Although most events are procedural, introduce larger procedural story arcs.

Example:

```text
Civilization discovers strange signal
        ↓
Investigates
        ↓
Finds ancient structure
        ↓
Develops new technology
        ↓
Discovers ancient civilization
        ↓
Attempts communication
        ↓
Major cosmic event
```

Story arcs should use simulation state rather than forcing identical outcomes.

---

# 90. Research Agent Requirements

Before implementing major systems, the coding agent should research current successful games in:

- Idle
- Incremental
- Simulation
- 4X
- God games
- Civilization simulation
- Universe sandbox
- Exploration
- Mobile strategy

Use this research to identify:

- Successful retention mechanics
- Common UX mistakes
- Progression structures
- Monetization patterns
- Simulation simplification techniques
- Mobile performance strategies

Do not copy copyrighted assets, code, or distinctive protected content.

---

# 91. AI Agent Workflow

The coding agent must work iteratively.

For every phase:

```text
1. Inspect repository.
2. Understand existing architecture.
3. Create implementation plan.
4. Implement smallest coherent slice.
5. Build.
6. Run tests.
7. Fix errors.
8. Run performance checks.
9. Review UX.
10. Refactor.
11. Document.
12. Continue.
```

Never make massive speculative changes.

---

# 92. Quality Gate

After each major phase verify:

### Correctness

- No crashes
- Save/load works
- Simulation remains deterministic
- Offline progression works

### Performance

- Stable frame rate
- No unnecessary allocations
- No runaway simulation loops

### UX

- Player understands what to do
- Important information is discoverable
- No excessive menus

### Design

- Progression feels meaningful
- New systems build on old systems
- Player decisions matter

---

# 93. Architecture Review Loop

After every major milestone, perform a review:

```text
Review 1
Find architectural problems.

Review 2
Find performance problems.

Review 3
Find simulation inconsistencies.

Review 4
Find UX problems.

Review 5
Find progression problems.

Review 6
Find retention problems.

Review 7
Find unnecessary complexity.

Review 8
Find missing polish.

Review 9
Find edge cases.

Review 10
Final quality pass.
```

Stop earlier if no meaningful issues remain.

---

# 94. Important Anti-Patterns

Do NOT:

- Build the entire universe literally at once.
- Simulate every organism.
- Simulate every civilization every frame.
- Use real-world astronomical precision everywhere.
- Create hundreds of resources immediately.
- Make every civilization identical.
- Make idle progression purely passive.
- Make every upgrade +10%.
- Introduce prestige before the core loop works.
- Hide basic progression behind monetization.
- Make the UI look like a spreadsheet.

---

# 95. Core Technical Principle

The most important architectural principle is:

> **The universe should be much larger than what the game actively simulates.**

Use abstraction.

For example:

```text
1 active planet
    → detailed simulation

100 nearby planets
    → simplified simulation

10,000 distant planets
    → statistical simulation

1,000,000 hypothetical distant objects
    → aggregate representation
```

This is what makes the concept scalable on mobile.

---

# 96. Final Product Vision

The finished game should allow the player to look back and see:

```text
My first planet
        ↓
My first moon
        ↓
My first civilization
        ↓
My first star system
        ↓
My first interstellar civilization
        ↓
My first galaxy
        ↓
My first galactic civilization
        ↓
My first black-hole civilization
        ↓
My first universe
```

And eventually:

> **There is no final level. The universe continues.**

The ultimate goal is not simply to accumulate numbers.

It is to create a universe that feels **alive, unpredictable, discoverable, and uniquely yours.**

---

# 97. Immediate Implementation Order

The AI agent should begin with exactly this order:

```text
1. Repository analysis
2. Core architecture
3. Universe state
4. Celestial object model
5. Planet
6. Star
7. Basic orbit model
8. Resource system
9. Upgrade system
10. Real-time simulation
11. Offline simulation
12. Save/load
13. Basic camera
14. Planet UI
15. Exploration
16. Procedural generation
17. Moon
18. Multiple planets
19. Life
20. Civilization
21. Civilization timeline
22. Civilization technology
23. Player influence
24. Events
25. Discoveries
26. Star systems
27. Galaxy
28. Advanced civilizations
29. Anomalies
30. Megastructures
31. Prestige
32. Infinite endgame
33. Optimization
34. Accessibility
35. Audio
36. Polish
37. Final QA
```

At every stage, preserve the ability to run the game.

**Never sacrifice a playable build for theoretical completeness.**