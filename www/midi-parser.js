// midi-parser.js
const MidiParser = {
    parse: function(data) {
        let lastEventTypeByte = null;
        const result = {
            timeDivision: null,
            tracks: []
        };

        let currentTrack = [];
        let pointer = 0;

        // Read header chunk
        if (data[pointer] != 0x4D || data[pointer + 1] != 0x54 || 
            data[pointer + 2] != 0x68 || data[pointer + 3] != 0x64) {
            throw new Error("Not a valid MIDI file");
        }
        pointer += 4;

        // Header length
        pointer += 4;

        // Format type
        pointer += 2;

        // Number of tracks
        const numberOfTracks = (data[pointer] << 8) + data[pointer + 1];
        pointer += 2;

        // Time division
        result.timeDivision = (data[pointer] << 8) + data[pointer + 1];
        pointer += 2;

        // Read tracks
        for (let i = 0; i < numberOfTracks; i++) {
            // Track header
            if (data[pointer] != 0x4D || data[pointer + 1] != 0x54 || 
                data[pointer + 2] != 0x72 || data[pointer + 3] != 0x6B) {
                throw new Error("Invalid track header");
            }
            pointer += 4;

            // Track length
            const trackLength = (data[pointer] << 24) + (data[pointer + 1] << 16) + 
                              (data[pointer + 2] << 8) + data[pointer + 3];
            pointer += 4;

            currentTrack = [];
            const endOfTrack = pointer + trackLength;

            while (pointer < endOfTrack) {
                // Read delta time
                let deltaTime = 0;
                let byte;
                do {
                    byte = data[pointer++];
                    deltaTime = (deltaTime << 7) + (byte & 0x7F);
                } while (byte & 0x80);

                // Read event
                let eventTypeByte = data[pointer++];

                // Handle running status
                if ((eventTypeByte & 0x80) == 0) {
                    pointer--;
                    eventTypeByte = lastEventTypeByte;
                } else {
                    lastEventTypeByte = eventTypeByte;
                }

                // Parse event
                if (eventTypeByte == 0xFF) {
                    // Meta event
                    const metaType = data[pointer++];
                    let length = data[pointer++];
                    const metaData = new Uint8Array(length);
                    for (let j = 0; j < length; j++) {
                        metaData[j] = data[pointer++];
                    }
                    currentTrack.push({
                        deltaTime: deltaTime,
                        type: eventTypeByte,
                        metaType: metaType,
                        data: metaData
                    });
                } else {
                    // MIDI event
                    const param1 = data[pointer++];
                    // Check if event type needs 2 parameters
                    let param2 = null;
                    if ((eventTypeByte & 0xF0) != 0xC0 && 
                        (eventTypeByte & 0xF0) != 0xD0) {
                        param2 = data[pointer++];
                    }
                    currentTrack.push({
                        deltaTime: deltaTime,
                        type: eventTypeByte & 0xF0,
                        channel: eventTypeByte & 0x0F,
                        data: param2 !== null ? [param1, param2] : [param1]
                    });
                }
            }

            result.tracks.push(currentTrack);
        }

        return result;
    }
};

export default MidiParser;
