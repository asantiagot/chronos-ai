import { useState, useEffect } from "react";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", start: "", end: "" });
  const [nlPrompt, setNlPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    const res = await fetch("/api/calendar");
    const data = await res.json();
    setEvents(data.items || []);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const createEvent = async () => {
    setLoading(true);
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "create", ...form })
    });
    await fetchEvents();
    setLoading(false);
  };

  const createNlEvent = async () => {
    setLoading(true);
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "nl_create", prompt: nlPrompt })
    });
    await fetchEvents();
    setLoading(false);
  };

  return (
    <div>
      <h1>Your Events</h1>
      <ul>
        {events.map(event => <li key={event.id}>{event.summary} - {event.start?.dateTime}</li>)}
      </ul>

      <h2>Create Event</h2>
      <input placeholder="Title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <input placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <input placeholder="Start" type="datetime-local" onChange={(e) => setForm({ ...form, start: e.target.value })} />
      <input placeholder="End" type="datetime-local" onChange={(e) => setForm({ ...form, end: e.target.value })} />
      <button onClick={createEvent} disabled={loading}>{loading ? "Creating..." : "Create"}</button>

      <h2>Create Event from Prompt</h2>
      <input placeholder="Describe your event..." onChange={(e) => setNlPrompt(e.target.value)} />
      <button onClick={createNlEvent} disabled={loading}>{loading ? "Generating..." : "Generate"}</button>
    </div>
  );
}
