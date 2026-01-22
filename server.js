const express = require("express");
const fs = require("fs");
const path = require("path");
const { Communicate } = require("edge-tts-universal");

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

    const fileName = `tts-${Date.now()}.mp3`;
    const outputPath = path.join(TMP_DIR, fileName);

    const tts = new Communicate(text, voice, {
      rate,
      pitch,
      format: "audio-24khz-48kbitrate-mono-mp3"
    });

    await tts.save(outputPath);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);

    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);

    stream.on("close", () => {
      fs.unlink(outputPath, () => {});
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "TTS generation failed" });
  }
});

app.listen(3000, () => {
  console.log("🚀 Edge TTS API running on http://localhost:3000");
});
