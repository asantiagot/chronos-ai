import { getToken } from "next-auth/jwt";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Utils
 */

/**
 * 
 * @returns string
 * @description Returns tomorrow's date in YYYY-MM-DD format
 */
const getTomorrowDate = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

/**
 * Models
 */

const MICROSOFT_PHI4 = "microsoft/phi-4";
const MISTRALAI_7B = "mistralai/Mistral-7B-Instruct-v0.3";

/**
 * Prompt
 */

const getPrompt = (prompt: string) => `
            Your task is to extract event details and return them in a JSON format from the following prompt that describes a calendar event: ${prompt}.
            Your JSON response must have ONLY the following fields: title, date, time and location. DO NOT ADD ANYTHING ELSE TO YOUR RESPONSE, DO NOT ADD COMMENTS.
            Constraints: 
              title is mandatory and must be a string (e.g. \"birthday\"). If not specified, return "Event",
              date is mandatory and must be a Date format (e.g. \"2025-05-25\"). If not specified, return ${getTomorrowDate()},
              time is optional and must be a time format (e.g. \"10:00\"). If not specified, return null,
              location is optional and must be a string (e.g. \"Empire State\"). If not specified, return null
              If the prompt lacks a date or time, infer it based on context
              ONLY RETURN THE JSON WITH THE SPECIFIED FIELDS. DO NOT ADD ANYTHING ELSE TO YOUR RESPONSE, DO NOT ADD ANY COMMENTS.
              The JSON response must be valid and parsable, and must have the following format:
              {
                "title": "Event",
                "date": "2025-05-25",
                "time": "10:00",
                "location": "Empire State"
              }
              Do not include the format in the JSON response, just the values.
              If the prompt is not clear or does not provide enough information, return an error message in the following format:
              {
                "error": "Could not parse event details. Please be more specific."
              }
          `;


async function parseEventWithMicrosoftPhi4(prompt: string) {
  return await fetch("https://router.huggingface.co/nebius/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "messages": [
        {
          "role": "user",
          "content": getPrompt(prompt)
        }
      ],
      "model": MICROSOFT_PHI4,
      "stream": false
    }),
  });
}

async function parseEventWithMistral7B(prompt: string) {
  return await fetch("https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.3/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "messages": [
        {
          "role": "user",
          "content": getPrompt(prompt)
        }
      ],
      "model": MISTRALAI_7B,
      "stream": false
    }),
  });
}

async function parseEventWithHuggingFace(prompt: string) {
  const response = await parseEventWithMicrosoftPhi4(prompt);

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  try {
    const parsedEvents = JSON.parse(data.choices[0].message.content.trim());
    return parsedEvents;
  } catch {
    throw new Error("Failed to parse response from Hugging Face.");
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req });

  if (!token?.accessToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { type, eventId, title, description, start, end, prompt } = req.body;

  switch (type) {
    case "nl_create":
      try {
        const parsedEvent = await parseEventWithHuggingFace(prompt);

        if (!parsedEvent.title || !parsedEvent.date) {
          return res.status(400).json({ error: "Could not parse event details. Please be more specific." });
        }

        const start = new Date(parsedEvent.date + " " + (parsedEvent.time || "10:00"));
        const end = new Date(start.getTime() + 60 * 60 * 1000); // Default duration: 1 hour

        const eventBody = {
          summary: parsedEvent.title,
          description: `Generated from natural language prompt: "${prompt}"`,
          location: parsedEvent.location || null,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
        };

        const createResponse = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        });

        const createdEvent = await createResponse.json();
        return res.status(200).json({ createdEvent });
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }

    case "create":
      const body = JSON.stringify({ summary: title, description, start: { dateTime: new Date(start) }, end: { dateTime: new Date(end) } })
      const createResponse = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json"
        },
        body,
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        return res.status(500).json({ error: createData.error });
      }

      return res.status(200).json(createData);

    case "update":
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ summary: title, description, start: { dateTime: start }, end: { dateTime: end } })
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(500).json({ error: data.error });
      }

      return res.status(200).json(data);
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=5&orderBy=startTime&singleEvents=true&timeMin=${new Date().toISOString()}`,
    { headers: { Authorization: `Bearer ${token.accessToken}` } }
  );

  const data = await response.json();
  res.status(200).json(data);
};
