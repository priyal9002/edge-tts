const express = require("express");
const fs = require("fs");
const path = require("path");
const { Communicate, listVoices } = require("edge-tts-universal");

const app = express();
app.use(express.json());

const TMP_DIR = path.join(__dirname, "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

app.post("/tts", async (req, res) => {
    try {
        const {
            text,
            voice = "en-US-AriaNeural",
            rate = "0%",
            pitch = "0%"
        } = req.body;

        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        // Create Communicate instance requesting an MP3 format
        // (the constructor signature used here matches examples; adapt if your version differs)
        const communicate = new Communicate(text, voice, {
            rate,
            pitch,
            format: "audio-24khz-48kbitrate-mono-mp3"
        });

        // Collect audio chunks
        const buffers = [];
        for await (const chunk of communicate.stream()) {
            // Only collect audio-type chunks that contain data
            if (chunk && chunk.type === "audio" && chunk.data) {
                // chunk.data may be Uint8Array or Buffer — normalize to Buffer
                const b = Buffer.isBuffer(chunk.data) ? chunk.data : Buffer.from(chunk.data);
                buffers.push(b);
            }
        }

        if (buffers.length === 0) {
            return res.status(500).json({ error: "No audio data returned from TTS" });
        }

        // Combine into single MP3 buffer and send
        const mp3Buffer = Buffer.concat(buffers);
        const fileName = `tts-${Date.now()}.mp3`;

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
        res.setHeader("Content-Length", mp3Buffer.length);

        // Send the MP3
        return res.end(mp3Buffer);

    } catch (err) {
        console.error("TTS error:", err);
        return res.status(500).json({ error: "TTS generation failed", details: err?.message ?? err });
    }
});


app.get("/check", async (req, res) => {
    try {
        const getAllVoicesList = await listVoices()

        res.status(200).json(getAllVoicesList);
    } catch (err) {

        res.status(500).json({ err });
        console.error(err);
    }
})

app.listen(3000, () => {
    console.log("🚀 Edge TTS API running on http://localhost:3000");
});
