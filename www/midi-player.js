// midi-player.js
import MidiParser from './midi-parser.js';

class MidiPlayer {
    constructor() {
        this.midiAccess = null;
        this.midiInput = null;
        this.midiOutput = null;
        this.midiData = null;
        this.isPlaying = false;
        this.startTime = 0;
        this.pauseTime = 0;
        this.lastEventTime = 0;
        this.lastEventTick = 0;
        this.baseTempo = 500000;
        this.currentTempo = 500000;
        this.ticksPerBeat = 480;
        this.eventQueue = [];
        this.tempoMultiplier = 1.0;
        this.nextEventTimestamp = 0;
        this.trackVolumes = new Map();
        this.channelAssignments = new Map();
        this.channelPrograms = new Map();
        this.nextChannel = 0;
        this.isAbsoluteTempo = false;
        this.currentBPM = 120;
    }

    async initialize() {
        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            console.log('MIDI initialized successfully');
            return this.midiAccess;
        } catch (error) {
            console.error('Failed to initialize MIDI:', error);
            throw error;
        }
    }

    setInputDevice(deviceId) {
        if (!this.midiAccess) return;
        const input = this.midiAccess.inputs.get(deviceId);
        if (input) {
            if (this.midiInput) {
                this.midiInput.onmidimessage = null;
            }
            this.midiInput = input;
            this.midiInput.onmidimessage = (msg) => {
                console.log('MIDI Input:', msg.data);
            };
        }
    }

    setOutputDevice(deviceId) {
        if (!this.midiAccess) return;
        const output = this.midiAccess.outputs.get(deviceId);
        if (output) {
            this.midiOutput = output;
            if (this.midiData) {
                this.initializeChannels();
            }
        }
    }

    async loadMidiFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                this.parseMidiFile(data);
                resolve();
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    parseMidiFile(data) {
        this.midiData = MidiParser.parse(data);
        this.ticksPerBeat = this.midiData.timeDivision;
        
        this.trackVolumes.clear();
        this.channelAssignments.clear();
        this.channelPrograms.clear();
        this.nextChannel = 0;
        
        // First pass: collect program changes
        this.midiData.tracks.forEach((track, index) => {
            let currentProgram = 0;
            for (const event of track) {
                if (event.type === 0xC0) {
                    currentProgram = event.data[0];
                    break;
                }
            }
            
            // Assign channel and store program
            const channel = this.nextChannel;
            this.channelAssignments.set(index, channel);
            this.channelPrograms.set(channel, currentProgram);
            this.trackVolumes.set(index, 100);
            
            this.nextChannel = (this.nextChannel + 1) % 16;
        });

        this.prepareEventQueue();
        this.initializeChannels();
    }

    initializeChannels() {
        if (!this.midiOutput) return;
        
        // Initialize each channel's program and volume
        this.channelAssignments.forEach((channel, trackIndex) => {
            // Send program change
            const program = this.channelPrograms.get(channel);
            if (program !== undefined) {
                this.midiOutput.send([0xC0 + channel, program]);
            }
            
            // Set volume
            const volume = this.trackVolumes.get(trackIndex);
            this.midiOutput.send([0xB0 + channel, 7, volume]);
        });
    }

    getMIDIInstrumentName(program) {
        const instruments = [
            "Acoustic Grand Piano", "Bright Piano", "Electric Grand", "Honky Tonk Piano",
            "Electric Piano 1", "Electric Piano 2", "Harpsichord", "Clavinet",
            "Celesta", "Glockenspiel", "Music Box", "Vibraphone",
            "Marimba", "Xylophone", "Tubular Bells", "Dulcimer",
            "Hammond Organ", "Percussive Organ", "Rock Organ", "Church Organ",
            "Reed Organ", "Accordion", "Harmonica", "Tango Accordion",
            "Acoustic Guitar (nylon)", "Acoustic Guitar (steel)", "Electric Guitar (jazz)", "Electric Guitar (clean)",
            "Electric Guitar (muted)", "Electric Guitar (overdriven)", "Electric Guitar (distortion)", "Electric Guitar (harmonics)",
            "Acoustic Bass", "Electric Bass (finger)", "Electric Bass (pick)", "Fretless Bass",
            "Slap Bass 1", "Slap Bass 2", "Synth Bass 1", "Synth Bass 2",
            "Violin", "Viola", "Cello", "Contrabass",
            "Tremolo Strings", "Pizzicato Strings", "Orchestral Harp", "Timpani",
            "String Ensemble 1", "String Ensemble 2", "Synth Strings 1", "Synth Strings 2",
            "Choir Aahs", "Voice Oohs", "Synth Voice", "Orchestra Hit",
            "Trumpet", "Trombone", "Tuba", "Muted Trumpet",
            "French Horn", "Brass Section", "Synth Brass 1", "Synth Brass 2",
            "Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax",
            "Oboe", "English Horn", "Bassoon", "Clarinet",
            "Piccolo", "Flute", "Recorder", "Pan Flute",
            "Blown Bottle", "Shakuhachi", "Whistle", "Ocarina",
            "Lead 1 (square)", "Lead 2 (sawtooth)", "Lead 3 (calliope)", "Lead 4 (chiff)",
            "Lead 5 (charang)", "Lead 6 (voice)", "Lead 7 (fifths)", "Lead 8 (bass+lead)",
            "Pad 1 (new age)", "Pad 2 (warm)", "Pad 3 (polysynth)", "Pad 4 (choir)",
            "Pad 5 (bowed)", "Pad 6 (metallic)", "Pad 7 (halo)", "Pad 8 (sweep)",
            "FX 1 (rain)", "FX 2 (soundtrack)", "FX 3 (crystal)", "FX 4 (atmosphere)",
            "FX 5 (brightness)", "FX 6 (goblins)", "FX 7 (echoes)", "FX 8 (sci-fi)",
            "Sitar", "Banjo", "Shamisen", "Koto",
            "Kalimba", "Bagpipe", "Fiddle", "Shanai",
            "Tinkle Bell", "Agogo", "Steel Drums", "Woodblock",
            "Taiko Drum", "Melodic Tom", "Synth Drum", "Reverse Cymbal",
            "Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet",
            "Telephone Ring", "Helicopter", "Applause", "Gunshot"
        ];
        return instruments[program] || "Unknown";
    }

    getTrackInfo() {
        if (!this.midiData) return [];
        
        return this.midiData.tracks.map((track, index) => {
            let program = 0;
            let instrumentFound = false;
            
            // Look for program change events
            for (const event of track) {
                if (event.type === 0xC0) {
                    program = event.data[0];
                    instrumentFound = true;
                    break;
                }
            }
            
            const noteEvents = track.filter(event => 
                (event.type === 0x90 || event.type === 0x80)).length;
            
            return {
                index: index,
                noteCount: noteEvents,
                volume: this.trackVolumes.get(index) || 100,
                channel: this.channelAssignments.get(index),
                program: program,
                instrumentName: instrumentFound ? this.getMIDIInstrumentName(program) : "No instrument"
            };
        });
    }

    prepareEventQueue() {
        this.eventQueue = [];
        
        // Add program changes at tick 0
        this.channelAssignments.forEach((channel, trackIndex) => {
            const program = this.channelPrograms.get(channel);
            if (program !== undefined) {
                this.eventQueue.push({
                    tick: 0,
                    data: [0xC0 + channel, program],
                    trackIndex: trackIndex
                });
            }
        });

        this.midiData.tracks.forEach((track, trackIndex) => {
            let currentTick = 0;
            const channel = this.channelAssignments.get(trackIndex);

            track.forEach(event => {
                currentTick += event.deltaTime;
                
                if (event.type === 0x80 || event.type === 0x90) {
                    const statusByte = (event.type | channel);
                    this.eventQueue.push({
                        tick: currentTick,
                        data: [statusByte, event.data[0], event.data[1]],
                        trackIndex: trackIndex
                    });
                }
                else if (event.type === 0xFF && event.metaType === 0x51) {
                    this.baseTempo = (event.data[0] << 16) | 
                                   (event.data[1] << 8) | 
                                   event.data[2];
                    this.currentTempo = this.baseTempo / this.tempoMultiplier;
                }
            });
        });

        this.eventQueue.sort((a, b) => a.tick - b.tick);
        this.resetPlayback();
    }

    resetPlayback() {
        this.lastEventTime = 0;
        this.lastEventTick = 0;
        this.updateNextEventTimestamp();
    }

    updateNextEventTimestamp() {
        if (this.eventQueue.length === 0) return;

        const nextEvent = this.eventQueue[0];
        const tickDelta = nextEvent.tick - this.lastEventTick;
        this.nextEventTimestamp = this.lastEventTime + this.ticksToMs(tickDelta);
    }

    ticksToMs(ticks) {
        return (ticks * this.currentTempo) / (this.ticksPerBeat * 1000);
    }

    setTempoMode(isAbsolute) {
        this.isAbsoluteTempo = isAbsolute;
        this.setTempo(this.currentBPM);
    }

    setTempo(bpm) {
        if (!bpm || bpm <= 0) return;
        
        this.currentBPM = bpm;
        if (this.isAbsoluteTempo) {
            // Convert BPM to microseconds per quarter note
            this.currentTempo = Math.round(60000000 / bpm);
        } else {
            this.tempoMultiplier = bpm / 120;
            this.currentTempo = this.baseTempo / this.tempoMultiplier;
        }
        
        if (this.eventQueue.length > 0) {
            this.updateNextEventTimestamp();
        }
    }

    setTrackVolume(trackIndex, volume) {
        if (!this.midiOutput || !this.channelAssignments.has(trackIndex)) return;
        
        volume = Math.max(0, Math.min(127, Math.floor(volume)));
        this.trackVolumes.set(trackIndex, volume);
        
        const channel = this.channelAssignments.get(trackIndex);
        this.midiOutput.send([0xB0 + channel, 7, volume]);
    }

    sendAllNotesOff() {
        if (!this.midiOutput) return;
        
        for (let channel = 0; channel < 16; channel++) {
            this.midiOutput.send([0xB0 + channel, 123, 0]);
            this.midiOutput.send([0xB0 + channel, 120, 0]);
        }
    }

    play() {
        if (this.isPlaying) return;
        
        if (this.pauseTime > 0) {
            this.startTime += performance.now() - this.pauseTime;
            this.pauseTime = 0;
        } else {
            this.prepareEventQueue();
            this.startTime = performance.now();
        }
        
        this.isPlaying = true;
        this.processEvents();
    }

    pause() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        this.pauseTime = performance.now();
        this.sendAllNotesOff();
    }

    stop() {
        this.isPlaying = false;
        this.pauseTime = 0;
        this.startTime = 0;
        this.lastEventTime = 0;
        this.lastEventTick = 0;
        this.sendAllNotesOff();
    }

    processEvents() {
        if (!this.isPlaying) return;

        const currentTime = performance.now() - this.startTime;
        
        while (this.eventQueue.length > 0 && 
               this.nextEventTimestamp <= currentTime) {
            const event = this.eventQueue.shift();
            if (this.midiOutput) {
                this.midiOutput.send(event.data);
            }
            
            this.lastEventTime = this.nextEventTimestamp;
            this.lastEventTick = event.tick;
            
            this.updateNextEventTimestamp();
        }

        if (this.eventQueue.length > 0) {
            requestAnimationFrame(() => this.processEvents());
        } else {
            this.stop();
        }
    }
}

export default MidiPlayer;