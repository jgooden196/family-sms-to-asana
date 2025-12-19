const express = require("express");

const app = express();

// Twilio will POST with form-encoded data by default
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("ok");
});

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
  const from = req.body.From;
  const to = req.body.To;
  const body = req.body.Body;
  const messageSid = req.body.MessageSid;

  logEvent("incoming_sms", { from, to, body, messageSid });

  const replyText =
    "Got it — this has been added to JP’s Asana and will be handled.";

  // Twilio expects TwiML (XML). This response tells Twilio to send an SMS reply.
  res.set("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`);
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  logEvent("server_started", { port });
});
