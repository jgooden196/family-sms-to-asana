const express = require("express");
const axios = require("axios");

const app = express();
const ASANA_TOKEN = process.env.ASANA_TOKEN;
const ASANA_PROJECT_ID = process.env.ASANA_PROJECT_ID || "1205042456117269";


// Twilio will POST with form-encoded data by default
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const app = express();
const ASANA_TOKEN = process.env.ASANA_TOKEN;
const ASANA_PROJECT_ID = process.env.ASANA_PROJECT_ID || "1205042456117269";

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

async function createAsanaTask({ taskName, notes }) {
  if (!ASANA_TOKEN) {
    throw new Error("Missing ASANA_TOKEN environment variable in Railway.");
  }

  const url = "https://app.asana.com/api/1.0/tasks";
  const headers = {
    Authorization: `Bearer ${ASANA_TOKEN}`,
    "Content-Type": "application/json"
  };

  const payload = {
    data: {
      name: taskName,
      notes: notes || "",
      projects: [ASANA_PROJECT_ID]
    }
  };

  logEvent("asana_create_task_request", {
    projectId: ASANA_PROJECT_ID,
    taskName
  });

  const response = await axios.post(url, payload, { headers });

  logEvent("asana_create_task_success", {
    taskGid: response.data?.data?.gid,
    taskUrl: response.data?.data?.permalink_url
  });

  return response.data?.data;
}


app.get("/health", (req, res) => {
  logEvent("health_check", { ip: req.ip });
  res.status(200).send("ok");
});

app.post("/twilio/sms", async (req, res) => {
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

    try {
    const taskName = body && body.trim().length ? body.trim() : "(empty message)";
    const notes = `Captured via SMS\nFrom: ${from}\nTo: ${to}\nMessageSid: ${messageSid}\nCapturedAt: ${new Date().toISOString()}`;

    await createAsanaTask({ taskName, notes });
  } catch (err) {
    logEvent("asana_create_task_error", {
      message: err?.message,
      status: err?.response?.status,
      data: err?.response?.data
    });
    // We still reply to the user even if Asana fails
  }


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
