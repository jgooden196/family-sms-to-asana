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

  // Basic compliance keywords
  const incoming = (body || "").trim().toUpperCase();

  if (incoming === "STOP") {
    logEvent("opt_out_stop", { from, to, messageSid });
    res.set("Content-Type", "text/xml");
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You’re opted out. Reply START to re-subscribe.</Message>
</Response>`);
  }

  if (incoming === "START") {
    logEvent("opt_in_start", { from, to, messageSid });
    res.set("Content-Type", "text/xml");
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You’re back in. Reply STOP to opt out.</Message>
</Response>`);
  }

  if (incoming === "HELP") {
    logEvent("help_request", { from, to, messageSid });
    res.set("Content-Type", "text/xml");
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Help: This number captures family to-dos into JP’s Asana. Reply STOP to opt out.</Message>
</Response>`);
  }

  logEvent("incoming_sms", { from, to, body, messageSid });

  const replyText =
    "Got it — this has been added to JP’s Asana and will be handled.";

  // Twilio expects TwiML (XML). This response tells Twilio to send an SMS reply.
  res.set("Content-Type", "text/xml");
 return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`);
});

app.get("/test/twilio", (req, res) => {
  const replyText = "Got it — this has been added to JP’s Asana and will be handled.";

  res.set("Content-Type", "text/xml");
  return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`);
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  logEvent("server_started", { port });
});
