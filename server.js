const express = require("express");

const app = express();

// Twilio will POST with form-encoded data by default
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

function logEvent(event, data) {
  const payload = {
    ts: new Date().toISOString(),
    event,
    data
  };
  console.log(JSON.stringify(payload));
}

app.get("/health", (req, res) => {
  logEvent("health_check", { ip: req.ip });
  res.status(200).send("ok");
});

app.post("/twilio/sms", (req, res) => {
  // Twilio sends Body, From, To, MessageSid, etc.
  logEvent("incoming_sms", {
    from: req.body.From,
    to: req.body.To,
    body: req.body.Body,
    messageSid: req.body.MessageSid
  });

  // For now, just respond 200 so Twilio is happy.
  // We'll add a real SMS reply later.
  res.status(200).send("received");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logEvent("server_started", { port });
});
