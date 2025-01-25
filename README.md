# MIDI Player Overview

A midi file player that allows for conductor-like controls over:
- Real-time tempo control

- Per-track volume management

  

## Set up 

- You need to serve this code (not just open the index.html file). So: 
- npm install 
- node midi-server.js 7777 # or whatever port number you would like to use
- point your browser to localhost:7777

- This program also requires an external synth. I use fluidsynth, and run it like this on Windows:
```
 > fluidsynth -a dsound -m winmidi "C:\soundfonts\FluidR3_GM_GS.sf2"
```
fluidsynth doesn't register itself as a MIDI output port, so I also run loopMidi (there are other programs like this). The app sees the virtual loopMIDI port, and fluidsynth (with the -m flag) connects to (all?) MIDI input ports. A midi synthesizer could be built within the app, but that's beyond the scope....


# MIDI Player Implementation Guide

## Core Concepts

### MIDI File Structure
The player handles Standard MIDI Files (SMF) which contain:
- Multiple tracks of MIDI events
- Time division information (ticks per quarter note)
- Tempo events that define playback speed
- Program change events that specify instruments
- Note events (note-on and note-off) that define the music

### Timing System
The player uses a hybrid timing approach:
- MIDI files store time in "ticks"
- Internal conversion from ticks to milliseconds based on tempo
- Real-time playback using requestAnimationFrame()  for timing
- Support for both relative and absolute tempo control - the "absolute" mode is so that the system could follow a "conductor" who controls absolute tempo, not tempo relative to the BPMs in the file. With "absolute mode" all dynamic TempoChange events in the midi file are ignored. 

## Key Components

### Event Queue
- Events from all tracks are merged into a single queue
- Sorted by tick timestamp
- Each event maintains its track association
- Program changes are inserted at time 0
- Queue is rebuilt on play/stop for consistent playback 

### Channel Management
- Each track is assigned to a MIDI channel (0-15)
- Channels handle:
  - Program (instrument) assignments
  - Volume control
  - Note events
- Circular assignment for files with >16 tracks

### Tempo Handling
Two modes supported:
1. Relative Mode:
   - Preserves tempo changes from MIDI file
   - User tempo acts as multiplier
   - currentTempo = baseTempo / tempoMultiplier
   
2. Absolute Mode: (intended for "conductor-like" control that ignore TempoChange events in the midi file)
   - Overrides MIDI file tempo
   - Direct BPM control
   - currentTempo = 60000000 / bpm (because we use microseconds for timing, and 60,000,000 = 60 seconds × 1,000,000 microseconds/second)

## Main Processing Loop

### Initialization
1. Parse MIDI file
2. Assign channels to tracks
3. Extract program changes
4. Build event queue
5. Initialize channel programs and volumes

### Playback Process
1. Start timing from performance.now() (a built-in Web API method that returns a DOMHighResTimeStamp measuring time elapsed since the page load)
2. Convert next event's tick time to milliseconds
3. Compare with elapsed time
4. Send MIDI messages when time is reached
5. Update timing for next event
6. Request next animation frame

### Event Processing
```
While events remain AND nextEventTime <= currentTime:
    1. Send MIDI message
    2. Update last event time/tick
    3. Calculate next event timing
```

## State Management

### Playback States
- Playing: Processing event queue
- Paused: Maintains position
- Stopped: Reset to beginning

### Time Tracking
- startTime: When playback began
- pauseTime: When playback paused
- lastEventTime: Most recent event
- lastEventTick: Position in MIDI ticks
- nextEventTimestamp: Next scheduled event

### Track/Channel State
- Volume levels per track
- Program assignments
- Channel assignments
- Note cleanup on pause/stop

## Implementation Considerations

### Key  Timing Points
- Program changes must precede notes
- All notes off on pause/stop
- Tempo changes affect remaining events
- Channel initialization before playback

### Resource Management
- Single event queue for performance
- Minimal state storage
- Clean note termination
- Channel reuse strategy

## Data Flow

1. MIDI File → Parser → Track Data
2. Track Data → Event Queue + Channel Assignments
3. Event Queue → Real-time Processor → MIDI Output
4. User Controls → State Updates → Playback Adjustments

```
project-root/
README.md
midi-server.js
package.json
index.html
├── www/
│   ├── main.js
│   ├── midi-parser.js
│   ├── midi-player.js
│   └── css/
│       ├── midistyle.css
│       └── file1-1-2.txt
├── examplemidifile/
│   ├── xxx.mid

```