import express from "express";
import Pusher from "pusher";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
});

app.post("/update-note", (req, res) => {
  const { id, newStatus } = req.body;

  // Sende ein Event an Pusher
  pusher.trigger("notes", "noteMoved", { id, newStatus });
  res.status(200).send("Event ausgelöst");
});

app.post("/create-note", (req, res) => {
  const { id, title, description, status } = req.body;
  console.log("Pusher sendet noteCreated:", { id, title, description, status });

  // Sende ein Event an Pusher, wenn eine neue Notiz erstellt wird
  pusher.trigger("notes", "noteCreated", { id, title, description, status });

  res.status(200).send("Neue Notiz erstellt");
});

app.post("/update-log", (req, res) => {
  const { logMessage } = req.body;
  pusher.trigger("notes", "logUpdated", { logMessage });
  res.status(200).send("Log synchronisiert");
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
