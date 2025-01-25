import MidiPlayer from './midi-player.js';

const player = new MidiPlayer();
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const tempoSlider = document.getElementById('tempoSlider');
const bpmDisplay = document.getElementById('bpmDisplay');
const fileInput = document.getElementById('midiFileInput');
const selectedFile = document.getElementById('selectedFile');
const status = document.getElementById('status');

let isPlaying = false;

function updateTrackControls() {
    const trackControls = document.getElementById('trackControls');
    trackControls.innerHTML = '';
    
    const tracks = player.getTrackInfo();
    
    tracks.forEach(track => {
        if (track.noteCount > 0) {
            const trackDiv = document.createElement('div');
            trackDiv.className = 'track-control';
            
            const label = document.createElement('div');
            label.className = 'track-label';
            label.textContent = `Track ${track.index + 1} - ${track.instrumentName}`;
            
            const volumeDiv = document.createElement('div');
            volumeDiv.className = 'track-volume';
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0';
            slider.max = '127';
            slider.value = track.volume;
            
            const volumeValue = document.createElement('span');
            volumeValue.className = 'volume-value';
            volumeValue.textContent = track.volume;
            
            slider.addEventListener('input', (e) => {
                const volume = parseInt(e.target.value);
                player.setTrackVolume(track.index, volume);
                volumeValue.textContent = volume;
            });
            
            volumeDiv.appendChild(slider);
            volumeDiv.appendChild(volumeValue);
            
            trackDiv.appendChild(label);
            trackDiv.appendChild(volumeDiv);
            trackControls.appendChild(trackDiv);
        }
    });
}

function populateDeviceSelects(midiAccess) {
    const inputSelect = document.getElementById('midiInput');
    const outputSelect = document.getElementById('midiOutput');
    
    inputSelect.innerHTML = '';
    outputSelect.innerHTML = '';
    
    for (const [id, input] of midiAccess.inputs) {
        const option = document.createElement('option');
        option.value = id;
        option.text = input.name;
        inputSelect.add(option);
    }
    
    for (const [id, output] of midiAccess.outputs) {
        const option = document.createElement('option');
        option.value = id;
        option.text = output.name;
        outputSelect.add(option);
    }
    
    if (inputSelect.options.length > 0) {
        player.setInputDevice(inputSelect.value);
    }
    if (outputSelect.options.length > 0) {
        player.setOutputDevice(outputSelect.value);
    }
    
    inputSelect.addEventListener('change', (e) => {
        player.setInputDevice(e.target.value);
    });
    
    outputSelect.addEventListener('change', (e) => {
        player.setOutputDevice(e.target.value);
    });
}

async function init() {
    try {
        const midiAccess = await player.initialize();
        populateDeviceSelects(midiAccess);
        status.textContent = 'MIDI system initialized. Ready to play.';
    } catch (error) {
        status.textContent = 'Error: Unable to initialize MIDI system. Please check your MIDI device connection.';
        console.error(error);
    }
}

playButton.addEventListener('click', () => {
    if (!isPlaying) {
        player.play();
        playButton.textContent = 'Pause';
        isPlaying = true;
    } else {
        player.pause();
        playButton.textContent = 'Play';
        isPlaying = false;
    }
});

stopButton.addEventListener('click', () => {
    player.stop();
    playButton.textContent = 'Play';
    isPlaying = false;
});

tempoSlider.addEventListener('input', (e) => {
    const bpm = parseInt(e.target.value);
    player.setTempo(bpm);
    bpmDisplay.textContent = `${bpm} BPM`;
});

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile.textContent = `Selected: ${file.name}`;
        try {
            await player.loadMidiFile(file);
            playButton.disabled = false;
            stopButton.disabled = false;
            status.textContent = 'MIDI file loaded successfully.';
            updateTrackControls();
        } catch (error) {
            status.textContent = 'Error: Failed to load MIDI file.';
            console.error(error);
        }
    }
});

const tempoModeInputs = document.getElementsByName('tempoMode');
tempoModeInputs.forEach(input => {
    input.addEventListener('change', (e) => {
        player.setTempoMode(e.target.value === 'absolute');
        const bpm = parseInt(tempoSlider.value);
        player.setTempo(bpm);
    });
});

init();